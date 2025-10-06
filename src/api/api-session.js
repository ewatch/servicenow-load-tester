import logger from '../logger.js';
import { executeApiCall, wait, getRandomDelay } from './api-calls.js';

/**
 * Manages API session for a single user making long-running API calls
 */
class ApiSession {
  constructor(user, config) {
    this.user = user;
    this.config = config;
    this.isRunning = false;
    this.authHeader = this.encodeCredentials(user.username, user.password);
    logger.debug(`API session created for user: ${user.username}`, { 
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });
  }

  encodeCredentials(username, password) {
    if (!password) {
      logger.warn(`No password provided for user`, { username });
    }
    return Buffer.from(`${username}:${password}`).toString('base64');
  }

  async runApiCalls() {
    const endpoints = this.config.api.endpoints;
    const callDelay = {
      min: this.config.api.call_delay_min,
      max: this.config.api.call_delay_max
    };

    let endpointIndex = 0;

    while (this.isRunning) {
      const endpoint = endpoints[endpointIndex % endpoints.length];
      
      await executeApiCall(
        endpoint,
        this.config.servicenow.instance_url,
        this.authHeader,
        this.user.username
      );

      // Wait before next call
      const delay = getRandomDelay(callDelay.min, callDelay.max);
      await wait(delay);

      endpointIndex++;
    }
  }

  async start() {
    this.isRunning = true;
    logger.info(`API session started`, { user: this.user.username });

    // Run API calls in loop
    await this.runApiCalls();
  }

  async stop() {
    this.isRunning = false;
    logger.info(`API session stopped`, { user: this.user.username });
  }
}

export default ApiSession;
