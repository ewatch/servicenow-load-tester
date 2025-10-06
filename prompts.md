# Project Setup 

I want to create a project, which sets up multiple users on a servicenow instance and then can be running for those users multiple simultanous headless browser sessions as well as multiple API requests in parallel.

I can image doing the the headless browsing with puppeteer or playwright and the API requests could be done with curl or the node fetch api. However I am open for proposals.

If you are not sure about any steps please ask before doing something.

Code Principles:

We prefer simple, clean, maintainable solutions over clever or complex ones.
Readabilty and maintalnablity are primary concerns
Self-documenting names and code
Small functions
Follow single responsiblity principle in classes and functions


Questions:
User Setup: When you say "sets up multiple users on a ServiceNow instance" - do you mean:

Creating/provisioning actual user accounts via ServiceNow API?
Or just managing/configuring a list of existing user credentials that the tool will use?
Project Language/Runtime: You mentioned Puppeteer/Playwright and Node fetch API. Should I assume:

Node.js/TypeScript as the primary runtime?
Would you prefer TypeScript over JavaScript for better type safety?
Concurrency Requirements:

How many simultaneous users/sessions do you anticipate? (helps with architecture decisions)
Should each user be able to run multiple browser sessions AND API requests simultaneously, or one of each at a time?
Browser Automation Choice:

Between Puppeteer and Playwright, do you have a preference? (Playwright is more modern with better debugging and multi-browser support)
Configuration:

How would you like to configure users and ServiceNow instance details? (JSON config file, environment variables, database?)
Output/Logging:

What kind of reporting/logging do you need? (Console logs, file logs, dashboard?)
Use Cases:

What will these sessions be doing? (Load testing, automated workflows, data extraction?) This helps me structure the project better.

Answers:
I mean creating/provisioning actual user accounts via ServiceNow API
JavaScript is fine for now
Make the amount of users to be created and used configurable. Each User should only run one browser session OR do API requests.
Then lets use playwright
JSON or YAML is fine
by default only log the actions
normal headless browser user should browse in a loop (i.e incident list, incdent form, system log and start again), API should execute long running calls. The goal is load testing