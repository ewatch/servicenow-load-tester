# ServiceNow Load Tester

A Node.js-based load testing tool for ServiceNow instances that supports both browser automation and API testing with multiple concurrent users.

## Features

- **User Provisioning**: Automatically creates test users on ServiceNow via REST API
- **Browser Automation**: Simulates real user interactions using Playwright (headless Chrome)
- **API Load Testing**: Executes parallel API requests for performance testing
- **Configurable Scenarios**: Define custom browsing paths and API endpoints
- **Parallel Sessions**: Run multiple concurrent user sessions simultaneously
- **Clean Architecture**: Modular, maintainable code following SOLID principles

## Prerequisites

- Node.js (v16 or higher)
- Access to a ServiceNow instance with admin credentials
- Network connectivity to the ServiceNow instance
- **Important**: Custom Scripted REST API must be installed on ServiceNow for password management (see Setup below)

## Setup

### 1. Install Dependencies

1. Clone or download this project
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

4. Install Playwright browsers:

```bash
npx playwright install chromium
```

### 2. ServiceNow Configuration

**⚠️ CRITICAL**: You must create a custom Scripted REST API in ServiceNow to enable password setting for test users.

See **[SETUP_SERVICENOW.md](./SETUP_SERVICENOW.md)** for detailed instructions.

**Quick Summary:**
1. Navigate to **System Web Services > Scripted REST APIs** in ServiceNow
2. Create a new REST API named "LoadTest User Management"
3. Add a POST resource at `/set_password` with the provided script
4. This enables the load tester to set passwords for created users

Without this API, users will be created but won't have passwords set, causing 401 Unauthorized errors.

## Configuration

Edit `config/config.yaml` to configure your load test:

### ServiceNow Instance

```yaml
servicenow:
  instance_url: "https://your-instance.service-now.com"
  admin:
    username: "admin"
    password: "admin_password"
```

### Load Test Parameters

```yaml
load_test:
  total_users: 10          # Total number of test users to create
  browser_users: 5         # Number of browser-based users (rest will be API users)
  user_prefix: "loadtest_user"  # Prefix for created usernames
  duration: 300            # Test duration in seconds (0 = run indefinitely)
```

### Browser Configuration

```yaml
browser:
  headless: true           # Run browsers in headless mode
  action_delay_min: 1000   # Minimum delay between actions (ms)
  action_delay_max: 3000   # Maximum delay between actions (ms)
  
  scenarios:               # Define browsing scenarios
    - name: "incident_list"
      path: "/now/nav/ui/classic/params/target/incident_list.do"
      wait_for: "table"
    - name: "incident_form"
      path: "/now/nav/ui/classic/params/target/incident.do"
      wait_for: "form"
```

### API Configuration

```yaml
api:
  endpoints:               # Define API endpoints to test
    - name: "incident_query"
      path: "/api/now/table/incident"
      method: "GET"
      query_params:
        sysparm_limit: 1000
        sysparm_query: "active=true"
  
  call_delay_min: 2000     # Minimum delay between API calls (ms)
  call_delay_max: 5000     # Maximum delay between API calls (ms)
```

## Usage

### Start Load Test

```bash
npm start
```

### Stop Load Test

Press `Ctrl+C` to gracefully stop the test. The tool will:
1. Stop all active sessions
2. Clean up (delete) test users from ServiceNow
3. Exit

## Project Structure

```
servicenow-load-tester/
├── config/
│   └── config.yaml              # Configuration file
├── src/
│   ├── users/
│   │   ├── user-provisioner.js  # Creates/deletes users via ServiceNow API
│   │   └── user-manager.js      # Manages user distribution
│   ├── browser/
│   │   ├── browser-session.js   # Manages Playwright browser sessions
│   │   └── scenarios.js         # Browser scenario utilities
│   ├── api/
│   │   ├── api-session.js       # Manages API request sessions
│   │   └── api-calls.js         # API call utilities
│   ├── orchestrator.js          # Coordinates all sessions
│   └── logger.js                # Logging utility
├── index.js                     # Main entry point
├── package.json
└── README.md
```

## How It Works

1. **User Provisioning**: The tool creates the specified number of test users on your ServiceNow instance
2. **User Distribution**: Users are distributed between browser and API sessions based on configuration
3. **Parallel Execution**:
   - Browser users continuously loop through defined scenarios (incident list → form → logs)
   - API users execute long-running queries in a loop
4. **Graceful Shutdown**: On exit, all sessions are stopped and test users are cleaned up

## Architecture Principles

This project follows clean code principles:

- **Single Responsibility**: Each class/module has one clear purpose
- **Small Functions**: Functions are focused and easy to understand
- **Self-Documenting**: Clear naming conventions reduce need for comments
- **Modularity**: Easy to extend with new scenarios or session types
- **Error Handling**: Comprehensive error handling and logging

## Logging

The tool logs all actions by default:

```
[2025-10-05T10:30:45.123Z] [INFO] User loadtest_user1 - NAVIGATE | {"url":"https://..."}
[2025-10-05T10:30:46.456Z] [INFO] User loadtest_user1 - PAGE_LOADED | {"url":"https://..."}
[2025-10-05T10:30:47.789Z] [INFO] User loadtest_user6 - API_CALL | {"endpoint":"incident_query"}
```

Configure logging level in `config/config.yaml`:

```yaml
logging:
  level: "info"  # Options: debug, info, warn, error
```

## Customization

### Adding New Browser Scenarios

Add to `config/config.yaml`:

```yaml
browser:
  scenarios:
    - name: "your_scenario"
      path: "/your/path"
      wait_for: "selector"  # Optional CSS selector to wait for
```

### Adding New API Endpoints

Add to `config/config.yaml`:

```yaml
api:
  endpoints:
    - name: "your_endpoint"
      path: "/api/now/table/your_table"
      method: "GET"
      query_params:
        your_param: "value"
```

## Troubleshooting

### Browser Sessions Not Starting

- Check that Playwright browsers are installed: `npx playwright install chromium`
- Verify ServiceNow instance URL is correct
- Check user credentials are valid

### API Calls Failing

- Verify admin credentials have proper API access
- Check ServiceNow instance is accessible
- Review API endpoint paths and query parameters

### User Provisioning Fails

- Ensure admin account has user creation permissions
- Check for existing users with same prefix
- Verify network connectivity to ServiceNow

## License

ISC

## Contributing

This is a simple, focused tool following clean code principles. Contributions that maintain code quality and simplicity are welcome.
