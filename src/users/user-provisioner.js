import logger from '../logger.js';

/**
 * Provisions test users on ServiceNow instance via REST API
 */
class UserProvisioner {
  constructor(instanceUrl, adminCredentials) {
    this.instanceUrl = instanceUrl;
    this.adminAuth = this.encodeCredentials(adminCredentials.username, adminCredentials.password);
  }

  encodeCredentials(username, password) {
    return Buffer.from(`${username}:${password}`).toString('base64');
  }

  async getRoleSysId(roleName) {
    try {
      const response = await fetch(
        `${this.instanceUrl}/api/now/table/sys_user_role?sysparm_query=name=${roleName}&sysparm_limit=1`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${this.adminAuth}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch role: ${response.status}`);
      }

      const result = await response.json();
      if (result.result && result.result.length > 0) {
        return result.result[0].sys_id;
      }
      throw new Error(`Role ${roleName} not found`);
    } catch (error) {
      logger.error(`Failed to get role sys_id for ${roleName}`, { error: error.message });
      throw error;
    }
  }

  async assignRoleToUser(userSysId, roleName) {
    try {
      const roleSysId = await this.getRoleSysId(roleName);
      
      const roleAssignment = {
        user: userSysId,
        role: roleSysId
      };

      const response = await fetch(`${this.instanceUrl}/api/now/table/sys_user_has_role`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.adminAuth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(roleAssignment)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to assign role: ${response.status} - ${errorText}`);
      }

      logger.info(`Role ${roleName} assigned to user`, { user_sys_id: userSysId });
    } catch (error) {
      logger.error(`Failed to assign role to user`, { user_sys_id: userSysId, error: error.message });
      throw error;
    }
  }

  async setUserPassword(userSysId, password) {
    try {
      // Use custom Scripted REST API to set password
      // This requires the API to be created in ServiceNow (see SETUP_SERVICENOW.md)
      const response = await fetch(`${this.instanceUrl}/api/497563/loadtest_user_mgmt/set_password`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.adminAuth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_sys_id: userSysId,
          password: password
        })
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        logger.error(`Failed to set password - HTTP error`, { 
          user_sys_id: userSysId,
          status: response.status,
          statusText: response.statusText,
          responseBody: responseText
        });
        return false;
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        logger.error(`Failed to parse password API response`, { 
          user_sys_id: userSysId,
          responseBody: responseText,
          parseError: e.message
        });
        return false;
      }

      logger.debug(`Password API response`, { 
        user_sys_id: userSysId, 
        result: result 
      });

      // ServiceNow wraps the response in a result object
      const actualResult = result.result || result;

      if (actualResult.success) {
        logger.info(`Password set for user`, { user_sys_id: userSysId });
        return true;
      } else {
        logger.error(`Password setting failed`, { 
          user_sys_id: userSysId, 
          error: actualResult.error || 'Unknown error',
          fullResponse: result
        });
        return false;
      }
    } catch (error) {
      logger.error(`Failed to set password - Exception`, { 
        user_sys_id: userSysId, 
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  async createUser(username, password, firstName, lastName) {
    const userData = {
      user_name: username,
      first_name: firstName,
      last_name: lastName,
      email: `${username}@loadtest.example.com`,
      active: true,
      web_service_access_only: false
    };

    try {
      const response = await fetch(`${this.instanceUrl}/api/now/table/sys_user`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.adminAuth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create user: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const userSysId = result.result.sys_id;
      
      logger.info(`User created successfully: ${username}`, { sys_id: userSysId });
      
      // Set password for the user
      await this.setUserPassword(userSysId, password);
      
      // Assign admin role to the user
      await this.assignRoleToUser(userSysId, 'admin');
      
      return {
        username,
        password,
        sys_id: userSysId
      };
    } catch (error) {
      logger.error(`Failed to create user ${username}`, { error: error.message });
      throw error;
    }
  }

  async deleteUser(sysId) {
    try {
      const response = await fetch(`${this.instanceUrl}/api/now/table/sys_user/${sysId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${this.adminAuth}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.status}`);
      }

      logger.info(`User deleted successfully`, { sys_id: sysId });
    } catch (error) {
      logger.error(`Failed to delete user`, { sys_id: sysId, error: error.message });
      throw error;
    }
  }

  async provisionUsers(count, userPrefix) {
    logger.info(`Provisioning ${count} test users...`);
    const users = [];
    const password = 'LoadTest123!';

    for (let i = 1; i <= count; i++) {
      const username = `${userPrefix}${i}`;
      const firstName = `LoadTest`;
      const lastName = `User${i}`;

      try {
        const user = await this.createUser(username, password, firstName, lastName);
        users.push(user);
      } catch (error) {
        logger.warn(`Skipping user ${username} - may already exist or creation failed`);
        // Add user anyway for retry logic
        users.push({ username, password, sys_id: null });
      }
    }

    logger.info(`User provisioning complete`, { total: users.length });
    return users;
  }

  async cleanupUsers(users) {
    logger.info(`Cleaning up ${users.length} test users...`);
    
    for (const user of users) {
      if (user.sys_id) {
        try {
          await this.deleteUser(user.sys_id);
        } catch (error) {
          logger.warn(`Could not delete user ${user.username}`);
        }
      }
    }
    
    logger.info('User cleanup complete');
  }
}

export default UserProvisioner;
