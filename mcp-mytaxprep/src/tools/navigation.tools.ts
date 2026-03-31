import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { BrowserSession } from '../browser/session.js';
import type { Logger } from '../utils/logger.js';
import { buildUrl, routes, BASE_URL } from '../config/urls.js';
import { navigationDelay } from '../browser/delays.js';
import { selectors } from '../config/selectors.js';

/** Known screen names mapped to routes */
const SCREEN_ROUTES: Record<string, string> = {
  dashboard: routes.dashboard,
  clients: routes.clients,
  newClient: routes.newClient,
  returns: routes.returns,
  documents: routes.documents,
  settings: routes.settings,
  login: routes.login,
};

export class NavigationTools {
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

  /** Navigate to a named screen or URL */
  async navigateTo(args: { screen: string }): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      await this.ensureAuth();
      const page = await this.session.getPage();

      const route = SCREEN_ROUTES[args.screen];
      const url = route ? buildUrl(route) : args.screen;

      this.logger.info('Navigating to screen', { screen: args.screen, url });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await navigationDelay();

      const currentUrl = page.url();
      const title = await page.title();

      this.logger.audit({
        tool: 'navigation',
        action: 'navigateTo',
        success: true,
        durationMs: timer(),
        details: { screen: args.screen, url: currentUrl },
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ screen: args.screen, url: currentUrl, title }, null, 2),
        }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'navigation',
        action: 'navigateTo',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `Navigation error: ${msg}` }],
        isError: true,
      };
    }
  }

  /** Detect what screen the browser is currently on */
  async getCurrentScreen(): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      const page = await this.session.getPage();
      const url = page.url();
      const title = await page.title();

      // Determine screen from URL
      let screen = 'unknown';
      const path = url.replace(BASE_URL, '');

      if (path.includes('login')) screen = 'login';
      else if (path.includes('dashboard') || path === '/') screen = 'dashboard';
      else if (path.includes('clients/new')) screen = 'newClient';
      else if (path.includes('w2') || path.includes('W-2')) screen = 'w2Input';
      else if (path.match(/clients\/[^/]+\/info/)) screen = 'clientInfo';
      else if (path.match(/clients\/[^/]+/)) screen = 'clientDetail';
      else if (path.includes('clients')) screen = 'clientList';
      else if (path.includes('return')) screen = 'returns';
      else if (path.includes('document')) screen = 'documents';
      else if (path.includes('setting')) screen = 'settings';

      // Gather visible indicators
      const indicators: Record<string, boolean> = {};
      for (const [name, sel] of Object.entries({
        dashboard: selectors.dashboard.container,
        clientList: selectors.clientList.container,
        clientInfo: selectors.clientInfo.container,
        w2Form: selectors.w2Input.container,
        newClient: selectors.newClient.form,
      })) {
        indicators[name] = await page.$(sel).then(el => el !== null).catch(() => false);
      }

      this.logger.audit({
        tool: 'navigation',
        action: 'getCurrentScreen',
        success: true,
        durationMs: timer(),
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ screen, url, title, indicators }, null, 2),
        }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'navigation',
        action: 'getCurrentScreen',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `getCurrentScreen error: ${msg}` }],
        isError: true,
      };
    }
  }

  /** Take a screenshot of the current browser state */
  async takeScreenshot(): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      const page = await this.session.getPage();
      const buffer = await page.screenshot({ fullPage: false });
      const base64 = buffer.toString('base64');

      this.logger.audit({
        tool: 'navigation',
        action: 'takeScreenshot',
        success: true,
        durationMs: timer(),
        details: { sizeBytes: buffer.length },
      });

      return {
        content: [
          {
            type: 'image',
            data: base64,
            mimeType: 'image/png',
          },
          {
            type: 'text',
            text: `Screenshot captured (${buffer.length} bytes).`,
          },
        ],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'navigation',
        action: 'takeScreenshot',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `Screenshot error: ${msg}` }],
        isError: true,
      };
    }
  }
}
