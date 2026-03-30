/**
 * IRS Information Search API
 * Searches the IRS database for forms, instructions, and tax info
 * Uses the IRS public API and form data
 */

// Comprehensive IRS forms database
export const IRS_FORMS = {
  'w-2': {
    name: 'Form W-2',
    title: 'Wage and Tax Statement',
    description: 'Reports wages paid to employees and taxes withheld. Employers must send W-2s to employees by January 31st.',
    url: 'https://www.irs.gov/forms-pubs/about-form-w-2',
    instructions: 'https://www.irs.gov/instructions/iw2w3',
    who_files: 'Employers issue to employees',
    deadline: 'January 31 (to employees); February 28/March 31 (to SSA)',
    key_boxes: 'Box 1: Wages; Box 2: Federal tax withheld; Box 3: Social Security wages; Box 4: SS tax withheld; Box 5: Medicare wages',
  },
  '1040': {
    name: 'Form 1040',
    title: 'U.S. Individual Income Tax Return',
    description: 'The main form used by individuals to file their annual income tax return. All U.S. taxpayers use this form.',
    url: 'https://www.irs.gov/forms-pubs/about-form-1040',
    instructions: 'https://www.irs.gov/instructions/i1040gi',
    who_files: 'All individual taxpayers',
    deadline: 'April 15 (or next business day)',
    key_boxes: 'Lines 1-8: Income; Line 11: AGI; Line 15: Taxable income; Line 24: Total tax; Line 34: Refund',
  },
  '1099-nec': {
    name: 'Form 1099-NEC',
    title: 'Nonemployee Compensation',
    description: 'Reports payments of $600 or more to independent contractors and freelancers. Replaced Box 7 of the old 1099-MISC for nonemployee compensation.',
    url: 'https://www.irs.gov/forms-pubs/about-form-1099-nec',
    instructions: 'https://www.irs.gov/instructions/i1099mec',
    who_files: 'Businesses paying independent contractors $600+',
    deadline: 'January 31',
    key_boxes: 'Box 1: Nonemployee compensation; Box 4: Federal income tax withheld',
  },
  '1099-int': {
    name: 'Form 1099-INT',
    title: 'Interest Income',
    description: 'Reports interest income of $10 or more from banks, brokerages, and other financial institutions.',
    url: 'https://www.irs.gov/forms-pubs/about-form-1099-int',
    instructions: 'https://www.irs.gov/instructions/i1099int',
    who_files: 'Banks and financial institutions',
    deadline: 'January 31 (to recipients); February 28 (to IRS)',
    key_boxes: 'Box 1: Interest income; Box 3: Interest on U.S. savings bonds; Box 4: Federal tax withheld',
  },
  '1099-div': {
    name: 'Form 1099-DIV',
    title: 'Dividends and Distributions',
    description: 'Reports dividend income of $10 or more from stocks, mutual funds, and other investments.',
    url: 'https://www.irs.gov/forms-pubs/about-form-1099-div',
    instructions: 'https://www.irs.gov/instructions/i1099div',
    who_files: 'Brokerages and mutual fund companies',
    deadline: 'January 31 (to recipients); February 28 (to IRS)',
    key_boxes: 'Box 1a: Ordinary dividends; Box 1b: Qualified dividends; Box 2a: Capital gain distributions',
  },
  '1099-misc': {
    name: 'Form 1099-MISC',
    title: 'Miscellaneous Income',
    description: 'Reports miscellaneous income including rents, royalties, prizes, awards, and other income payments of $600+.',
    url: 'https://www.irs.gov/forms-pubs/about-form-1099-misc',
    instructions: 'https://www.irs.gov/instructions/i1099msc',
    who_files: 'Businesses making qualifying payments',
    deadline: 'January 31 (to recipients); February 28 (to IRS)',
    key_boxes: 'Box 1: Rents; Box 2: Royalties; Box 3: Other income; Box 10: Crop insurance proceeds',
  },
  '1098': {
    name: 'Form 1098',
    title: 'Mortgage Interest Statement',
    description: 'Reports mortgage interest of $600 or more paid during the year. Used to claim the mortgage interest deduction.',
    url: 'https://www.irs.gov/forms-pubs/about-form-1098',
    instructions: 'https://www.irs.gov/instructions/i1098',
    who_files: 'Mortgage lenders',
    deadline: 'January 31',
    key_boxes: 'Box 1: Mortgage interest received; Box 2: Outstanding mortgage principal; Box 5: Mortgage insurance premiums',
  },
  '1095-a': {
    name: 'Form 1095-A',
    title: 'Health Insurance Marketplace Statement',
    description: 'Provided by the Health Insurance Marketplace if you enrolled in coverage. Needed to reconcile premium tax credits.',
    url: 'https://www.irs.gov/forms-pubs/about-form-1095-a',
    who_files: 'Health Insurance Marketplace',
    deadline: 'January 31',
    key_boxes: 'Column A: Monthly enrollment premiums; Column B: Monthly SLCSP premium; Column C: Monthly advance payment of PTC',
  },
  '4868': {
    name: 'Form 4868',
    title: 'Application for Automatic Extension of Time',
    description: 'Grants an automatic 6-month extension to file your individual income tax return. Does NOT extend the time to pay.',
    url: 'https://www.irs.gov/forms-pubs/about-form-4868',
    who_files: 'Individual taxpayers needing more time',
    deadline: 'April 15 (extends filing to October 15)',
    key_boxes: 'Line 4: Estimated total tax liability; Line 5: Total payments; Line 6: Balance due',
  },
  'schedule-c': {
    name: 'Schedule C',
    title: 'Profit or Loss From Business (Sole Proprietorship)',
    description: 'Used by self-employed individuals and sole proprietors to report business income and expenses.',
    url: 'https://www.irs.gov/forms-pubs/about-schedule-c-form-1040',
    instructions: 'https://www.irs.gov/instructions/i1040sc',
    who_files: 'Sole proprietors and single-member LLCs',
    deadline: 'April 15 (filed with Form 1040)',
    key_boxes: 'Line 1: Gross receipts; Line 28: Total expenses; Line 31: Net profit or loss',
  },
  'schedule-se': {
    name: 'Schedule SE',
    title: 'Self-Employment Tax',
    description: 'Calculates self-employment tax (Social Security and Medicare) for people who work for themselves.',
    url: 'https://www.irs.gov/forms-pubs/about-schedule-se-form-1040',
    who_files: 'Self-employed individuals with net earnings of $400+',
    deadline: 'April 15 (filed with Form 1040)',
    key_boxes: 'Line 4: Net self-employment earnings; Line 12: Self-employment tax',
  },
  '941': {
    name: 'Form 941',
    title: "Employer's Quarterly Federal Tax Return",
    description: 'Reports income taxes, Social Security tax, and Medicare tax withheld from employees, plus employer share.',
    url: 'https://www.irs.gov/forms-pubs/about-form-941',
    who_files: 'Employers who pay wages',
    deadline: 'Last day of month following quarter end (April 30, July 31, October 31, January 31)',
    key_boxes: 'Line 2: Wages paid; Line 3: Federal income tax withheld; Line 5a: Taxable Social Security wages',
  },
  '1120-s': {
    name: 'Form 1120-S',
    title: 'U.S. Income Tax Return for an S Corporation',
    description: 'Annual tax return for S corporations. Income passes through to shareholders via Schedule K-1.',
    url: 'https://www.irs.gov/forms-pubs/about-form-1120-s',
    who_files: 'S corporations',
    deadline: 'March 15 (or 15th day of 3rd month after fiscal year end)',
    key_boxes: 'Line 1: Gross receipts; Line 21: Ordinary business income; Schedule K-1: Shareholder distributions',
  },
  '1065': {
    name: 'Form 1065',
    title: 'U.S. Return of Partnership Income',
    description: 'Annual information return for partnerships. Income passes through to partners via Schedule K-1.',
    url: 'https://www.irs.gov/forms-pubs/about-form-1065',
    who_files: 'Partnerships and multi-member LLCs',
    deadline: 'March 15',
    key_boxes: 'Line 1: Gross receipts; Line 22: Ordinary business income; Schedule K-1: Partner distributions',
  },
  'schedule-k1': {
    name: 'Schedule K-1',
    title: "Partner's/Shareholder's Share of Income",
    description: 'Reports each partner/shareholder share of income, deductions, and credits from a partnership, S corp, or trust.',
    url: 'https://www.irs.gov/forms-pubs/about-schedule-k-1-form-1065',
    who_files: 'Partnerships, S corps, trusts issue to owners',
    deadline: 'March 15 (partnerships/S corps); April 15 (trusts)',
    key_boxes: 'Box 1: Ordinary business income; Box 2: Net rental income; Box 14: Self-employment earnings',
  },
};

