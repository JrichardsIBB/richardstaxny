import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Logger } from '../utils/logger.js';
import { selectors } from '../config/selectors.js';
import { BASE_URL, routes, buildUrl } from '../config/urls.js';
import { humanDelay, navigationDelay, getTypingSpeed } from './delays.js';

const COOKIES_DIR = join(process.cwd(), 'cookies');
const COOKIES_FILE = join(COOKIES_DIR, 'session.json');

export class BrowserSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private logger: Logger;
  private headless: boolean;

  constructor(logger: Logger, headless = false) {
    this.logger = logger;
    this.headless = headless;
  }

  /** Launch browser and restore session cookies if available */
  async launch(): Promise<void> {
    if (this.browser?.isConnected()) {
      this.logger.debug('Browser already running');
      return;
    }

    this.logger.info('Launching browser', { headless: this.headless });

    this.browser = await chromium.launch({
      headless: this.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
      ],
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });

    // Restore cookies if available
    await this.loadCookies();

    this.page = await this.context.newPage();
    this.logger.info('Browser launched and page created');
  }

  /** Get the current page instance, launching if needed */
  async getPage(): Promise<Page> {
    if (!this.page || this.page.isClosed()) {
      await this.launch();
    }
    return this.page!;
  }

  /** Save current cookies to disk */
  async saveCookies(): Promise<void> {
    if (!this.context) return;

    try {
      if (!existsSync(COOKIES_DIR)) {
        mkdirSync(COOKIES_DIR, { recursive: true });
      }
      const cookies = await this.context.cookies();
      writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
      this.logger.debug('Session cookies saved', { count: cookies.length });
    } catch (error) {
      this.logger.warn('Failed to save cookies', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Load cookies from disk into the browser context */
  private async loadCookies(): Promise<void> {
    if (!this.context) return;

    try {
      if (existsSync(COOKIES_FILE)) {
        const raw = readFileSync(COOKIES_FILE, 'utf-8');
        const cookies = JSON.parse(raw);
        await this.context.addCookies(cookies);
        this.logger.debug('Session cookies restored', { count: cookies.length });
      }
    } catch (error) {
      this.logger.warn('Failed to load cookies', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Check if the browser is alive and user is authenticated */
  async isHealthy(): Promise<{ alive: boolean; authenticated: boolean }> {
    const alive = this.browser?.isConnected() ?? false;
    if (!alive || !this.page || this.page.isClosed()) {
      return { alive: false, authenticated: false };
    }

    try {
      // Navigate to dashboard to check auth
      await this.page.goto(buildUrl(routes.dashboard), { waitUntil: 'domcontentloaded', timeout: 10000 });
      const url = this.page.url();

      // If redirected to login, not authenticated
      const authenticated = !url.includes('login');
      return { alive: true, authenticated };
    } catch {
      return { alive, authenticated: false };
    }
  }

  /** Login to MyTAXPrepOffice */
  async login(username: string, password: string): Promise<boolean> {
    const page = await this.getPage();

    try {
      this.logger.info('Navigating to login page');
      await page.goto(buildUrl(routes.login), { waitUntil: 'networkidle', timeout: 30000 });
      await humanDelay();

      // Fill username
      await page.click(selectors.login.usernameInput);
      await page.fill(selectors.login.usernameInput, '');
      await page.type(selectors.login.usernameInput, username, { delay: getTypingSpeed() });
      await humanDelay();

      // Fill password
      await page.click(selectors.login.passwordInput);
      await page.fill(selectors.login.passwordInput, '');
      await page.type(selectors.login.passwordInput, password, { delay: getTypingSpeed() });
      await humanDelay();

      // Submit
      await page.click(selectors.login.loginButton);
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
      await navigationDelay();

      // Check for login success
      const url = page.url();
      const success = !url.includes('login');

      if (success) {
        this.logger.info('Login successful');
        await this.saveCookies();
      } else {
        const errorText = await page.textContent(selectors.login.errorMessage).catch(() => 'Unknown error');
        this.logger.error('Login failed', { error: errorText });
      }

      return success;
    } catch (error) {
      this.logger.error('Login error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /** Auto re-login using environment credentials */
  async ensureAuthenticated(): Promise<boolean> {
    const health = await this.isHealthy();
    if (health.authenticated) return true;

    const username = process.env.MYTAXPREP_USERNAME;
    const password = process.env.MYTAXPREP_PASSWORD;

    if (!username || !password) {
      this.logger.error('Cannot auto-login: credentials not in environment');
      return false;
    }

    this.logger.info('Session expired, re-authenticating');
    return this.login(username, password);
  }

  /** Close the browser */
  async close(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      await this.saveCookies();
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.logger.info('Browser closed');
    }
  }
}
