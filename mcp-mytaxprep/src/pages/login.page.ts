import type { Page } from 'playwright';
import type { Logger } from '../utils/logger.js';
import { BasePage } from './base.page.js';
import { selectors } from '../config/selectors.js';
import { buildUrl, routes } from '../config/urls.js';
import { getTypingSpeed } from '../browser/delays.js';

export class LoginPage extends BasePage {
  constructor(page: Page, logger: Logger) {
    super(page, selectors.login, logger, 'LoginPage');
  }

  /** Navigate to the login page */
  async goto(): Promise<void> {
    this.logger.info('Navigating to login page');
    await this.page.goto(buildUrl(routes.login), {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await this.humanDelay();
  }

  /** Perform login with username and password */
  async login(username: string, password: string): Promise<boolean> {
    this.logger.info('Attempting login');

    await this.goto();

    // Fill username
    await this.fillField(this.selectors.usernameInput, username);
    await this.humanDelay();

    // Fill password
    await this.page.click(this.selectors.passwordInput);
    await this.page.fill(this.selectors.passwordInput, '');
    await this.page.type(this.selectors.passwordInput, password, {
      delay: getTypingSpeed(),
    });
    await this.humanDelay();

    // Submit
    await this.clickAndWait(this.selectors.loginButton);

    const loggedIn = await this.isLoggedIn();
    if (loggedIn) {
      this.logger.info('Login successful');
    } else {
      const errorMsg = await this.getErrorMessage();
      this.logger.error('Login failed', { error: errorMsg });
    }

    return loggedIn;
  }

  /** Check if user is currently logged in by looking for dashboard elements */
  async isLoggedIn(): Promise<boolean> {
    try {
      const url = this.page.url();
      if (url.includes('login')) return false;

      // Check for dashboard or user menu elements
      const hasDashboard = await this.exists(selectors.dashboard.container);
      const hasUserMenu = await this.exists(selectors.dashboard.userMenu);
      return hasDashboard || hasUserMenu;
    } catch {
      return false;
    }
  }

  /** Get the error message shown on the login page */
  async getErrorMessage(): Promise<string> {
    try {
      return await this.readField(this.selectors.errorMessage);
    } catch {
      return '';
    }
  }
}