// IRS processes and procedures
export const IRS_PROCESSES = {
  'file taxes': {
    title: 'How to File Your Tax Return',
    steps: [
      'Gather all income documents (W-2s, 1099s, etc.)',
      'Choose your filing status (Single, MFJ, MFS, HoH, QSS)',
      'Decide standard deduction vs. itemizing',
      'Complete Form 1040 (or use tax prep software/service)',
      'Review for accuracy and sign',
      'E-file or mail by April 15th deadline',
      'Pay any tax owed or wait for refund',
    ],
    url: 'https://www.irs.gov/filing',
  },
  'check refund': {
    title: 'Check Your Refund Status',
    steps: [
      'Wait at least 24 hours after e-filing (4 weeks if mailed)',
      'Go to irs.gov/refunds or use the IRS2Go app',
      "Enter your SSN, filing status, and exact refund amount",
      'Status updates once per day, usually overnight',
      'Most refunds issued within 21 days of e-filing',
    ],
    url: 'https://www.irs.gov/refunds',
  },
  'get transcript': {
    title: 'Get Your Tax Transcript',
    steps: [
      'Go to irs.gov/individuals/get-transcript',
      'Choose Online or By Mail',
      'For online: create/login to ID.me account',
      'Select transcript type: Return, Account, Wage & Income, etc.',
      'Select the tax year you need',
    ],
    url: 'https://www.irs.gov/individuals/get-transcript',
  },
  'payment plan': {
    title: 'Set Up an IRS Payment Plan',
    steps: [
      'Determine how much you owe (check IRS notice or account)',
      'Go to irs.gov/payments/online-payment-agreement-application',
      'Choose plan type: Short-term (120 days) or Long-term (installment)',
      'Short-term: no setup fee; Long-term: $31-$107 setup fee',
      'Apply online, by phone (800-829-1040), or mail Form 9465',
      'Set up direct debit for lowest fees',
    ],
    url: 'https://www.irs.gov/payments/online-payment-agreement-application',
  },
  'amended return': {
    title: 'File an Amended Return (Form 1040-X)',
    steps: [
      'Wait for original return to be processed first',
      'Gather correct information and documents',
      'Complete Form 1040-X (can now e-file)',
      'Explain changes on Part III of the form',
      'File within 3 years of original filing date',
      'Processing takes up to 16 weeks',
    ],
    url: 'https://www.irs.gov/forms-pubs/about-form-1040x',
  },
  'ein': {
    title: 'Apply for an EIN (Employer Identification Number)',
    steps: [
      'Determine if you need an EIN (businesses, estates, trusts)',
      'Apply online at irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
      'Complete the application (takes about 15 minutes)',
      'Receive your EIN immediately after online application',
      'Alternative: fax Form SS-4 or mail it (takes 4-5 weeks)',
    ],
    url: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
  },
  'estimated taxes': {
    title: 'Pay Quarterly Estimated Taxes',
    steps: [
      'Determine if you need to pay (expect to owe $1,000+ in taxes)',
      'Use Form 1040-ES to calculate estimated tax',
      'Due dates: April 15, June 15, September 15, January 15',
      'Pay online at irs.gov/payments or mail voucher with check',
      'Underpayment may result in penalties',
    ],
    url: 'https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes',
  },
  'identity theft': {
    title: 'Report Tax-Related Identity Theft',
    steps: [
      'File a complaint at identitytheft.gov',
      'Contact IRS at 800-908-4490 (Identity Protection Specialized Unit)',
      'Submit Form 14039 (Identity Theft Affidavit)',
      'Continue to pay taxes and file returns',
      'Request an Identity Protection PIN for future filings',
    ],
    url: 'https://www.irs.gov/identity-theft-central',
  },
};

