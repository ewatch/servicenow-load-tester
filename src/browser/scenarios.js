import logger from '../logger.js';

/**
 * Utility functions for browser scenarios
 */

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function navigateToPage(page, url, waitForSelector, userId) {
  try {
    logger.action(userId, 'NAVIGATE', { url });
    await page.goto(url, { waitUntil: 'networkidle' });
    
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }
    
    logger.action(userId, 'PAGE_LOADED', { url });
    return true;
  } catch (error) {
    logger.error(`Navigation failed for user ${userId}`, { url, error: error.message });
    return false;
  }
}

async function executeScenario(page, scenario, instanceUrl, userId, actionDelay) {
  const fullUrl = `${instanceUrl}${scenario.path}`;
  const success = await navigateToPage(page, fullUrl, scenario.wait_for, userId);
  
  if (success) {
    const delay = getRandomDelay(actionDelay.min, actionDelay.max);
    await wait(delay);
  }
  
  return success;
}

export { getRandomDelay, wait, navigateToPage, executeScenario };
