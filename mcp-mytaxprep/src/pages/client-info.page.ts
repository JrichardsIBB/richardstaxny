import type { Page } from 'playwright';
import type { Logger } from '../utils/logger.js';
import { BasePage } from './base.page.js';
import { selectors } from '../config/selectors.js';
import { navigationDelay } from '../browser/delays.js';

export interface ClientInfoData {
  firstName?: string;
  lastName?: string;
  ssn?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  filingStatus?: string;
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseSSN?: string;
}

/** Field name to selector mapping */
const FIELD_MAP: Record<keyof ClientInfoData, string> = {
  firstName: selectors.clientInfo.firstName,
  lastName: selectors.clientInfo.lastName,
  ssn: selectors.clientInfo.ssn,
  dateOfBirth: selectors.clientInfo.dateOfBirth,
  phone: selectors.clientInfo.phone,
  email: selectors.clientInfo.email,
  address: selectors.clientInfo.address,
  city: selectors.clientInfo.city,
  state: selectors.clientInfo.state,
  zip: selectors.clientInfo.zip,
  filingStatus: selectors.clientInfo.filingStatus,
  spouseFirstName: selectors.clientInfo.spouseFirstName,
  spouseLastName: selectors.clientInfo.spouseLastName,
  spouseSSN: selectors.clientInfo.spouseSSN,
};

export class ClientInfoPage extends BasePage {
  constructor(page: Page, logger: Logger) {
    super(page, selectors.clientInfo as unknown as Record<string, string>, logger, 'ClientInfoPage');
  }

  /** Read all client information fields from the current page */
  async readAllFields(): Promise<ClientInfoData> {
    this.logger.info('Reading all client info fields');

    const onPage = await this.isOnPage(selectors.clientInfo.container);
    if (!onPage) {
      this.logger.warn('Not on client info page');
      return {};
    }

    const data: ClientInfoData = {};

    for (const [fieldName, selector] of Object.entries(FIELD_MAP)) {
      try {
        const exists = await this.exists(selector);
        if (exists) {
          const value = await this.readField(selector);
          if (value) {
            (data as Record<string, string>)[fieldName] = value;
          }
        }
      } catch {
        this.logger.debug(`Failed to read field: ${fieldName}`);
      }
    }

    this.logger.info('Client info read', {
      fieldsFound: Object.keys(data).length,
    });
    return data;
  }

  /** Update a specific field on the client info page */
  async updateField(fieldName: keyof ClientInfoData, value: string): Promise<boolean> {
    this.logger.info('Updating client info field', { fieldName });

    const selector = FIELD_MAP[fieldName];
    if (!selector) {
      this.logger.error('Unknown field name', { fieldName });
      return false;
    }

    const exists = await this.exists(selector);
    if (!exists) {
      this.logger.error('Field not found on page', { fieldName, selector });
      return false;
    }

    // Check if we need to click edit first
    const editBtn = await this.page.$(selectors.clientInfo.editButton);
    if (editBtn) {
      await editBtn.click();
      await this.humanDelay();
    }

    // Determine if it's a select or input
    if (fieldName === 'state' || fieldName === 'filingStatus') {
      await this.selectOption(selector, value);
    } else {
      await this.fillField(selector, value);
    }

    await this.humanDelay();
    return true;
  }

  /** Save changes by clicking the save button */
  async save(): Promise<boolean> {
    this.logger.info('Saving client info changes');

    try {
      await this.clickAndWait(selectors.clientInfo.saveButton);
      await navigationDelay();
      return true;
    } catch (error) {
      this.logger.error('Failed to save client info', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /** Get the client header/name displayed on the page */
  async getClientHeader(): Promise<string> {
    return this.readField(selectors.clientInfo.header);
  }
}
