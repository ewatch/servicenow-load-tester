import logger from './logger.js';
import BrowserSession from './browser/browser-session.js';
import ApiSession from './api/api-session.js';

/**
 * Orchestrates multiple parallel browser and API sessions
 */
class Orchestrator {
  constructor(config, userManager) {
    this.config = config;
    this.userManager = userManager;
    this.sessions = [];
    this.isRunning = false;
  }

  createBrowserSessions() {
    const browserUsers = this.userManager.getBrowserUsers();
    logger.info(`Creating ${browserUsers.length} browser sessions...`);

    return browserUsers.map(user => {
      return new BrowserSession(user, this.config);
    });
  }

  createApiSessions() {
    const apiUsers = this.userManager.getApiUsers();
    logger.info(`Creating ${apiUsers.length} API sessions...`);

    return apiUsers.map(user => {
      return new ApiSession(user, this.config);
    });
  }

  async startAllSessions() {
    const browserSessions = this.createBrowserSessions();
    const apiSessions = this.createApiSessions();

    this.sessions = [...browserSessions, ...apiSessions];
    this.isRunning = true;

    logger.info(`Starting ${this.sessions.length} concurrent sessions...`);

    // Start all sessions in parallel
    const sessionPromises = this.sessions.map(session => {
      return session.start().catch(error => {
        logger.error('Session failed', { error: error.message });
      });
    });

    // Handle duration limit
    const duration = this.config.load_test.duration;
    if (duration > 0) {
      logger.info(`Load test will run for ${duration} seconds`);
      
      setTimeout(async () => {
        await this.stopAllSessions();
      }, duration * 1000);
    }

    // Wait for all sessions (or until stopped)
    await Promise.all(sessionPromises);
  }

  async stopAllSessions() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping all sessions...');
    this.isRunning = false;

    // Stop all sessions
    const stopPromises = this.sessions.map(session => {
      return session.stop().catch(error => {
        logger.error('Failed to stop session', { error: error.message });
      });
    });

    await Promise.all(stopPromises);
    logger.info('All sessions stopped');
  }

  getStats() {
    const userCount = this.userManager.getUserCount();
    return {
      totalSessions: this.sessions.length,
      browserSessions: userCount.browser,
      apiSessions: userCount.api,
      isRunning: this.isRunning
    };
  }
}

export default Orchestrator;