// Tax brackets and standard deductions (2025)
export const TAX_INFO_2025 = {
  standard_deductions: {
    single: 15000,
    married_joint: 30000,
    married_separate: 15000,
    head_of_household: 22500,
  },
  brackets_single: [
    { rate: 10, min: 0, max: 11925 },
    { rate: 12, min: 11926, max: 48475 },
    { rate: 22, min: 48476, max: 103350 },
    { rate: 24, min: 103351, max: 197300 },
    { rate: 32, min: 197301, max: 250525 },
    { rate: 35, min: 250526, max: 626350 },
    { rate: 37, min: 626351, max: Infinity },
  ],
  eitc_max: { 0: 632, 1: 4213, 2: 6960, 3: 7830 },
  child_tax_credit: 2000,
  social_security_wage_base: 176100,
};

function searchIRS(query) {
  const lower = query.toLowerCase().trim();
  const results = { forms: [], processes: [], taxInfo: null };

  // Search forms
  for (const [key, form] of Object.entries(IRS_FORMS)) {
    const searchText = `${key} ${form.name} ${form.title} ${form.description}`.toLowerCase();
    if (lower.split(' ').some((word) => word.length > 2 && searchText.includes(word))) {
      results.forms.push(form);
    }
  }

  // Search processes
  for (const [key, process] of Object.entries(IRS_PROCESSES)) {
    const searchText = `${key} ${process.title} ${process.steps.join(' ')}`.toLowerCase();
    if (lower.split(' ').some((word) => word.length > 2 && searchText.includes(word))) {
      results.processes.push(process);
    }
  }

  // Tax bracket / deduction queries
  if (lower.includes('bracket') || lower.includes('rate') || lower.includes('deduction') || lower.includes('standard')) {
    results.taxInfo = TAX_INFO_2025;
  }

  return results;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

  const results = searchIRS(q);
  return res.status(200).json(results);
}
