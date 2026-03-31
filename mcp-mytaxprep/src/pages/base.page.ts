import type { Page } from 'playwright';
import type { Logger } from '../utils/logger.js';
import { humanDelay as humanDelayFn, clickDelay, getTypingSpeed, shortPause } from '../browser/delays.js';

/**
 * Base page class that all page objects extend.
 * Provides common interaction methods with human-speed delays.
 */
export class BasePage {
  protected page: Page;
  protected selectors: Record<string, string>;
  protected logger: Logger;
  protected pageName: string;

  constructor(
    page: Page,
    selectors: Record<string, string>,
    logger: Logger,
    pageName: string = 'BasePage',
  ) {
    this.page = page;
    this.selectors = selectors;
    this.logger = logger;
    this.pageName = pageName;
  }

  /** Fill a field: click, clear, then type with human delay */
  async fillField(selector: string, value: string): Promise<void> {
    this.logger.debug(`${this.pageName}: filling field`, { selector, valueLength: value.length });
    await clickDelay();
    await this.page.click(selector);
    await shortPause();
    // Triple-click to select all existing content, then type over
    await this.page.click(selector, { clickCount: 3 });
    await this.page.type(selector, value, { delay: getTypingSpeed() });
    this.logger.debug(`${this.pageName}: field filled`, { selector });
  }

  /** Read text content from an element */
  async readField(selector: string): Promise<string> {
    this.logger.debug(`${this.pageName}: reading field`, { selector });
    try {
      // Try input value first
      const tagName = await this.page.$eval(selector, el => el.tagName.toLowerCase());
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        const value = await this.page.inputValue(selector);
        return value.trim();
      }
      // Fall back to text content
      const text = await this.page.textContent(selector);
      return (text ?? '').trim();
    } catch (error) {
      this.logger.warn(`${this.pageName}: failed to read field`, {
        selector,
        error: error instanceof Error ? error.message : String(error),
      });
      return '';
    }
  }

  /** Click an element and wait for navigation */
  async clickAndWait(selector: string, waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle'): Promise<void> {
    this.logger.debug(`${this.pageName}: click and wait`, { selector });
    await clickDelay();
    await Promise.all([
      this.page.waitForNavigation({ waitUntil, timeout: 30000 }),
      this.page.click(selector),
    ]);
    await humanDelayFn();
  }

  /** Random human-speed delay */
  async humanDelay(): Promise<void> {
    await humanDelayFn();
  }

  /** Check if the page contains a specific indicator element */
  async isOnPage(indicatorSelector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(indicatorSelector, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Capture a screenshot of the current page state */
  async screenshot(name?: string): Promise<Buffer> {
    const filename = name ?? `${this.pageName}-${Date.now()}`;
    this.logger.debug(`${this.pageName}: taking screenshot`, { filename });
    const buffer = await this.page.screenshot({ fullPage: false });
    return buffer;
  }

  /** Wait for a selector to appear on the page */
  async waitFor(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  /** Check if an element exists on the page */
  async exists(selector: string): Promise<boolean> {
    const el = await this.page.$(selector);
    return el !== null;
  }

  /** Select a value from a dropdown */
  async selectOption(selector: string, value: string): Promise<void> {
    this.logger.debug(`${this.pageName}: selecting option`, { selector, value });
    await clickDelay();
    await this.page.selectOption(selector, value);
  }
}
