import type { Page } from 'playwright';
import type { Logger } from '../utils/logger.js';
import { BasePage } from './base.page.js';
import { selectors } from '../config/selectors.js';
import { buildUrl, routes } from '../config/urls.js';
import { navigationDelay } from '../browser/delays.js';

export interface NewClientData {
  firstName: string;
  lastName: string;
  ssn: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  filingStatus?: string;
}

export class NewClientPage extends BasePage {
  constructor(page: Page, logger: Logger) {
    super(page, selectors.newClient, logger, 'NewClientPage');
  }

  /** Navigate to the new client form */
  async goto(): Promise<void> {
    this.logger.info('Navigating to new client form');
    await this.page.goto(buildUrl(routes.newClient), {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await navigationDelay();
  }

  /** Fill the entire client form with provided data */
  async fillClientForm(data: NewClientData): Promise<void> {
    this.logger.info('Filling new client form', {
      firstName: data.firstName,
      lastName: data.lastName,
    });

    const onPage = await this.isOnPage(this.selectors.form);
    if (!onPage) {
      await this.goto();
    }

    // Required fields
    await this.fillField(this.selectors.firstName, data.firstName);
    await this.humanDelay();

    await this.fillField(this.selectors.lastName, data.lastName);
    await this.humanDelay();

    await this.fillField(this.selectors.ssn, data.ssn);
    await this.humanDelay();

    // Optional fields
    if (data.dateOfBirth) {
      await this.fillField(this.selectors.dateOfBirth, data.dateOfBirth);
      await this.humanDelay();
    }

    if (data.phone) {
      await this.fillField(this.selectors.phone, data.phone);
      await this.humanDelay();
    }

    if (data.email) {
      await this.fillField(this.selectors.email, data.email);
      await this.humanDelay();
    }

    if (data.address) {
      await this.fillField(this.selectors.address, data.address);
      await this.humanDelay();
    }

    if (data.city) {
      await this.fillField(this.selectors.city, data.city);
      await this.humanDelay();
    }

    if (data.state) {
      await this.selectOption(this.selectors.state, data.state);
      await this.humanDelay();
    }

    if (data.zip) {
      await this.fillField(this.selectors.zip, data.zip);
      await this.humanDelay();
    }

    if (data.filingStatus) {
      await this.selectOption(this.selectors.filingStatus, data.filingStatus);
      await this.humanDelay();
    }

    this.logger.info('New client form filled');
  }

  /** Submit the new client form */
  async submit(): Promise<{ success: boolean; message: string }> {
    this.logger.info('Submitting new client form');

    await this.clickAndWait(this.selectors.submitButton);

    // Check for success or error
    const hasSuccess = await this.exists(this.selectors.successMessage);
    if (hasSuccess) {
      const message = await this.readField(this.selectors.successMessage);
      this.logger.info('New client created successfully', { message });
      return { success: true, message };
    }

    const hasError = await this.exists(this.selectors.errorMessage);
    if (hasError) {
      const message = await this.readField(this.selectors.errorMessage);
      this.logger.error('New client creation failed', { message });
      return { success: false, message };
    }

    // If no explicit message, check URL to determine outcome
    const url = this.page.url();
    if (!url.includes('new')) {
      return { success: true, message: 'Client created (redirected away from form)' };
    }

    return { success: false, message: 'Unknown result - no success or error message found' };
  }
}
