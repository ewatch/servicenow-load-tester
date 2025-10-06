/**
 * Manages test user credentials and distribution
 */
class UserManager {
  constructor(users) {
    this.users = users;
    this.browserUsers = [];
    this.apiUsers = [];
  }

  distributeUsers(browserCount) {
    this.browserUsers = this.users.slice(0, browserCount);
    this.apiUsers = this.users.slice(browserCount);
  }

  getBrowserUsers() {
    return this.browserUsers;
  }

  getApiUsers() {
    return this.apiUsers;
  }

  getAllUsers() {
    return this.users;
  }

  getUserCount() {
    return {
      total: this.users.length,
      browser: this.browserUsers.length,
      api: this.apiUsers.length
    };
  }
}

export default UserManager;
