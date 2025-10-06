# ServiceNow Setup Guide

## Password Setting Issue

ServiceNow's REST API does **not allow setting passwords** via the standard Table API due to security restrictions. The `user_password` field in the `sys_user` table is write-protected.

## Solution: Create a Scripted REST API

You need to create a custom Scripted REST API in your ServiceNow instance to set user passwords.

### Steps to Create the Password Setting API

1. **Navigate to System Web Services > Scripted REST APIs**
2. **Create a New REST API:**
   - Name: `LoadTest User Management`
   - API ID: `loadtest_user_mgmt`
   - Protection: `Requires authentication`

3. **Create a Resource:**
   - Name: `Set User Password`
   - HTTP method: `POST`
   - Relative path: `/set_password`

4. **Add this script:**

```javascript
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
    try {
        var body = request.body.data;
        var userSysId = body.user_sys_id;
        var password = body.password;
        
        if (!userSysId || !password) {
            response.setStatus(400);
            response.setBody({
                success: false,
                error: 'user_sys_id and password are required'
            });
            return;
        }
        
        var gr = new GlideRecord('sys_user');
        if (gr.get(userSysId)) {
            gr.user_password.setDisplayValue(password);
            gr.update();
            
            response.setStatus(200);
            response.setBody({
                success: true,
                message: 'Password set successfully'
            });
        } else {
            response.setStatus(404);
            response.setBody({
                success: false,
                error: 'User not found'
            });
        }
    } catch (e) {
        response.setStatus(500);
        response.setBody({
            success: false,
            error: e.message
        });
    }
})(request, response);
```

5. **Set the API ACL:**
   - Make sure the API requires the `admin` role or create a specific role for load testing

### API Endpoint

Once created, the endpoint will be available at:
```
https://your-instance.service-now.com/api/<scope_id>/loadtest_user_mgmt/set_password
```

Where `<scope_id>` is the ID of your scoped application (e.g., `497563`).

For global scope, it would be:
```
https://your-instance.service-now.com/api/now/loadtest_user_mgmt/set_password
```

**Note:** After creating the API, copy the full endpoint URL and update it in `src/users/user-provisioner.js` in the `setUserPassword()` method if the scope ID is different.

### Request Format

```json
POST /api/now/loadtest_user_mgmt/set_password
{
  "user_sys_id": "abc123...",
  "password": "LoadTest123!"
}
```

## Alternative Solution: Use Pre-existing Users

If you can't create a custom REST API, you can:

1. **Manually create users** in ServiceNow with known passwords
2. **Update the config.yaml** to skip user provisioning
3. **Provide a list of existing users** in the configuration

This requires modifying the code to support using existing users instead of creating new ones.

## Troubleshooting 401 Unauthorized Errors

If you're getting 401 errors, it means:

1. **Passwords are not set correctly** - ServiceNow REST API cannot set passwords
2. **Users don't have proper roles** - Make sure users have the `admin` role or required roles
3. **Authentication is failing** - The credentials being passed don't match what's in ServiceNow

### Quick Fix

The fastest way to resolve this is:

1. Create the Scripted REST API above
2. The load tester will automatically use it to set passwords
3. Alternatively, manually set passwords for the users in ServiceNow and ensure they match `LoadTest123!`
