import fs from 'fs';
import yaml from 'js-yaml';
import logger from './src/logger.js';
import UserProvisioner from './src/users/user-provisioner.js';
import UserManager from './src/users/user-manager.js';
import Orchestrator from './src/orchestrator.js';

/**
 * Main entry point for ServiceNow Load Tester
 */

async function loadConfig(configPath = './config/config.yaml') {
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents);
    return config;
  } catch (error) {
    logger.error('Failed to load configuration', { error: error.message });
    process.exit(1);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ServiceNow Load Tester');
  console.log('='.repeat(60));

  // Load configuration
  const config = await loadConfig();
  logger.setLevel(config.logging.level);

  logger.info('Configuration loaded successfully');
  logger.info('Instance URL', { url: config.servicenow.instance_url });
  logger.info('Test configuration', {
    totalUsers: config.load_test.total_users,
    browserUsers: config.load_test.browser_users,
    apiUsers: config.load_test.total_users - config.load_test.browser_users,
    duration: config.load_test.duration === 0 ? 'indefinite' : `${config.load_test.duration}s`
  });

  // Provision users
  logger.info('Starting user provisioning...');
  const provisioner = new UserProvisioner(
    config.servicenow.instance_url,
    config.servicenow.admin
  );

  let users;
  try {
    users = await provisioner.provisionUsers(
      config.load_test.total_users,
      config.load_test.user_prefix
    );
  } catch (error) {
    logger.error('User provisioning failed', { error: error.message });
    process.exit(1);
  }

  // Distribute users between browser and API sessions
  const userManager = new UserManager(users);
  userManager.distributeUsers(config.load_test.browser_users);

  const userCount = userManager.getUserCount();
  logger.info('Users distributed', userCount);

  // Create orchestrator
  const orchestrator = new Orchestrator(config, userManager);

  // Handle graceful shutdown
  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    logger.info('\nShutdown signal received, stopping load test...');
    await orchestrator.stopAllSessions();

    // Cleanup users
    logger.info('Cleaning up test users...');
    await provisioner.cleanupUsers(users);

    logger.info('Load test completed');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start load test
  console.log('\n' + '='.repeat(60));
  logger.info('Starting load test...');
  console.log('='.repeat(60) + '\n');

  try {
    await orchestrator.startAllSessions();
    
    // Test completed normally - cleanup
    if (!isShuttingDown) {
      logger.info('Load test duration completed');
      await shutdown();
    }
  } catch (error) {
    logger.error('Load test failed', { error: error.message });
    await shutdown();
  }
}

// Run the load tester
main().catch(error => {
  logger.error('Fatal error', { error: error.message });
  process.exit(1);
});
