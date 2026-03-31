import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { BrowserSession } from '../browser/session.js';
import type { Logger } from '../utils/logger.js';
import { ClientListPage } from '../pages/client-list.page.js';
import { W2InputPage } from '../pages/w2-input.page.js';
import type { W2Data } from '../pages/w2-input.page.js';
import { withRetry } from '../utils/retry.js';
import { maskSSN } from '../utils/logger.js';
import { selectors } from '../config/selectors.js';
import { navigationDelay } from '../browser/delays.js';

export class TaxDataTools {
  private session: BrowserSession;
  private logger: Logger;

  constructor(session: BrowserSession, logger: Logger) {
    this.session = session;
    this.logger = logger;
  }

  private async ensureAuth(): Promise<void> {
    const ok = await this.session.ensureAuthenticated();
    if (!ok) {
      throw new Error('Not authenticated. Please login first.');
    }
  }

  /** Navigate to a client's W-2 input page */
  private async navigateToW2(clientName: string): Promise<W2InputPage> {
    const page = await this.session.getPage();
    const clientList = new ClientListPage(page, this.logger);

    const found = await clientList.navigateToClient(clientName);
    if (!found) {
      throw new Error(`Client "${clientName}" not found.`);
    }

    // Navigate to W-2 input within the client's forms
    // Look for a forms/income tab then W-2 link
    const formsTab = await page.$(selectors.clientInfo.formsTab);
    if (formsTab) {
      await formsTab.click();
      await navigationDelay();
    }

    // Look for a W-2 link or button
    const w2Link = await page.$('a[href*="w2"], a[href*="W-2"], button:has-text("W-2")');
    if (w2Link) {
      await w2Link.click();
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
      await navigationDelay();
    }

    return new W2InputPage(page, this.logger);
  }

  /** Input W-2 data for a client */
  async inputW2(args: { clientName: string; w2Data: W2Data }): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      await this.ensureAuth();

      const w2Page = await withRetry(
        () => this.navigateToW2(args.clientName),
        this.logger,
        { operationName: 'navigateToW2' },
      );

      await w2Page.fillW2(args.w2Data);
      const result = await w2Page.save();

      this.logger.audit({
        tool: 'taxData',
        action: 'inputW2',
        success: result.success,
        durationMs: timer(),
        details: { clientName: args.clientName },
      });

      return {
        content: [{
          type: 'text',
          text: result.success
            ? `W-2 data entered successfully for ${args.clientName}. ${result.message}`
            : `Failed to save W-2: ${result.message}`,
        }],
        isError: !result.success,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'taxData',
        action: 'inputW2',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `Input W-2 error: ${msg}` }],
        isError: true,
      };
    }
  }

  /** Read existing W-2 data for a client */
  async readW2(args: { clientName: string }): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      await this.ensureAuth();

      const w2Page = await withRetry(
        () => this.navigateToW2(args.clientName),
        this.logger,
        { operationName: 'navigateToW2ForRead' },
      );

      const data = await w2Page.readW2();

      // Mask SSN in output
      if (data.employeeSSN) {
        data.employeeSSN = maskSSN(data.employeeSSN);
      }

      this.logger.audit({
        tool: 'taxData',
        action: 'readW2',
        success: true,
        durationMs: timer(),
        details: { clientName: args.clientName, fieldsRead: Object.keys(data).length },
      });

      return {
        content: [{
          type: 'text',
          text: Object.keys(data).length > 0
            ? JSON.stringify(data, null, 2)
            : `No W-2 data found for ${args.clientName}.`,
        }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'taxData',
        action: 'readW2',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `Read W-2 error: ${msg}` }],
        isError: true,
      };
    }
  }
}
