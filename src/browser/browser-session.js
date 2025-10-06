import { chromium } from 'playwright';
import logger from '../logger.js';
import { executeScenario, wait, getRandomDelay } from './scenarios.js';

/**
 * Manages a browser session for a single user
 */
class BrowserSession {
  constructor(user, config) {
    this.user = user;
    this.config = config;
    this.browser = null;
    this.page = null;
    this.isRunning = false;
  }

  encodeCredentials(username, password) {
    return Buffer.from(`${username}:${password}`).toString('base64');
  }

  async initialize() {
    try {
      this.browser = await chromium.launch({
        headless: this.config.browser.headless
      });

      this.page = await this.browser.newPage();
      
      // Set basic auth header for ServiceNow
      const authHeader = this.encodeCredentials(this.user.username, this.user.password);
      await this.page.setExtraHTTPHeaders({
        'Authorization': `Basic ${authHeader}`
      });

      logger.info(`Browser session initialized`, { user: this.user.username });
      return true;
    } catch (error) {
      logger.error(`Failed to initialize browser session`, { 
        user: this.user.username, 
        error: error.message 
      });
      return false;
    }
  }

  async login() {
    try {
      const loginUrl = `${this.config.servicenow.instance_url}/login.do`;
      await this.page.goto(loginUrl);
      
      // Fill login form if not using basic auth
      const usernameField = await this.page.$('#user_name');
      if (usernameField) {
        await this.page.fill('#user_name', this.user.username);
        await this.page.fill('#user_password', this.user.password);
        await this.page.click('#sysverb_login');
        await this.page.waitForNavigation({ waitUntil: 'networkidle' });
      }
      
      logger.action(this.user.username, 'LOGIN', { status: 'success' });
      return true;
    } catch (error) {
      logger.error(`Login failed`, { user: this.user.username, error: error.message });
      return false;
    }
  }

  async runScenarios() {
    const scenarios = this.config.browser.scenarios;
    const actionDelay = {
      min: this.config.browser.action_delay_min,
      max: this.config.browser.action_delay_max
    };

    let scenarioIndex = 0;

    while (this.isRunning) {
      const scenario = scenarios[scenarioIndex % scenarios.length];
      
      await executeScenario(
        this.page, 
        scenario, 
        this.config.servicenow.instance_url,
        this.user.username,
        actionDelay
      );

      scenarioIndex++;
    }
  }

  async start() {
    const initialized = await this.initialize();
    if (!initialized) {
      return;
    }

    const loggedIn = await this.login();
    if (!loggedIn) {
      await this.stop();
      return;
    }

    this.isRunning = true;
    logger.info(`Browser session started`, { user: this.user.username });

    // Run scenarios in loop
    await this.runScenarios();
  }

  async stop() {
    this.isRunning = false;
    
    if (this.page) {
      await this.page.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }
    
    logger.info(`Browser session stopped`, { user: this.user.username });
  }
}

export default BrowserSession;
