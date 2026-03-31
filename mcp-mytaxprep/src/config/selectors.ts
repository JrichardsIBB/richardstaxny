/**
 * CSS selectors for MyTAXPrepOffice screens.
 * These are placeholder selectors based on common patterns.
 * Discover real selectors via `npm run inspect` (Playwright codegen).
 */

export const selectors = {
  login: {
    usernameInput: 'input[name="username"]',
    passwordInput: 'input[name="password"]',
    loginButton: 'button[type="submit"]',
    rememberMe: 'input[name="remember"]',
    errorMessage: '.login-error, .alert-danger',
    forgotPassword: 'a[href*="forgot"]',
  },

  dashboard: {
    container: '#dashboard, .dashboard-container',
    welcomeMessage: '.welcome-message, .user-greeting',
    userMenu: '.user-menu, .dropdown-toggle',
    logoutLink: 'a[href*="logout"], button.logout',
  },

  navigation: {
    sidebar: 'nav.sidebar, .side-nav, #sidebar',
    clientsLink: 'a[href*="client"], .nav-clients',
    returnsLink: 'a[href*="return"], .nav-returns',
    documentsLink: 'a[href*="document"], .nav-documents',
    settingsLink: 'a[href*="setting"], .nav-settings',
    breadcrumb: '.breadcrumb, nav[aria-label="breadcrumb"]',
    activeNavItem: '.nav-item.active, .nav-link.active',
  },

  clientList: {
    container: '.client-list, #client-list, .clients-table',
    searchInput: 'input[name="search"], input[placeholder*="Search"], .client-search input',
    searchButton: 'button.search, .search-btn',
    table: 'table.client-table, .clients-table table',
    tableRows: 'table.client-table tbody tr, .clients-table tbody tr',
    clientNameCell: 'td:first-child a, td.client-name a',
    clientSSNCell: 'td.client-ssn, td:nth-child(2)',
    clientStatusCell: 'td.client-status, td:nth-child(3)',
    newClientButton: 'button.new-client, a.new-client, .btn-new-client',
    pagination: '.pagination, nav[aria-label="pagination"]',
    nextPage: '.pagination .next, .page-next',
    noResults: '.no-results, .empty-state',
  },

  newClient: {
    form: 'form.new-client, form#new-client-form',
    firstName: 'input[name="firstName"], input[name="first_name"], #firstName',
    lastName: 'input[name="lastName"], input[name="last_name"], #lastName',
    ssn: 'input[name="ssn"], input[name="socialSecurityNumber"], #ssn',
    dateOfBirth: 'input[name="dob"], input[name="dateOfBirth"], #dob',
    phone: 'input[name="phone"], input[name="phoneNumber"], #phone',
    email: 'input[name="email"], #email',
    address: 'input[name="address"], input[name="streetAddress"], #address',
    city: 'input[name="city"], #city',
    state: 'select[name="state"], #state',
    zip: 'input[name="zip"], input[name="zipCode"], #zip',
    filingStatus: 'select[name="filingStatus"], #filingStatus',
    submitButton: 'button[type="submit"], .btn-save-client',
    cancelButton: 'button.cancel, .btn-cancel',
    successMessage: '.alert-success, .success-message',
    errorMessage: '.alert-danger, .error-message',
  },

  clientInfo: {
    container: '.client-info, #client-info, .client-detail',
    header: '.client-header, h1.client-name, h2.client-name',
    // Personal info fields
    firstName: 'input[name="firstName"], .field-firstName input',
    lastName: 'input[name="lastName"], .field-lastName input',
    ssn: 'input[name="ssn"], .field-ssn input',
    dateOfBirth: 'input[name="dob"], .field-dob input',
    phone: 'input[name="phone"], .field-phone input',
    email: 'input[name="email"], .field-email input',
    address: 'input[name="address"], .field-address input',
    city: 'input[name="city"], .field-city input',
    state: 'select[name="state"], .field-state select',
    zip: 'input[name="zip"], .field-zip input',
    filingStatus: 'select[name="filingStatus"], .field-filingStatus select',
    // Spouse info
    spouseFirstName: 'input[name="spouseFirstName"], .field-spouseFirstName input',
    spouseLastName: 'input[name="spouseLastName"], .field-spouseLastName input',
    spouseSSN: 'input[name="spouseSSN"], .field-spouseSSN input',
    // Dependents
    dependentsSection: '.dependents-section, #dependents',
    addDependentButton: 'button.add-dependent, .btn-add-dependent',
    // Actions
    saveButton: 'button.save, button[type="submit"], .btn-save',
    editButton: 'button.edit, .btn-edit',
    deleteButton: 'button.delete, .btn-delete',
    // Tabs / sections
    personalTab: '.tab-personal, a[href*="personal"]',
    incomeTab: '.tab-income, a[href*="income"]',
    deductionsTab: '.tab-deductions, a[href*="deductions"]',
    formsTab: '.tab-forms, a[href*="forms"]',
  },

  w2Input: {
    container: '.w2-form, #w2-input, .form-w2',
    // Employer info
    employerEIN: 'input[name="employerEIN"], input[name="ein"], #ein',
    employerName: 'input[name="employerName"], #employerName',
    employerAddress: 'input[name="employerAddress"], #employerAddress',
    employerCity: 'input[name="employerCity"], #employerCity',
    employerState: 'select[name="employerState"], #employerState',
    employerZip: 'input[name="employerZip"], #employerZip',
    // Employee info
    employeeSSN: 'input[name="employeeSSN"], #employeeSSN',
    employeeName: 'input[name="employeeName"], #employeeName',
    // W-2 Boxes
    box1: 'input[name="box1"], input[name="wagesTips"], #box1',
    box2: 'input[name="box2"], input[name="fedTaxWithheld"], #box2',
    box3: 'input[name="box3"], input[name="socialSecurityWages"], #box3',
    box4: 'input[name="box4"], input[name="socialSecurityTax"], #box4',
    box5: 'input[name="box5"], input[name="medicareWages"], #box5',
    box6: 'input[name="box6"], input[name="medicareTax"], #box6',
    box7: 'input[name="box7"], input[name="socialSecurityTips"], #box7',
    box8: 'input[name="box8"], input[name="allocatedTips"], #box8',
    box10: 'input[name="box10"], input[name="dependentCareBenefits"], #box10',
    box11: 'input[name="box11"], input[name="nonqualifiedPlans"], #box11',
    box12a: 'input[name="box12a"], #box12a',
    box12b: 'input[name="box12b"], #box12b',
    box12c: 'input[name="box12c"], #box12c',
    box12d: 'input[name="box12d"], #box12d',
    box13Statutory: 'input[name="box13Statutory"], #box13Statutory',
    box13Retirement: 'input[name="box13Retirement"], #box13Retirement',
    box13ThirdParty: 'input[name="box13ThirdParty"], #box13ThirdParty',
    box14: 'input[name="box14"], textarea[name="box14"], #box14',
    // State/local
    box15State: 'select[name="box15State"], input[name="box15State"], #box15State',
    box15StateID: 'input[name="box15StateID"], #box15StateID',
    box16: 'input[name="box16"], input[name="stateWages"], #box16',
    box17: 'input[name="box17"], input[name="stateTax"], #box17',
    box18: 'input[name="box18"], input[name="localWages"], #box18',
    box19: 'input[name="box19"], input[name="localTax"], #box19',
    box20: 'input[name="box20"], input[name="localityName"], #box20',
    // Actions
    saveButton: 'button.save, button[type="submit"], .btn-save-w2',
    cancelButton: 'button.cancel, .btn-cancel',
    addAnotherW2: 'button.add-w2, .btn-add-w2',
    deleteW2: 'button.delete-w2, .btn-delete-w2',
    successMessage: '.alert-success, .success-message',
    errorMessage: '.alert-danger, .error-message',
  },
} as const;

/** Type for the full selectors config */
export type Selectors = typeof selectors;

/** Type for each page's selector group */
export type LoginSelectors = typeof selectors.login;
export type DashboardSelectors = typeof selectors.dashboard;
export type NavigationSelectors = typeof selectors.navigation;
export type ClientListSelectors = typeof selectors.clientList;
export type NewClientSelectors = typeof selectors.newClient;
export type ClientInfoSelectors = typeof selectors.clientInfo;
export type W2InputSelectors = typeof selectors.w2Input;
