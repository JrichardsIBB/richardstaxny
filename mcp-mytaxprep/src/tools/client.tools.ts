import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { BrowserSession } from '../browser/session.js';
import type { Logger } from '../utils/logger.js';
import { ClientListPage } from '../pages/client-list.page.js';
import { NewClientPage } from '../pages/new-client.page.js';
import type { NewClientData } from '../pages/new-client.page.js';
import { ClientInfoPage } from '../pages/client-info.page.js';
import { withRetry } from '../utils/retry.js';
import { maskSSN } from '../utils/logger.js';

export class ClientTools {
  private session: BrowserSession;
  private logger: Logger;

  constructor(session: BrowserSession, logger: Logger) {
    this.session = session;
    this.logger = logger;
  }

  /** Ensure we are authenticated before performing any action */
  private async ensureAuth(): Promise<void> {
    const ok = await this.session.ensureAuthenticated();
    if (!ok) {
      throw new Error('Not authenticated. Please login first.');
    }
  }

  /** Search for clients */
  async searchClient(args: { query: string }): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      await this.ensureAuth();
      const page = await this.session.getPage();
      const clientList = new ClientListPage(page, this.logger);

      const results = await withRetry(
        () => clientList.searchClient(args.query),
        this.logger,
        { operationName: 'searchClient' },
      );

      // Mask SSNs in results before returning
      const masked = results.map(r => ({
        ...r,
        ssn: maskSSN(r.ssn),
      }));

      this.logger.audit({
        tool: 'client',
        action: 'searchClient',
        success: true,
        durationMs: timer(),
        details: { query: args.query, resultCount: results.length },
      });

      return {
        content: [{
          type: 'text',
          text: results.length > 0
            ? JSON.stringify(masked, null, 2)
            : `No clients found matching "${args.query}".`,
        }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'client',
        action: 'searchClient',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `Search error: ${msg}` }],
        isError: true,
      };
    }
  }

  /** Create a new client */
  async createClient(args: NewClientData): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      await this.ensureAuth();
      const page = await this.session.getPage();
      const newClientPage = new NewClientPage(page, this.logger);

      await newClientPage.goto();
      await newClientPage.fillClientForm(args);
      const result = await newClientPage.submit();

      this.logger.audit({
        tool: 'client',
        action: 'createClient',
        success: result.success,
        durationMs: timer(),
        details: {
          firstName: args.firstName,
          lastName: args.lastName,
          ssn: args.ssn,
        },
      });

      return {
        content: [{
          type: 'text',
          text: result.success
            ? `Client ${args.firstName} ${args.lastName} created successfully. ${result.message}`
            : `Failed to create client: ${result.message}`,
        }],
        isError: !result.success,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'client',
        action: 'createClient',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `Create client error: ${msg}` }],
        isError: true,
      };
    }
  }

  /** Read a client's information sheet */
  async readClientInfo(args: { clientName: string }): Promise<CallToolResult> {
    const timer = this.logger.startTimer();

    try {
      await this.ensureAuth();
      const page = await this.session.getPage();

      // First navigate to the client
      const clientList = new ClientListPage(page, this.logger);
      const found = await clientList.navigateToClient(args.clientName);

      if (!found) {
        this.logger.audit({
          tool: 'client',
          action: 'readClientInfo',
          success: false,
          durationMs: timer(),
          details: { clientName: args.clientName, reason: 'not_found' },
        });
        return {
          content: [{ type: 'text', text: `Client "${args.clientName}" not found.` }],
          isError: true,
        };
      }

      // Read client info
      const clientInfo = new ClientInfoPage(page, this.logger);
      const data = await withRetry(
        () => clientInfo.readAllFields(),
        this.logger,
        { operationName: 'readClientInfo' },
      );

      // Mask SSN in output
      const masked = { ...data };
      if (masked.ssn) masked.ssn = maskSSN(masked.ssn);
      if (masked.spouseSSN) masked.spouseSSN = maskSSN(masked.spouseSSN);

      this.logger.audit({
        tool: 'client',
        action: 'readClientInfo',
        success: true,
        durationMs: timer(),
        details: { clientName: args.clientName, fieldsRead: Object.keys(data).length },
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(masked, null, 2),
        }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.audit({
        tool: 'client',
        action: 'readClientInfo',
        success: false,
        durationMs: timer(),
        details: { error: msg },
      });
      return {
        content: [{ type: 'text', text: `Read client info error: ${msg}` }],
        isError: true,
      };
    }
  }
}
