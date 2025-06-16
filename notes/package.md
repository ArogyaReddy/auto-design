```json
{
  "name": "auto-design",
  "version": "1.0.0",
  "description": "A professional tool to automatically generate Playwright/Cucumber tests from various sources.",
  "main": "run.js",
  "scripts": {
    "test": "npx playwright test",
    "codegen": "node run.js",
    "codegen:ui": "node run.js --ui",
    "playwright-to-code": "node run.js record --url 'https://online-iat.adp.com/signin/v1/?APPID=RUN&productId=7bf1242e-2ff0-e324-e053-37004b0bc98c' --name 'myFlow'",
    "jira-to-code": "node run.js text --file './examples/jira-story.txt' --name 'JiraPurchaseFlow'",
    "image-to-code": "node run.js image --path './examples/login-screenshot.png' --name 'ScreenshotLogin'",
    "text-to-code": "node run.js record --url 'https://online-iat.adp.com/signin/v1/?APPID=RUN&productId=7bf1242e-2ff0-e324-e053-37004b0bc98c' --name 'myFlow'"
  },
  "keywords": ["playwright", "cucumber", "codegen", "automation"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@cucumber/cucumber": "^10.8.0",
    "@playwright/test": "^1.44.1",
    "dotenv": "^16.5.0",
    "fs-extra": "^11.3.0",
    "handlebars": "^4.7.8",
    "ora": "^5.4.1",
    "playwright": "^1.44.1",
    "yargs": "^17.7.2"
  },
  "devDependencies": {
    "@cucumber/pretty-formatter": "^1.0.1"
  }
}
```
