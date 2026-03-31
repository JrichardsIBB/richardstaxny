import type { Page } from 'playwright';
import type { Logger } from '../utils/logger.js';
import { BasePage } from './base.page.js';
import { selectors } from '../config/selectors.js';
import { buildUrl, routes } from '../config/urls.js';
import { navigationDelay } from '../browser/delays.js';

export interface ClientRow {
  name: string;
  ssn: string;
  status: string;
  link: string | null;
}

export class ClientListPage extends BasePage {
  constructor(page: Page, logger: Logger) {
    super(page, selectors.clientList, logger, 'ClientListPage');
  }

  /** Navigate to the client list */
  async goto(): Promise<void> {
    this.logger.info('Navigating to client list');
    await this.page.goto(buildUrl(routes.clients), {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await navigationDelay();
  }

  /** Search for a client by name, SSN, etc. */
  async searchClient(query: string): Promise<ClientRow[]> {
    this.logger.info('Searching for client', { query });

    // Ensure we're on the client list page
    const onPage = await this.isOnPage(this.selectors.container);
    if (!onPage) {
      await this.goto();
    }

    // Fill search and submit
    await this.fillField(this.selectors.searchInput, query);
    await this.humanDelay();

    // Try clicking search button if it exists, otherwise press Enter
    const hasSearchBtn = await this.exists(this.selectors.searchButton);
    if (hasSearchBtn) {
      await this.page.click(this.selectors.searchButton);
    } else {
      await this.page.press(this.selectors.searchInput, 'Enter');
    }

    await navigationDelay();

    return this.getClientList();
  }

  /** Scrape the client table rows */
  async getClientList(): Promise<ClientRow[]> {
    this.logger.info('Reading client list');

    const onPage = await this.isOnPage(this.selectors.container);
    if (!onPage) {
      await this.goto();
    }

    // Check for no results
    const noResults = await this.exists(this.selectors.noResults);
    if (noResults) {
      this.logger.info('No clients found');
      return [];
    }

    try {
      await this.page.waitForSelector(this.selectors.tableRows, { timeout: 10000 });
    } catch {
      this.logger.info('No client table rows found');
      return [];
    }

    const rows = await this.page.$$eval(
      this.selectors.tableRows,
      (trs) => {
        return trs.map(tr => {
          const cells = tr.querySelectorAll('td');
          const nameLink = cells[0]?.querySelector('a');
          return {
            name: cells[0]?.textContent?.trim() ?? '',
            ssn: cells[1]?.textContent?.trim() ?? '',
            status: cells[2]?.textContent?.trim() ?? '',
            link: nameLink?.getAttribute('href') ?? null,
          };
        });
      },
    );

    this.logger.info('Client list read', { count: rows.length });
    return rows;
  }

  /** Click the New Client button */
  async clickNewClient(): Promise<void> {
    this.logger.info('Clicking New Client button');
    await this.clickAndWait(this.selectors.newClientButton);
  }

  /** Navigate to a specific client by clicking their name link */
  async navigateToClient(name: string): Promise<boolean> {
    this.logger.info('Navigating to client', { name });

    const clients = await this.getClientList();
    const target = clients.find(c =>
      c.name.toLowerCase().includes(name.toLowerCase()),
    );

    if (!target) {
      this.logger.warn('Client not found', { name });
      return false;
    }

    if (target.link) {
      await this.page.goto(new URL(target.link, this.page.url()).href, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
    } else {
      // Try clicking the name text directly
      const rows = await this.page.$$(this.selectors.tableRows);
      for (const row of rows) {
        const text = await row.textContent();
        if (text?.toLowerCase().includes(name.toLowerCase())) {
          const link = await row.$(this.selectors.clientNameCell);
          if (link) {
            await link.click();
            await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
            break;
          }
        }
      }
    }

    await navigationDelay();
    this.logger.info('Navigated to client', { name });
    return true;
  }
}
