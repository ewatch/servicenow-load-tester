import logger from '../logger.js';

/**
 * Utility functions for API calls
 */

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildUrl(baseUrl, path, queryParams) {
  const url = new URL(path, baseUrl);
  
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  return url.toString();
}

async function executeApiCall(endpoint, instanceUrl, authHeader, userId) {
  const url = buildUrl(instanceUrl, endpoint.path, endpoint.query_params);
  
  try {
    logger.action(userId, 'API_CALL', { 
      endpoint: endpoint.name, 
      method: endpoint.method,
      path: endpoint.path 
    });
    
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const recordCount = data.result ? data.result.length : 0;
    
    logger.action(userId, 'API_RESPONSE', { 
      endpoint: endpoint.name,
      status: response.status,
      duration: `${duration}ms`,
      records: recordCount
    });

    return { success: true, duration, recordCount };
  } catch (error) {
    logger.error(`API call failed for user ${userId}`, { 
      endpoint: endpoint.name,
      error: error.message 
    });
    return { success: false, error: error.message };
  }
}

export { getRandomDelay, wait, buildUrl, executeApiCall };
