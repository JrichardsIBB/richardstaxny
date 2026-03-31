import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { BrowserSession } from '../browser/session.js';
import type { Logger } from '../utils/logger.js';
import { LoginPage } from '../pages/login.page.js';
import { withRetry } from '../utils/retry.js';

export class AuthTools {
  private session: BrowserSession;
  private logger: Logger;

  constructor(session: BrowserSession, logger: Logger) {
    this.session = session;
    this.logger = logger;
  }

  /** Login to MyTAXPrepOffice */
  async login(args: { username: string; password: string }): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      const page = await this.session.getPage();
      const loginPage = new LoginPage(page, this.logger);

      const success = await withRetry(
        () => loginPage.login(args.username, args.password),
        this.logger,
        { operationName: 'login', maxRetries: 2 },
      );

      if (success) {
        await this.session.saveCookies();
      }

      this.logger.audit({
        tool: 'auth',
        action: 'login',
        success,
        durationMs: timer(),
      });

      return {
        content: [{
          type: 'text',
          text: success
            ? 'Successfully logged in to MyTAXPrepOffice.'
            : 'Login failed. Please check your credentials.',
        }],
        isError: !success,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'auth',
        action: 'login',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `Login error: ${msg}` }],
        isError: true,
      };
    }
  }

  /** Logout from MyTAXPrepOffice */
  async logout(): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      const page = await this.session.getPage();
      await page.goto('https://app.mytaxprepoffice.com/logout', {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      this.logger.audit({
        tool: 'auth',
        action: 'logout',
        success: true,
        durationMs: timer(),
      });

      return {
        content: [{ type: 'text', text: 'Successfully logged out.' }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'auth',
        action: 'logout',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `Logout error: ${msg}` }],
        isError: true,
      };
    }
  }

  /** Check current session health */
  async checkSession(): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      const health = await this.session.isHealthy();

      this.logger.audit({
        tool: 'auth',
        action: 'checkSession',
        success: true,
        durationMs: timer(),
        details: health as unknown as Record<string, unknown>,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            browserAlive: health.alive,
            authenticated: health.authenticated,
            status: health.authenticated ? 'active' : health.alive ? 'session_expired' : 'browser_closed',
          }, null, 2),
        }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'auth',
        action: 'checkSession',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `Session check error: ${msg}` }],
        isError: true,
      };
    }
  }
}
