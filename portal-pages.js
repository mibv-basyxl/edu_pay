(function (document) {
  'use strict';

  var page = document.body.getAttribute('data-page');
  var config = {
    login: ['Sign in', 'Welcome back', 'Sign in to continue to your EduPay account.', ''],
    register: ['Create account', 'Create your account', 'Register a student or parent account.', ''],
    'forgot-password': ['Reset password', 'Forgot your password?', 'Request a demonstration password-reset code.', ''],
    'reset-password': ['Choose a new password', 'Reset your password', 'Enter the reset code and choose a new password.', ''],
    'verify-account': ['Verify account', 'Verify your account', 'Use the demonstration verification code shown below.', ''],
    'student-dashboard': ['Student dashboard', 'Your fee overview', 'Review balances, deadlines, receipts and recent activity.', 'student'],
    'parent-dashboard': ['Parent dashboard', 'Linked student overview', 'Review fee balances and activity for your linked students.', 'parent'],
    payment: ['Make a payment', 'Pay school fees', 'Payments are simulated in this demonstration; no bank details are collected.', 'student,parent'],
    'payment-history': ['Payment history', 'Transactions', 'Search and review recorded payment activity.', 'student,parent,finance,admin,superadmin'],
    'payment-details': ['Payment details', 'Transaction details', 'Transaction details are available only to authorised users.', 'student,parent,finance,admin,superadmin'],
    receipt: ['Receipt', 'Receipt lookup', 'Look up a receipt by its number, transaction reference or student ID.', 'student,parent,finance,admin,superadmin'],
    'receipt-verification': ['Verify a receipt', 'Receipt verification', 'Check demonstration receipt records stored in this browser.', ''],
    'fee-statement': ['Fee statement', 'Student fee statement', 'Review charges, payments and the current outstanding balance.', 'student,parent,finance,admin,superadmin'],
    'fee-structure': ['Fee structure', 'Applicable fees', 'View fees configured for your class and academic session.', 'student,parent'],
    notifications: ['Notifications', 'Your notifications', 'Review notices associated with your demonstration account.', 'student,parent,finance,admin,superadmin'],
    profile: ['Profile', 'Your profile', 'Manage your demonstration account details and password.', 'student,parent,finance,admin,superadmin'],
    support: ['Support', 'Contact support', 'Submit a local demonstration support request.', ''],
    'finance-dashboard': ['Finance dashboard', 'Finance overview', 'Monitor payment collections and pending transactions.', 'finance'],
    transactions: ['Transactions', 'All transactions', 'Search and review payment transactions.', 'finance,admin,superadmin'],
    'verify-payment': ['Verify payments', 'Verification queue', 'Review pending or offline payment submissions.', 'finance,admin,superadmin'],
    reconciliation: ['Reconciliation', 'Settlement reconciliation', 'Compare a settlement CSV with local demonstration records.', 'finance,admin,superadmin'],
    reports: ['Reports', 'Collections and balances', 'Build a demonstration report using the available filters.', 'finance,admin,superadmin'],
    receipts: ['Receipt management', 'Issued receipts', 'Review generated demonstration receipts.', 'finance,admin,superadmin'],
    'admin-dashboard': ['Administration', 'School overview', 'Review school-level collections, balances and fee configuration.', 'admin,superadmin'],
    students: ['Students', 'Manage students', 'Browse student records and update their active status.', 'admin,superadmin'],
    parents: ['Parents', 'Manage parents', 'Browse guardians and maintain student links.', 'admin,superadmin'],
    staff: ['Staff', 'Manage staff', 'Browse finance and administration accounts.', 'admin,superadmin'],
    'fee-management': ['Fee management', 'Manage fee structures', 'Create and maintain academic fee structures.', 'admin,superadmin'],
    'academic-sessions': ['Academic sessions', 'Manage academic sessions', 'Create sessions and choose the active session.', 'admin,superadmin'],
    classes: ['Classes', 'Manage classes', 'Review available class and programme records.', 'admin,superadmin'],
    'audit-logs': ['Audit logs', 'Activity history', 'Review recorded administrative actions.', 'admin,superadmin'],
    settings: ['School settings', 'Settings', 'Update local demonstration settings.', 'admin,superadmin'],
    'notifications-admin': ['Announcements', 'Send an announcement', 'Create an in-app announcement for demonstration accounts.', 'admin,superadmin'],
    privacy: ['Privacy notice', 'Privacy for this demonstration', 'Important information about sample data stored in this browser.', ''],
    terms: ['Terms of use', 'Demonstration terms', 'Important limitations of this fee payment portal preview.', '']
  };
  var pageConfig = config[page];
  if (!pageConfig) return;

  var title = pageConfig[0];
  var subtitle = pageConfig[1];
  var description = pageConfig[2];
  var roles = pageConfig[3];
  var appPages = ['student-dashboard', 'parent-dashboard', 'payment', 'payment-history', 'payment-details', 'receipt', 'fee-statement', 'fee-structure', 'notifications', 'profile', 'finance-dashboard', 'transactions', 'verify-payment', 'reconciliation', 'reports', 'receipts', 'admin-dashboard', 'students', 'parents', 'staff', 'fee-management', 'academic-sessions', 'classes', 'audit-logs', 'settings', 'notifications-admin'];

  if (roles) document.body.setAttribute('data-requires', roles);
  if (['login', 'register', 'forgot-password', 'reset-password', 'verify-account'].indexOf(page) >= 0) {
    document.body.setAttribute('data-guest', 'true');
  }
  document.title = title + ' — EduPay';

  function field(label, name, type, extra) {
    return '<div class="field"><label for="' + name + '">' + label + '</label><input class="input" id="' + name + '" name="' + name + '" type="' + (type || 'text') + '" ' + (extra || '') + '></div>';
  }
  function select(label, name, options, attrs) {
    return '<div class="field"><label for="' + name + '">' + label + '</label><select class="select" id="' + name + '" name="' + name + '" ' + (attrs || '') + '>' + options + '</select></div>';
  }
  function table(name) {
    return '<div class="card"><div class="table-tools"><input class="input" type="search" aria-label="Search records" placeholder="Search…" data-table-search="' + name + '">' +
      '<button class="btn btn--soft btn--sm" type="button" data-export="' + name + '">Export CSV</button></div>' +
      '<div data-table="' + name + '"></div><div data-table-pagination="' + name + '"></div></div>';
  }

  var content = '';
  if (page === 'login') {
    content = '<div class="auth"><aside class="auth__aside"><a class="brand" href="index.html">EduPay</a><h2>School payments, made simple.</h2><p>Sign in to review fees, make simulated payments and access receipts.</p></aside>' +
      '<section class="auth__panel"><form id="loginForm" class="auth__form" novalidate><h1>Sign in</h1><p>Use a demo account or your registered account.</p><div id="loginError" class="alert alert--danger" hidden></div>' +
      field('Email address or student ID', 'identifier', 'text', 'autocomplete="username" required') +
      field('Password', 'password', 'password', 'autocomplete="current-password" required') +
      '<label class="check"><input type="checkbox" name="remember"> Keep me signed in on this device</label><button class="btn btn--primary" type="submit">Sign in</button>' +
      '<div class="auth__foot"><a href="forgot-password.html">Forgot password?</a> · <a href="register.html">Create account</a></div>' +
      '<div class="auth__demo"><b>Demo accounts</b><div class="demo-strip"><button type="button" data-demo-role="student">Student</button><button type="button" data-demo-role="parent">Parent</button><button type="button" data-demo-role="finance">Finance</button><button type="button" data-demo-role="admin">Admin</button></div><small>Demo data is stored only in this browser.</small></div></form></section></div>';
  } else if (page === 'register') {
    content = '<form id="registerForm" class="card form-grid" novalidate><div class="grid grid--2">' +
      field('Full name', 'name', 'text', 'autocomplete="name" required') + field('Email address', 'email', 'email', 'autocomplete="email" required') +
      field('Phone number', 'phone', 'tel', 'autocomplete="tel" required') +
      select('Account type', 'role', '<option value="student">Student</option><option value="parent">Parent / Guardian</option>') +
      select('School', 'schoolId', '<option value="SCH-001">Loading schools…</option>') +
      field('Student ID or linked student ID', 'studentCode', 'text', 'autocomplete="off"') +
      '<div data-when-role="student">' + select('Class / programme', 'classLevel', '<option value="">Choose a class</option><option>JSS 1</option><option>JSS 2</option><option>JSS 3</option><option>SSS 1</option><option>SSS 2</option><option>SSS 3</option>') + '</div>' +
      '<div data-when-role="parent">' + select('Relationship', 'relationship', '<option>Father</option><option>Mother</option><option>Guardian</option><option>Sponsor</option>') + '</div>' +
      field('Password', 'password', 'password', 'autocomplete="new-password" required') + field('Confirm password', 'confirmPassword', 'password', 'autocomplete="new-password" required') +
      '</div><label class="check"><input type="checkbox" name="terms"> I accept the demonstration <a href="privacy.html">privacy notice</a> and <a href="terms.html">terms</a>.</label>' +
      '<div class="form-actions"><button class="btn btn--primary" type="submit">Create account</button><a href="login.html">Already registered? Sign in</a></div></form>';
  } else if (page === 'forgot-password') {
    content = '<form id="forgotForm" class="card form-grid" novalidate>' + field('Email address', 'email', 'email', 'autocomplete="email" required') +
      '<button class="btn btn--primary" type="submit">Request reset code</button><div id="forgotResult" class="mt-4" hidden></div></form>';
  } else if (page === 'reset-password') {
    content = '<form id="resetForm" class="card form-grid" novalidate>' + field('Email address', 'email', 'email', 'autocomplete="email" required') +
      field('Reset code', 'token', 'text', 'autocomplete="one-time-code" required') + field('New password', 'password', 'password', 'autocomplete="new-password" required') +
      field('Confirm new password', 'confirmPassword', 'password', 'autocomplete="new-password" required') + '<button class="btn btn--primary" type="submit">Update password</button></form>';
  } else if (page === 'verify-account') {
    content = '<form id="verifyForm" class="card form-grid" novalidate>' + field('Email address', 'email', 'email', 'autocomplete="email" required') +
      field('Verification code', 'code', 'text', 'autocomplete="one-time-code" required') + '<p id="verifyHint" class="alert alert--info"></p><button class="btn btn--primary" type="submit">Verify account</button></form>';
  } else if (page === 'student-dashboard') {
    content = '<div class="card mb-4"><strong data-student-name></strong><span class="mono" data-student-code></span><span data-student-class></span><span data-student-session></span><span data-student-school></span></div>' +
      '<div class="stats"><div class="stat stat--accent"><span class="stat__label">Total fees</span><div class="stat__value" data-total-fees>—</div></div><div class="stat stat--success"><span class="stat__label">Paid</span><div class="stat__value" data-amount-paid>—</div></div><div class="stat stat--warning"><span class="stat__label">Outstanding</span><div class="stat__value" data-outstanding>—</div></div><div class="stat"><span class="stat__label">Pending</span><div class="stat__value" data-pending-amount>—</div></div></div>' +
      '<div class="card mb-4"><span data-collection-rate></span><div class="progress"><i class="progress__bar" data-progress-bar></i></div><div data-fee-alerts></div><h2>Fee breakdown</h2><div data-fee-breakdown></div><div data-optional-fees></div><h2>Upcoming deadlines</h2><div data-deadlines></div></div>' +
      '<div class="grid grid--2"><section class="card"><h2>Latest receipt</h2><div data-latest-receipt></div></section><section class="card"><h2>Recent payments</h2>' + table('student-transactions') + '</section></div>';
  } else if (page === 'parent-dashboard') {
    content = '<div class="card"><div class="field"><label for="linkedStudentSelector">Linked student</label><select id="linkedStudentSelector" class="select"></select></div><div data-parent-summary></div>' +
      '<div class="grid grid--2"><div class="stat"><span class="stat__label">Student</span><div data-child-name></div><span data-child-code></span><span data-child-class></span><span data-child-session></span></div>' +
      '<div class="stats"><div class="stat stat--accent"><span>Total fees</span><div data-total-fees></div></div><div class="stat stat--success"><span>Paid</span><div data-amount-paid></div></div><div class="stat stat--warning"><span>Outstanding</span><div data-outstanding></div></div><div class="stat"><span data-collection-rate></span></div></div></div><div class="progress"><i class="progress__bar" data-progress-bar></i></div>' +
      '<a class="btn btn--primary" data-quick-pay href="payment.html">Make a payment</a><div data-reminders></div><h2>Receipts</h2>' + table('parent-receipts') + '<h2>Transactions</h2>' + table('parent-transactions') + '</div>';
  } else if (page === 'payment') {
    content = '<div class="grid grid--2"><form id="paymentForm" class="card form-grid" novalidate>' +
      select('Student', 'studentId', '<option>Loading students…</option>') + select('Academic session', 'sessionId', '<option>Loading sessions…</option>') +
      select('Fee', 'feeLabel', '<option>Loading fees…</option>') + field('Amount (NGN)', 'amount', 'number', 'min="500" step="0.01" inputmode="decimal" required') +
      '<div class="form-actions"><button class="btn btn--soft btn--sm" type="button" data-set-amount="half">Pay half</button><button class="btn btn--soft btn--sm" type="button" data-set-amount="full">Pay full balance</button></div>' +
      select('Payment plan', 'planInstalment', '<option value="">Loading plans…</option>') + '<fieldset class="field"><legend>Payment method</legend><label class="check"><input type="radio" name="method" value="Card"> Card (simulation)</label><label class="check"><input type="radio" name="method" value="Bank Transfer"> Bank transfer</label><label class="check"><input type="radio" name="method" value="USSD"> USSD</label></fieldset>' +
      select('Simulated outcome', 'demoOutcome', '<option value="success">Successful</option><option value="pending">Pending</option><option value="failed">Failed</option>') +
      '<p data-max-hint class="text-xs text-muted"></p><button class="btn btn--primary" type="submit">Review and pay</button></form>' +
      '<aside><section class="card"><h2>Current balance</h2><div data-payment-summary></div></section><section class="card mt-4"><h2>Payment review</h2><div data-payment-review></div></section></aside></div>';
  } else if (page === 'payment-details') {
    content = '<section data-transaction-detail class="card"></section>';
  } else if (page === 'receipt' || page === 'receipt-verification') {
    content = '<form id="receiptLookupForm" class="card form-grid"><div class="grid grid--2">' +
      select('Search by', 'lookupMode', '<option value="receipt">Receipt number</option><option value="reference">Transaction reference</option><option value="student">Student ID</option>') +
      field('Receipt number, reference or student ID', 'lookupValue', 'text', 'required') + '</div><button class="btn btn--primary" type="submit">Find receipt</button><div id="lookupResult" data-lookup-result class="mt-4"></div></form><section class="mt-4" data-receipt-host></section>';
  } else if (page === 'fee-statement') {
    content = '<div class="card"><div class="grid grid--2">' + select('Student', 'statementStudent', '<option>Loading students…</option>') + select('Academic session', 'statementSession', '<option>Loading sessions…</option>') +
      '</div><button class="btn btn--soft" type="button" data-export-statement>Export statement</button></div><div data-statement-summary class="mt-4"></div><div data-statement-host class="mt-4"></div>';
  } else if (page === 'fee-structure') {
    content = '<section data-fee-structure-host class="card"></section>';
  } else if (page === 'payment-history' || page === 'transactions' || page === 'receipts' || page === 'audit-logs' || page === 'students' || page === 'parents' || page === 'staff' || page === 'fee-management' || page === 'academic-sessions' || page === 'classes') {
    var tableName = page;
    if (page === 'payment-history') tableName = 'payment-history';
    if (page === 'transactions') tableName = 'transactions';
    if (page === 'receipts') tableName = 'receipts';
    if (page === 'audit-logs') tableName = 'audit-logs';
    if (page === 'fee-management') tableName = 'fees';
    if (page === 'academic-sessions') tableName = 'sessions';
    content = '<div class="card mb-4"><div class="grid grid--2">' +
      select('Status', 'filter-status', '<option value="">All statuses</option><option>Successful</option><option>Pending</option><option>Failed</option><option>Active</option><option>Inactive</option>', 'data-filter="status"') +
      select('Payment method', 'filter-method', '<option value="">All methods</option><option>Card</option><option>Bank Transfer</option><option>USSD</option>', 'data-filter="method"') +
      select('Session', 'filter-session', '<option value="">All sessions</option>', 'data-filter="sessionId"') +
      select('Category', 'filter-category', '<option value="">All categories</option><option>Tuition</option><option>Registration</option><option>Examination</option>', 'data-filter="category"') +
      '</div><div class="form-actions"><button class="btn btn--soft btn--sm" type="button" data-filter-reset>Clear filters</button>' +
      (['students', 'parents', 'staff', 'fee-management', 'academic-sessions', 'classes'].indexOf(page) >= 0 ? '<button class="btn btn--primary btn--sm" type="button" data-new-record>Add new</button>' : '') + '</div></div>' + table(tableName);
  } else if (page === 'student-dashboard') {
    content = '';
  } else if (page === 'finance-dashboard' || page === 'admin-dashboard') {
    var stats = page === 'finance-dashboard'
      ? [['Collections', 'data-collections'], ['Pending', 'data-pending-count'], ['Pending amount', 'data-pending-amount'], ['Failed', 'data-failed-count'], ['Under review', 'data-review-count'], ['Outstanding', 'data-outstanding'], ['Receipts', 'data-receipts-issued'], ['Collection rate', 'data-collection-rate']]
      : [['Students', 'data-total-students'], ['Fees assessed', 'data-fees-assessed'], ['Collections', 'data-collections'], ['Outstanding', 'data-outstanding'], ['Pending', 'data-pending-count'], ['Failed', 'data-failed-count'], ['Active fees', 'data-active-fees'], ['Collection rate', 'data-collection-rate']];
    content = '<div class="stats">' + stats.map(function (item) { return '<div class="stat"><span class="stat__label">' + item[0] + '</span><div class="stat__value" ' + item[1] + '>—</div></div>'; }).join('') + '</div>' +
      '<div class="grid grid--2"><section class="card"><h2>Collection trend</h2><div data-' + (page === 'finance-dashboard' ? 'collections-chart' : 'collection-trend') + '></div></section>' +
      '<section class="card"><h2>' + (page === 'finance-dashboard' ? 'Payment methods' : 'Balances by class') + '</h2><div data-' + (page === 'finance-dashboard' ? 'method-breakdown' : 'balances-by-class') + '></div></section></div>' +
      (page === 'admin-dashboard' ? '<section class="card mt-4"><h2>Verification queue</h2><div data-verification-queue></div></section>' : '') +
      '<section class="card mt-4"><h2>Recent transactions</h2>' + table(page === 'finance-dashboard' ? 'finance-recent' : 'admin-recent') + '</section>';
  } else if (page === 'verify-payment') {
    content = '<section data-verification-host></section>';
  } else if (page === 'reconciliation') {
    content = '<div class="card"><p>Upload a CSV with <code>reference</code> and <code>amount</code> columns. Unmatched records are never automatically marked as paid.</p>' +
      '<div class="field"><label for="settlementFile">Settlement CSV</label><input class="input" id="settlementFile" type="file" accept=".csv,text/csv"></div><div data-column-mapping></div>' +
      '<div class="form-actions"><button class="btn btn--primary" type="button" data-run-reconciliation>Run reconciliation</button><button class="btn btn--soft" type="button" data-export-reconciliation>Export results</button></div><div data-reconciliation-results class="mt-4"></div></div>';
  } else if (page === 'reports') {
    content = '<form id="reportFilters" class="card form-grid"><div class="grid grid--2">' + select('Session', 'sessionId', '<option value="All">All sessions</option>') +
      select('Class', 'classLevel', '<option>All</option><option>JSS 1</option><option>JSS 2</option><option>JSS 3</option><option>SSS 1</option><option>SSS 2</option><option>SSS 3</option>') +
      select('Status', 'status', '<option>All</option><option>Successful</option><option>Pending</option><option>Failed</option>') +
      select('Method', 'method', '<option>All</option><option>Card</option><option>Bank Transfer</option><option>USSD</option>') +
      select('Category', 'category', '<option>All</option><option>Tuition</option><option>Registration</option><option>Examination</option>') +
      '</div><button class="btn btn--primary" type="submit">Run report</button></form><div data-report-metrics class="mt-4"></div><div data-report-host class="mt-4"></div>';
  } else if (page === 'notifications') {
    content = '<div class="form-actions"><button type="button" class="btn btn--soft" data-notification-filter="all">All</button><button type="button" class="btn btn--soft" data-notification-filter="unread">Unread</button><button type="button" class="btn btn--soft" data-mark-all-read>Mark all read</button></div><div data-notification-list class="mt-4"></div>';
  } else if (page === 'profile') {
    content = '<div class="grid grid--2"><form id="profileForm" class="card form-grid"><h2>Profile details</h2><p><span data-profile-name></span> · <span data-profile-role></span> · <span data-profile-email></span></p>' +
      field('Full name', 'name', 'text', 'required') + field('Email address', 'email', 'email', 'readonly') + field('Phone number', 'phone', 'tel') + '<button class="btn btn--primary" type="submit">Save profile</button></form>' +
      '<form id="passwordForm" class="card form-grid"><h2>Change password</h2>' + field('Current password', 'currentPassword', 'password', 'autocomplete="current-password" required') +
      field('New password', 'password', 'password', 'autocomplete="new-password" required') + field('Confirm password', 'confirmPassword', 'password', 'autocomplete="new-password" required') + '<button class="btn btn--primary" type="submit">Update password</button></form></div>';
  } else if (page === 'support') {
    content = '<div class="grid grid--2"><form id="supportForm" class="card form-grid">' + field('Subject', 'subject', 'text', 'required') +
      '<div class="field"><label for="message">Message</label><textarea class="textarea" id="message" name="message" required></textarea></div><button class="btn btn--primary" type="submit">Submit request</button></form><section class="card"><h2>Previous requests</h2><div data-support-history></div></section></div>';
  } else if (page === 'notifications-admin') {
    content = '<form id="announcementForm" class="card form-grid">' + field('Announcement title', 'title', 'text', 'required') +
      '<div class="field"><label for="body">Message</label><textarea class="textarea" id="body" name="body" required></textarea></div>' +
      select('Audience', 'audience', '<option value="all">Everyone</option><option value="students">Students</option><option value="parents">Parents</option><option value="staff">Staff</option>') +
      '<button class="btn btn--primary" type="submit">Send announcement</button></form>';
  } else if (page === 'settings') {
    content = '<form id="settingsForm" class="card form-grid"><h2>School settings</h2><div class="grid grid--2">' +
      field('School name', 'schoolName', 'text') + field('Support email', 'supportEmail', 'email') + select('Current academic session', 'currentSessionId', '<option>Loading sessions…</option>') +
      '</div><button class="btn btn--primary" type="submit">Save settings</button></form>';
  } else if (page === 'classes') {
    content = '<div class="alert alert--info"><div>Class lists are populated from the student and fee structure records in this demonstration.</div></div>' + table('classes');
  } else if (page === 'privacy' || page === 'terms') {
    content = '<section class="card"><h2>' + (page === 'privacy' ? 'Demonstration privacy notice' : 'Demonstration terms of use') + '</h2><p>This frontend demonstration stores sample account and transaction data in this browser only. It does not connect to a payment provider or send messages to an institution.</p><p>Do not enter real personal, payment-card, banking, or password information. Production use requires institution-approved legal terms, a secure backend, and provider-verified payment processing.</p><a class="btn btn--primary" href="index.html">Return to EduPay</a></section>';
  }

  var dashboardLinks = [
    ['Overview', 'student-dashboard.html'], ['Make payment', 'payment.html'], ['Transactions', 'payment-history.html'],
    ['Fee statement', 'fee-statement.html'], ['Fee structure', 'fee-structure.html'], ['Receipts', 'receipt-verification.html'],
    ['Notifications', 'notifications.html'], ['Profile', 'profile.html'], ['Support', 'support.html']
  ];
  var adminLinks = [
    ['School overview', 'admin/dashboard.html'], ['Students', 'admin/students.html'], ['Parents', 'admin/parents.html'],
    ['Staff', 'admin/staff.html'], ['Fee structures', 'admin/fee-management.html'], ['Sessions', 'admin/academic-sessions.html'],
    ['Classes', 'admin/classes.html'], ['Transactions', 'finance/transactions.html'], ['Verification', 'finance/verify-payment.html'],
    ['Reconciliation', 'finance/reconciliation.html'], ['Reports', 'finance/reports.html'], ['Audit logs', 'admin/audit-logs.html'],
    ['Settings', 'admin/settings.html'], ['Announcements', 'admin/notifications.html']
  ];

  if (appPages.indexOf(page) >= 0) {
    var links = ['finance-dashboard', 'transactions', 'verify-payment', 'reconciliation', 'reports', 'receipts', 'admin-dashboard', 'students', 'parents', 'staff', 'fee-management', 'academic-sessions', 'classes', 'audit-logs', 'settings', 'notifications-admin'].indexOf(page) >= 0 ? adminLinks : dashboardLinks;
    if (page === 'parent-dashboard') links[0] = ['Overview', 'parent-dashboard.html'];
    var nav = links.map(function (item) { return '<li><a href="' + item[1] + '">' + item[0] + '</a></li>'; }).join('');
    document.body.innerHTML = '<div class="app"><aside class="sidebar"><a class="sidebar__brand" href="index.html">EduPay</a><nav><ul class="sidebar__nav">' + nav +
      '<li><a href="#" data-logout>Sign out</a></li></ul></nav><div class="sidebar__foot">Demonstration only · No live payments</div></aside>' +
      '<div class="app__main"><header class="topbar"><button class="btn btn--soft btn--sm" type="button" data-sidebar-toggle aria-label="Toggle navigation">Menu</button>' +
      '<strong class="topbar__title">' + title + '</strong><div class="topbar__actions"><span data-user-name></span><button class="theme-toggle" type="button" data-theme-toggle aria-label="Toggle theme">Theme</button></div></header>' +
      '<main class="page"><div class="page-head"><div><div class="breadcrumbs"><a href="index.html">Home</a><span class="sep">/</span><span>' + title + '</span></div><h1>' + subtitle + '</h1><p>' + description + '</p></div>' +
      '<div class="page-head__actions"><a class="btn btn--primary btn--sm" href="payment.html">Make a payment</a></div></div><div id="portalContent">' + content + '</div>' +
      '<p class="text-xs text-muted mt-6">EduPay demonstration project. Records and payment outcomes are simulated locally.</p></main></div></div>';
  } else {
    var main = document.createElement('main');
    main.className = 'page';
    main.innerHTML = '<div class="wrap"><div class="page-head"><div><div class="breadcrumbs"><a href="index.html">Home</a><span class="sep">/</span><span>' + title + '</span></div><h1>' + subtitle + '</h1><p>' + description + '</p></div></div>' + content + '<p class="auth__foot"><a href="index.html">Return to EduPay</a></p></div>';
    document.body.appendChild(main);
  }

})(document);
