import type { Page } from 'playwright';
import type { Logger } from '../utils/logger.js';
import { BasePage } from './base.page.js';
import { selectors } from '../config/selectors.js';

export interface W2Data {
  // Employer info
  employerEIN?: string;
  employerName?: string;
  employerAddress?: string;
  employerCity?: string;
  employerState?: string;
  employerZip?: string;
  // Employee info
  employeeSSN?: string;
  employeeName?: string;
  // W-2 boxes
  box1?: string;
  box2?: string;
  box3?: string;
  box4?: string;
  box5?: string;
  box6?: string;
  box7?: string;
  box8?: string;
  box10?: string;
  box11?: string;
  box12a?: string;
  box12b?: string;
  box12c?: string;
  box12d?: string;
  box13Statutory?: boolean;
  box13Retirement?: boolean;
  box13ThirdParty?: boolean;
  box14?: string;
  // State/local
  box15State?: string;
  box15StateID?: string;
  box16?: string;
  box17?: string;
  box18?: string;
  box19?: string;
  box20?: string;
}

/** Map of W2Data field names to selectors (excluding checkbox fields) */
const TEXT_FIELD_MAP: Record<string, string> = {
  employerEIN: selectors.w2Input.employerEIN,
  employerName: selectors.w2Input.employerName,
  employerAddress: selectors.w2Input.employerAddress,
  employerCity: selectors.w2Input.employerCity,
  employerZip: selectors.w2Input.employerZip,
  employeeSSN: selectors.w2Input.employeeSSN,
  employeeName: selectors.w2Input.employeeName,
  box1: selectors.w2Input.box1,
  box2: selectors.w2Input.box2,
  box3: selectors.w2Input.box3,
  box4: selectors.w2Input.box4,
  box5: selectors.w2Input.box5,
  box6: selectors.w2Input.box6,
  box7: selectors.w2Input.box7,
  box8: selectors.w2Input.box8,
  box10: selectors.w2Input.box10,
  box11: selectors.w2Input.box11,
  box12a: selectors.w2Input.box12a,
  box12b: selectors.w2Input.box12b,
  box12c: selectors.w2Input.box12c,
  box12d: selectors.w2Input.box12d,
  box14: selectors.w2Input.box14,
  box15StateID: selectors.w2Input.box15StateID,
  box16: selectors.w2Input.box16,
  box17: selectors.w2Input.box17,
  box18: selectors.w2Input.box18,
  box19: selectors.w2Input.box19,
  box20: selectors.w2Input.box20,
};

const SELECT_FIELDS: Record<string, string> = {
  employerState: selectors.w2Input.employerState,
  box15State: selectors.w2Input.box15State,
};

const CHECKBOX_FIELDS: Record<string, string> = {
  box13Statutory: selectors.w2Input.box13Statutory,
  box13Retirement: selectors.w2Input.box13Retirement,
  box13ThirdParty: selectors.w2Input.box13ThirdParty,
};

export class W2InputPage extends BasePage {
  constructor(page: Page, logger: Logger) {
    super(page, selectors.w2Input as unknown as Record<string, string>, logger, 'W2InputPage');
  }

  /** Fill all W-2 boxes with provided data */
  async fillW2(data: W2Data): Promise<void> {
    this.logger.info('Filling W-2 form');

    const onPage = await this.isOnPage(selectors.w2Input.container);
    if (!onPage) {
      this.logger.warn('Not on W-2 input page');
      throw new Error('Not on W-2 input page. Navigate there first.');
    }

    // Fill text fields
    for (const [field, selector] of Object.entries(TEXT_FIELD_MAP)) {
      const value = (data as Record<string, unknown>)[field];
      if (value !== undefined && value !== null && typeof value === 'string') {
        const exists = await this.exists(selector);
        if (exists) {
          await this.fillField(selector, value);
          await this.humanDelay();
        } else {
          this.logger.debug(`W-2 field not found on page: ${field}`);
        }
      }
    }

    // Fill select fields
    for (const [field, selector] of Object.entries(SELECT_FIELDS)) {
      const value = (data as Record<string, unknown>)[field];
      if (value !== undefined && typeof value === 'string') {
        const exists = await this.exists(selector);
        if (exists) {
          await this.selectOption(selector, value);
          await this.humanDelay();
        }
      }
    }

    // Handle checkboxes
    for (const [field, selector] of Object.entries(CHECKBOX_FIELDS)) {
      const value = (data as Record<string, unknown>)[field];
      if (typeof value === 'boolean') {
        const exists = await this.exists(selector);
        if (exists) {
          const isChecked = await this.page.isChecked(selector);
          if (value !== isChecked) {
            await this.page.click(selector);
            await this.humanDelay();
          }
        }
      }
    }

    this.logger.info('W-2 form filled');
  }

  /** Read all existing W-2 data from the form */
  async readW2(): Promise<W2Data> {
    this.logger.info('Reading W-2 data');

    const onPage = await this.isOnPage(selectors.w2Input.container);
    if (!onPage) {
      this.logger.warn('Not on W-2 input page');
      throw new Error('Not on W-2 input page. Navigate there first.');
    }

    const data: W2Data = {};

    // Read text fields
    for (const [field, selector] of Object.entries(TEXT_FIELD_MAP)) {
      try {
        const exists = await this.exists(selector);
        if (exists) {
          const value = await this.readField(selector);
          if (value) {
            (data as Record<string, unknown>)[field] = value;
          }
        }
      } catch {
        this.logger.debug(`Failed to read W-2 field: ${field}`);
      }
    }

    // Read select fields
    for (const [field, selector] of Object.entries(SELECT_FIELDS)) {
      try {
        const exists = await this.exists(selector);
        if (exists) {
          const value = await this.readField(selector);
          if (value) {
            (data as Record<string, unknown>)[field] = value;
          }
        }
      } catch {
        this.logger.debug(`Failed to read W-2 select: ${field}`);
      }
    }

    // Read checkboxes
    for (const [field, selector] of Object.entries(CHECKBOX_FIELDS)) {
      try {
        const exists = await this.exists(selector);
        if (exists) {
          (data as Record<string, unknown>)[field] = await this.page.isChecked(selector);
        }
      } catch {
        this.logger.debug(`Failed to read W-2 checkbox: ${field}`);
      }
    }

    this.logger.info('W-2 data read', {
      fieldsFound: Object.keys(data).length,
    });
    return data;
  }

  /** Save the W-2 form */
  async save(): Promise<{ success: boolean; message: string }> {
    this.logger.info('Saving W-2 form');

    await this.clickAndWait(selectors.w2Input.saveButton);

    const hasSuccess = await this.exists(selectors.w2Input.successMessage);
    if (hasSuccess) {
      const message = await this.readField(selectors.w2Input.successMessage);
      return { success: true, message };
    }

    const hasError = await this.exists(selectors.w2Input.errorMessage);
    if (hasError) {
      const message = await this.readField(selectors.w2Input.errorMessage);
      return { success: false, message };
    }

    return { success: true, message: 'W-2 saved' };
  }
}
