/* ==========================================================================
   EduPay — School Fee Payment & Receipt Tracking Portal
   File: js/app.js
   --------------------------------------------------------------------------
   Vanilla ES6+ only. No frameworks, no build step, no network calls.
   Every module is guarded so a page that lacks an element never throws.

   SECTIONS
   01. Config & constants
   02. Utilities (format, ids, csv, validate, dom)
   03. Storage layer
   04. Seed / demo data
   05. Mock API layer
   06. Auth & route guards
   07. UI kit (theme, nav, toast, modal, dropdown, tabs, reveal)
   08. Tables, filters, pagination, export
   09. Landing page
   10. Auth pages
   11. Student & parent pages
   12. Payment workflow
   13. Receipts & verification
   14. Fee statement
   15. Finance pages
   16. Admin pages
   17. Notifications, profile, support
   18. Boot
   ========================================================================== */

(function (window, document) {
  'use strict';

  /* ========================================================================
     01. CONFIG & CONSTANTS
     ======================================================================== */
  var CONFIG = {
    appName: 'EduPay',
    tagline: 'School Payments Made Simple, Secure and Traceable.',
    version: '1.0.0',
    currency: { code: 'NGN', symbol: '\u20A6', locale: 'en-NG', decimals: 2 },
    pageSize: 10,
    seedVersion: '1.0.0',
    keys: {
      users: 'edupay_users',
      session: 'edupay_current_session',
      schools: 'edupay_schools',
      students: 'edupay_students',
      parents: 'edupay_parents',
      fees: 'edupay_fees',
      transactions: 'edupay_transactions',
      receipts: 'edupay_receipts',
      notifications: 'edupay_notifications',
      audit: 'edupay_audit_logs',
      settings: 'edupay_settings',
      sessions: 'edupay_academic_sessions',
      classes: 'edupay_classes',
      reconciliation: 'edupay_reconciliation',
      theme: 'edupay_theme',
      seed: 'edupay_seed_version'
    },
    roles: {
      student:    { label: 'Student',                home: 'student-dashboard.html' },
      parent:     { label: 'Parent / Guardian',      home: 'parent-dashboard.html' },
      finance:    { label: 'Finance Officer',        home: 'finance/dashboard.html' },
      admin:      { label: 'School Administrator',   home: 'admin/dashboard.html' },
      superadmin: { label: 'Super Administrator',    home: 'admin/dashboard.html' }
    },
    statuses: ['Initiated', 'Pending', 'Successful', 'Failed', 'Cancelled', 'Under Review', 'Reversed', 'Refunded'],
    methods: ['Card', 'Bank Transfer', 'USSD', 'Gateway Checkout', 'Offline Submission'],
    categories: ['Tuition', 'Registration', 'Examination', 'Laboratory', 'Library', 'Technology', 'Sports', 'Accommodation', 'Transportation', 'Development Levy', 'Other'],
    planInstalments: [
      { label: 'Instalment 1 (40%)', percent: 40 },
      { label: 'Instalment 2 (30%)', percent: 30 },
      { label: 'Instalment 3 (30%)', percent: 30 }
    ],
    limits: { minAmount: 500, maxAmount: 10000000 },
    demoCode: '123456'
  };

  var NS = {};
  window.EduPay = NS;

  /* ========================================================================
     02. UTILITIES
     ======================================================================== */
  var Utils = (NS.utils = {});

  Utils.qs = function (sel, root) { return (root || document).querySelector(sel); };
  Utils.qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  Utils.on = function (el, evt, fn, opts) { if (el && el.addEventListener) el.addEventListener(evt, fn, opts); };
  Utils.off = function (el, evt, fn) { if (el && el.removeEventListener) el.removeEventListener(evt, fn); };

  Utils.esc = function (value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  Utils.pad = function (n, len) {
    var s = String(n);
    while (s.length < len) s = '0' + s;
    return s;
  };

  Utils.uid = function (prefix) {
    var t = Date.now().toString(36);
    var r = Math.random().toString(36).slice(2, 8);
    return (prefix ? prefix + '_' : '') + t + r;
  };

  /* Deterministic pseudo-random generator — reproducible demo data. */
  Utils.seededRandom = function (seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  Utils.clamp = function (n, min, max) { return Math.min(Math.max(n, min), max); };

  Utils.round2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };

  Utils.toNumber = function (value) {
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    if (value === null || value === undefined) return 0;
    var cleaned = String(value).replace(/[^0-9.\-]/g, '');
    var n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  };

  Utils.formatCurrency = function (value) {
    var n = Utils.toNumber(value);
    try {
      return new Intl.NumberFormat(CONFIG.currency.locale, {
        style: 'currency',
        currency: CONFIG.currency.code,
        minimumFractionDigits: CONFIG.currency.decimals,
        maximumFractionDigits: CONFIG.currency.decimals
      }).format(n);
    } catch (e) {
      return CONFIG.currency.symbol + n.toFixed(CONFIG.currency.decimals);
    }
  };

  Utils.formatCurrencyShort = function (value) {
    var n = Utils.toNumber(value);
    if (Math.abs(n) >= 1000000) return CONFIG.currency.symbol + (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return CONFIG.currency.symbol + (n / 1000).toFixed(0) + 'k';
    return Utils.formatCurrency(n);
  };

  Utils.formatNumber = function (value) {
    var n = Utils.toNumber(value);
    try { return new Intl.NumberFormat(CONFIG.currency.locale).format(n); }
    catch (e) { return String(n); }
  };

  Utils.formatPercent = function (part, whole) {
    var w = Utils.toNumber(whole);
    if (w <= 0) return '0%';
    return ((Utils.toNumber(part) / w) * 100).toFixed(1) + '%';
  };

  Utils.toDate = function (value) {
    if (value instanceof Date) return value;
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  Utils.formatDate = function (value) {
    var d = Utils.toDate(value);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
    } catch (e) { return d.toDateString(); }
  };

  Utils.formatDateTime = function (value) {
    var d = Utils.toDate(value);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(d);
    } catch (e) { return d.toString(); }
  };

  Utils.formatTime = function (value) {
    var d = Utils.toDate(value);
    if (!d) return '—';
    try { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(d); }
    catch (e) { return d.toTimeString(); }
  };

  Utils.relativeTime = function (value) {
    var d = Utils.toDate(value);
    if (!d) return '—';
    var diff = Date.now() - d.getTime();
    var mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    var days = Math.round(hrs / 24);
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    return Utils.formatDate(d);
  };

  Utils.isoNow = function () { return new Date().toISOString(); };

  Utils.todayISO = function () { return new Date().toISOString().slice(0, 10); };

  Utils.daysUntil = function (value) {
    var d = Utils.toDate(value);
    if (!d) return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  };

  Utils.slug = function (value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  Utils.titleCase = function (value) {
    return String(value || '').replace(/\w\S*/g, function (t) {
      return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase();
    });
  };

  Utils.initials = function (name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'EP';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  Utils.debounce = function (fn, wait) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
    };
  };

  Utils.badgeClass = function (status) {
    var map = {
      'Successful': 'badge--success', 'Active': 'badge--success', 'Approved': 'badge--success',
      'Valid': 'badge--success', 'Matched': 'badge--success', 'Paid': 'badge--success',
      'Pending': 'badge--pending', 'Unmatched': 'badge--pending', 'Requires Review': 'badge--pending',
      'Initiated': 'badge--initiated', 'Failed': 'badge--failed', 'Rejected': 'badge--failed',
      'Amount Mismatch': 'badge--failed', 'Cancelled': 'badge--cancelled', 'Inactive': 'badge--cancelled',
      'Void': 'badge--cancelled', 'Under Review': 'badge--review', 'Duplicate': 'badge--review',
      'Reversed': 'badge--reversed', 'Refunded': 'badge--refunded'
    };
    return map[status] || 'badge--pending';
  };

  Utils.badge = function (status) {
    return '<span class="badge ' + Utils.badgeClass(status) + '">' +
      '<span class="dot"></span>' + Utils.esc(status) + '</span>';
  };

  Utils.csvCell = function (value) {
    var s = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  Utils.buildCSV = function (columns, rows) {
    var head = columns.map(function (c) { return Utils.csvCell(c.label); }).join(',');
    var body = rows.map(function (row) {
      return columns.map(function (c) {
        var v = typeof c.value === 'function' ? c.value(row) : row[c.key];
        return Utils.csvCell(v);
      }).join(',');
    }).join('\r\n');
    return head + '\r\n' + body;
  };

  Utils.downloadBlob = function (filename, content, mime) {
    try {
      var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8;' });
      if (window.navigator && window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, filename);
        return true;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
      return true;
    } catch (e) {
      Utils.toast('Download failed: ' + e.message, 'danger');
      return false;
    }
  };

  Utils.downloadCSV = function (filename, columns, rows) {
    var csv = Utils.buildCSV(columns, rows);
    return Utils.downloadBlob(filename, '\ufeff' + csv, 'text/csv;charset=utf-8;');
  };

  Utils.parseCSV = function (text) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQuotes = false;
    var i;
    for (i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else { inQuotes = false; }
        } else { cell += ch; }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell); cell = '';
      } else if (ch === '\n') {
        row.push(cell); cell = '';
        if (row.some(function (c) { return c !== ''; })) rows.push(row);
        row = [];
      } else if (ch !== '\r') {
        cell += ch;
      }
    }
    row.push(cell);
    if (row.some(function (c) { return c !== ''; })) rows.push(row);
    return rows;
  };

  /* ---------------- Validation ---------------- */
  var Validate = (NS.validate = {});

  Validate.email = function (value) {
    var v = String(value || '').trim();
    if (!v) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address (e.g. name@school.edu.ng).';
    return null;
  };

  Validate.phone = function (value) {
    var v = String(value || '').replace(/[\s\-()]/g, '');
    if (!v) return 'Phone number is required.';
    if (!/^(\+?234|0)[0-9]{9,10}$/.test(v)) return 'Enter a valid Nigerian phone number (e.g. 08012345678).';
    return null;
  };

  Validate.required = function (value, label) {
    if (value === null || value === undefined || String(value).trim() === '') {
      return (label || 'This field') + ' is required.';
    }
    return null;
  };

  Validate.studentCode = function (value) {
    var v = String(value || '').trim();
    if (!v) return 'Student ID is required.';
    if (!/^[A-Za-z0-9/\-]{4,20}$/.test(v)) return 'Student ID must be 4–20 characters (letters, numbers, / or -).';
    return null;
  };

  Validate.reference = function (value) {
    var v = String(value || '').trim();
    if (!v) return 'Transaction reference is required.';
    if (!/^[A-Za-z0-9\-]{6,32}$/.test(v)) return 'Reference must be 6–32 characters (letters, numbers or -).';
    return null;
  };

  Validate.password = function (value) {
    var v = String(value || '');
    if (!v) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return 'Password must include at least one letter and one number.';
    return null;
  };

  Validate.confirm = function (pass, confirm) {
    if (!confirm) return 'Please confirm your password.';
    if (pass !== confirm) return 'Passwords do not match.';
    return null;
  };

  Validate.amount = function (value, ctx) {
    var n = Utils.toNumber(value);
    var c = ctx || {};
    if (value === '' || value === null || value === undefined) return 'Enter the amount you wish to pay.';
    if (!isFinite(n) || n <= 0) return 'Amount must be greater than zero.';
    if (n < CONFIG.limits.minAmount) return 'Minimum payment amount is ' + Utils.formatCurrency(CONFIG.limits.minAmount) + '.';
    if (n > CONFIG.limits.maxAmount) return 'Amount exceeds the maximum permitted single payment.';
    if (typeof c.balance === 'number' && n > c.balance + 0.001) {
      return 'Amount exceeds the outstanding balance of ' + Utils.formatCurrency(c.balance) + '.';
    }
    return null;
  };

  Validate.setFieldError = function (input, message) {
    if (!input) return;
    var field = input.closest ? input.closest('.field') : null;
    var slot = field ? field.querySelector('.field__error') : null;
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      input.classList.add('input--error');
      if (slot) slot.textContent = message;
    } else {
      input.removeAttribute('aria-invalid');
      input.classList.remove('input--error');
      if (slot) slot.textContent = '';
    }
  };

  Validate.clearForm = function (form) {
    if (!form) return;
    Utils.qsa('.field__error', form).forEach(function (n) { n.textContent = ''; });
    Utils.qsa('[aria-invalid]', form).forEach(function (n) {
      n.removeAttribute('aria-invalid');
      n.classList.remove('input--error');
    });
  };

  Validate.form = function (form, rules) {
    Validate.clearForm(form);
    var firstInvalid = null;
    var values = {};
    var errors = [];
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      var rule = rules[name];
      var raw = input ? input.value : '';
      values[name] = raw;
      var msg = rule ? rule(raw, values) : null;
      if (msg) {
        errors.push(msg);
        Validate.setFieldError(input, msg);
        if (!firstInvalid && input) firstInvalid = input;
      }
    });
    if (firstInvalid && typeof firstInvalid.focus === 'function') firstInvalid.focus();
    return { valid: errors.length === 0, errors: errors, values: values };
  };

  /* ========================================================================
     03. STORAGE LAYER
     ======================================================================== */
  var Storage = (NS.storage = {});

  Storage.available = (function () {
    try {
      var k = '__edupay_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  Storage.memory = {};

  Storage.get = function (key, fallback) {
    try {
      var raw = Storage.available ? window.localStorage.getItem(key) : Storage.memory[key];
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  };

  Storage.set = function (key, value) {
    try {
      var raw = JSON.stringify(value);
      if (Storage.available) window.localStorage.setItem(key, raw);
      else Storage.memory[key] = raw;
      return true;
    } catch (e) {
      return false;
    }
  };

  Storage.remove = function (key) {
    try {
      if (Storage.available) window.localStorage.removeItem(key);
      else delete Storage.memory[key];
      return true;
    } catch (e) { return false; }
  };

  Storage.collection = function (key) { return Storage.get(key, []) || []; };
  Storage.save = function (key, rows) { return Storage.set(key, rows || []); };

  Storage.findById = function (key, id) {
    var rows = Storage.collection(key);
    for (var i = 0; i < rows.length; i++) { if (rows[i].id === id) return rows[i]; }
    return null;
  };

  Storage.upsert = function (key, record) {
    var rows = Storage.collection(key);
    var idx = -1;
    for (var i = 0; i < rows.length; i++) { if (rows[i].id === record.id) { idx = i; break; } }
    if (idx >= 0) rows[idx] = Object.assign({}, rows[idx], record);
    else rows.push(record);
    Storage.save(key, rows);
    return record;
  };

  Storage.removeById = function (key, id) {
    var rows = Storage.collection(key).filter(function (r) { return r.id !== id; });
    Storage.save(key, rows);
    return rows.length;
  };

  /* ========================================================================
     04. SEED / DEMO DATA
     ------------------------------------------------------------------------
     One fictional school, 30 students, 10 parents, 5 staff accounts, multiple
     fee structures across three sessions, 25 transactions of mixed statuses
     (15 successful → 15 receipts), notifications and audit events.
     ======================================================================== */
  var Seed = (NS.seed = {});

  var FIRST_NAMES = ['Aisha', 'Blessing', 'Chidi', 'Daniel', 'Emeka', 'Fatima', 'Grace', 'Hassan',
    'Ibrahim', 'Joy', 'Kelvin', 'Linda', 'Musa', 'Ngozi', 'Obinna', 'Peace', 'Rita', 'Samuel',
    'Tunde', 'Uche', 'Victor', 'Winnie', 'Yakubu', 'Zainab', 'Chinedu', 'Amaka', 'Bola', 'Efe',
    'Ifeoma', 'Segun'];

  var LAST_NAMES = ['Abasi', 'Bassey', 'Chukwu', 'Danjuma', 'Edet', 'Effiong', 'Ekpo', 'Etim',
    'Henshaw', 'Ibanga', 'Idris', 'James', 'Kalu', 'Mba', 'Ndoma', 'Obi', 'Okafor', 'Okon',
    'Okoro', 'Onuoha'];

  var CLASS_LEVELS = ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];

  Seed.build = function () {
    var rand = Utils.seededRandom(20261009);
    var now = new Date();
    var nowISO = now.toISOString();

    /* ---- School ---- */
    var school = {
      id: 'SCH-001',
      name: 'Greenfield Model College',
      slug: 'greenfield',
      address: '12 Demo Avenue, Calabar, Cross River State',
      email: 'info@greenfield.edupay.demo',
      phone: '08030000000',
      contact: 'Bursary Office, Greenfield Model College',
      plan: 'Professional',
      status: 'Active',
      createdAt: nowISO
    };

    /* ---- Academic sessions ---- */
    var academicSessions = [
      { id: 'SES-2024', label: '2024/2025', term: 'Full Session', startDate: '2024-09-09', endDate: '2025-07-18', status: 'Completed', schoolId: school.id },
      { id: 'SES-2025', label: '2025/2026', term: 'Full Session', startDate: '2025-09-08', endDate: '2026-07-17', status: 'Completed', schoolId: school.id },
      { id: 'SES-2026', label: '2026/2027', term: 'First Term', startDate: '2026-09-07', endDate: '2026-12-18', status: 'Active', schoolId: school.id }
    ];
    var currentSession = academicSessions[2];

    /* ---- Classes ---- */
    var classes = CLASS_LEVELS.map(function (level, i) {
      return {
        id: 'CLS-' + Utils.pad(i + 1, 3),
        name: level,
        level: level,
        schoolId: school.id,
        sessionId: currentSession.id,
        capacity: 45,
        status: 'Active'
      };
    });

    /* ---- Fee structures ---- */
    var fees = [];
    var feeSeq = 1;
    function addFee(rec) {
      rec.id = 'FEE-' + Utils.pad(feeSeq++, 4);
      rec.schoolId = school.id;
      rec.currency = CONFIG.currency.code;
      rec.createdAt = nowISO;
      if (rec.active === undefined) rec.active = true;
      fees.push(rec);
      return rec;
    }

    var tuitionByClass = {
      'JSS 1': 145000, 'JSS 2': 150000, 'JSS 3': 165000,
      'SSS 1': 175000, 'SSS 2': 185000, 'SSS 3': 195000
    };

    academicSessions.forEach(function (ses) {
      CLASS_LEVELS.forEach(function (level) {
        var base = tuitionByClass[level];
        var factor = ses.label === '2024/2025' ? 0.85 : (ses.label === '2025/2026' ? 0.93 : 1);
        addFee({
          name: 'Tuition Fee', category: 'Tuition', amount: Utils.round2(base * factor),
          sessionId: ses.id, sessionLabel: ses.label, classLevel: level,
          dueDate: ses.label === '2026/2027' ? '2026-10-30' : ses.endDate,
          mandatory: true, active: ses.status !== 'Completed',
          paymentPlan: { allowed: true, instalments: CONFIG.planInstalments }
        });
      });

      addFee({
        name: 'Registration Fee', category: 'Registration', amount: 15000,
        sessionId: ses.id, sessionLabel: ses.label, classLevel: 'All',
        dueDate: ses.startDate, mandatory: true, active: ses.status !== 'Completed',
        paymentPlan: { allowed: false, instalments: [] }
      });
      addFee({
        name: 'Examination Fee', category: 'Examination', amount: 12000,
        sessionId: ses.id, sessionLabel: ses.label, classLevel: 'All',
        dueDate: ses.endDate, mandatory: true, active: ses.status !== 'Completed',
        paymentPlan: { allowed: false, instalments: [] }
      });
      addFee({
        name: 'Library & Technology Levy', category: 'Technology', amount: 8500,
        sessionId: ses.id, sessionLabel: ses.label, classLevel: 'All',
        dueDate: ses.startDate, mandatory: true, active: ses.status !== 'Completed',
        paymentPlan: { allowed: false, instalments: [] }
      });
      addFee({
        name: 'Sports Levy', category: 'Sports', amount: 4500,
        sessionId: ses.id, sessionLabel: ses.label, classLevel: 'All',
        dueDate: ses.startDate, mandatory: false, active: ses.status !== 'Completed',
        paymentPlan: { allowed: false, instalments: [] }
      });
      addFee({
        name: 'Boarding / Accommodation', category: 'Accommodation', amount: 60000,
        sessionId: ses.id, sessionLabel: ses.label, classLevel: 'All',
        dueDate: ses.startDate, mandatory: false, active: ses.status !== 'Completed',
        paymentPlan: { allowed: true, instalments: CONFIG.planInstalments }
      });
    });

    /* ---- Students (30) ---- */
    var students = [];
    for (var i = 0; i < 30; i++) {
      var first = FIRST_NAMES[i % FIRST_NAMES.length];
      var last = LAST_NAMES[(i * 7) % LAST_NAMES.length];
      var level = CLASS_LEVELS[i % CLASS_LEVELS.length];
      var code = 'GMC/' + Utils.pad(1000 + i + 1, 4);
      students.push({
        id: 'STU-' + Utils.pad(i + 1, 4),
        studentCode: code,
        name: first + ' ' + last,
        email: Utils.slug(first + '.' + last) + '@student.edupay.demo',
        phone: '080' + Utils.pad(30000000 + i * 137, 8).slice(0, 8),
        schoolId: school.id,
        classLevel: level,
        classId: classes[CLASS_LEVELS.indexOf(level)].id,
        sessionId: currentSession.id,
        guardianIds: [],
        status: 'Active',
        createdAt: nowISO
      });
    }

    /* ---- Parents (10), each linked to 1–4 students ---- */
    var parents = [];
    for (var p = 0; p < 10; p++) {
      var pf = FIRST_NAMES[(p * 3 + 4) % FIRST_NAMES.length];
      var pl = LAST_NAMES[(p * 5 + 2) % LAST_NAMES.length];
      var parent = {
        id: 'PAR-' + Utils.pad(p + 1, 3),
        name: pf + ' ' + pl,
        email: p === 0 ? 'parent@edupay.demo' : Utils.slug(pf + '.' + pl) + '@parent.edupay.demo',
        phone: '080' + Utils.pad(40000000 + p * 211, 8).slice(0, 8),
        schoolId: school.id,
        relationship: p % 2 === 0 ? 'Father' : 'Mother',
        linkedStudentIds: [],
        status: 'Active',
        createdAt: nowISO
      };
      parents.push(parent);
    }

    /* First parent is linked to the first three students so the demo parent
       account has multiple children to switch between. */
    parents[0].linkedStudentIds = [students[0].id, students[1].id, students[2].id];
    students[0].guardianIds.push(parents[0].id);
    students[1].guardianIds.push(parents[0].id);
    students[2].guardianIds.push(parents[0].id);

    for (var s = 3; s < students.length; s++) {
      var parentIdx = 1 + (s % 9);
      parents[parentIdx].linkedStudentIds.push(students[s].id);
      students[s].guardianIds.push(parents[parentIdx].id);
    }

    /* ---- Users: 30 students, 10 parents, 5 staff + super admin ---- */
    var users = [];

    function userRecord(o) {
      return {
        id: o.id,
        name: o.name,
        email: o.email,
        password: o.password,
        role: o.role,
        schoolId: school.id,
        studentId: o.studentId || null,
        parentId: o.parentId || null,
        phone: o.phone || '',
        status: 'Active',
        verified: true,
        createdAt: nowISO,
        lastLoginAt: null
      };
    }

    students.forEach(function (st) {
      users.push(userRecord({
        id: 'USR-' + st.id,
        name: st.name,
        email: st.email,
        password: 'Student123!',
        role: 'student',
        studentId: st.id,
        phone: st.phone
      }));
    });

    parents.forEach(function (pa) {
      users.push(userRecord({
        id: 'USR-' + pa.id,
        name: pa.name,
        email: pa.email,
        password: 'Parent123!',
        role: 'parent',
        parentId: pa.id,
        phone: pa.phone
      }));
    });

    users.push(userRecord({
      id: 'USR-STAFF-001', name: 'Ngozi Effiong', email: 'finance@edupay.demo',
      password: 'Finance123!', role: 'finance', phone: '08031112222'
    }));
    users.push(userRecord({
      id: 'USR-STAFF-002', name: 'Ibrahim Danjuma', email: 'finance2@edupay.demo',
      password: 'Finance123!', role: 'finance', phone: '08031113333'
    }));
    users.push(userRecord({
      id: 'USR-STAFF-003', name: 'Grace Okon', email: 'admin@edupay.demo',
      password: 'Admin123!', role: 'admin', phone: '08031114444'
    }));
    users.push(userRecord({
      id: 'USR-STAFF-004', name: 'Samuel Etim', email: 'registrar@edupay.demo',
      password: 'Registrar123!', role: 'admin', phone: '08031115555'
    }));
    users.push(userRecord({
      id: 'USR-STAFF-005', name: 'Platform Operations', email: 'superadmin@edupay.demo',
      password: 'SuperAdmin123!', role: 'superadmin', phone: '08031116666'
    }));

    /* ---- Transactions (25) ----
       Distribution: 15 Successful, 4 Pending, 3 Failed, 1 Cancelled,
       1 Under Review, 1 Reversed = 25.                              */
    var plan = [
      { status: 'Successful', method: 'Card' },
      { status: 'Successful', method: 'Bank Transfer' },
      { status: 'Successful', method: 'Gateway Checkout' },
      { status: 'Successful', method: 'USSD' },
      { status: 'Successful', method: 'Card' },
      { status: 'Successful', method: 'Bank Transfer' },
      { status: 'Successful', method: 'Gateway Checkout' },
      { status: 'Successful', method: 'Card' },
      { status: 'Successful', method: 'Bank Transfer' },
      { status: 'Successful', method: 'USSD' },
      { status: 'Successful', method: 'Card' },
      { status: 'Successful', method: 'Gateway Checkout' },
      { status: 'Successful', method: 'Bank Transfer' },
      { status: 'Successful', method: 'Card' },
      { status: 'Successful', method: 'Bank Transfer' },
      { status: 'Pending', method: 'Bank Transfer' },
      { status: 'Pending', method: 'Gateway Checkout' },
      { status: 'Pending', method: 'USSD' },
      { status: 'Pending', method: 'Bank Transfer' },
      { status: 'Failed', method: 'Card' },
      { status: 'Failed', method: 'Gateway Checkout' },
      { status: 'Failed', method: 'Card' },
      { status: 'Cancelled', method: 'USSD' },
      { status: 'Under Review', method: 'Offline Submission' },
      { status: 'Reversed', method: 'Bank Transfer' }
    ];

    var transactions = [];
    var receipts = [];
    var tuitionFees = fees.filter(function (f) {
      return f.sessionId === currentSession.id && f.category === 'Tuition' && f.active;
    });

    plan.forEach(function (entry, idx) {
      var student = students[idx % students.length];
      var tuition = tuitionFees.filter(function (f) { return f.classLevel === student.classLevel; })[0] || tuitionFees[0];
      var amount = idx % 5 === 0
        ? Utils.round2(tuition.amount * 0.4)
        : (idx % 3 === 0 ? Utils.round2(tuition.amount * 0.6) : tuition.amount);

      var daysAgo = 120 - idx * 4;
      var created = new Date(now.getTime() - daysAgo * 86400000);
      var confirmed = entry.status === 'Successful' || entry.status === 'Reversed'
        ? new Date(created.getTime() + 6 * 60000) : null;

      var tx = {
        id: 'TXN-' + Utils.pad(idx + 1, 4),
        reference: 'EDP-2026-' + Utils.pad(idx + 1, 6),
        schoolId: school.id,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.name,
        classLevel: student.classLevel,
        sessionId: currentSession.id,
        sessionLabel: currentSession.label,
        feeIds: [tuition.id],
        feeLabel: tuition.name,
        category: tuition.category,
        amount: amount,
        currency: CONFIG.currency.code,
        method: entry.method,
        type: 'Payment',
        status: entry.status,
        provider: entry.method === 'Offline Submission' ? 'Manual' : 'DemoPay',
        providerReference: 'PRV-' + Utils.pad(idx + 1, 8),
        createdAt: created.toISOString(),
        updatedAt: (confirmed || created).toISOString(),
        confirmedAt: confirmed ? confirmed.toISOString() : null,
        receiptId: null,
        verification: entry.status === 'Under Review'
          ? { decision: 'Pending', reason: '', reviewerId: null, reviewerName: null, at: null }
          : null,
        notes: entry.status === 'Reversed' ? 'Payment reversed after provider dispute review.' : ''
      };
      transactions.push(tx);
    });

    /* ---- Receipts: one per Successful transaction (15) ---- */
    var receiptSeq = 1;
    transactions.forEach(function (tx) {
      if (tx.status !== 'Successful') return;
      var receipt = {
        id: 'RCP-' + Utils.pad(receiptSeq, 4),
        receiptNumber: 'EDP-RCP-' + Utils.pad(receiptSeq, 6),
        transactionId: tx.id,
        reference: tx.reference,
        schoolId: school.id,
        studentId: tx.studentId,
        studentName: tx.studentName,
        studentCode: tx.studentCode,
        classLevel: tx.classLevel,
        sessionId: tx.sessionId,
        sessionLabel: tx.sessionLabel,
        feeLabel: tx.feeLabel,
        amount: tx.amount,
        currency: tx.currency,
        method: tx.method,
        paidAt: tx.confirmedAt,
        status: 'Valid',
        issuedBy: 'EduPay System',
        createdAt: tx.confirmedAt
      };
      receipts.push(receipt);
      tx.receiptId = receipt.id;
      receiptSeq++;
    });

    /* ---- Approved adjustments (scholarship / bursary) ---- */
    var adjustments = [
      { studentId: students[4].id, amount: -25000, note: 'Merit scholarship award (approved)' },
      { studentId: students[11].id, amount: -15000, note: 'Staff ward discount (approved)' }
    ];
    adjustments.forEach(function (adj, i) {
      transactions.push({
        id: 'TXN-ADJ-' + Utils.pad(i + 1, 3),
        reference: 'EDP-ADJ-2026-' + Utils.pad(i + 1, 4),
        schoolId: school.id,
        studentId: adj.studentId,
        studentCode: students.filter(function (s) { return s.id === adj.studentId; })[0].studentCode,
        studentName: students.filter(function (s) { return s.id === adj.studentId; })[0].name,
        classLevel: students.filter(function (s) { return s.id === adj.studentId; })[0].classLevel,
        sessionId: currentSession.id,
        sessionLabel: currentSession.label,
        feeIds: [],
        feeLabel: 'Approved Adjustment',
        category: 'Other',
        amount: adj.amount,
        currency: CONFIG.currency.code,
        method: 'Manual',
        type: 'Adjustment',
        status: 'Approved',
        provider: 'Manual',
        providerReference: '',
        createdAt: new Date(now.getTime() - 40 * 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 40 * 86400000).toISOString(),
        confirmedAt: new Date(now.getTime() - 40 * 86400000).toISOString(),
        receiptId: null,
        verification: null,
        notes: adj.note
      });
    });

    /* ---- Notifications ---- */
    var notifications = [];
    var notifSeq = 1;
    function addNotification(userId, title, body, type, link, read, daysAgo) {
      notifications.push({
        id: 'NTF-' + Utils.pad(notifSeq++, 4),
        userId: userId,
        title: title,
        body: body,
        type: type,
        link: link || '',
        read: !!read,
        createdAt: new Date(now.getTime() - (daysAgo || 0) * 86400000).toISOString()
      });
    }

    var demoStudent = students[0];
    var demoStudentUser = 'USR-' + demoStudent.id;
    var demoParentUser = 'USR-PAR-001';

    addNotification(demoStudentUser, 'Payment successful', 'Your payment of ' + Utils.formatCurrency(145000) + ' was confirmed. Receipt EDP-RCP-000001 is ready to download.', 'success', 'receipt.html?receipt=RCP-0001', false, 1);
    addNotification(demoStudentUser, 'Fee reminder', 'Tuition fee for 2026/2027 is due on 30 Oct 2026. Outstanding balance: ' + Utils.formatCurrency(0) + '.', 'warning', 'fee-statement.html', false, 2);
    addNotification(demoStudentUser, 'Receipt generated', 'A receipt has been generated for transaction EDP-2026-000001.', 'info', 'payment-history.html', true, 3);
    addNotification(demoParentUser, 'Child payment confirmed', 'Payment for ' + students[0].name + ' was confirmed successfully.', 'success', 'parent-dashboard.html', false, 1);
    addNotification(demoParentUser, 'Upcoming deadline', 'Examination fee for ' + students[1].name + ' is due soon.', 'warning', 'parent-dashboard.html', false, 2);
    addNotification(demoParentUser, 'Payment pending', 'A bank transfer payment for ' + students[2].name + ' is awaiting confirmation.', 'info', 'parent-dashboard.html', true, 4);
    addNotification('USR-STAFF-001', 'Transactions awaiting verification', '4 transactions require finance review.', 'warning', 'finance/verify-payment.html', false, 0);
    addNotification('USR-STAFF-001', 'Reconciliation completed', 'The latest reconciliation run produced matched and unmatched records.', 'info', 'finance/reconciliation.html', true, 5);
    addNotification('USR-STAFF-003', 'New students enrolled', 'Students have been added for the 2026/2027 session.', 'info', 'admin/students.html', false, 2);
    addNotification('USR-STAFF-003', 'Fee structure active', 'Active fee structures have been published for 2026/2027.', 'info', 'admin/fee-management.html', true, 6);
    addNotification('USR-STAFF-005', 'Platform usage summary', 'Tenant usage statistics are available for review.', 'info', 'admin/dashboard.html', true, 1);
    addNotification(demoStudentUser, 'Announcement', 'First term resumption date: 7 September 2026.', 'info', 'notifications.html', false, 7);

    /* ---- Audit log ---- */
    var auditLogs = [];
    var auditSeq = 1;
    function addAudit(actorId, actorName, action, target, summary, reference, daysAgo) {
      auditLogs.push({
        id: 'AUD-' + Utils.pad(auditSeq++, 5),
        schoolId: school.id,
        actorId: actorId,
        actorName: actorName,
        action: action,
        target: target,
        summary: summary,
        reference: reference || '',
        createdAt: new Date(now.getTime() - (daysAgo || 0) * 86400000).toISOString()
      });
    }

    addAudit('USR-STAFF-003', 'Grace Okon', 'Student created', 'Student record', 'Bulk enrolment of 30 students for 2026/2027.', '', 30);
    addAudit('USR-STAFF-003', 'Grace Okon', 'Fee structure published', 'Fee structure', 'Tuition, registration, examination and library fees activated for 2026/2027.', '', 28);
    addAudit('USR-STAFF-003', 'Grace Okon', 'Academic session activated', 'Session', '2026/2027 First Term set as the active session.', 'SES-2026', 28);
    addAudit('USR-STAFF-001', 'Ngozi Effiong', 'Payment confirmed', 'Transaction', 'Demo card payment confirmed.', 'EDP-2026-000001', 26);
    addAudit('USR-STAFF-001', 'Ngozi Effiong', 'Receipt generated', 'Receipt', 'Receipt issued for confirmed payment.', 'EDP-RCP-000001', 26);
    addAudit('USR-STAFF-001', 'Ngozi Effiong', 'Verification decision', 'Transaction', 'Offline submission placed under review pending bank confirmation.', 'EDP-2026-0024', 9);
    addAudit('USR-STAFF-002', 'Ibrahim Danjuma', 'Reconciliation run', 'Reconciliation', 'Bank settlement CSV imported and matched against transactions.', '', 5);
    addAudit('USR-STAFF-003', 'Grace Okon', 'CSV export', 'Report', 'Collections report exported to CSV.', '', 4);
    addAudit('USR-STAFF-001', 'Ngozi Effiong', 'Payment reversed', 'Transaction', 'Payment reversed after provider dispute review.', 'EDP-2026-0025', 3);
    addAudit('USR-STAFF-005', 'Platform Operations', 'Settings updated', 'Platform settings', 'Tenant plan reviewed for Greenfield Model College.', 'SCH-001', 2);
    addAudit('USR-STAFF-003', 'Grace Okon', 'Adjustment approved', 'Transaction', 'Merit scholarship adjustment approved.', 'EDP-ADJ-2026-0001', 40);
    addAudit('USR-STAFF-003', 'Grace Okon', 'Notification sent', 'Announcement', 'Resumption announcement published in-app.', '', 7);

    /* ---- Settings ---- */
    var settings = {
      schoolId: school.id,
      currency: CONFIG.currency.code,
      currentSessionId: currentSession.id,
      partialPaymentsEnabled: true,
      paymentPlansEnabled: true,
      receiptPrefix: 'EDP-RCP',
      referencePrefix: 'EDP',
      lateFeeEnabled: false,
      notifyOnPayment: true,
      notifyOnDeadline: true,
      maintenanceMode: false
    };

    return {
      schools: [school],
      academicSessions: academicSessions,
      classes: classes,
      fees: fees,
      students: students,
      parents: parents,
      users: users,
      transactions: transactions,
      receipts: receipts,
      notifications: notifications,
      auditLogs: auditLogs,
      settings: settings,
      reconciliation: []
    };
  };

  Seed.install = function (force) {
    var installed = Storage.get(CONFIG.keys.seed, null);
    var hasData = (Storage.collection(CONFIG.keys.students).length > 0);
    if (installed === CONFIG.seedVersion && hasData && !force) return false;

    var data = Seed.build();
    Storage.set(CONFIG.keys.schools, data.schools);
    Storage.set(CONFIG.keys.sessions, data.academicSessions);
    Storage.set(CONFIG.keys.classes, data.classes);
    Storage.set(CONFIG.keys.fees, data.fees);
    Storage.set(CONFIG.keys.students, data.students);
    Storage.set(CONFIG.keys.parents, data.parents);
    Storage.set(CONFIG.keys.users, data.users);
    Storage.set(CONFIG.keys.transactions, data.transactions);
    Storage.set(CONFIG.keys.receipts, data.receipts);
    Storage.set(CONFIG.keys.notifications, data.notifications);
    Storage.set(CONFIG.keys.audit, data.auditLogs);
    Storage.set(CONFIG.keys.settings, data.settings);
    Storage.set(CONFIG.keys.reconciliation, data.reconciliation);
    Storage.set(CONFIG.keys.seed, CONFIG.seedVersion);
    return true;
  };

  /* ========================================================================
     05. MOCK API LAYER
     ------------------------------------------------------------------------
     All functions are asynchronous and return { ok, data } or { ok, error }
     so the UI never touches storage directly and a real backend can replace
     this module without changing the pages.
     ======================================================================== */
  var API = (NS.api = {});

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, typeof ms === 'number' ? ms : 180); });
  }
  function ok(data) { return { ok: true, data: data }; }
  function fail(error, code) { return { ok: false, error: error, code: code || 'ERROR' }; }

  API.reset = function () {
    Object.keys(CONFIG.keys).forEach(function (k) { Storage.remove(CONFIG.keys[k]); });
    Seed.install(true);
    return ok({ reseeded: true });
  };

  /* ---------------- Audit ---------------- */
  API.createAuditLog = function (actor, action, target, summary, reference) {
    var entry = {
      id: Utils.uid('AUD'),
      schoolId: actor && actor.schoolId ? actor.schoolId : null,
      actorId: actor ? actor.id : null,
      actorName: actor ? actor.name : 'System',
      action: action,
      target: target || '',
      summary: summary || '',
      reference: reference || '',
      createdAt: Utils.isoNow()
    };
    var rows = Storage.collection(CONFIG.keys.audit);
    rows.unshift(entry);
    Storage.save(CONFIG.keys.audit, rows);
    return ok(entry);
  };

  API.getAuditLogs = function (filters) {
    var f = filters || {};
    var rows = Storage.collection(CONFIG.keys.audit);
    if (f.action) rows = rows.filter(function (r) { return r.action === f.action; });
    if (f.actorId) rows = rows.filter(function (r) { return r.actorId === f.actorId; });
    if (f.search) {
      var q = String(f.search).toLowerCase();
      rows = rows.filter(function (r) {
        return [r.action, r.actorName, r.target, r.summary, r.reference]
          .join(' ').toLowerCase().indexOf(q) >= 0;
      });
    }
    return delay(80).then(function () { return ok(rows); });
  };

  /* ---------------- Auth ---------------- */
  API.loginUser = function (identifier, password, remember) {
    return delay(320).then(function () {
      var id = String(identifier || '').trim().toLowerCase();
      if (!id) return fail('Enter your email address or student ID.', 'MISSING_IDENTIFIER');
      if (!password) return fail('Enter your password.', 'MISSING_PASSWORD');

      var users = Storage.collection(CONFIG.keys.users);
      var user = null;
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        if (u.email.toLowerCase() === id) { user = u; break; }
        if (u.role === 'student' && u.studentId) {
          var st = Storage.findById(CONFIG.keys.students, u.studentId);
          if (st && st.studentCode.toLowerCase() === id) { user = u; break; }
        }
      }

      if (!user) return fail('No account matches those details. Check your email or student ID.', 'UNKNOWN_USER');
      if (user.password !== password) return fail('Incorrect password. Please try again.', 'BAD_PASSWORD');
      if (user.status !== 'Active') return fail('This account has been deactivated. Contact your school administrator.', 'INACTIVE');

      var session = {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        studentId: user.studentId || null,
        parentId: user.parentId || null,
        remember: !!remember,
        startedAt: Utils.isoNow()
      };
      Storage.set(CONFIG.keys.session, session);

      user.lastLoginAt = Utils.isoNow();
      Storage.upsert(CONFIG.keys.users, user);
      API.createAuditLog(user, 'Login', 'Session', user.name + ' signed in.', user.id);

      return ok(session);
    });
  };

  API.demoLogin = function (role) {
    var map = {
      student: 'student@edupay.demo',
      parent: 'parent@edupay.demo',
      finance: 'finance@edupay.demo',
      admin: 'admin@edupay.demo',
      superadmin: 'superadmin@edupay.demo'
    };
    var passwords = {
      student: 'Student123!',
      parent: 'Parent123!',
      finance: 'Finance123!',
      admin: 'Admin123!',
      superadmin: 'SuperAdmin123!'
    };
    if (!map[role]) return Promise.resolve(fail('Unknown demo role.', 'UNKNOWN_ROLE'));
    var users = Storage.collection(CONFIG.keys.users);
    var user = users.filter(function (record) {
      return record.role === role && record.email.toLowerCase() === map[role];
    })[0];
    if (!user && role === 'student') {
      user = users.filter(function (record) { return record.role === role; })[0];
    }
    if (!user) return Promise.resolve(fail('The demo account is not available.', 'DEMO_ACCOUNT_MISSING'));
    return API.loginUser(user.email, user.password || passwords[role], true);
  };

  API.registerUser = function (payload) {
    return delay(380).then(function () {
      var p = payload || {};
      var email = String(p.email || '').trim().toLowerCase();
      var users = Storage.collection(CONFIG.keys.users);

      if (users.some(function (u) { return u.email.toLowerCase() === email; })) {
        return fail('An account with that email already exists.', 'DUPLICATE_EMAIL');
      }
      if (p.role && ['finance', 'admin', 'superadmin'].indexOf(p.role) >= 0) {
        return fail('Finance and administrative accounts must be created by an authorised administrator.', 'ROLE_FORBIDDEN');
      }

      var role = p.role === 'parent' ? 'parent' : 'student';
      var schoolId = p.schoolId || 'SCH-001';
      var user = {
        id: Utils.uid('USR'),
        name: String(p.name || '').trim(),
        email: email,
        password: p.password,
        role: role,
        schoolId: schoolId,
        studentId: null,
        parentId: null,
        phone: p.phone || '',
        status: 'Active',
        verified: false,
        verificationCode: CONFIG.demoCode,
        resetToken: null,
        createdAt: Utils.isoNow(),
        lastLoginAt: null
      };

      if (role === 'student') {
        var code = String(p.studentCode || '').trim().toUpperCase();
        var existing = Storage.collection(CONFIG.keys.students).filter(function (s) {
          return s.studentCode.toUpperCase() === code;
        })[0];
        if (existing) {
          user.studentId = existing.id;
          if (existing.guardianIds.indexOf(user.parentId) < 0) { /* placeholder */ }
        } else {
          var newStudent = {
            id: Utils.uid('STU'),
            studentCode: code,
            name: user.name,
            email: email,
            phone: user.phone,
            schoolId: schoolId,
            classLevel: p.classLevel || 'JSS 1',
            classId: null,
            sessionId: Storage.get(CONFIG.keys.settings, {}).currentSessionId || 'SES-2026',
            guardianIds: [],
            status: 'Active',
            createdAt: Utils.isoNow()
          };
          Storage.upsert(CONFIG.keys.students, newStudent);
          user.studentId = newStudent.id;
        }
      } else {
        var newParent = {
          id: Utils.uid('PAR'),
          name: user.name,
          email: email,
          phone: user.phone,
          schoolId: schoolId,
          relationship: p.relationship || 'Guardian',
          linkedStudentIds: [],
          status: 'Active',
          createdAt: Utils.isoNow()
        };
        if (p.studentCode) {
          var linked = Storage.collection(CONFIG.keys.students).filter(function (s) {
            return s.studentCode.toUpperCase() === String(p.studentCode).trim().toUpperCase();
          })[0];
          if (linked) {
            newParent.linkedStudentIds.push(linked.id);
            linked.guardianIds = linked.guardianIds || [];
            linked.guardianIds.push(newParent.id);
            Storage.upsert(CONFIG.keys.students, linked);
          }
        }
        Storage.upsert(CONFIG.keys.parents, newParent);
        user.parentId = newParent.id;
      }

      Storage.upsert(CONFIG.keys.users, user);
      API.createAuditLog(user, 'Registration', 'User account', 'New ' + role + ' account registered.', user.id);

      API.notify(user.id, 'Welcome to EduPay', 'Verify your account to complete setup. Your demo verification code is ' + CONFIG.demoCode + '.', 'info', 'verify-account.html');

      return ok({ user: user, verificationCode: CONFIG.demoCode });
    });
  };

  API.verifyAccount = function (email, code) {
    return delay(300).then(function () {
      var users = Storage.collection(CONFIG.keys.users);
      var user = users.filter(function (u) { return u.email.toLowerCase() === String(email || '').toLowerCase(); })[0];
      if (!user) return fail('No account found for that email address.', 'UNKNOWN_USER');
      if (String(code).trim() !== String(user.verificationCode || CONFIG.demoCode)) {
        return fail('That verification code is not valid.', 'BAD_CODE');
      }
      user.verified = true;
      Storage.upsert(CONFIG.keys.users, user);
      API.createAuditLog(user, 'Account verified', 'User account', 'Email verification completed.', user.id);
      return ok(user);
    });
  };

  API.requestPasswordReset = function (email) {
    return delay(320).then(function () {
      var users = Storage.collection(CONFIG.keys.users);
      var user = users.filter(function (u) { return u.email.toLowerCase() === String(email || '').toLowerCase(); })[0];
      /* Always report success so the form cannot be used to discover accounts. */
      if (user) {
        user.resetToken = 'DEMO-' + Utils.pad(Math.floor(Math.random() * 900000) + 100000, 6);
        Storage.upsert(CONFIG.keys.users, user);
        API.createAuditLog(user, 'Password reset requested', 'User account', 'Reset requested for ' + user.email + '.', user.id);
        return ok({ email: user.email, token: user.resetToken, exists: true });
      }
      return ok({ email: String(email || ''), token: null, exists: false });
    });
  };

  API.resetPassword = function (email, token, password) {
    return delay(320).then(function () {
      var users = Storage.collection(CONFIG.keys.users);
      var user = users.filter(function (u) { return u.email.toLowerCase() === String(email || '').toLowerCase(); })[0];
      if (!user) return fail('No account found for that email address.', 'UNKNOWN_USER');
      if (!user.resetToken || user.resetToken !== String(token || '').trim()) {
        return fail('That reset code is not valid or has expired.', 'BAD_TOKEN');
      }
      user.password = password;
      user.resetToken = null;
      Storage.upsert(CONFIG.keys.users, user);
      API.createAuditLog(user, 'Password reset', 'User account', 'Password changed via reset flow.', user.id);
      return ok(user);
    });
  };

  API.getCurrentUser = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (!session) return null;
    var user = Storage.collection(CONFIG.keys.users).filter(function (u) { return u.id === session.userId; })[0];
    return user ? Object.assign({}, user, { password: undefined }) : Object.assign({}, session);
  };

  API.getSession = function () { return Storage.get(CONFIG.keys.session, null); };

  API.logoutUser = function () {
    var user = API.getCurrentUser();
    if (user) API.createAuditLog(user, 'Logout', 'Session', (user.name || 'User') + ' signed out.', user.id);
    Storage.remove(CONFIG.keys.session);
    return ok(true);
  };

  /* ---------------- Schools & settings ---------------- */
  API.getSchools = function () { return delay(60).then(function () { return ok(Storage.collection(CONFIG.keys.schools)); }); };
  API.getSchoolById = function (id) { return Storage.findById(CONFIG.keys.schools, id); };
  API.getSettings = function () { return Storage.get(CONFIG.keys.settings, {}); };
  API.saveSettings = function (patch) {
    var settings = Object.assign({}, Storage.get(CONFIG.keys.settings, {}), patch || {});
    Storage.set(CONFIG.keys.settings, settings);
    return delay(160).then(function () { return ok(settings); });
  };

  /* ---------------- Sessions & classes ---------------- */
  API.getAcademicSessions = function () { return delay(60).then(function () { return ok(Storage.collection(CONFIG.keys.sessions)); }); };
  API.getActiveSession = function () {
    var id = Storage.get(CONFIG.keys.settings, {}).currentSessionId;
    var list = Storage.collection(CONFIG.keys.sessions);
    return list.filter(function (s) { return s.id === id; })[0] || list.filter(function (s) { return s.status === 'Active'; })[0] || list[0] || null;
  };
  API.getClasses = function () { return delay(60).then(function () { return ok(Storage.collection(CONFIG.keys.classes)); }); };

  /* ---------------- Students & parents ---------------- */
  API.getStudents = function (filters) {
    var f = filters || {};
    var rows = Storage.collection(CONFIG.keys.students);
    if (f.schoolId) rows = rows.filter(function (r) { return r.schoolId === f.schoolId; });
    if (f.classLevel) rows = rows.filter(function (r) { return r.classLevel === f.classLevel; });
    if (f.status) rows = rows.filter(function (r) { return r.status === f.status; });
    if (f.ids) rows = rows.filter(function (r) { return f.ids.indexOf(r.id) >= 0; });
    if (f.search) {
      var q = String(f.search).toLowerCase();
      rows = rows.filter(function (r) {
        return (r.name + ' ' + r.studentCode + ' ' + r.classLevel).toLowerCase().indexOf(q) >= 0;
      });
    }
    return delay(80).then(function () { return ok(rows); });
  };

  API.getStudentById = function (id) {
    return delay(40).then(function () {
      var s = Storage.findById(CONFIG.keys.students, id);
      return s ? ok(s) : fail('Student record not found.', 'NOT_FOUND');
    });
  };

  API.getStudentByCode = function (code) {
    var s = Storage.collection(CONFIG.keys.students).filter(function (r) {
      return r.studentCode.toUpperCase() === String(code || '').trim().toUpperCase();
    })[0];
    return s || null;
  };

  API.getParents = function (filters) {
    var f = filters || {};
    var rows = Storage.collection(CONFIG.keys.parents);
    if (f.search) {
      var q = String(f.search).toLowerCase();
      rows = rows.filter(function (r) { return (r.name + ' ' + r.email).toLowerCase().indexOf(q) >= 0; });
    }
    return delay(80).then(function () { return ok(rows); });
  };

  API.getParentById = function (id) { return Storage.findById(CONFIG.keys.parents, id); };

  API.getAuthorisedStudents = function (user) {
    if (!user) return delay(40).then(function () { return ok([]); });
    var all = Storage.collection(CONFIG.keys.students);
    if (user.role === 'student') {
      return delay(40).then(function () { return ok(all.filter(function (s) { return s.id === user.studentId; })); });
    }
    if (user.role === 'parent') {
      var parent = API.getParentById(user.parentId);
      var ids = parent ? parent.linkedStudentIds : [];
      return delay(40).then(function () {
        return ok(all.filter(function (s) { return ids.indexOf(s.id) >= 0; }));
      });
    }
    return delay(60).then(function () { return ok(all); });
  };

  /* Authorisation helper: knowing an ID must never grant access. */
  API.canAccessStudent = function (user, studentId) {
    if (!user) return false;
    if (user.role === 'finance' || user.role === 'admin' || user.role === 'superadmin') return true;
    if (user.role === 'student') return user.studentId === studentId;
    if (user.role === 'parent') {
      var parent = API.getParentById(user.parentId);
      return !!(parent && parent.linkedStudentIds.indexOf(studentId) >= 0);
    }
    return false;
  };

  /* ---------------- Fees & balances ---------------- */
  API.getFees = function (filters) {
    var f = filters || {};
    var rows = Storage.collection(CONFIG.keys.fees);
    if (f.sessionId) rows = rows.filter(function (r) { return r.sessionId === f.sessionId; });
    if (f.classLevel) rows = rows.filter(function (r) { return r.classLevel === f.classLevel || r.classLevel === 'All'; });
    if (f.category) rows = rows.filter(function (r) { return r.category === f.category; });
    if (typeof f.active === 'boolean') rows = rows.filter(function (r) { return !!r.active === f.active; });
    if (f.search) {
      var q = String(f.search).toLowerCase();
      rows = rows.filter(function (r) { return (r.name + ' ' + r.category).toLowerCase().indexOf(q) >= 0; });
    }
    return delay(80).then(function () { return ok(rows); });
  };

  API.getFeeById = function (id) { return Storage.findById(CONFIG.keys.fees, id); };

  API.getApplicableFees = function (student, sessionId) {
    if (!student) return [];
    var list = Storage.collection(CONFIG.keys.fees);
    return list.filter(function (fee) {
      if (!fee.active) return false;
      if (sessionId && fee.sessionId !== sessionId) return false;
      if (fee.classLevel !== 'All' && fee.classLevel !== student.classLevel) return false;
      return true;
    });
  };

  API.getTransactionsForStudent = function (studentId, sessionId) {
    return Storage.collection(CONFIG.keys.transactions).filter(function (t) {
      if (t.studentId !== studentId) return false;
      if (sessionId && t.sessionId !== sessionId) return false;
      return true;
    });
  };

  /* Outstanding = Charges + Approved Adjustments − Confirmed Payments
                   + Applicable Reversals − Applicable Refund Credits */
  API.getFeeBalance = function (studentId, sessionId) {
    var student = Storage.findById(CONFIG.keys.students, studentId);
    var sesId = sessionId || (student ? student.sessionId : null) ||
      Storage.get(CONFIG.keys.settings, {}).currentSessionId;

    var applicable = student ? API.getApplicableFees(student, sesId) : [];
    var mandatory = applicable.filter(function (f) { return f.mandatory; });
    var optional = applicable.filter(function (f) { return !f.mandatory; });

    var charges = mandatory.reduce(function (sum, f) { return sum + Utils.toNumber(f.amount); }, 0);

    var txs = API.getTransactionsForStudent(studentId, sesId);
    var adjustments = 0, payments = 0, reversals = 0, refunds = 0, pending = 0;

    txs.forEach(function (t) {
      var amt = Utils.toNumber(t.amount);
      if (t.type === 'Adjustment' && t.status === 'Approved') adjustments += amt;
      else if (t.type === 'Refund' && (t.status === 'Refunded' || t.status === 'Successful')) refunds += Math.abs(amt);
      else if (t.type === 'Payment') {
        if (t.status === 'Successful') payments += amt;
        else if (t.status === 'Reversed') reversals += amt;
        else if (t.status === 'Pending' || t.status === 'Initiated' || t.status === 'Under Review') pending += amt;
      }
    });

    var outstanding = Utils.round2(charges + adjustments - payments + reversals - refunds);
    if (outstanding < 0) outstanding = 0;
    var netPaid = Utils.round2(Math.max(0, payments - reversals - refunds));

    return {
      studentId: studentId,
      sessionId: sesId,
      charges: Utils.round2(charges),
      adjustments: Utils.round2(adjustments),
      payments: Utils.round2(payments),
      reversals: Utils.round2(reversals),
      refunds: Utils.round2(refunds),
      pending: Utils.round2(pending),
      paid: netPaid,
      outstanding: outstanding,
      mandatoryFees: mandatory,
      optionalFees: optional,
      progress: charges > 0 ? Utils.clamp((netPaid / charges) * 100, 0, 100) : 0
    };
  };

  API.getFeeStatement = function (studentId, sessionId) {
    var student = Storage.findById(CONFIG.keys.students, studentId);
    if (!student) return delay(60).then(function () { return fail('Student record not found.', 'NOT_FOUND'); });

    var sesId = sessionId || student.sessionId;
    var ses = Storage.findById(CONFIG.keys.sessions, sesId);
    var applicable = API.getApplicableFees(student, sesId);
    var txs = API.getTransactionsForStudent(studentId, sesId);

    var entries = [];
    var running = 0;

    applicable.filter(function (f) { return f.mandatory; }).forEach(function (f) {
      running += Utils.toNumber(f.amount);
      entries.push({
        date: ses ? ses.startDate : '',
        type: 'Charge',
        description: f.name + ' (' + f.category + ')',
        reference: f.id,
        debit: Utils.toNumber(f.amount),
        credit: 0,
        balance: running
      });
    });

    txs.slice().sort(function (a, b) {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }).forEach(function (t) {
      var amt = Utils.toNumber(t.amount);
      var debit = 0, credit = 0, type = t.type;
      if (t.type === 'Adjustment' && t.status === 'Approved') {
        if (amt < 0) { credit = Math.abs(amt); type = 'Adjustment'; }
        else { debit = amt; type = 'Adjustment'; }
      } else if (t.type === 'Payment') {
        if (t.status === 'Successful') { credit = amt; type = 'Payment'; }
        else if (t.status === 'Reversed') { debit = amt; type = 'Reversal'; }
        else return;
      } else if (t.type === 'Refund') {
        credit = Math.abs(amt); type = 'Refund';
      }
      running += debit - credit;
      entries.push({
        date: t.confirmedAt || t.createdAt,
        type: type,
        description: t.feeLabel + ' · ' + t.status,
        reference: t.reference,
        debit: debit,
        credit: credit,
        balance: Utils.round2(running),
        transactionId: t.id
      });
    });

    return delay(120).then(function () {
      return ok({
        student: student,
        session: ses,
        entries: entries,
        balance: API.getFeeBalance(studentId, sesId)
      });
    });
  };

  /* ---------------- Payment workflow ---------------- */
  API.nextReference = function () {
    var prefix = (Storage.get(CONFIG.keys.settings, {}).referencePrefix || 'EDP') + '-2026-';
    var max = 0;
    Storage.collection(CONFIG.keys.transactions).forEach(function (t) {
      if (t.reference && t.reference.indexOf(prefix) === 0) {
        var n = parseInt(t.reference.slice(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return prefix + Utils.pad(max + 1, 6);
  };

  API.nextReceiptNumber = function () {
    var prefix = (Storage.get(CONFIG.keys.settings, {}).receiptPrefix || 'EDP-RCP') + '-';
    var max = 0;
    Storage.collection(CONFIG.keys.receipts).forEach(function (r) {
      if (r.receiptNumber && r.receiptNumber.indexOf(prefix) === 0) {
        var n = parseInt(r.receiptNumber.slice(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return prefix + Utils.pad(max + 1, 6);
  };

  API.createPaymentIntent = function (payload) {
    return delay(420).then(function () {
      var p = payload || {};
      var user = API.getCurrentUser();
      var student = Storage.findById(CONFIG.keys.students, p.studentId);
      if (!student) return fail('Select a student before continuing.', 'NO_STUDENT');
      if (!API.canAccessStudent(user, student.id)) return fail('You are not authorised to pay for this student.', 'FORBIDDEN');

      var sessionId = p.sessionId || student.sessionId;
      var balance = API.getFeeBalance(student.id, sessionId);
      var amount = Utils.toNumber(p.amount);

      if (!amount || amount <= 0) return fail('Enter an amount greater than zero.', 'INVALID_AMOUNT');
      if (amount < CONFIG.limits.minAmount) {
        return fail('Minimum payment amount is ' + Utils.formatCurrency(CONFIG.limits.minAmount) + '.', 'AMOUNT_TOO_SMALL');
      }
      if (amount > balance.outstanding + 0.001) {
        return fail('Amount exceeds the outstanding balance of ' + Utils.formatCurrency(balance.outstanding) + '.', 'AMOUNT_TOO_HIGH');
      }
      if (!p.method || CONFIG.methods.indexOf(p.method) < 0) return fail('Choose a payment method.', 'NO_METHOD');

      /* Duplicate guard: same student, amount and method within 2 minutes. */
      var recent = Storage.collection(CONFIG.keys.transactions).filter(function (t) {
        return t.studentId === student.id && t.status === 'Initiated' &&
          Utils.toNumber(t.amount) === amount && (Date.now() - new Date(t.createdAt).getTime()) < 120000;
      });
      if (recent.length) {
        return fail('An identical payment was just initiated. Please wait a moment before retrying.', 'DUPLICATE');
      }

      var reference = API.nextReference();
      var tx = {
        id: Utils.uid('TXN'),
        reference: reference,
        schoolId: student.schoolId,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.name,
        classLevel: student.classLevel,
        sessionId: sessionId,
        sessionLabel: (Storage.findById(CONFIG.keys.sessions, sessionId) || {}).label || '',
        feeIds: p.feeIds || [],
        feeLabel: p.feeLabel || 'Tuition Fee',
        category: p.category || 'Tuition',
        amount: amount,
        currency: CONFIG.currency.code,
        method: p.method,
        type: 'Payment',
        status: 'Initiated',
        provider: p.method === 'Offline Submission' ? 'Manual' : 'DemoPay',
        providerReference: 'PRV-' + Utils.pad(Math.floor(Math.random() * 99999999) + 1, 8),
        createdAt: Utils.isoNow(),
        updatedAt: Utils.isoNow(),
        confirmedAt: null,
        receiptId: null,
        verification: p.method === 'Offline Submission'
          ? { decision: 'Pending', reason: '', reviewerId: null, reviewerName: null, at: null }
          : null,
        notes: p.notes || ''
      };

      Storage.upsert(CONFIG.keys.transactions, tx);
      API.createAuditLog(user, 'Payment initiated', 'Transaction',
        'Payment of ' + Utils.formatCurrency(amount) + ' initiated for ' + student.name + '.', reference);

      return ok(tx);
    });
  };

  API.confirmDemoPayment = function (transactionId, outcome) {
    return delay(700).then(function () {
      var tx = Storage.findById(CONFIG.keys.transactions, transactionId);
      if (!tx) return fail('Transaction not found.', 'NOT_FOUND');
      if (tx.status === 'Successful') return fail('This payment has already been confirmed.', 'ALREADY_CONFIRMED');

      var result = outcome || 'success';
      var user = API.getCurrentUser();

      if (result === 'success') {
        tx.status = 'Successful';
        tx.confirmedAt = Utils.isoNow();
      } else if (result === 'pending') {
        tx.status = 'Pending';
      } else {
        tx.status = 'Failed';
        tx.failureReason = 'Simulated provider decline for demonstration purposes.';
      }
      tx.updatedAt = Utils.isoNow();
      Storage.upsert(CONFIG.keys.transactions, tx);

      API.createAuditLog(user, 'Payment ' + (result === 'success' ? 'confirmed' : result), 'Transaction',
        'Demo payment ' + result + ' for ' + tx.studentName + '.', tx.reference);

      var receipt = null;
      if (result === 'success') {
        receipt = API.generateReceiptInternal(tx);
        if (tx.studentId) {
          API.notifyForStudent(tx.studentId, 'Payment successful',
            'Your payment of ' + Utils.formatCurrency(tx.amount) + ' was confirmed. Receipt ' + receipt.receiptNumber + ' is ready.',
            'success', 'receipt.html?receipt=' + receipt.id);
        }
      } else if (result === 'pending') {
        if (tx.studentId) {
          API.notifyForStudent(tx.studentId, 'Payment pending',
            'Your payment of ' + Utils.formatCurrency(tx.amount) + ' is awaiting confirmation.', 'info',
            'payment-history.html');
        }
      } else {
        if (tx.studentId) {
          API.notifyForStudent(tx.studentId, 'Payment failed',
            'Your payment of ' + Utils.formatCurrency(tx.amount) + ' was not completed. No balance change was applied.', 'danger',
            'payment.html');
        }
      }

      return ok({ transaction: tx, receipt: receipt });
    });
  };

  API.generateReceiptInternal = function (tx) {
    var existing = Storage.collection(CONFIG.keys.receipts).filter(function (r) {
      return r.transactionId === tx.id;
    })[0];
    if (existing) return existing;

    var student = Storage.findById(CONFIG.keys.students, tx.studentId) || {};
    var receipt = {
      id: Utils.uid('RCP'),
      receiptNumber: API.nextReceiptNumber(),
      transactionId: tx.id,
      reference: tx.reference,
      schoolId: tx.schoolId,
      studentId: tx.studentId,
      studentName: tx.studentName || student.name,
      studentCode: tx.studentCode || student.studentCode,
      classLevel: tx.classLevel || student.classLevel,
      sessionId: tx.sessionId,
      sessionLabel: tx.sessionLabel,
      feeLabel: tx.feeLabel,
      amount: tx.amount,
      currency: tx.currency,
      method: tx.method,
      paidAt: tx.confirmedAt,
      status: 'Valid',
      issuedBy: 'EduPay System',
      createdAt: Utils.isoNow()
    };
    Storage.upsert(CONFIG.keys.receipts, receipt);
    tx.receiptId = receipt.id;
    Storage.upsert(CONFIG.keys.transactions, tx);
    API.createAuditLog(API.getCurrentUser(), 'Receipt generated', 'Receipt',
      'Receipt ' + receipt.receiptNumber + ' issued for ' + receipt.reference + '.', receipt.receiptNumber);
    return receipt;
  };

  API.generateReceipt = function (transactionId) {
    return delay(220).then(function () {
      var tx = Storage.findById(CONFIG.keys.transactions, transactionId);
      if (!tx) return fail('Transaction not found.', 'NOT_FOUND');
      if (tx.status !== 'Successful') {
        return fail('A receipt can only be generated for a confirmed successful payment.', 'NOT_CONFIRMED');
      }
      return ok(API.generateReceiptInternal(tx));
    });
  };

  API.getTransactions = function (filters) {
    var f = filters || {};
    var rows = Storage.collection(CONFIG.keys.transactions).filter(function (t) { return t.type === 'Payment'; });

    if (f.studentIds) rows = rows.filter(function (t) { return f.studentIds.indexOf(t.studentId) >= 0; });
    if (f.studentId) rows = rows.filter(function (t) { return t.studentId === f.studentId; });
    if (f.status && f.status !== 'All') rows = rows.filter(function (t) { return t.status === f.status; });
    if (f.method && f.method !== 'All') rows = rows.filter(function (t) { return t.method === f.method; });
    if (f.sessionId && f.sessionId !== 'All') rows = rows.filter(function (t) { return t.sessionId === f.sessionId; });
    if (f.category && f.category !== 'All') rows = rows.filter(function (t) { return t.category === f.category; });
    if (f.from) rows = rows.filter(function (t) { return new Date(t.createdAt) >= new Date(f.from); });
    if (f.to) {
      var to = new Date(f.to);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter(function (t) { return new Date(t.createdAt) <= to; });
    }
    if (f.search) {
      var q = String(f.search).toLowerCase();
      rows = rows.filter(function (t) {
        return [t.reference, t.studentName, t.studentCode, t.feeLabel, t.status]
          .join(' ').toLowerCase().indexOf(q) >= 0;
      });
    }
    rows.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return delay(100).then(function () { return ok(rows); });
  };

  API.getTransactionByReference = function (reference) {
    var ref = String(reference || '').trim().toUpperCase();
    var tx = Storage.collection(CONFIG.keys.transactions).filter(function (t) {
      return String(t.reference).toUpperCase() === ref;
    })[0];
    return delay(80).then(function () {
      return tx ? ok(tx) : fail('No transaction matches that reference.', 'NOT_FOUND');
    });
  };

  API.getTransactionById = function (id) { return Storage.findById(CONFIG.keys.transactions, id); };

  API.verifyTransaction = function (transactionId, decision, reason) {
    return delay(320).then(function () {
      var tx = Storage.findById(CONFIG.keys.transactions, transactionId);
      if (!tx) return fail('Transaction not found.', 'NOT_FOUND');
      var user = API.getCurrentUser();
      if (!user || (user.role !== 'finance' && user.role !== 'admin' && user.role !== 'superadmin')) {
        return fail('Only finance officers and administrators can record verification decisions.', 'FORBIDDEN');
      }
      if (['Approved', 'Rejected', 'More Information Requested'].indexOf(decision) < 0) {
        return fail('Choose a valid decision.', 'BAD_DECISION');
      }
      if (decision !== 'Approved' && !String(reason || '').trim()) {
        return fail('A reason is required when rejecting or requesting more information.', 'REASON_REQUIRED');
      }

      tx.verification = {
        decision: decision,
        reason: String(reason || '').trim(),
        reviewerId: user.id,
        reviewerName: user.name,
        at: Utils.isoNow()
      };

      if (decision === 'Approved') {
        tx.status = 'Successful';
        tx.confirmedAt = Utils.isoNow();
      } else if (decision === 'Rejected') {
        tx.status = 'Failed';
      } else {
        tx.status = 'Under Review';
      }
      tx.updatedAt = Utils.isoNow();
      Storage.upsert(CONFIG.keys.transactions, tx);

      API.createAuditLog(user, 'Verification decision', 'Transaction',
        decision + ' recorded for ' + tx.reference + (reason ? ' — ' + reason : '.'), tx.reference);

      var receipt = null;
      if (decision === 'Approved') {
        receipt = API.generateReceiptInternal(tx);
        API.notifyForStudent(tx.studentId, 'Payment verified',
          'Your offline payment of ' + Utils.formatCurrency(tx.amount) + ' was approved. Receipt ' + receipt.receiptNumber + ' is ready.',
          'success', 'receipt.html?receipt=' + receipt.id);
      } else {
        API.notifyForStudent(tx.studentId, 'Verification decision',
          'Your payment ' + tx.reference + ' was marked "' + decision + '".' + (reason ? ' Reason: ' + reason : ''),
          decision === 'Rejected' ? 'danger' : 'warning', 'payment-history.html');
      }

      return ok({ transaction: tx, receipt: receipt });
    });
  };

  API.submitOfflineEvidence = function (payload) {
    return API.createPaymentIntent(Object.assign({}, payload, { method: 'Offline Submission' }));
  };

  /* ---------------- Receipts ---------------- */
  API.getReceipts = function (filters) {
    var f = filters || {};
    var rows = Storage.collection(CONFIG.keys.receipts);
    if (f.studentIds) rows = rows.filter(function (r) { return f.studentIds.indexOf(r.studentId) >= 0; });
    if (f.studentId) rows = rows.filter(function (r) { return r.studentId === f.studentId; });
    if (f.sessionId && f.sessionId !== 'All') rows = rows.filter(function (r) { return r.sessionId === f.sessionId; });
    if (f.search) {
      var q = String(f.search).toLowerCase();
      rows = rows.filter(function (r) {
        return [r.receiptNumber, r.reference, r.studentName, r.studentCode, r.feeLabel]
          .join(' ').toLowerCase().indexOf(q) >= 0;
      });
    }
    rows.sort(function (a, b) { return new Date(b.paidAt) - new Date(a.paidAt); });
    return delay(100).then(function () { return ok(rows); });
  };

  API.getReceipt = function (id) {
    return delay(60).then(function () {
      var r = Storage.findById(CONFIG.keys.receipts, id);
      if (r) return ok(r);
      r = Storage.collection(CONFIG.keys.receipts).filter(function (x) {
        return x.receiptNumber === id || x.reference === id || x.transactionId === id;
      })[0];
      return r ? ok(r) : fail('No receipt matches that identifier.', 'NOT_FOUND');
    });
  };

  API.lookupReceipt = function (mode, value) {
    return delay(260).then(function () {
      var v = String(value || '').trim();
      if (!v) return fail('Enter a receipt number, transaction reference or student ID.', 'EMPTY');
      var receipts = Storage.collection(CONFIG.keys.receipts);
      var found = null;

      if (mode === 'reference') {
        found = receipts.filter(function (r) { return r.reference.toUpperCase() === v.toUpperCase(); })[0];
      } else if (mode === 'student') {
        var student = API.getStudentByCode(v);
        if (!student) return fail('No student matches that ID.', 'NOT_FOUND');
        var list = receipts.filter(function (r) { return r.studentId === student.id; });
        return ok({ student: student, receipts: list, mode: mode });
      } else {
        found = receipts.filter(function (r) {
          return r.receiptNumber.toUpperCase() === v.toUpperCase();
        })[0];
      }

      if (!found) return fail('No receipt matches that identifier. Check the value and try again.', 'NOT_FOUND');
      var tx = API.getTransactionById(found.transactionId);
      return ok({ receipt: found, transaction: tx, mode: mode });
    });
  };

  /* ---------------- Notifications ---------------- */
  API.getNotifications = function (userId, filter) {
    var rows = Storage.collection(CONFIG.keys.notifications).filter(function (n) {
      return !userId || n.userId === userId;
    });
    if (filter === 'unread') rows = rows.filter(function (n) { return !n.read; });
    rows.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return delay(80).then(function () { return ok(rows); });
  };

  API.notify = function (userId, title, body, type, link) {
    var n = {
      id: Utils.uid('NTF'),
      userId: userId,
      title: title,
      body: body,
      type: type || 'info',
      link: link || '',
      read: false,
      createdAt: Utils.isoNow()
    };
    var rows = Storage.collection(CONFIG.keys.notifications);
    rows.unshift(n);
    Storage.save(CONFIG.keys.notifications, rows);
    return n;
  };

  API.notifyForStudent = function (studentId, title, body, type, link) {
    var student = Storage.findById(CONFIG.keys.students, studentId);
    if (student) API.notify('USR-' + student.id, title, body, type, link);
    if (student && student.guardianIds) {
      student.guardianIds.forEach(function (pid) { API.notify('USR-' + pid, title, body, type, link); });
    }
  };

  API.markNotificationRead = function (id) {
    var n = Storage.findById(CONFIG.keys.notifications, id);
    if (n) { n.read = true; Storage.upsert(CONFIG.keys.notifications, n); }
    return delay(40).then(function () { return ok(!!n); });
  };

  API.markAllNotificationsRead = function (userId) {
    var rows = Storage.collection(CONFIG.keys.notifications);
    rows.forEach(function (n) { if (!userId || n.userId === userId) n.read = true; });
    Storage.save(CONFIG.keys.notifications, rows);
    return delay(80).then(function () { return ok(true); });
  };

  API.unreadCount = function (userId) {
    return Storage.collection(CONFIG.keys.notifications).filter(function (n) {
      return n.userId === userId && !n.read;
    }).length;
  };

  /* ---------------- Reconciliation ---------------- */
  API.reconcileTransactions = function (rows) {
    return delay(420).then(function () {
      var list = rows || [];
      var transactions = Storage.collection(CONFIG.keys.transactions);
      var results = [];
      var seen = {};

      list.forEach(function (row) {
        var ref = String(row.reference || '').trim().toUpperCase();
        var amount = Utils.toNumber(row.amount);
        var outcome = 'Unmatched';
        var tx = null;
        var note = '';

        if (!ref) {
          outcome = 'Requires Review';
          note = 'Row has no transaction reference.';
        } else if (seen[ref]) {
          outcome = 'Duplicate';
          note = 'Reference appears more than once in the imported file.';
        } else {
          seen[ref] = true;
          tx = transactions.filter(function (t) { return String(t.reference).toUpperCase() === ref; })[0];
          if (!tx) {
            outcome = 'Unmatched';
            note = 'No transaction with this reference exists.';
          } else if (Math.abs(Utils.toNumber(tx.amount) - amount) > 0.01) {
            outcome = 'Amount Mismatch';
            note = 'Settlement amount differs from the recorded transaction amount.';
          } else if (tx.status !== 'Successful') {
            outcome = 'Requires Review';
            note = 'Transaction status is ' + tx.status + ' and must not be marked paid automatically.';
          } else {
            outcome = 'Matched';
            note = 'Reference and amount agree with a confirmed transaction.';
          }
        }

        results.push({
          id: Utils.uid('REC'),
          reference: ref,
          providerAmount: amount,
          transactionId: tx ? tx.id : null,
          transactionAmount: tx ? tx.amount : null,
          status: outcome,
          decision: '',
          notes: note,
          importedAt: Utils.isoNow()
        });
      });

      var store = Storage.collection(CONFIG.keys.reconciliation);
      store = results.concat(store);
      Storage.save(CONFIG.keys.reconciliation, store);

      API.createAuditLog(API.getCurrentUser(), 'Reconciliation run', 'Reconciliation',
        results.length + ' settlement row(s) imported and compared. Unmatched records were not marked paid.', '');

      return ok(results);
    });
  };

  API.getReconciliationResults = function () {
    return delay(80).then(function () { return ok(Storage.collection(CONFIG.keys.reconciliation)); });
  };

  API.recordReconciliationDecision = function (id, decision, notes) {
    var rec = Storage.findById(CONFIG.keys.reconciliation, id);
    if (!rec) return delay(60).then(function () { return fail('Reconciliation record not found.', 'NOT_FOUND'); });
    rec.decision = decision;
    rec.notes = (rec.notes ? rec.notes + ' ' : '') + (notes || '');
    Storage.upsert(CONFIG.keys.reconciliation, rec);
    API.createAuditLog(API.getCurrentUser(), 'Reconciliation decision', 'Reconciliation',
      decision + ' recorded for ' + rec.reference + '.', rec.reference);
    return delay(120).then(function () { return ok(rec); });
  };

  /* ---------------- Metrics & reports ---------------- */
  API.getDashboardMetrics = function (scope) {
    var s = scope || {};
    var students = Storage.collection(CONFIG.keys.students);
    var fees = Storage.collection(CONFIG.keys.fees);
    var transactions = Storage.collection(CONFIG.keys.transactions).filter(function (t) { return t.type === 'Payment'; });
    var receipts = Storage.collection(CONFIG.keys.receipts);
    var sessionId = s.sessionId || Storage.get(CONFIG.keys.settings, {}).currentSessionId;

    var scoped = transactions.filter(function (t) { return !sessionId || t.sessionId === sessionId; });

    var collections = scoped.filter(function (t) { return t.status === 'Successful'; })
      .reduce(function (sum, t) { return sum + Utils.toNumber(t.amount); }, 0);
    var pendingCount = scoped.filter(function (t) { return t.status === 'Pending' || t.status === 'Initiated'; }).length;
    var pendingAmount = scoped.filter(function (t) { return t.status === 'Pending' || t.status === 'Initiated'; })
      .reduce(function (sum, t) { return sum + Utils.toNumber(t.amount); }, 0);
    var failedCount = scoped.filter(function (t) { return t.status === 'Failed' || t.status === 'Cancelled'; }).length;
    var reviewCount = scoped.filter(function (t) { return t.status === 'Under Review'; }).length;
    var reversedAmount = scoped.filter(function (t) { return t.status === 'Reversed'; })
      .reduce(function (sum, t) { return sum + Utils.toNumber(t.amount); }, 0);

    var assessed = 0;
    students.forEach(function (st) {
      var b = API.getFeeBalance(st.id, sessionId);
      assessed += b.charges + b.adjustments;
    });

    var outstanding = 0;
    students.forEach(function (st) {
      outstanding += API.getFeeBalance(st.id, sessionId).outstanding;
    });

    var byMethod = {};
    scoped.filter(function (t) { return t.status === 'Successful'; }).forEach(function (t) {
      byMethod[t.method] = (byMethod[t.method] || 0) + Utils.toNumber(t.amount);
    });

    var byCategory = {};
    scoped.filter(function (t) { return t.status === 'Successful'; }).forEach(function (t) {
      byCategory[t.category] = (byCategory[t.category] || 0) + Utils.toNumber(t.amount);
    });

    var byClass = {};
    students.forEach(function (st) {
      var b = API.getFeeBalance(st.id, sessionId);
      byClass[st.classLevel] = (byClass[st.classLevel] || 0) + b.outstanding;
    });

    var byMonth = {};
    scoped.filter(function (t) { return t.status === 'Successful'; }).forEach(function (t) {
      var key = String(t.confirmedAt || t.createdAt).slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + Utils.toNumber(t.amount);
    });

    return {
      totalStudents: students.length,
      activeFeeStructures: fees.filter(function (f) { return f.active; }).length,
      feesAssessed: Utils.round2(assessed),
      collections: Utils.round2(collections),
      outstanding: Utils.round2(outstanding),
      collectionRate: assessed > 0 ? Utils.clamp((collections / assessed) * 100, 0, 100) : 0,
      pendingCount: pendingCount,
      pendingAmount: Utils.round2(pendingAmount),
      failedCount: failedCount,
      reviewCount: reviewCount,
      reversedAmount: Utils.round2(reversedAmount),
      receiptsIssued: receipts.length,
      byMethod: byMethod,
      byCategory: byCategory,
      byClass: byClass,
      byMonth: byMonth
    };
  };

  API.getReports = function (filters) {
    var f = filters || {};
    var sessionId = f.sessionId || Storage.get(CONFIG.keys.settings, {}).currentSessionId;
    var transactions = Storage.collection(CONFIG.keys.transactions).filter(function (t) {
      return t.type === 'Payment' && (!sessionId || sessionId === 'All' || t.sessionId === sessionId);
    });
    if (f.status && f.status !== 'All') transactions = transactions.filter(function (t) { return t.status === f.status; });
    if (f.method && f.method !== 'All') transactions = transactions.filter(function (t) { return t.method === f.method; });
    if (f.category && f.category !== 'All') transactions = transactions.filter(function (t) { return t.category === f.category; });

    var students = Storage.collection(CONFIG.keys.students);
    if (f.classLevel && f.classLevel !== 'All') {
      students = students.filter(function (s) { return s.classLevel === f.classLevel; });
      var ids = students.map(function (s) { return s.id; });
      transactions = transactions.filter(function (t) { return ids.indexOf(t.studentId) >= 0; });
    }

    var rows = students.map(function (st) {
      var b = API.getFeeBalance(st.id, sessionId === 'All' ? st.sessionId : sessionId);
      return {
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.name,
        classLevel: st.classLevel,
        charges: b.charges,
        adjustments: b.adjustments,
        paid: b.paid,
        outstanding: b.outstanding,
        progress: b.progress
      };
    });

    return delay(160).then(function () {
      return ok({
        generatedAt: Utils.isoNow(),
        sessionId: sessionId,
        filters: f,
        metrics: API.getDashboardMetrics({ sessionId: sessionId === 'All' ? null : sessionId }),
        transactions: transactions,
        studentRows: rows
      });
    });
  };

  /* ========================================================================
     06. AUTH & ROUTE GUARDS
     ======================================================================== */
  var Auth = (NS.auth = {});

  Auth.currentUser = function () { return API.getCurrentUser(); };

  Auth.isLoggedIn = function () { return !!Storage.get(CONFIG.keys.session, null); };

  Auth.homeFor = function (role) {
    var r = CONFIG.roles[role];
    return r ? r.home : 'login.html';
  };

  Auth.redirect = function (url) {
    if (!url) return;
    window.location.href = url;
  };

  Auth.requireRole = function (roles) {
    var session = Storage.get(CONFIG.keys.session, null);
    var here = window.location.pathname.replace(/^\/+/, '') || 'index.html';
    if (!session) {
      Auth.redirect('login.html?next=' + encodeURIComponent(here));
      return null;
    }
    if (roles && roles.length && roles.indexOf(session.role) < 0) {
      Utils.toast('You do not have permission to view that page.', 'warning', 'Access denied');
      setTimeout(function () { Auth.redirect(Auth.homeFor(session.role)); }, 900);
      return null;
    }
    return session;
  };

  Auth.requireGuest = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (session) {
      Auth.redirect(Auth.homeFor(session.role));
      return false;
    }
    return true;
  };

  Auth.logout = function () {
    API.logoutUser();
    Auth.redirect('login.html');
  };

  Auth.guard = function () {
    var body = document.body;
    var requires = body.getAttribute('data-requires');
    var guestOnly = body.getAttribute('data-guest') === 'true';
    if (guestOnly) { Auth.requireGuest(); return; }
    if (requires) {
      var roles = requires.split(',').map(function (r) { return r.trim(); }).filter(Boolean);
      Auth.requireRole(roles);
    }
  };

  /* ========================================================================
     07. UI KIT
     ======================================================================== */
  var UI = (NS.ui = {});

  /* ---- Theme ---- */
  UI.initTheme = function () {
    var stored = Storage.get(CONFIG.keys.theme, null);
    if (!stored) {
      try {
        stored = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch (e) { stored = 'light'; }
    }
    document.documentElement.setAttribute('data-theme', stored);

    Utils.qsa('[data-theme-toggle], #themeToggle').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        Storage.set(CONFIG.keys.theme, next);
        UI.emit('theme:change', next);
      });
    });
  };

  /* ---- Tiny event bus ---- */
  var listeners = {};
  UI.on = function (name, fn) {
    listeners[name] = listeners[name] || [];
    listeners[name].push(fn);
  };
  UI.emit = function (name, payload) {
    (listeners[name] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { /* keep other listeners alive */ }
    });
  };

  /* ---- Navigation ---- */
  UI.initNav = function () {
    var nav = document.getElementById('nav');
    var toggle = document.getElementById('navToggle');
    if (nav && toggle) {
      Utils.on(toggle, 'click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      Utils.on(nav, 'click', function (e) {
        if (e.target && e.target.tagName === 'A') {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var header = Utils.qs('.header');
    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
      Utils.on(window, 'scroll', onScroll, { passive: true });
      onScroll();
    }

    /* Sidebar drawer (app shell) */
    var sidebar = Utils.qs('.sidebar');
    var sidebarToggle = Utils.qs('[data-sidebar-toggle]');
    if (sidebar && sidebarToggle) {
      Utils.on(sidebarToggle, 'click', function () { sidebar.classList.toggle('is-open'); });
      Utils.on(document, 'click', function (e) {
        if (window.innerWidth > 1024) return;
        if (!sidebar.classList.contains('is-open')) return;
        if (sidebar.contains(e.target) || sidebarToggle.contains(e.target)) return;
        sidebar.classList.remove('is-open');
      });
    }

    /* Mark the active nav item from the current path */
    var file = window.location.pathname.split('/').pop() || 'index.html';
    Utils.qsa('.sidebar__nav a, .nav a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href && href.split('?')[0] === file) a.classList.add('is-active');
    });
  };

  /* ---- Scroll reveal ---- */
  UI.initReveal = function () {
    var items = Utils.qsa('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  };

  /* ---- FAQ accordion ---- */
  UI.initAccordion = function () {
    Utils.qsa('.faq__q').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        var item = btn.closest('.faq__item');
        if (!item) return;
        var panel = item.querySelector('.faq__a');
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
        if (panel) panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
      });
    });
  };

  /* ---- Tabs ---- */
  UI.initTabs = function () {
    Utils.qsa('[data-tabs]').forEach(function (group) {
      var tabs = Utils.qsa('.tab', group);
      var panels = Utils.qsa('[data-tab-panel]', group.parentNode || document);
      tabs.forEach(function (tab) {
        Utils.on(tab, 'click', function () {
          tabs.forEach(function (t) { t.classList.remove('is-active'); });
          tab.classList.add('is-active');
          var key = tab.getAttribute('data-tab');
          panels.forEach(function (p) {
            p.hidden = p.getAttribute('data-tab-panel') !== key;
          });
        });
      });
    });
  };

  /* ---- Dropdowns ---- */
  UI.initDropdowns = function () {
    Utils.qsa('[data-dropdown-toggle]').forEach(function (btn) {
      var menuId = btn.getAttribute('data-dropdown-toggle');
      var menu = menuId ? document.getElementById(menuId) : null;
      if (!menu) return;
      Utils.on(btn, 'click', function (e) {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
        btn.setAttribute('aria-expanded', String(!menu.hidden));
      });
    });
    Utils.on(document, 'click', function () {
      Utils.qsa('.dropdown__menu').forEach(function (m) { m.hidden = true; });
    });
  };

  /* ---- Toasts ---- */
  UI.toastHost = function () {
    var host = Utils.qs('.toasts');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toasts';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    return host;
  };

  UI.toast = function (message, type, title, timeout) {
    var host = UI.toastHost();
    var el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    el.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>' +
      '<div><b>' + Utils.esc(title || (type === 'danger' ? 'Something went wrong' : 'EduPay')) + '</b>' +
      '<small>' + Utils.esc(message) + '</small></div>' +
      '<button class="toast__close" type="button" aria-label="Dismiss notification">&times;</button>';
    host.appendChild(el);
    var close = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    Utils.on(el.querySelector('.toast__close'), 'click', close);
    setTimeout(close, typeof timeout === 'number' ? timeout : 5200);
    return el;
  };

  Utils.toast = UI.toast;

  /* ---- Modal ---- */
  UI.modal = function (opts) {
    var o = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML =
      '<div class="modal__backdrop" data-close></div>' +
      '<div class="modal__dialog" role="dialog" aria-modal="true" aria-label="' + Utils.esc(o.title || 'Dialog') + '">' +
      '<div class="modal__head"><h3>' + Utils.esc(o.title || '') + '</h3>' +
      '<button class="btn btn--icon btn--soft" type="button" data-close aria-label="Close dialog">&times;</button></div>' +
      '<div class="modal__body">' + (o.body || '') + '</div>' +
      '<div class="modal__foot">' + (o.footer || '<button class="btn btn--soft" type="button" data-close>Close</button>') + '</div>' +
      '</div>';

    document.body.appendChild(wrap);
    document.body.classList.add('is-locked');

    function close() {
      Utils.off(document, 'keydown', onKey);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (!Utils.qs('.modal')) document.body.classList.remove('is-locked');
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    Utils.qsa('[data-close]', wrap).forEach(function (b) { Utils.on(b, 'click', close); });
    Utils.on(document, 'keydown', onKey);

    wrap.close = close;
    var first = wrap.querySelector('input, select, textarea, button');
    if (first && typeof first.focus === 'function') setTimeout(function () { first.focus(); }, 30);
    return wrap;
  };

  UI.confirm = function (opts) {
    var o = opts || {};
    return new Promise(function (resolve) {
      var modal = UI.modal({
        title: o.title || 'Please confirm',
        body: '<p>' + Utils.esc(o.message || 'Are you sure?') + '</p>',
        footer: '<button class="btn btn--soft" type="button" data-cancel>Cancel</button>' +
          '<button class="btn ' + (o.danger ? 'btn--danger' : 'btn--primary') + '" type="button" data-confirm>' +
          Utils.esc(o.confirmLabel || 'Confirm') + '</button>'
      });
      Utils.on(modal.querySelector('[data-cancel]'), 'click', function () { modal.close(); resolve(false); });
      Utils.on(modal.querySelector('[data-confirm]'), 'click', function () { modal.close(); resolve(true); });
    });
  };

  /* ---- Loading helpers ---- */
  UI.setLoading = function (el, loading, label) {
    if (!el) return;
    if (loading) {
      el.classList.add('is-loading');
      el.disabled = true;
      el.setAttribute('aria-busy', 'true');
      if (label) {
        el.setAttribute('data-label', el.textContent);
        el.textContent = label;
      }
    } else {
      el.classList.remove('is-loading');
      el.disabled = false;
      el.removeAttribute('aria-busy');
      var prev = el.getAttribute('data-label');
      if (prev) el.textContent = prev;
    }
  };

  UI.skeleton = function (container, lines, variant) {
    if (!container) return;
    var html = '';
    var n = lines || 3;
    for (var i = 0; i < n; i++) {
      html += '<div class="skeleton ' + (variant || 'skeleton--text') + '"></div>';
    }
    container.innerHTML = html;
  };

  UI.empty = function (message, title, actionHtml) {
    return '<div class="empty">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
      '<path d="M4 7h16v12H4z"/><path d="M4 7l2-3h12l2 3"/><path d="M9 12h6"/></svg>' +
      '<h3>' + Utils.esc(title || 'Nothing here yet') + '</h3>' +
      '<p>' + Utils.esc(message || 'There are no records to display.') + '</p>' +
      (actionHtml || '') + '</div>';
  };

  UI.errorState = function (message, retryLabel) {
    return '<div class="empty">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
      '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>' +
      '<h3>We could not load this content</h3>' +
      '<p>' + Utils.esc(message || 'Something went wrong. Please try again.') + '</p>' +
      '<button class="btn btn--outline btn--sm" type="button" data-retry>' + Utils.esc(retryLabel || 'Retry') + '</button>' +
      '</div>';
  };

  /* ---- Misc wiring used across pages ---- */
  UI.initMisc = function () {
    /* Password visibility toggles */
    Utils.qsa('[data-toggle-password]').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        var target = document.getElementById(btn.getAttribute('data-toggle-password'));
        if (!target) return;
        var showing = target.type === 'text';
        target.type = showing ? 'password' : 'text';
        btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        btn.textContent = showing ? 'Show' : 'Hide';
      });
    });

    /* Logout buttons */
    Utils.qsa('[data-logout]').forEach(function (btn) {
      Utils.on(btn, 'click', function (e) {
        e.preventDefault();
        Auth.logout();
      });
    });

    /* Print buttons */
    Utils.qsa('[data-print]').forEach(function (btn) {
      Utils.on(btn, 'click', function () { window.print(); });
    });

    /* Footer year */
    Utils.qsa('[data-year], #year').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });

    /* Session identity in the chrome */
    var session = Storage.get(CONFIG.keys.session, null);
    if (session) {
      Utils.qsa('[data-user-name]').forEach(function (el) { el.textContent = session.name || ''; });
      Utils.qsa('[data-user-role]').forEach(function (el) {
        el.textContent = (CONFIG.roles[session.role] || {}).label || session.role;
      });
      Utils.qsa('[data-user-email]').forEach(function (el) { el.textContent = session.email || ''; });
      Utils.qsa('[data-user-avatar]').forEach(function (el) {
        el.textContent = Utils.initials(session.name);
      });
      var count = API.unreadCount(session.userId);
      Utils.qsa('[data-unread-count]').forEach(function (el) {
        el.textContent = String(count);
        el.hidden = count === 0;
      });
    }
  };

  /* ========================================================================
     08. TABLES, FILTERS, PAGINATION, EXPORT
     ======================================================================== */
  var Tables = (NS.tables = {});
  Tables.defs = {};

  Tables.register = function (name, def) { Tables.defs[name] = def; };

  Tables.mountAll = function () {
    Utils.qsa('[data-table]').forEach(function (host) { Tables.mount(host); });
  };

  Tables.mount = function (host) {
    var name = host.getAttribute('data-table');
    var def = Tables.defs[name];
    if (!def) return null;

    var scope = host.closest('[data-table-scope]') || document;
    var state = {
      page: 1,
      pageSize: def.pageSize || CONFIG.pageSize,
      sort: def.defaultSort || null,
      dir: def.defaultDir || 'desc',
      search: '',
      filters: {}
    };
    host.__state = state;

    var searchInput = Utils.qs('[data-table-search="' + name + '"]', scope) ||
      Utils.qs('[data-table-search]', scope);
    var filterEls = Utils.qsa('[data-filter]', scope);
    var countEl = Utils.qs('[data-table-count="' + name + '"]', scope) || Utils.qs('[data-table-count]', scope);
    var pagerEl = Utils.qs('[data-table-pagination="' + name + '"]', scope) || Utils.qs('[data-table-pagination]', scope);
    var exportBtns = Utils.qsa('[data-export="' + name + '"]', scope);

    var refresh = function () {
      host.innerHTML = '<div class="skeleton skeleton--block"></div>';
      Promise.resolve(def.load(state)).then(function (res) {
        var rows = res && res.ok ? res.data : (Array.isArray(res) ? res : []);
        if (res && res.ok === false) {
          host.innerHTML = UI.errorState(res.error);
          var retry = Utils.qs('[data-retry]', host);
          Utils.on(retry, 'click', refresh);
          return;
        }
        Tables.render(host, def, rows, state, { countEl: countEl, pagerEl: pagerEl });
      }).catch(function (err) {
        host.innerHTML = UI.errorState(err && err.message ? err.message : 'Unexpected error.');
      });
    };

    if (searchInput) {
      Utils.on(searchInput, 'input', Utils.debounce(function () {
        state.search = searchInput.value;
        state.page = 1;
        refresh();
      }, 260));
    }

    filterEls.forEach(function (el) {
      Utils.on(el, 'change', function () {
        state.filters[el.getAttribute('data-filter')] = el.value;
        state.page = 1;
        refresh();
      });
    });

    Utils.qsa('[data-filter-reset]', scope).forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        if (searchInput) searchInput.value = '';
        filterEls.forEach(function (el) { el.value = ''; });
        state.search = '';
        state.filters = {};
        state.page = 1;
        refresh();
      });
    });

    exportBtns.forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        Promise.resolve(def.load(state)).then(function (res) {
          var rows = res && res.ok ? res.data : [];
          if (!rows.length) { UI.toast('There is nothing to export for the current filters.', 'warning'); return; }
          var cols = def.exportColumns || def.columns;
          Utils.downloadCSV(def.exportName || (name + '-export.csv'), cols, rows);
          UI.toast(rows.length + ' row(s) exported to CSV.', 'success', 'Export complete');
          var user = Auth.currentUser();
          if (user) API.createAuditLog(user, 'CSV export', 'Report', def.exportName || name, '');
        });
      });
    });

    Tables.hosts = Tables.hosts || {};
    Tables.hosts[name] = { refresh: refresh, state: state };
    refresh();
    return { refresh: refresh, state: state };
  };

  Tables.refresh = function (name) {
    var entry = (Tables.hosts || {})[name];
    if (entry) entry.refresh();
  };

  Tables.render = function (host, def, rows, state, refs) {
    var data = rows.slice();

    if (state.search && def.clientSearch) {
      var q = state.search.toLowerCase();
      data = data.filter(function (r) {
        return def.clientSearch(r).toLowerCase().indexOf(q) >= 0;
      });
    }

    if (state.sort) {
      var col = def.columns.filter(function (c) { return c.key === state.sort; })[0];
      data.sort(function (a, b) {
        var av = col && col.sortValue ? col.sortValue(a) : a[state.sort];
        var bv = col && col.sortValue ? col.sortValue(b) : b[state.sort];
        if (typeof av === 'number' && typeof bv === 'number') return state.dir === 'asc' ? av - bv : bv - av;
        var as = String(av === null || av === undefined ? '' : av).toLowerCase();
        var bs = String(bv === null || bv === undefined ? '' : bv).toLowerCase();
        if (as < bs) return state.dir === 'asc' ? -1 : 1;
        if (as > bs) return state.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    var total = data.length;
    var pages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > pages) state.page = pages;
    var start = (state.page - 1) * state.pageSize;
    var pageRows = data.slice(start, start + state.pageSize);

    if (refs && refs.countEl) {
      refs.countEl.textContent = total === 0 ? 'No records' :
        'Showing ' + (start + 1) + '–' + (start + pageRows.length) + ' of ' + total;
    }

    if (!total) {
      host.innerHTML = UI.empty(def.emptyMessage || 'No records match the current filters.',
        def.emptyTitle || 'No records found');
      if (refs && refs.pagerEl) refs.pagerEl.innerHTML = '';
      return;
    }

    var head = def.columns.map(function (c) {
      var sortable = c.sortable !== false;
      var active = state.sort === c.key;
      var arrow = active ? (state.dir === 'asc' ? ' ▲' : ' ▼') : '';
      return '<th' + (c.align === 'right' ? ' style="text-align:right"' : '') +
        (sortable ? ' data-sort="' + Utils.esc(c.key) + '" style="cursor:pointer"' : '') +
        ' aria-sort="' + (active ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '">' +
        Utils.esc(c.label) + arrow + '</th>';
    }).join('');

    var body = pageRows.map(function (row, idx) {
      var cells = def.columns.map(function (c) {
        var value = c.render ? c.render(row, idx) : Utils.esc(row[c.key]);
        return '<td' + (c.align === 'right' ? ' class="num"' : '') +
          ' data-label="' + Utils.esc(c.label) + '">' + (value === null || value === undefined ? '—' : value) + '</td>';
      }).join('');
      var attrs = def.rowAttrs ? def.rowAttrs(row) : '';
      return '<tr' + attrs + '>' + cells + '</tr>';
    }).join('');

    host.innerHTML = '<div class="table-wrap"><table class="data-table' +
      (def.stackOnMobile ? ' table--stack' : '') + '">' +
      '<thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';

    Utils.qsa('[data-sort]', host).forEach(function (th) {
      Utils.on(th, 'click', function () {
        var key = th.getAttribute('data-sort');
        if (state.sort === key) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
        else { state.sort = key; state.dir = 'asc'; }
        Tables.render(host, def, rows, state, refs);
      });
    });

    if (def.onRowClick) {
      Utils.qsa('tbody tr', host).forEach(function (tr, i) {
        Utils.on(tr, 'click', function (e) {
          if (e.target.closest('a, button, input, select')) return;
          def.onRowClick(pageRows[i]);
        });
      });
    }

    if (refs && refs.pagerEl) {
      var html = '<div class="pagination">' +
        '<span>Page ' + state.page + ' of ' + pages + '</span><div class="pagination__pages">';
      var from = Math.max(1, state.page - 2);
      var to = Math.min(pages, from + 4);
      for (var p = from; p <= to; p++) {
        html += '<button type="button" class="' + (p === state.page ? 'is-active' : '') +
          '" data-page="' + p + '">' + p + '</button>';
      }
      html += '</div></div>';
      refs.pagerEl.innerHTML = html;
      Utils.qsa('[data-page]', refs.pagerEl).forEach(function (btn) {
        Utils.on(btn, 'click', function () {
          state.page = parseInt(btn.getAttribute('data-page'), 10);
          Tables.render(host, def, rows, state, refs);
        });
      });
    }
  };

  /* ========================================================================
     09. LANDING PAGE
     ======================================================================== */
  var Pages = (NS.pages = {});

  Pages.landing = function () {
    /* Demo role buttons on the landing page and CTA strip */
    Utils.qsa('[data-demo]').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        var role = btn.getAttribute('data-demo');
        btn.disabled = true;
        UI.setLoading(btn, true, 'Starting…');
        API.demoLogin(role).then(function (res) {
          UI.setLoading(btn, false);
          btn.disabled = false;
          if (!res.ok) { UI.toast(res.error, 'danger'); return; }
          UI.toast('Signed in as ' + res.data.name + ' (demo).', 'success', 'Demo session started');
          setTimeout(function () { Auth.redirect(Auth.homeFor(res.data.role)); }, 500);
        });
      });
    });

    /* Contact form */
    var form = document.getElementById('contactForm');
    if (form) {
      var status = document.getElementById('contactStatus');
      Utils.on(form, 'submit', function (e) {
        e.preventDefault();
        var result = Validate.form(form, {
          name: function (v) { return Validate.required(v, 'Full name'); },
          email: Validate.email,
          message: function (v) { return Validate.required(v, 'Message'); }
        });
        if (!result.valid) {
          if (status) status.textContent = result.errors[0];
          return;
        }
        if (status) status.textContent = 'Thank you — your message has been recorded for this demonstration.';
        form.reset();
        UI.toast('Your message has been recorded for this demonstration.', 'success');
      });
    }

    /* Receipt lookup panel on the landing page, if present */
    var quickLookup = document.getElementById('quickLookupForm');
    if (quickLookup) {
      Utils.on(quickLookup, 'submit', function (e) {
        e.preventDefault();
        var mode = quickLookup.elements.lookupMode.value;
        var value = quickLookup.elements.lookupValue.value;
        Receipts.renderLookup(quickLookup, mode, value);
      });
    }
  };

  /* ========================================================================
     10. AUTH PAGES
     ======================================================================== */
  Pages.login = function () {
    var form = document.getElementById('loginForm');
    if (!form) return;
    var errorBox = document.getElementById('loginError');
    var submit = form.querySelector('[type="submit"]');

    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');
    var prefill = params.get('email');
    if (prefill && form.elements.identifier) form.elements.identifier.value = prefill;

    function showError(message) {
      if (errorBox) {
        errorBox.textContent = message;
        errorBox.hidden = false;
      }
      UI.toast(message, 'danger', 'Sign-in failed');
    }

    function clearError() {
      if (errorBox) { errorBox.textContent = ''; errorBox.hidden = true; }
    }

    Utils.on(form, 'submit', function (e) {
      e.preventDefault();
      clearError();
      var result = Validate.form(form, {
        identifier: function (v) { return Validate.required(v, 'Email address or student ID'); },
        password: function (v) { return Validate.required(v, 'Password'); }
      });
      if (!result.valid) { showError(result.errors[0]); return; }

      var remember = form.elements.remember ? form.elements.remember.checked : false;
      UI.setLoading(submit, true, 'Signing in…');

      API.loginUser(result.values.identifier, result.values.password, remember).then(function (res) {
        UI.setLoading(submit, false);
        if (!res.ok) {
          showError(res.error);
          if (res.code === 'BAD_PASSWORD') Validate.setFieldError(form.elements.password, res.error);
          if (res.code === 'UNKNOWN_USER') Validate.setFieldError(form.elements.identifier, res.error);
          return;
        }
        UI.toast('Welcome back, ' + res.data.name + '.', 'success', 'Signed in');
        var target = next ? decodeURIComponent(next) : Auth.homeFor(res.data.role);
        setTimeout(function () { Auth.redirect(target); }, 450);
      }).catch(function () {
        UI.setLoading(submit, false);
        showError('We could not complete sign-in. Please try again.');
      });
    });

    /* Demo credential buttons: populate the form */
    Utils.qsa('[data-fill-demo]').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        var email = btn.getAttribute('data-email') || '';
        var pass = btn.getAttribute('data-password') || '';
        if (form.elements.identifier) form.elements.identifier.value = email;
        if (form.elements.password) form.elements.password.value = pass;
        clearError();
        Validate.clearForm(form);
        UI.toast('Demo credentials filled. Press Sign In to continue.', 'info', 'Demo account');
      });
    });

    /* Demo sign-in buttons: establish the session and redirect */
    Utils.qsa('[data-demo-role]').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        var role = btn.getAttribute('data-demo-role');
        UI.setLoading(btn, true, 'Starting…');
        API.demoLogin(role).then(function (res) {
          UI.setLoading(btn, false);
          if (!res.ok) { showError(res.error); return; }
          UI.toast('Demo session started for ' + res.data.name + '.', 'success');
          setTimeout(function () { Auth.redirect(Auth.homeFor(res.data.role)); }, 400);
        });
      });
    });
  };

  Pages.register = function () {
    var form = document.getElementById('registerForm');
    if (!form) return;
    var submit = form.querySelector('[type="submit"]');
    var roleSelect = form.elements.role;

    var studentFields = Utils.qsa('[data-when-role="student"]');
    var parentFields = Utils.qsa('[data-when-role="parent"]');

    function syncRoleFields() {
      var role = roleSelect ? roleSelect.value : 'student';
      studentFields.forEach(function (el) { el.hidden = role !== 'student'; });
      parentFields.forEach(function (el) { el.hidden = role !== 'parent'; });
    }

    if (roleSelect) {
      Utils.on(roleSelect, 'change', syncRoleFields);
      syncRoleFields();
    }

    /* Populate the school selector */
    var schoolSelect = form.elements.schoolId;
    if (schoolSelect) {
      API.getSchools().then(function (res) {
        if (!res.ok) return;
        schoolSelect.innerHTML = res.data.map(function (s) {
          return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.name) + '</option>';
        }).join('');
      });
    }

    Utils.on(form, 'submit', function (e) {
      e.preventDefault();
      var result = Validate.form(form, {
        name: function (v) { return Validate.required(v, 'Full name'); },
        email: Validate.email,
        phone: Validate.phone,
        password: Validate.password,
        confirmPassword: function (v, values) { return Validate.confirm(values.password, v); }
      });

      var terms = form.elements.terms;
      if (terms && !terms.checked) {
        result.valid = false;
        result.errors.push('You must accept the privacy notice and terms to continue.');
        UI.toast('You must accept the privacy notice and terms to continue.', 'warning');
      }
      if (!result.valid) { UI.toast(result.errors[0], 'danger'); return; }

      var payload = {
        name: result.values.name,
        email: result.values.email,
        phone: result.values.phone,
        password: result.values.password,
        role: roleSelect ? roleSelect.value : 'student',
        schoolId: schoolSelect ? schoolSelect.value : 'SCH-001',
        studentCode: form.elements.studentCode ? form.elements.studentCode.value : '',
        classLevel: form.elements.classLevel ? form.elements.classLevel.value : '',
        relationship: form.elements.relationship ? form.elements.relationship.value : ''
      };

      UI.setLoading(submit, true, 'Creating account…');
      API.registerUser(payload).then(function (res) {
        UI.setLoading(submit, false);
        if (!res.ok) {
          UI.toast(res.error, 'danger', 'Registration failed');
          if (res.code === 'DUPLICATE_EMAIL') Validate.setFieldError(form.elements.email, res.error);
          return;
        }
        UI.toast('Account created. Your demo verification code is ' + res.data.verificationCode + '.',
          'success', 'Almost there');
        setTimeout(function () {
          Auth.redirect('verify-account.html?email=' + encodeURIComponent(payload.email));
        }, 900);
      });
    });
  };

  Pages.forgotPassword = function () {
    var form = document.getElementById('forgotForm');
    if (!form) return;
    var submit = form.querySelector('[type="submit"]');
    var panel = document.getElementById('forgotResult');

    Utils.on(form, 'submit', function (e) {
      e.preventDefault();
      var result = Validate.form(form, { email: Validate.email });
      if (!result.valid) { UI.toast(result.errors[0], 'danger'); return; }

      UI.setLoading(submit, true, 'Submitting…');
      API.requestPasswordReset(result.values.email).then(function (res) {
        UI.setLoading(submit, false);
        if (!res.ok) { UI.toast(res.error, 'danger'); return; }
        if (panel) {
          panel.hidden = false;
          panel.innerHTML = res.data.exists
            ? '<div class="alert alert--info"><div><strong>Demo reset code</strong>' +
              'No email is sent in this demonstration. Your reset code is <b class="mono">' +
              Utils.esc(res.data.token) + '</b>. Continue to the reset page to set a new password.</div></div>' +
              '<p class="mt-4"><a class="btn btn--primary" href="reset-password.html?email=' +
              encodeURIComponent(res.data.email) + '&token=' + encodeURIComponent(res.data.token) +
              '">Continue to reset password</a></p>'
            : '<div class="alert alert--success"><div>If an account exists for that address, reset instructions have been prepared.</div></div>';
        }
        UI.toast('Reset request recorded for this demonstration.', 'success');
      });
    });
  };

  Pages.resetPassword = function () {
    var form = document.getElementById('resetForm');
    if (!form) return;
    var submit = form.querySelector('[type="submit"]');
    var params = new URLSearchParams(window.location.search);

    if (params.get('email') && form.elements.email) form.elements.email.value = params.get('email');
    if (params.get('token') && form.elements.token) form.elements.token.value = params.get('token');

    Utils.on(form, 'submit', function (e) {
      e.preventDefault();
      var result = Validate.form(form, {
        email: Validate.email,
        token: function (v) { return Validate.required(v, 'Reset code'); },
        password: Validate.password,
        confirmPassword: function (v, values) { return Validate.confirm(values.password, v); }
      });
      if (!result.valid) { UI.toast(result.errors[0], 'danger'); return; }

      UI.setLoading(submit, true, 'Updating…');
      API.resetPassword(result.values.email, result.values.token, result.values.password).then(function (res) {
        UI.setLoading(submit, false);
        if (!res.ok) { UI.toast(res.error, 'danger'); return; }
        UI.toast('Password updated. You can now sign in.', 'success');
        setTimeout(function () {
          Auth.redirect('login.html?email=' + encodeURIComponent(result.values.email));
        }, 800);
      });
    });
  };

  Pages.verifyAccount = function () {
    var form = document.getElementById('verifyForm');
    if (!form) return;
    var submit = form.querySelector('[type="submit"]');
    var params = new URLSearchParams(window.location.search);
    if (params.get('email') && form.elements.email) form.elements.email.value = params.get('email');

    var hint = document.getElementById('verifyHint');
    if (hint) {
      hint.textContent = 'Demonstration only — no email or SMS is sent. Use the code ' + CONFIG.demoCode + '.';
    }

    Utils.on(form, 'submit', function (e) {
      e.preventDefault();
      var result = Validate.form(form, {
        email: Validate.email,
        code: function (v) { return Validate.required(v, 'Verification code'); }
      });
      if (!result.valid) { UI.toast(result.errors[0], 'danger'); return; }

      UI.setLoading(submit, true, 'Verifying…');
      API.verifyAccount(result.values.email, result.values.code).then(function (res) {
        UI.setLoading(submit, false);
        if (!res.ok) { UI.toast(res.error, 'danger'); return; }
        UI.toast('Account verified. You can sign in now.', 'success');
        setTimeout(function () {
          Auth.redirect('login.html?email=' + encodeURIComponent(result.values.email));
        }, 800);
      });
    });
  };

  /* ========================================================================
     11. STUDENT & PARENT PAGES
     ======================================================================== */
  Pages.studentDashboard = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (!session) return;
    var studentId = session.studentId;

    API.getStudentById(studentId).then(function (res) {
      if (!res.ok) { UI.toast(res.error, 'danger'); return; }
      var student = res.data;
      var balance = API.getFeeBalance(student.id);
      var sessionRecord = Storage.findById(CONFIG.keys.sessions, student.sessionId);

      setText('[data-student-name]', student.name);
      setText('[data-student-code]', student.studentCode);
      setText('[data-student-class]', student.classLevel);
      setText('[data-student-session]', sessionRecord ? sessionRecord.label : '—');
      setText('[data-student-school]', (API.getSchoolById(student.schoolId) || {}).name || '—');
      setText('[data-total-fees]', Utils.formatCurrency(balance.charges + balance.adjustments));
      setText('[data-amount-paid]', Utils.formatCurrency(balance.paid));
      setText('[data-outstanding]', Utils.formatCurrency(balance.outstanding));
      setText('[data-pending-amount]', Utils.formatCurrency(balance.pending));
      setText('[data-collection-rate]', balance.progress.toFixed(1) + '% settled');

      var bar = Utils.qs('[data-progress-bar]');
      if (bar) bar.style.setProperty('--value', String(Utils.round2(balance.progress)));

      /* Fee breakdown */
      var breakdown = Utils.qs('[data-fee-breakdown]');
      if (breakdown) {
        var rows = balance.mandatoryFees.concat(balance.optionalFees);
        breakdown.innerHTML = rows.length ? '<div class="detail-list">' + rows.map(function (f) {
          return '<div><dt>' + Utils.esc(f.name) + ' <span class="badge">' + Utils.esc(f.category) + '</span>' +
            (f.mandatory ? '' : ' <span class="badge badge--pending">Optional</span>') + '</dt>' +
            '<dd>' + Utils.formatCurrency(f.amount) + '</dd></div>';
        }).join('') + '</div>' : UI.empty('No active fee structures for your class.');

        var optional = balance.optionalFees;
        if (optional.length) {
          var optHost = Utils.qs('[data-optional-fees]');
          if (optHost) {
            optHost.innerHTML = '<div class="chip-group">' + optional.map(function (f) {
              return '<span class="chip">' + Utils.esc(f.name) + ' · ' + Utils.formatCurrency(f.amount) + '</span>';
            }).join('') + '</div>';
          }
        }
      }

      /* Deadlines */
      var deadlineHost = Utils.qs('[data-deadlines]');
      if (deadlineHost) {
        var deadlines = balance.mandatoryFees.filter(function (f) { return f.dueDate; })
          .sort(function (a, b) { return new Date(a.dueDate) - new Date(b.dueDate); })
          .slice(0, 4);
        deadlineHost.innerHTML = deadlines.length ? '<div class="detail-list">' + deadlines.map(function (f) {
          var days = Utils.daysUntil(f.dueDate);
          var label = days === null ? '' : (days < 0 ? 'Overdue by ' + Math.abs(days) + ' day(s)' :
            (days === 0 ? 'Due today' : 'Due in ' + days + ' day(s)'));
          return '<div><dt>' + Utils.esc(f.name) + ' <span class="text-xs text-muted">' + label + '</span></dt>' +
            '<dd>' + Utils.formatDate(f.dueDate) + '</dd></div>';
        }).join('') + '</div>' : UI.empty('No deadlines have been configured.');
      }

      /* Latest receipt */
      API.getReceipts({ studentId: student.id }).then(function (rr) {
        var latest = rr.ok && rr.data.length ? rr.data[0] : null;
        var host = Utils.qs('[data-latest-receipt]');
        if (!host) return;
        host.innerHTML = latest
          ? '<div class="receipt-preview"><dl>' +
            '<dt>Receipt No.</dt><dd>' + Utils.esc(latest.receiptNumber) + '</dd>' +
            '<dt>Reference</dt><dd>' + Utils.esc(latest.reference) + '</dd>' +
            '<dt>Amount</dt><dd>' + Utils.formatCurrency(latest.amount) + '</dd>' +
            '<dt>Status</dt><dd>' + Utils.badge(latest.status) + '</dd></dl>' +
            '<p class="mt-4"><a class="btn btn--primary btn--sm" href="receipt.html?receipt=' +
            encodeURIComponent(latest.id) + '">View Receipt</a></p></div>'
          : UI.empty('No receipts have been issued yet.');
      });

      /* Alerts */
      var alerts = Utils.qs('[data-fee-alerts]');
      if (alerts) {
        var items = [];
        if (balance.outstanding > 0) {
          items.push('<div class="alert alert--warning"><div><strong>Outstanding balance</strong>' +
            Utils.formatCurrency(balance.outstanding) + ' remains unpaid for this session.</div></div>');
        } else {
          items.push('<div class="alert alert--success"><div><strong>All settled</strong>' +
            'No outstanding balance for the current session.</div></div>');
        }
        if (balance.pending > 0) {
          items.push('<div class="alert alert--info"><div><strong>Pending payment</strong>' +
            Utils.formatCurrency(balance.pending) + ' is awaiting confirmation and does not count as paid yet.</div></div>');
        }
        alerts.innerHTML = items.join('');
      }
    });

    /* Recent transactions table */
    Tables.register('student-transactions', {
      pageSize: 5,
      defaultSort: 'createdAt',
      defaultDir: 'desc',
      exportName: 'edupay-student-transactions.csv',
      emptyTitle: 'No transactions yet',
      emptyMessage: 'Payments you make will appear here.',
      columns: [
        { key: 'reference', label: 'Reference', render: function (r) { return '<span class="mono">' + Utils.esc(r.reference) + '</span>'; } },
        { key: 'feeLabel', label: 'Fee' },
        { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return Utils.formatCurrency(r.amount); } },
        { key: 'method', label: 'Method' },
        { key: 'createdAt', label: 'Date', render: function (r) { return Utils.formatDate(r.createdAt); } },
        { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } },
        { key: 'action', label: 'Action', sortable: false, render: function (r) {
          return '<div class="actions"><a class="btn btn--soft btn--sm" href="payment-details.html?tx=' +
            encodeURIComponent(r.id) + '">View</a></div>';
        } }
      ],
      exportColumns: [
        { label: 'Reference', key: 'reference' },
        { label: 'Fee', key: 'feeLabel' },
        { label: 'Amount', key: 'amount' },
        { label: 'Method', key: 'method' },
        { label: 'Date', key: 'createdAt' },
        { label: 'Status', key: 'status' }
      ],
      load: function (state) {
        return API.getTransactions({
          studentId: studentId,
          status: state.filters.status || 'All',
          method: state.filters.method || 'All',
          search: state.search
        });
      }
    });
  };

  Pages.parentDashboard = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (!session) return;

    var selector = document.getElementById('linkedStudentSelector');
    var host = document.querySelector('[data-parent-summary]');

    API.getAuthorisedStudents(session).then(function (res) {
      var students = res.ok ? res.data : [];
      if (!students.length) {
        if (host) host.innerHTML = UI.empty('No students are linked to your account yet. Contact your school administrator.');
        return;
      }

      if (selector) {
        selector.innerHTML = students.map(function (s) {
          return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.name) + ' · ' + Utils.esc(s.classLevel) + '</option>';
        }).join('');
        Utils.on(selector, 'change', function () { render(selector.value); });
      }

      function render(studentId) {
        var student = students.filter(function (s) { return s.id === studentId; })[0] || students[0];
        var balance = API.getFeeBalance(student.id);
        var ses = Storage.findById(CONFIG.keys.sessions, student.sessionId);
        setText('[data-child-name]', student.name);
        setText('[data-child-code]', student.studentCode);
        setText('[data-child-class]', student.classLevel);
        setText('[data-child-session]', ses ? ses.label : '—');
        setText('[data-total-fees]', Utils.formatCurrency(balance.charges + balance.adjustments));
        setText('[data-amount-paid]', Utils.formatCurrency(balance.paid));
        setText('[data-outstanding]', Utils.formatCurrency(balance.outstanding));
        setText('[data-collection-rate]', balance.progress.toFixed(1) + '% settled');

        var bar = Utils.qs('[data-progress-bar]');
        if (bar) bar.style.setProperty('--value', String(Utils.round2(balance.progress)));

        var payLink = Utils.qs('[data-quick-pay]');
        if (payLink) payLink.setAttribute('href', 'payment.html?student=' + encodeURIComponent(student.id));

        var reminderHost = Utils.qs('[data-reminders]');
        if (reminderHost) {
          var upcoming = balance.mandatoryFees.filter(function (f) { return f.dueDate; })
            .sort(function (a, b) { return new Date(a.dueDate) - new Date(b.dueDate); }).slice(0, 3);
          reminderHost.innerHTML = upcoming.length ? upcoming.map(function (f) {
            var days = Utils.daysUntil(f.dueDate);
            return '<div class="alert alert--' + (days !== null && days < 0 ? 'danger' : 'warning') + '"><div>' +
              '<strong>' + Utils.esc(f.name) + '</strong>Due ' + Utils.formatDate(f.dueDate) +
              ' · ' + Utils.formatCurrency(f.amount) + '</div></div>';
          }).join('') : '';
        }

        Tables.register('parent-receipts', {
          pageSize: 5,
          defaultSort: 'paidAt',
          defaultDir: 'desc',
          exportName: 'edupay-child-receipts.csv',
          emptyMessage: 'No receipts have been issued for this student yet.',
          columns: [
            { key: 'receiptNumber', label: 'Receipt No.', render: function (r) { return '<span class="mono">' + Utils.esc(r.receiptNumber) + '</span>'; } },
            { key: 'reference', label: 'Reference', render: function (r) { return '<span class="mono">' + Utils.esc(r.reference) + '</span>'; } },
            { key: 'feeLabel', label: 'Fee' },
            { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return Utils.formatCurrency(r.amount); } },
            { key: 'paidAt', label: 'Date', render: function (r) { return Utils.formatDate(r.paidAt); } },
            { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } }
          ],
          exportColumns: [
            { label: 'Receipt No.', key: 'receiptNumber' },
            { label: 'Reference', key: 'reference' },
            { label: 'Fee', key: 'feeLabel' },
            { label: 'Amount', key: 'amount' },
            { label: 'Date', key: 'paidAt' },
            { label: 'Status', key: 'status' }
          ],
          load: function () { return API.getReceipts({ studentId: student.id }); }
        });

        Tables.register('parent-transactions', {
          pageSize: 5,
          defaultSort: 'createdAt',
          defaultDir: 'desc',
          exportName: 'edupay-child-transactions.csv',
          emptyMessage: 'No transactions recorded for this student yet.',
          columns: [
            { key: 'reference', label: 'Reference', render: function (r) { return '<span class="mono">' + Utils.esc(r.reference) + '</span>'; } },
            { key: 'feeLabel', label: 'Fee' },
            { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return Utils.formatCurrency(r.amount); } },
            { key: 'method', label: 'Method' },
            { key: 'createdAt', label: 'Date', render: function (r) { return Utils.formatDate(r.createdAt); } },
            { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } }
          ],
          exportColumns: [
            { label: 'Reference', key: 'reference' },
            { label: 'Fee', key: 'feeLabel' },
            { label: 'Amount', key: 'amount' },
            { label: 'Method', key: 'method' },
            { label: 'Date', key: 'createdAt' },
            { label: 'Status', key: 'status' }
          ],
          load: function () { return API.getTransactions({ studentId: student.id }); }
        });

        Tables.mountAll();
      }

      render(students[0].id);
    });
  };

  /* ========================================================================
     12. PAYMENT WORKFLOW
     ======================================================================== */
  Pages.payment = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (!session) return;

    var form = document.getElementById('paymentForm');
    if (!form) return;

    var params = new URLSearchParams(window.location.search);
    var studentSelect = form.elements.studentId;
    var sessionSelect = form.elements.sessionId;
    var feeSelect = form.elements.feeLabel;
    var amountInput = form.elements.amount;
    var methodRadios = Utils.qsa('[name="method"]', form);
    var summaryHost = Utils.qs('[data-payment-summary]');
    var submit = form.querySelector('[type="submit"]');
    var outcomeSelect = form.elements.demoOutcome;
    var reviewBox = Utils.qs('[data-payment-review]');

    var current = { student: null, balance: null, sessionId: null };

    function renderSummary() {
      if (!summaryHost || !current.student || !current.balance) return;
      var b = current.balance;
      summaryHost.innerHTML =
        '<div class="detail-list">' +
        '<div><dt>Student</dt><dd>' + Utils.esc(current.student.name) + '</dd></div>' +
        '<div><dt>Student ID</dt><dd class="mono">' + Utils.esc(current.student.studentCode) + '</dd></div>' +
        '<div><dt>Class</dt><dd>' + Utils.esc(current.student.classLevel) + '</dd></div>' +
        '<div><dt>Total charges</dt><dd>' + Utils.formatCurrency(b.charges) + '</dd></div>' +
        '<div><dt>Approved adjustments</dt><dd>' + Utils.formatCurrency(b.adjustments) + '</dd></div>' +
        '<div><dt>Confirmed payments</dt><dd>' + Utils.formatCurrency(b.payments) + '</dd></div>' +
        '<div><dt>Outstanding balance</dt><dd>' + Utils.formatCurrency(b.outstanding) + '</dd></div>' +
        '</div>';
    }

    function loadStudent(studentId) {
      return API.getStudentById(studentId).then(function (res) {
        if (!res.ok) { UI.toast(res.error, 'danger'); return; }
        current.student = res.data;
        current.sessionId = res.data.sessionId;
        current.balance = API.getFeeBalance(res.data.id, current.sessionId);

        if (sessionSelect) {
          API.getAcademicSessions().then(function (sr) {
            if (!sr.ok) return;
            sessionSelect.innerHTML = sr.data.map(function (s) {
              return '<option value="' + Utils.esc(s.id) + '"' +
                (s.id === current.sessionId ? ' selected' : '') + '>' + Utils.esc(s.label + ' · ' + s.term) + '</option>';
            }).join('');
          });
        }

        if (feeSelect) {
          var fees = API.getApplicableFees(res.data, current.sessionId);
          feeSelect.innerHTML = fees.map(function (f) {
            return '<option value="' + Utils.esc(f.id) + '" data-category="' + Utils.esc(f.category) + '"' +
              ' data-amount="' + Utils.esc(f.amount) + '">' + Utils.esc(f.name) + ' — ' +
              Utils.formatCurrency(f.amount) + '</option>';
          }).join('');
        }

        var maxHint = Utils.qs('[data-max-hint]');
        if (maxHint) {
          maxHint.textContent = 'You may pay up to ' + Utils.formatCurrency(current.balance.outstanding) +
            ' for this session. Partial payments are permitted where configured.';
        }

        renderSummary();
      });
    }

    function collectMethod() {
      for (var i = 0; i < methodRadios.length; i++) {
        if (methodRadios[i].checked) return methodRadios[i].value;
      }
      return null;
    }

    /* Student selector */
    API.getAuthorisedStudents(session).then(function (res) {
      var students = res.ok ? res.data : [];
      if (!students.length) {
        UI.toast('No student account is linked to you.', 'warning');
        return;
      }
      if (studentSelect) {
        studentSelect.innerHTML = students.map(function (s) {
          return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.name) + ' · ' + Utils.esc(s.studentCode) + '</option>';
        }).join('');
        var preselect = params.get('student');
        if (preselect && students.some(function (s) { return s.id === preselect; })) {
          studentSelect.value = preselect;
        }
        Utils.on(studentSelect, 'change', function () { loadStudent(studentSelect.value); });
      }
      loadStudent(studentSelect ? studentSelect.value : students[0].id);
    });

    /* Preset amount buttons */
    Utils.qsa('[data-set-amount]').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        if (!current.balance) return;
        var mode = btn.getAttribute('data-set-amount');
        var value = mode === 'full' ? current.balance.outstanding
          : mode === 'half' ? Utils.round2(current.balance.outstanding / 2)
            : Utils.round2(current.balance.outstanding * (parseFloat(mode) || 0) / 100);
        if (amountInput) amountInput.value = String(value);
        Validate.setFieldError(amountInput, null);
        updateReview();
      });
    });

    /* Payment plan selection */
    var planSelect = form.elements.planInstalment;
    if (planSelect) {
      planSelect.innerHTML = '<option value="">No plan — pay an amount</option>' +
        CONFIG.planInstalments.map(function (p, i) {
          return '<option value="' + i + '">' + Utils.esc(p.label) + '</option>';
        }).join('');
      Utils.on(planSelect, 'change', function () {
        var idx = parseInt(planSelect.value, 10);
        if (isNaN(idx) || !current.balance) return;
        var percent = CONFIG.planInstalments[idx].percent;
        if (amountInput) amountInput.value = String(Utils.round2(current.balance.outstanding * percent / 100));
        updateReview();
      });
    }

    function updateReview() {
      if (!reviewBox) return;
      var method = collectMethod();
      var amount = Utils.toNumber(amountInput ? amountInput.value : 0);
      var feeOpt = feeSelect && feeSelect.options[feeSelect.selectedIndex];
      reviewBox.innerHTML =
        '<div class="detail-list">' +
        '<div><dt>Student</dt><dd>' + Utils.esc(current.student ? current.student.name : '—') + '</dd></div>' +
        '<div><dt>Fee</dt><dd>' + Utils.esc(feeOpt ? feeOpt.text.split(' — ')[0] : '—') + '</dd></div>' +
        '<div><dt>Amount</dt><dd>' + Utils.formatCurrency(amount) + '</dd></div>' +
        '<div><dt>Method</dt><dd>' + Utils.esc(method || 'Not selected') + '</dd></div>' +
        '<div><dt>Reference</dt><dd class="mono">' + Utils.esc(API.nextReference()) + '</dd></div>' +
        '</div>' +
        '<p class="text-xs text-muted mt-4">Simulated payment. No real card numbers, PINs, CVVs or banking passwords are collected or stored.</p>';
    }

    if (amountInput) Utils.on(amountInput, 'input', Utils.debounce(updateReview, 200));
    methodRadios.forEach(function (r) { Utils.on(r, 'change', updateReview); });
    if (feeSelect) Utils.on(feeSelect, 'change', updateReview);

    Utils.on(form, 'submit', function (e) {
      e.preventDefault();
      Validate.clearForm(form);

      if (!current.balance) { UI.toast('Select a student first.', 'warning'); return; }

      var amount = amountInput ? amountInput.value : '';
      var amountError = Validate.amount(amount, { balance: current.balance.outstanding });
      if (amountError) {
        Validate.setFieldError(amountInput, amountError);
        UI.toast(amountError, 'danger', 'Check the amount');
        return;
      }

      var method = collectMethod();
      if (!method) { UI.toast('Choose a payment method.', 'warning'); return; }

      if (current.balance.outstanding <= 0) {
        UI.toast('There is no outstanding balance for this student.', 'info');
        return;
      }

      var feeOpt = feeSelect && feeSelect.options[feeSelect.selectedIndex];
      var outcome = outcomeSelect ? outcomeSelect.value : 'success';

      UI.confirm({
        title: 'Confirm payment',
        message: 'Pay ' + Utils.formatCurrency(Utils.toNumber(amount)) + ' for ' +
          current.student.name + ' using ' + method + '? This is a simulated payment.',
        confirmLabel: 'Confirm payment'
      }).then(function (confirmed) {
        if (!confirmed) return;
        UI.setLoading(submit, true, 'Processing…');

        API.createPaymentIntent({
          studentId: current.student.id,
          sessionId: current.sessionId,
          amount: Utils.toNumber(amount),
          method: method,
          feeIds: feeSelect && feeOpt ? [feeOpt.value] : [],
          feeLabel: feeOpt ? feeOpt.text.split(' — ')[0] : 'Tuition Fee',
          category: feeOpt ? (feeOpt.getAttribute('data-category') || 'Tuition') : 'Tuition'
        }).then(function (res) {
          if (!res.ok) {
            UI.setLoading(submit, false);
            UI.toast(res.error, 'danger', 'Payment not started');
            return;
          }
          var tx = res.data;
          UI.toast('Payment initiated. Reference ' + tx.reference + '.', 'info', 'Processing');
          return API.confirmDemoPayment(tx.id, outcome).then(function (cr) {
            UI.setLoading(submit, false);
            if (!cr.ok) { UI.toast(cr.error, 'danger'); return; }
            if (outcome === 'success' && cr.data.receipt) {
              UI.toast('Payment successful. Receipt ' + cr.data.receipt.receiptNumber + ' generated.', 'success');
              setTimeout(function () {
                Auth.redirect('receipt.html?receipt=' + encodeURIComponent(cr.data.receipt.id));
              }, 900);
            } else if (outcome === 'pending') {
              UI.toast('Payment is pending confirmation. The balance is unchanged.', 'warning', 'Pending');
              setTimeout(function () { Auth.redirect('payment-history.html'); }, 900);
            } else {
              UI.toast('The simulated payment failed. No balance change was applied.', 'danger', 'Payment failed');
              setTimeout(function () { Auth.redirect('payment-history.html'); }, 900);
            }
          });
        }).catch(function () {
          UI.setLoading(submit, false);
          UI.toast('We could not process the payment. Please try again.', 'danger');
        });
      });
    });

    updateReview();
  };

  Pages.paymentHistory = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (!session) return;

    /* Session filter options */
    var sessionFilter = Utils.qs('[data-filter="sessionId"]');
    if (sessionFilter) {
      API.getAcademicSessions().then(function (res) {
        if (!res.ok) return;
        sessionFilter.innerHTML = '<option value="">All sessions</option>' + res.data.map(function (s) {
          return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.label) + '</option>';
        }).join('');
      });
    }

    /* Student filter, only where authorised */
    var studentFilter = Utils.qs('[data-filter="studentId"]');
    if (studentFilter && (session.role === 'parent' || session.role === 'admin' || session.role === 'finance' || session.role === 'superadmin')) {
      API.getAuthorisedStudents(session).then(function (res) {
        if (!res.ok) return;
        studentFilter.innerHTML = '<option value="">All students</option>' + res.data.map(function (s) {
          return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.name) + '</option>';
        }).join('');
      });
    }

    Tables.register('payment-history', {
      defaultSort: 'createdAt',
      defaultDir: 'desc',
      exportName: 'edupay-payment-history.csv',
      emptyTitle: 'No transactions found',
      emptyMessage: 'Adjust the filters or make a payment to see records here.',
      columns: [
        { key: 'reference', label: 'Reference', render: function (r) {
          return '<a class="mono" href="payment-details.html?tx=' + encodeURIComponent(r.id) + '">' + Utils.esc(r.reference) + '</a>';
        } },
        { key: 'receiptNumber', label: 'Receipt No.', render: function (r) {
          var receipt = r.receiptId ? Storage.findById(CONFIG.keys.receipts, r.receiptId) : null;
          return receipt
            ? '<a class="mono" href="receipt.html?receipt=' + encodeURIComponent(receipt.id) + '">' + Utils.esc(receipt.receiptNumber) + '</a>'
            : '<span class="text-muted">—</span>';
        } },
        { key: 'studentName', label: 'Student', render: function (r) {
          return Utils.esc(r.studentName) + '<br><small class="text-muted mono">' + Utils.esc(r.studentCode) + '</small>';
        } },
        { key: 'feeLabel', label: 'Fee' },
        { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return Utils.formatCurrency(r.amount); } },
        { key: 'method', label: 'Method' },
        { key: 'createdAt', label: 'Date', render: function (r) { return Utils.formatDate(r.createdAt); } },
        { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } },
        { key: 'action', label: 'Action', sortable: false, render: function (r) {
          return '<div class="actions"><a class="btn btn--soft btn--sm" href="payment-details.html?tx=' +
            encodeURIComponent(r.id) + '">View</a></div>';
        } }
      ],
      exportColumns: [
        { label: 'Reference', key: 'reference' },
        { label: 'Student', key: 'studentName' },
        { label: 'Student ID', key: 'studentCode' },
        { label: 'Fee', key: 'feeLabel' },
        { label: 'Amount', key: 'amount' },
        { label: 'Method', key: 'method' },
        { label: 'Date', key: 'createdAt' },
        { label: 'Status', key: 'status' }
      ],
      load: function (state) {
        var filters = {
          status: state.filters.status || 'All',
          method: state.filters.method || 'All',
          sessionId: state.filters.sessionId || 'All',
          from: state.filters.from || '',
          to: state.filters.to || '',
          search: state.search
        };
        var studentId = state.filters.studentId;
        if (session.role === 'student') filters.studentId = session.studentId;
        else if (studentId) filters.studentId = studentId;

        if (!studentId && session.role === 'parent') {
          return API.getAuthorisedStudents(session).then(function (ar) {
            filters.studentIds = (ar.ok ? ar.data : []).map(function (s) { return s.id; });
            return API.getTransactions(filters);
          });
        }
        return API.getTransactions(filters);
      }
    });
  };

  Pages.paymentDetails = function () {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('tx') || params.get('id') || params.get('reference');
    var host = Utils.qs('[data-transaction-detail]');
    if (!host) return;

    var session = Storage.get(CONFIG.keys.session, null);

    function paint(tx) {
      if (!session || !API.canAccessStudent(session, tx.studentId)) {
        host.innerHTML = UI.empty('You are not authorised to view this transaction.', 'Access denied');
        return;
      }
      var receipt = tx.receiptId ? Storage.findById(CONFIG.keys.receipts, tx.receiptId) : null;
      host.innerHTML =
        '<div class="card card--static">' +
        '<div class="card__head"><h3 class="mono">' + Utils.esc(tx.reference) + '</h3>' + Utils.badge(tx.status) + '</div>' +
        '<div class="detail-list">' +
        '<div><dt>Student</dt><dd>' + Utils.esc(tx.studentName) + ' <span class="mono text-muted">' + Utils.esc(tx.studentCode) + '</span></dd></div>' +
        '<div><dt>Class</dt><dd>' + Utils.esc(tx.classLevel) + '</dd></div>' +
        '<div><dt>Session</dt><dd>' + Utils.esc(tx.sessionLabel || '—') + '</dd></div>' +
        '<div><dt>Fee</dt><dd>' + Utils.esc(tx.feeLabel) + '</dd></div>' +
        '<div><dt>Amount</dt><dd>' + Utils.formatCurrency(tx.amount) + '</dd></div>' +
        '<div><dt>Method</dt><dd>' + Utils.esc(tx.method) + '</dd></div>' +
        '<div><dt>Provider reference</dt><dd class="mono">' + Utils.esc(tx.providerReference || '—') + '</dd></div>' +
        '<div><dt>Initiated</dt><dd>' + Utils.formatDateTime(tx.createdAt) + '</dd></div>' +
        '<div><dt>Confirmed</dt><dd>' + Utils.formatDateTime(tx.confirmedAt) + '</dd></div>' +
        (tx.verification ? '<div><dt>Verification</dt><dd>' + Utils.esc(tx.verification.decision) +
          (tx.verification.reason ? ' — ' + Utils.esc(tx.verification.reason) : '') + '</dd></div>' : '') +
        (tx.notes ? '<div><dt>Notes</dt><dd>' + Utils.esc(tx.notes) + '</dd></div>' : '') +
        '</div>' +
        '<div class="form-actions mt-6">' +
        (receipt ? '<a class="btn btn--primary" href="receipt.html?receipt=' + encodeURIComponent(receipt.id) + '">View Receipt</a>' : '') +
        (tx.status === 'Successful' && !receipt ? '<button class="btn btn--primary" type="button" data-generate-receipt>Generate Receipt</button>' : '') +
        '<a class="btn btn--soft" href="payment-history.html">Back to Payment History</a>' +
        '</div></div>';

      var gen = Utils.qs('[data-generate-receipt]', host);
      if (gen) {
        Utils.on(gen, 'click', function () {
          UI.setLoading(gen, true, 'Generating…');
          API.generateReceipt(tx.id).then(function (res) {
            UI.setLoading(gen, false);
            if (!res.ok) { UI.toast(res.error, 'danger'); return; }
            UI.toast('Receipt ' + res.data.receiptNumber + ' generated.', 'success');
            setTimeout(function () {
              Auth.redirect('receipt.html?receipt=' + encodeURIComponent(res.data.id));
            }, 600);
          });
        });
      }
    }

    if (!id) { host.innerHTML = UI.empty('No transaction was specified.'); return; }

    API.getTransactionByReference(id).then(function (res) {
      if (res.ok) { paint(res.data); return; }
      var tx = API.getTransactionById(id);
      if (tx) paint(tx);
      else host.innerHTML = UI.empty('No transaction matches that reference.', 'Transaction not found');
    });
  };

  /* ========================================================================
     13. RECEIPTS & VERIFICATION
     ======================================================================== */
  var Receipts = (NS.receipts = {});

  Receipts.template = function (receipt, tx) {
    var school = API.getSchoolById(receipt.schoolId) || {};
    return '' +
      '<div class="receipt-sheet" id="receiptSheet">' +
      '<div class="receipt-sheet__head">' +
      '<div><h2>' + Utils.esc(school.name || 'School') + '</h2>' +
      '<p>' + Utils.esc(school.address || '') + '<br>' +
      Utils.esc(school.email || '') + ' · ' + Utils.esc(school.phone || '') + '</p></div>' +
      '<div class="receipt-sheet__stamp">' + Utils.esc(receipt.status) + '</div>' +
      '</div>' +
      '<div class="receipt-sheet__title">Official Payment Receipt</div>' +
      '<table><tbody>' +
      '<tr><th>Receipt number</th><td class="mono">' + Utils.esc(receipt.receiptNumber) + '</td></tr>' +
      '<tr><th>Transaction reference</th><td class="mono">' + Utils.esc(receipt.reference) + '</td></tr>' +
      '<tr><th>Student name</th><td>' + Utils.esc(receipt.studentName) + '</td></tr>' +
      '<tr><th>Student ID</th><td class="mono">' + Utils.esc(receipt.studentCode) + '</td></tr>' +
      '<tr><th>Class / programme</th><td>' + Utils.esc(receipt.classLevel) + '</td></tr>' +
      '<tr><th>Academic session</th><td>' + Utils.esc(receipt.sessionLabel || '—') + '</td></tr>' +
      '<tr><th>Fee description</th><td>' + Utils.esc(receipt.feeLabel) + '</td></tr>' +
      '<tr><th>Payment method</th><td>' + Utils.esc(receipt.method) + '</td></tr>' +
      '<tr><th>Payment date</th><td>' + Utils.formatDateTime(receipt.paidAt) + '</td></tr>' +
      '<tr><th>Transaction status</th><td>' + Utils.esc(tx ? tx.status : 'Successful') + '</td></tr>' +
      '<tr><th>Issued by</th><td>' + Utils.esc(receipt.issuedBy) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="receipt-sheet__amount"><span>Amount paid</span><span>' +
      Utils.formatCurrency(receipt.amount) + ' ' + Utils.esc(receipt.currency) + '</span></div>' +
      '<div class="receipt-sheet__foot">' +
      '<div><b>Verification instructions</b><br>' +
      'Look up this receipt by receipt number or transaction reference on the EduPay receipt verification page. ' +
      'Receipt access is restricted to authorised users.</div>' +
      '<div>Generated ' + Utils.formatDateTime(receipt.createdAt) + '</div>' +
      '</div>' +
      '<p class="receipt-sheet__note">Demonstration receipt. This document was produced from a simulated payment ' +
      'record stored in the browser and is not proof of a real financial transaction.</p>' +
      '</div>';
  };

  Receipts.renderLookup = function (form, mode, value) {
    var host = Utils.qs('[data-lookup-result]') || document.getElementById('lookupResult');
    if (!host) return;
    host.innerHTML = '<div class="skeleton skeleton--block"></div>';
    API.lookupReceipt(mode, value).then(function (res) {
      if (!res.ok) {
        host.innerHTML = '<div class="alert alert--warning"><div><strong>No match</strong>' +
          Utils.esc(res.error) + '</div></div>';
        return;
      }
      if (res.data.mode === 'student') {
        var list = res.data.receipts || [];
        host.innerHTML = '<h3>' + Utils.esc(res.data.student.name) + ' — ' + list.length + ' receipt(s)</h3>' +
          (list.length ? '<div class="detail-list">' + list.map(function (r) {
            return '<div><dt class="mono">' + Utils.esc(r.receiptNumber) + '</dt><dd>' +
              Utils.formatCurrency(r.amount) + ' · ' + Utils.esc(r.status) + '</dd></div>';
          }).join('') + '</div>' : '<p class="text-muted">No receipts found for this student.</p>');
        return;
      }
      var receipt = res.data.receipt;
      var tx = res.data.transaction;
      var valid = receipt.status === 'Valid' && (!tx || tx.status === 'Successful');
      host.innerHTML =
        '<div class="alert alert--' + (valid ? 'success' : 'warning') + '"><div>' +
        '<strong>' + (valid ? 'Receipt found and consistent' : 'Receipt found — status requires review') + '</strong>' +
        'Receipt ' + Utils.esc(receipt.receiptNumber) + ' is linked to transaction ' +
        Utils.esc(receipt.reference) + ' (' + Utils.esc(tx ? tx.status : 'unknown') + ').</div></div>' +
        '<div class="mt-4">' + Receipts.template(receipt, tx) + '</div>' +
        '<p class="text-xs text-muted mt-4">Verification is based on demonstration records stored in this browser. ' +
        'A production system must confirm receipts through a backend endpoint.</p>';
    });
  };

  Pages.receipt = function () {
    var host = Utils.qs('[data-receipt-host]');
    if (!host) return;

    var params = new URLSearchParams(window.location.search);
    var key = params.get('receipt') || params.get('ref') || params.get('reference') || params.get('id');
    var session = Storage.get(CONFIG.keys.session, null);

    /* Lookup panel */
    var lookupForm = document.getElementById('receiptLookupForm');
    if (lookupForm) {
      Utils.on(lookupForm, 'submit', function (e) {
        e.preventDefault();
        Receipts.renderLookup(lookupForm, lookupForm.elements.lookupMode.value, lookupForm.elements.lookupValue.value);
      });
    }

    if (!key) {
      host.innerHTML = UI.empty('Enter a receipt number, transaction reference or student ID to look up a receipt.',
        'Receipt lookup', '');
      return;
    }

    host.innerHTML = '<div class="skeleton skeleton--block"></div>';

    API.getReceipt(key).then(function (res) {
      if (!res.ok) {
        host.innerHTML = '<div class="alert alert--warning"><div><strong>Receipt not found</strong>' +
          Utils.esc(res.error) + '</div></div>';
        return;
      }
      var receipt = res.data;
      if (session && !API.canAccessStudent(session, receipt.studentId)) {
        host.innerHTML = '<div class="alert alert--danger"><div><strong>Access denied</strong>' +
          'This receipt belongs to a student you are not authorised to view.</div></div>';
        return;
      }

      var tx = API.getTransactionById(receipt.transactionId);
      host.innerHTML =
        Receipts.template(receipt, tx) +
        '<div class="form-actions mt-6 no-print">' +
        '<button class="btn btn--primary" type="button" data-download-receipt>Download Receipt</button>' +
        '<button class="btn btn--soft" type="button" data-print>Print Receipt</button>' +
        (tx ? '<a class="btn btn--soft" href="payment-details.html?tx=' + encodeURIComponent(tx.id) + '">View Transaction</a>' : '') +
        '<a class="btn btn--ghost" href="' + Utils.esc(Auth.homeFor(session ? session.role : 'student')) + '">Return to Dashboard</a>' +
        '</div>';

      Utils.on(Utils.qs('[data-download-receipt]', host), 'click', function () {
        var text = Receipts.plainText(receipt, tx);
        Utils.downloadBlob(receipt.receiptNumber + '.txt', text, 'text/plain;charset=utf-8;');
        UI.toast('Receipt downloaded.', 'success');
      });
    });
  };

  Receipts.plainText = function (receipt, tx) {
    var school = API.getSchoolById(receipt.schoolId) || {};
    var lines = [
      (school.name || 'School'),
      (school.address || ''),
      (school.email || '') + ' | ' + (school.phone || ''),
      '',
      'OFFICIAL PAYMENT RECEIPT',
      '-----------------------------------------',
      'Receipt number        : ' + receipt.receiptNumber,
      'Transaction reference : ' + receipt.reference,
      'Student name          : ' + receipt.studentName,
      'Student ID            : ' + receipt.studentCode,
      'Class / programme     : ' + receipt.classLevel,
      'Academic session      : ' + (receipt.sessionLabel || '—'),
      'Fee description       : ' + receipt.feeLabel,
      'Payment method        : ' + receipt.method,
      'Payment date          : ' + Utils.formatDateTime(receipt.paidAt),
      'Transaction status    : ' + (tx ? tx.status : 'Successful'),
      'Issued by             : ' + receipt.issuedBy,
      '-----------------------------------------',
      'AMOUNT PAID           : ' + Utils.formatCurrency(receipt.amount) + ' ' + receipt.currency,
      '-----------------------------------------',
      '',
      'Verification: look up this receipt by receipt number or transaction',
      'reference on the EduPay receipt verification page.',
      '',
      'Demonstration receipt generated from a simulated payment record.',
      'Generated ' + Utils.formatDateTime(receipt.createdAt)
    ];
    return lines.join('\r\n');
  };

  /* ========================================================================
     14. FEE STATEMENT
     ======================================================================== */
  Pages.feeStatement = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (!session) return;

    var selector = document.getElementById('statementStudent');
    var sessionFilter = document.getElementById('statementSession');
    var host = Utils.qs('[data-statement-host]');
    var summary = Utils.qs('[data-statement-summary]');

    function load(studentId, sessionId) {
      if (host) host.innerHTML = '<div class="skeleton skeleton--block"></div>';
      API.getFeeStatement(studentId, sessionId).then(function (res) {
        if (!res.ok) {
          if (host) host.innerHTML = UI.errorState(res.error);
          return;
        }
        var d = res.data;
        if (summary) {
          summary.innerHTML =
            '<div class="stats">' +
            '<div class="stat stat--accent"><span class="stat__label">Total charges</span>' +
            '<div class="stat__value">' + Utils.formatCurrency(d.balance.charges) + '</div></div>' +
            '<div class="stat stat--success"><span class="stat__label">Confirmed payments</span>' +
            '<div class="stat__value">' + Utils.formatCurrency(d.balance.paid) + '</div></div>' +
            '<div class="stat stat--warning"><span class="stat__label">Adjustments</span>' +
            '<div class="stat__value">' + Utils.formatCurrency(d.balance.adjustments) + '</div></div>' +
            '<div class="stat stat--danger"><span class="stat__label">Outstanding balance</span>' +
            '<div class="stat__value">' + Utils.formatCurrency(d.balance.outstanding) + '</div></div>' +
            '</div>';
        }
        if (!host) return;
        if (!d.entries.length) { host.innerHTML = UI.empty('No ledger entries for this session.'); return; }

        var rows = d.entries.map(function (e) {
          return '<tr>' +
            '<td data-label="Date">' + Utils.formatDate(e.date) + '</td>' +
            '<td data-label="Type">' + Utils.esc(e.type) + '</td>' +
            '<td data-label="Description">' + Utils.esc(e.description) + '</td>' +
            '<td data-label="Reference" class="mono">' + Utils.esc(e.reference) + '</td>' +
            '<td data-label="Debit" class="num">' + (e.debit ? Utils.formatCurrency(e.debit) : '—') + '</td>' +
            '<td data-label="Credit" class="num">' + (e.credit ? Utils.formatCurrency(e.credit) : '—') + '</td>' +
            '<td data-label="Balance" class="num">' + Utils.formatCurrency(e.balance) + '</td>' +
            '</tr>';
        }).join('');

        host.innerHTML = '<div class="table-wrap"><table class="data-table table--stack">' +
          '<caption>Fee statement for ' + Utils.esc(d.student.name) + ' · ' +
          Utils.esc(d.session ? d.session.label : '') + '</caption>' +
          '<thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Reference</th>' +
          '<th style="text-align:right">Debit</th><th style="text-align:right">Credit</th>' +
          '<th style="text-align:right">Balance</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table></div>' +
          '<p class="text-xs text-muted mt-4">Outstanding balance = total charges + approved adjustments − ' +
          'confirmed payments + applicable reversals − applicable refund credits. Pending and failed ' +
          'transactions are excluded.</p>';
      });
    }

    API.getAuthorisedStudents(session).then(function (res) {
      var students = res.ok ? res.data : [];
      if (!students.length) {
        if (host) host.innerHTML = UI.empty('No students are linked to your account.');
        return;
      }
      if (selector) {
        selector.innerHTML = students.map(function (s) {
          return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.name) + ' · ' + Utils.esc(s.studentCode) + '</option>';
        }).join('');
        Utils.on(selector, 'change', function () { load(selector.value, sessionFilter ? sessionFilter.value : null); });
      }
      if (sessionFilter) {
        API.getAcademicSessions().then(function (sr) {
          if (!sr.ok) return;
          sessionFilter.innerHTML = sr.data.map(function (s) {
            return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.label) + '</option>';
          }).join('');
          sessionFilter.value = students[0].sessionId;
          Utils.on(sessionFilter, 'change', function () { load(selector.value, sessionFilter.value); });
        });
      }
      load(selector ? selector.value : students[0].id, sessionFilter ? sessionFilter.value : null);
    });

    Utils.qsa('[data-export-statement]').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        var studentId = selector ? selector.value : null;
        var sessionId = sessionFilter ? sessionFilter.value : null;
        API.getFeeStatement(studentId, sessionId).then(function (res) {
          if (!res.ok) { UI.toast(res.error, 'danger'); return; }
          var cols = [
            { label: 'Date', value: function (r) { return Utils.formatDate(r.date); } },
            { label: 'Type', key: 'type' },
            { label: 'Description', key: 'description' },
            { label: 'Reference', key: 'reference' },
            { label: 'Debit', key: 'debit' },
            { label: 'Credit', key: 'credit' },
            { label: 'Balance', key: 'balance' }
          ];
          Utils.downloadCSV('edupay-fee-statement.csv', cols, res.data.entries);
          UI.toast('Fee statement exported.', 'success');
        });
      });
    });
  };

  /* ========================================================================
     15. FINANCE PAGES
     ======================================================================== */
  Pages.financeDashboard = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (!session) return;
    var metrics = API.getDashboardMetrics({});

    setText('[data-collections]', Utils.formatCurrency(metrics.collections));
    setText('[data-pending-count]', Utils.formatNumber(metrics.pendingCount));
    setText('[data-pending-amount]', Utils.formatCurrency(metrics.pendingAmount));
    setText('[data-failed-count]', Utils.formatNumber(metrics.failedCount));
    setText('[data-review-count]', Utils.formatNumber(metrics.reviewCount));
    setText('[data-outstanding]', Utils.formatCurrency(metrics.outstanding));
    setText('[data-receipts-issued]', Utils.formatNumber(metrics.receiptsIssued));
    setText('[data-collection-rate]', metrics.collectionRate.toFixed(1) + '%');

    var charts = Utils.qs('[data-collections-chart]');
    if (charts) {
      var months = Object.keys(metrics.byMonth).sort();
      if (!months.length) { charts.innerHTML = UI.empty('No confirmed collections to chart yet.'); }
      else {
        var max = Math.max.apply(null, months.map(function (m) { return metrics.byMonth[m]; })) || 1;
        charts.innerHTML = '<div class="bars" role="img" aria-label="Confirmed collections by month">' +
          months.map(function (m) {
            var h = Math.max(6, Math.round((metrics.byMonth[m] / max) * 100));
            return '<i style="height:' + h + '%" title="' + Utils.esc(m) + ': ' +
              Utils.esc(Utils.formatCurrency(metrics.byMonth[m])) + '"></i>';
          }).join('') + '</div>' +
          '<p class="text-xs text-muted mt-4">' + Utils.esc(months.join(' · ')) + '</p>';
      }
    }

    var methodHost = Utils.qs('[data-method-breakdown]');
    if (methodHost) {
      var keys = Object.keys(metrics.byMethod);
      methodHost.innerHTML = keys.length ? '<div class="detail-list">' + keys.map(function (k) {
        return '<div><dt>' + Utils.esc(k) + '</dt><dd>' + Utils.formatCurrency(metrics.byMethod[k]) + '</dd></div>';
      }).join('') + '</div>' : UI.empty('No confirmed payments by method yet.');
    }

    Tables.register('finance-recent', {
      pageSize: 8,
      defaultSort: 'createdAt',
      defaultDir: 'desc',
      exportName: 'edupay-finance-recent.csv',
      emptyMessage: 'No transactions recorded.',
      columns: [
        { key: 'reference', label: 'Reference', render: function (r) { return '<span class="mono">' + Utils.esc(r.reference) + '</span>'; } },
        { key: 'studentName', label: 'Student' },
        { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return Utils.formatCurrency(r.amount); } },
        { key: 'method', label: 'Method' },
        { key: 'createdAt', label: 'Date', render: function (r) { return Utils.formatDate(r.createdAt); } },
        { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } }
      ],
      exportColumns: [
        { label: 'Reference', key: 'reference' },
        { label: 'Student', key: 'studentName' },
        { label: 'Amount', key: 'amount' },
        { label: 'Method', key: 'method' },
        { label: 'Date', key: 'createdAt' },
        { label: 'Status', key: 'status' }
      ],
      load: function () { return API.getTransactions({}); }
    });
  };

  Pages.transactions = function () {
    var sessionFilter = Utils.qs('[data-filter="sessionId"]');
    if (sessionFilter) {
      API.getAcademicSessions().then(function (res) {
        if (!res.ok) return;
        sessionFilter.innerHTML = '<option value="">All sessions</option>' + res.data.map(function (s) {
          return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.label) + '</option>';
        }).join('');
      });
    }

    Tables.register('transactions', {
      defaultSort: 'createdAt',
      defaultDir: 'desc',
      exportName: 'edupay-transactions.csv',
      emptyTitle: 'No transactions found',
      emptyMessage: 'Adjust the filters to see more records.',
      columns: [
        { key: 'reference', label: 'Reference', render: function (r) { return '<span class="mono">' + Utils.esc(r.reference) + '</span>'; } },
        { key: 'receiptNumber', label: 'Receipt No.', render: function (r) {
          var rc = r.receiptId ? Storage.findById(CONFIG.keys.receipts, r.receiptId) : null;
          return rc ? '<span class="mono">' + Utils.esc(rc.receiptNumber) + '</span>' : '—';
        } },
        { key: 'studentName', label: 'Student', render: function (r) {
          return Utils.esc(r.studentName) + '<br><small class="text-muted mono">' + Utils.esc(r.studentCode) + '</small>';
        } },
        { key: 'feeLabel', label: 'Fee' },
        { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return Utils.formatCurrency(r.amount); } },
        { key: 'method', label: 'Method' },
        { key: 'createdAt', label: 'Date', render: function (r) { return Utils.formatDate(r.createdAt); } },
        { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } },
        { key: 'action', label: 'Action', sortable: false, render: function (r) {
          return '<div class="actions"><a class="btn btn--soft btn--sm" href="payment-details.html?tx=' +
            encodeURIComponent(r.id) + '">View</a>' +
            (r.status === 'Successful' && r.receiptId ? '<a class="btn btn--soft btn--sm" href="receipt.html?receipt=' +
              encodeURIComponent(r.receiptId) + '">Receipt</a>' : '') + '</div>';
        } }
      ],
      exportColumns: [
        { label: 'Reference', key: 'reference' },
        { label: 'Student', key: 'studentName' },
        { label: 'Student ID', key: 'studentCode' },
        { label: 'Fee', key: 'feeLabel' },
        { label: 'Amount', key: 'amount' },
        { label: 'Method', key: 'method' },
        { label: 'Date', key: 'createdAt' },
        { label: 'Status', key: 'status' }
      ],
      load: function (state) {
        return API.getTransactions({
          status: state.filters.status || 'All',
          method: state.filters.method || 'All',
          sessionId: state.filters.sessionId || 'All',
          category: state.filters.category || 'All',
          from: state.filters.from || '',
          to: state.filters.to || '',
          search: state.search
        });
      }
    });
  };

  Pages.verification = function () {
    var host = Utils.qs('[data-verification-host]');
    if (!host) return;

    function render() {
      host.innerHTML = '<div class="skeleton skeleton--block"></div>';
      API.getTransactions({}).then(function (res) {
        if (!res.ok) { host.innerHTML = UI.errorState(res.error); return; }
        var queue = res.data.filter(function (t) {
          return t.status === 'Pending' || t.status === 'Under Review' || t.method === 'Offline Submission';
        });
        if (!queue.length) {
          host.innerHTML = UI.empty('There are no transactions awaiting verification.', 'Queue is clear');
          return;
        }
        host.innerHTML = queue.map(function (t) {
          return '<div class="card card--static mb-4" data-verify-card="' + Utils.esc(t.id) + '">' +
            '<div class="card__head"><h3 class="mono">' + Utils.esc(t.reference) + '</h3>' + Utils.badge(t.status) + '</div>' +
            '<div class="detail-list">' +
            '<div><dt>Student</dt><dd>' + Utils.esc(t.studentName) + ' · <span class="mono">' + Utils.esc(t.studentCode) + '</span></dd></div>' +
            '<div><dt>Claimed amount</dt><dd>' + Utils.formatCurrency(t.amount) + '</dd></div>' +
            '<div><dt>Channel</dt><dd>' + Utils.esc(t.method) + '</dd></div>' +
            '<div><dt>Submitted</dt><dd>' + Utils.formatDateTime(t.createdAt) + '</dd></div>' +
            '<div><dt>Evidence reference</dt><dd class="mono">' + Utils.esc(t.providerReference || '—') + '</dd></div>' +
            (t.verification && t.verification.decision !== 'Pending'
              ? '<div><dt>Last decision</dt><dd>' + Utils.esc(t.verification.decision) + '</dd></div>' : '') +
            '</div>' +
            '<div class="form-actions mt-4">' +
            '<button class="btn btn--success btn--sm" type="button" data-decision="Approved" data-tx="' + Utils.esc(t.id) + '">Approve</button>' +
            '<button class="btn btn--danger btn--sm" type="button" data-decision="Rejected" data-tx="' + Utils.esc(t.id) + '">Reject</button>' +
            '<button class="btn btn--warning btn--sm" type="button" data-decision="More Information Requested" data-tx="' + Utils.esc(t.id) + '">Request more information</button>' +
            '</div></div>';
        }).join('');

        Utils.qsa('[data-decision]', host).forEach(function (btn) {
          Utils.on(btn, 'click', function () {
            var txId = btn.getAttribute('data-tx');
            var decision = btn.getAttribute('data-decision');
            var tx = API.getTransactionById(txId);
            var modal = UI.modal({
              title: 'Record verification decision',
              body:
                '<div class="alert alert--warning"><div><strong>' +
                Utils.esc(decision) + '</strong> for ' + Utils.esc(tx.reference) + ' — ' +
                Utils.formatCurrency(tx.amount) + '.</div></div>' +
                '<p class="text-xs text-muted mt-4">A bank transfer screenshot is not definitive proof. ' +
                'Approve only when the payment is confirmed through trusted bank or provider evidence.</p>' +
                '<div class="field"><label for="decisionReason">Reason / notes' +
                (decision === 'Approved' ? ' (optional)' : ' (required)') + '</label>' +
                '<textarea id="decisionReason" class="textarea"></textarea></div>',
              footer: '<button class="btn btn--soft" type="button" data-close>Cancel</button>' +
                '<button class="btn btn--primary" type="button" data-save>Save decision</button>'
            });

            Utils.on(modal.querySelector('[data-save]'), 'click', function () {
              var reasonEl = modal.querySelector('#decisionReason');
              var saveBtn = modal.querySelector('[data-save]');
              UI.setLoading(saveBtn, true, 'Saving…');
              API.verifyTransaction(txId, decision, reasonEl ? reasonEl.value : '').then(function (res) {
                UI.setLoading(saveBtn, false);
                if (!res.ok) { UI.toast(res.error, 'danger'); return; }
                modal.close();
                UI.toast('Decision recorded: ' + decision + '.', 'success');
                render();
              });
            });
          });
        });
      });
    }

    render();
  };

  Pages.reconciliation = function () {
    var fileInput = document.getElementById('settlementFile');
    var mappingHost = Utils.qs('[data-column-mapping]');
    var resultsHost = Utils.qs('[data-reconciliation-results]');
    var runBtn = Utils.qs('[data-run-reconciliation]');
    var parsedRows = [];

    if (fileInput) {
      Utils.on(fileInput, 'change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          var rows = Utils.parseCSV(String(e.target.result || ''));
          if (rows.length < 2) {
            UI.toast('The selected file does not contain any settlement rows.', 'warning');
            return;
          }
          var header = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
          var refIdx = header.indexOf('reference');
          var amtIdx = header.indexOf('amount');
          if (refIdx < 0 || amtIdx < 0) {
            UI.toast('The file must include "reference" and "amount" columns.', 'danger', 'Column mapping failed');
            return;
          }
          parsedRows = rows.slice(1).map(function (r) {
            return { reference: r[refIdx], amount: r[amtIdx] };
          });
          if (mappingHost) {
            mappingHost.innerHTML = '<div class="alert alert--success"><div><strong>Column mapping validated</strong>' +
              parsedRows.length + ' settlement row(s) read. Reference → column "' + Utils.esc(rows[0][refIdx]) +
              '", Amount → column "' + Utils.esc(rows[0][amtIdx]) + '".</div></div>';
          }
          UI.toast(parsedRows.length + ' row(s) ready to reconcile.', 'success');
        };
        reader.onerror = function () { UI.toast('The file could not be read.', 'danger'); };
        reader.readAsText(file);
      });
    }

    if (runBtn) {
      Utils.on(runBtn, 'click', function () {
        if (!parsedRows.length) { UI.toast('Import a settlement CSV first.', 'warning'); return; }
        UI.setLoading(runBtn, true, 'Reconciling…');
        API.reconcileTransactions(parsedRows).then(function (res) {
          UI.setLoading(runBtn, false);
          if (!res.ok) { UI.toast(res.error, 'danger'); return; }
          UI.toast(res.data.length + ' row(s) reconciled. Unmatched records were not marked paid.', 'success');
          renderResults(res.data);
        });
      });
    }

    function renderResults(rows) {
      if (!resultsHost) return;
      if (!rows.length) { resultsHost.innerHTML = UI.empty('No reconciliation results yet.'); return; }
      resultsHost.innerHTML = '<div class="table-wrap"><table class="data-table table--stack">' +
        '<thead><tr><th>Reference</th><th style="text-align:right">Settlement amount</th>' +
        '<th style="text-align:right">Recorded amount</th><th>Outcome</th><th>Notes</th></tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr>' +
            '<td data-label="Reference" class="mono">' + Utils.esc(r.reference || '—') + '</td>' +
            '<td data-label="Settlement amount" class="num">' + Utils.formatCurrency(r.providerAmount) + '</td>' +
            '<td data-label="Recorded amount" class="num">' +
            (r.transactionAmount === null ? '—' : Utils.formatCurrency(r.transactionAmount)) + '</td>' +
            '<td data-label="Outcome">' + Utils.badge(r.status) + '</td>' +
            '<td data-label="Notes">' + Utils.esc(r.notes) + '</td>' +
            '</tr>';
        }).join('') + '</tbody></table></div>';
    }

    Utils.qsa('[data-export-reconciliation]').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        API.getReconciliationResults().then(function (res) {
          if (!res.ok || !res.data.length) { UI.toast('There is nothing to export yet.', 'warning'); return; }
          Utils.downloadCSV('edupay-reconciliation.csv', [
            { label: 'Reference', key: 'reference' },
            { label: 'Settlement amount', key: 'providerAmount' },
            { label: 'Recorded amount', key: 'transactionAmount' },
            { label: 'Outcome', key: 'status' },
            { label: 'Decision', key: 'decision' },
            { label: 'Notes', key: 'notes' },
            { label: 'Imported', key: 'importedAt' }
          ], res.data);
          UI.toast('Reconciliation results exported.', 'success');
        });
      });
    });

    API.getReconciliationResults().then(function (res) {
      if (res.ok) renderResults(res.data);
    });
  };

  Pages.reports = function () {
    var host = Utils.qs('[data-report-host]');
    var metricsHost = Utils.qs('[data-report-metrics]');
    var form = document.getElementById('reportFilters');

    function run() {
      var filters = {
        sessionId: form && form.elements.sessionId ? form.elements.sessionId.value : null,
        classLevel: form && form.elements.classLevel ? form.elements.classLevel.value : 'All',
        status: form && form.elements.status ? form.elements.status.value : 'All',
        method: form && form.elements.method ? form.elements.method.value : 'All',
        category: form && form.elements.category ? form.elements.category.value : 'All'
      };
      if (metricsHost) metricsHost.innerHTML = '<div class="skeleton skeleton--block"></div>';
      if (host) host.innerHTML = '<div class="skeleton skeleton--block"></div>';

      API.getReports(filters).then(function (res) {
        if (!res.ok) {
          if (host) host.innerHTML = UI.errorState(res.error);
          return;
        }
        var d = res.data;
        if (metricsHost) {
          metricsHost.innerHTML =
            '<div class="stats">' +
            '<div class="stat stat--accent"><span class="stat__label">Fees assessed</span>' +
            '<div class="stat__value">' + Utils.formatCurrency(d.metrics.feesAssessed) + '</div></div>' +
            '<div class="stat stat--success"><span class="stat__label">Confirmed collections</span>' +
            '<div class="stat__value">' + Utils.formatCurrency(d.metrics.collections) + '</div></div>' +
            '<div class="stat stat--warning"><span class="stat__label">Outstanding</span>' +
            '<div class="stat__value">' + Utils.formatCurrency(d.metrics.outstanding) + '</div></div>' +
            '<div class="stat stat--danger"><span class="stat__label">Collection rate</span>' +
            '<div class="stat__value">' + d.metrics.collectionRate.toFixed(1) + '%</div></div>' +
            '</div>';
        }
        if (!host) return;
        if (!d.studentRows.length) { host.innerHTML = UI.empty('No student records match the selected filters.'); return; }
        host.innerHTML = '<div class="table-wrap"><table class="data-table table--stack">' +
          '<caption>Generated ' + Utils.formatDateTime(d.generatedAt) + '</caption>' +
          '<thead><tr><th>Student ID</th><th>Student</th><th>Class</th>' +
          '<th style="text-align:right">Charges</th><th style="text-align:right">Adjustments</th>' +
          '<th style="text-align:right">Paid</th><th style="text-align:right">Outstanding</th><th>Progress</th></tr></thead><tbody>' +
          d.studentRows.map(function (r) {
            return '<tr>' +
              '<td data-label="Student ID" class="mono">' + Utils.esc(r.studentCode) + '</td>' +
              '<td data-label="Student">' + Utils.esc(r.studentName) + '</td>' +
              '<td data-label="Class">' + Utils.esc(r.classLevel) + '</td>' +
              '<td data-label="Charges" class="num">' + Utils.formatCurrency(r.charges) + '</td>' +
              '<td data-label="Adjustments" class="num">' + Utils.formatCurrency(r.adjustments) + '</td>' +
              '<td data-label="Paid" class="num">' + Utils.formatCurrency(r.paid) + '</td>' +
              '<td data-label="Outstanding" class="num">' + Utils.formatCurrency(r.outstanding) + '</td>' +
              '<td data-label="Progress">' + r.progress.toFixed(1) + '%</td>' +
              '</tr>';
          }).join('') + '</tbody></table></div>';
      });
    }

    if (form) {
      Utils.on(form, 'submit', function (e) { e.preventDefault(); run(); });
      Utils.on(form, 'change', run);
      var sessionSelect = form.elements.sessionId;
      if (sessionSelect) {
        API.getAcademicSessions().then(function (res) {
          if (!res.ok) return;
          sessionSelect.innerHTML = '<option value="All">All sessions</option>' + res.data.map(function (s) {
            return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.label) + '</option>';
          }).join('');
          sessionSelect.value = (API.getActiveSession() || {}).id || 'All';
          run();
        });
      }
    }

    Utils.qsa('[data-export-report]').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        var filters = {
          sessionId: form && form.elements.sessionId ? form.elements.sessionId.value : null,
          classLevel: form && form.elements.classLevel ? form.elements.classLevel.value : 'All',
          status: form && form.elements.status ? form.elements.status.value : 'All',
          method: form && form.elements.method ? form.elements.method.value : 'All',
          category: form && form.elements.category ? form.elements.category.value : 'All'
        };
        API.getReports(filters).then(function (res) {
          if (!res.ok) { UI.toast(res.error, 'danger'); return; }
          Utils.downloadCSV('edupay-collections-report.csv', [
            { label: 'Student ID', key: 'studentCode' },
            { label: 'Student', key: 'studentName' },
            { label: 'Class', key: 'classLevel' },
            { label: 'Charges', key: 'charges' },
            { label: 'Adjustments', key: 'adjustments' },
            { label: 'Paid', key: 'paid' },
            { label: 'Outstanding', key: 'outstanding' },
            { label: 'Progress (%)', value: function (r) { return r.progress.toFixed(1); } }
          ], res.data.studentRows);
          UI.toast('Report exported to CSV.', 'success');
          var user = Auth.currentUser();
          if (user) API.createAuditLog(user, 'CSV export', 'Report', 'Collections report exported.', '');
        });
      });
    });
  };

  Pages.receiptManagement = function () {
    Tables.register('receipts', {
      defaultSort: 'paidAt',
      defaultDir: 'desc',
      exportName: 'edupay-receipts.csv',
      emptyTitle: 'No receipts issued',
      emptyMessage: 'Receipts are created automatically when a payment is confirmed.',
      columns: [
        { key: 'receiptNumber', label: 'Receipt No.', render: function (r) {
          return '<a class="mono" href="receipt.html?receipt=' + encodeURIComponent(r.id) + '">' + Utils.esc(r.receiptNumber) + '</a>';
        } },
        { key: 'reference', label: 'Reference', render: function (r) { return '<span class="mono">' + Utils.esc(r.reference) + '</span>'; } },
        { key: 'studentName', label: 'Student' },
        { key: 'feeLabel', label: 'Fee' },
        { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return Utils.formatCurrency(r.amount); } },
        { key: 'method', label: 'Method' },
        { key: 'paidAt', label: 'Paid', render: function (r) { return Utils.formatDate(r.paidAt); } },
        { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } },
        { key: 'action', label: 'Action', sortable: false, render: function (r) {
          return '<div class="actions"><a class="btn btn--soft btn--sm" href="receipt.html?receipt=' +
            encodeURIComponent(r.id) + '">Open</a></div>';
        } }
      ],
      exportColumns: [
        { label: 'Receipt No.', key: 'receiptNumber' },
        { label: 'Reference', key: 'reference' },
        { label: 'Student', key: 'studentName' },
        { label: 'Student ID', key: 'studentCode' },
        { label: 'Fee', key: 'feeLabel' },
        { label: 'Amount', key: 'amount' },
        { label: 'Method', key: 'method' },
        { label: 'Paid', key: 'paidAt' },
        { label: 'Status', key: 'status' }
      ],
      load: function (state) {
        return API.getReceipts({ search: state.search, sessionId: state.filters.sessionId || 'All' });
      }
    });

    var lookupForm = document.getElementById('receiptLookupForm');
    if (lookupForm) {
      Utils.on(lookupForm, 'submit', function (e) {
        e.preventDefault();
        Receipts.renderLookup(lookupForm, lookupForm.elements.lookupMode.value, lookupForm.elements.lookupValue.value);
      });
    }
  };

  /* ========================================================================
     16. ADMIN PAGES
     ======================================================================== */
  var CRUD = {
    students: {
      title: 'Student',
      key: CONFIG.keys.students,
      idPrefix: 'STU',
      fields: [
        { name: 'name', label: 'Full name', required: true },
        { name: 'studentCode', label: 'Student ID', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'classLevel', label: 'Class / programme', type: 'select', options: CLASS_LEVELS },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
      ],
      table: {
        columns: [
          { key: 'studentCode', label: 'Student ID', render: function (r) { return '<span class="mono">' + Utils.esc(r.studentCode) + '</span>'; } },
          { key: 'name', label: 'Name' },
          { key: 'classLevel', label: 'Class' },
          { key: 'email', label: 'Email' },
          { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } },
          { key: 'action', label: 'Action', sortable: false, render: function (r) {
            return '<div class="actions">' +
              '<button class="btn btn--soft btn--sm" type="button" data-edit="' + Utils.esc(r.id) + '">Edit</button>' +
              '<button class="btn btn--soft btn--sm" type="button" data-toggle-status="' + Utils.esc(r.id) + '">' +
              (r.status === 'Active' ? 'Deactivate' : 'Activate') + '</button></div>';
          } }
        ],
        exportColumns: [
          { label: 'Student ID', key: 'studentCode' },
          { label: 'Name', key: 'name' },
          { label: 'Class', key: 'classLevel' },
          { label: 'Email', key: 'email' },
          { label: 'Phone', key: 'phone' },
          { label: 'Status', key: 'status' }
        ],
        load: function (state) {
          return API.getStudents({
            search: state.search,
            classLevel: state.filters.classLevel || null,
            status: state.filters.status || null
          });
        }
      }
    },
    parents: {
      title: 'Parent / guardian',
      key: CONFIG.keys.parents,
      idPrefix: 'PAR',
      fields: [
        { name: 'name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'relationship', label: 'Relationship', type: 'select', options: ['Father', 'Mother', 'Guardian', 'Sponsor'] },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
      ],
      table: {
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'relationship', label: 'Relationship' },
          { key: 'linkedStudentIds', label: 'Linked students', sortable: false, render: function (r) {
            return '<span class="badge">' + (r.linkedStudentIds || []).length + '</span>';
          } },
          { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } },
          { key: 'action', label: 'Action', sortable: false, render: function (r) {
            return '<div class="actions">' +
              '<button class="btn btn--soft btn--sm" type="button" data-edit="' + Utils.esc(r.id) + '">Edit</button>' +
              '<button class="btn btn--soft btn--sm" type="button" data-link-parent="' + Utils.esc(r.id) + '">Link students</button></div>';
          } }
        ],
        exportColumns: [
          { label: 'Name', key: 'name' },
          { label: 'Email', key: 'email' },
          { label: 'Phone', key: 'phone' },
          { label: 'Relationship', key: 'relationship' },
          { label: 'Status', key: 'status' }
        ],
        load: function (state) { return API.getParents({ search: state.search }); }
      }
    },
    fees: {
      title: 'Fee structure',
      key: CONFIG.keys.fees,
      idPrefix: 'FEE',
      fields: [
        { name: 'name', label: 'Fee name', required: true },
        { name: 'category', label: 'Category', type: 'select', options: CONFIG.categories },
        { name: 'amount', label: 'Amount (NGN)', type: 'number', required: true },
        { name: 'classLevel', label: 'Class / programme', type: 'select', options: ['All'].concat(CLASS_LEVELS) },
        { name: 'dueDate', label: 'Due date', type: 'date' },
        { name: 'mandatory', label: 'Mandatory', type: 'select', options: ['Yes', 'No'] },
        { name: 'active', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
      ],
      table: {
        columns: [
          { key: 'name', label: 'Fee' },
          { key: 'category', label: 'Category' },
          { key: 'classLevel', label: 'Class' },
          { key: 'sessionLabel', label: 'Session' },
          { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return Utils.formatCurrency(r.amount); } },
          { key: 'dueDate', label: 'Due date', render: function (r) { return Utils.formatDate(r.dueDate); } },
          { key: 'mandatory', label: 'Type', render: function (r) {
            return '<span class="badge ' + (r.mandatory ? 'badge--initiated' : 'badge--pending') + '">' +
              (r.mandatory ? 'Mandatory' : 'Optional') + '</span>';
          } },
          { key: 'active', label: 'Status', render: function (r) { return Utils.badge(r.active ? 'Active' : 'Inactive'); } },
          { key: 'action', label: 'Action', sortable: false, render: function (r) {
            return '<div class="actions">' +
              '<button class="btn btn--soft btn--sm" type="button" data-edit="' + Utils.esc(r.id) + '">Edit</button>' +
              '<button class="btn btn--soft btn--sm" type="button" data-toggle-fee="' + Utils.esc(r.id) + '">' +
              (r.active ? 'Deactivate' : 'Activate') + '</button></div>';
          } }
        ],
        exportColumns: [
          { label: 'Fee', key: 'name' },
          { label: 'Category', key: 'category' },
          { label: 'Class', key: 'classLevel' },
          { label: 'Session', key: 'sessionLabel' },
          { label: 'Amount', key: 'amount' },
          { label: 'Due date', key: 'dueDate' },
          { label: 'Active', key: 'active' }
        ],
        load: function (state) {
          return API.getFees({
            search: state.search,
            sessionId: state.filters.sessionId || null,
            category: state.filters.category || null
          });
        }
      }
    },
    sessions: {
      title: 'Academic session',
      key: CONFIG.keys.sessions,
      idPrefix: 'SES',
      fields: [
        { name: 'label', label: 'Session label', required: true },
        { name: 'term', label: 'Term / semester' },
        { name: 'startDate', label: 'Start date', type: 'date' },
        { name: 'endDate', label: 'End date', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Completed', 'Upcoming'] }
      ],
      table: {
        columns: [
          { key: 'label', label: 'Session' },
          { key: 'term', label: 'Term' },
          { key: 'startDate', label: 'Start', render: function (r) { return Utils.formatDate(r.startDate); } },
          { key: 'endDate', label: 'End', render: function (r) { return Utils.formatDate(r.endDate); } },
          { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status === 'Completed' ? 'Inactive' : 'Active'); } },
          { key: 'action', label: 'Action', sortable: false, render: function (r) {
            return '<div class="actions"><button class="btn btn--soft btn--sm" type="button" data-edit="' +
              Utils.esc(r.id) + '">Edit</button>' +
              (r.status !== 'Active'
                ? '<button class="btn btn--primary btn--sm" type="button" data-activate-session="' +
                  Utils.esc(r.id) + '">Set active</button>' : '') + '</div>';
          } }
        ],
        exportColumns: [
          { label: 'Session', key: 'label' },
          { label: 'Term', key: 'term' },
          { label: 'Start', key: 'startDate' },
          { label: 'End', key: 'endDate' },
          { label: 'Status', key: 'status' }
        ],
        load: function () { return API.getAcademicSessions(); }
      }
    },
    classes: {
      title: 'Class',
      key: CONFIG.keys.classes,
      idPrefix: 'CLS',
      fields: [
        { name: 'name', label: 'Class name', required: true },
        { name: 'capacity', label: 'Capacity', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
      ],
      table: {
        columns: [
          { key: 'name', label: 'Class' },
          { key: 'capacity', label: 'Capacity', align: 'right' },
          { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } },
          { key: 'action', label: 'Action', sortable: false, render: function (r) {
            return '<div class="actions"><button class="btn btn--soft btn--sm" type="button" data-edit="' +
              Utils.esc(r.id) + '">Edit</button></div>';
          } }
        ],
        exportColumns: [
          { label: 'Class', key: 'name' },
          { label: 'Capacity', key: 'capacity' },
          { label: 'Status', key: 'status' }
        ],
        load: function () { return API.getClasses(); }
      }
    },
    staff: {
      title: 'Staff account',
      key: CONFIG.keys.users,
      idPrefix: 'USR-STAFF',
      filter: function (r) { return r.role === 'finance' || r.role === 'admin' || r.role === 'superadmin'; },
      fields: [
        { name: 'name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'role', label: 'Role', type: 'select', options: ['finance', 'admin'] },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
      ],
      table: {
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: function (r) {
            return '<span class="badge">' + Utils.esc((CONFIG.roles[r.role] || {}).label || r.role) + '</span>';
          } },
          { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } },
          { key: 'lastLoginAt', label: 'Last sign-in', render: function (r) { return Utils.formatDateTime(r.lastLoginAt); } },
          { key: 'action', label: 'Action', sortable: false, render: function (r) {
            return '<div class="actions"><button class="btn btn--soft btn--sm" type="button" data-edit="' +
              Utils.esc(r.id) + '">Edit</button></div>';
          } }
        ],
        exportColumns: [
          { label: 'Name', key: 'name' },
          { label: 'Email', key: 'email' },
          { label: 'Role', key: 'role' },
          { label: 'Status', key: 'status' }
        ],
        load: function () {
          var rows = Storage.collection(CONFIG.keys.users).filter(function (u) {
            return u.role === 'finance' || u.role === 'admin' || u.role === 'superadmin';
          });
          return { ok: true, data: rows };
        }
      }
    }
  };

  function entityFormHtml(entity, record) {
    var rec = record || {};
    return entity.fields.map(function (f) {
      var value = rec[f.name];
      if (f.name === 'mandatory') value = rec.mandatory === undefined ? 'Yes' : (rec.mandatory ? 'Yes' : 'No');
      if (f.name === 'active') value = rec.active === undefined ? 'Active' : (rec.active ? 'Active' : 'Inactive');
      if (f.type === 'select') {
        return '<div class="field"><label for="fld_' + f.name + '">' + Utils.esc(f.label) + '</label>' +
          '<select id="fld_' + f.name + '" name="' + f.name + '" class="select">' +
          f.options.map(function (o) {
            return '<option value="' + Utils.esc(o) + '"' +
              (String(value) === String(o) ? ' selected' : '') + '>' + Utils.esc(o) + '</option>';
          }).join('') + '</select><span class="field__error"></span></div>';
      }
      return '<div class="field"><label for="fld_' + f.name + '">' + Utils.esc(f.label) +
        (f.required ? ' *' : '') + '</label>' +
        '<input id="fld_' + f.name + '" name="' + f.name + '" class="input" type="' + (f.type || 'text') +
        '" value="' + Utils.esc(value === undefined || value === null ? '' : value) + '"' +
        (f.required ? ' required' : '') + ' /><span class="field__error"></span></div>';
    }).join('');
  }

  function openEntityForm(entityName, id) {
    var entity = CRUD[entityName];
    if (!entity) return;
    var record = id ? Storage.findById(entity.key, id) : null;

    var modal = UI.modal({
      title: (record ? 'Edit ' : 'New ') + entity.title.toLowerCase(),
      body: '<form id="entityForm" novalidate>' + entityFormHtml(entity, record) + '</form>',
      footer: '<button class="btn btn--soft" type="button" data-close>Cancel</button>' +
        '<button class="btn btn--primary" type="button" data-save>Save</button>'
    });

    Utils.on(modal.querySelector('[data-save]'), 'click', function () {
      var form = modal.querySelector('#entityForm');
      var saveBtn = modal.querySelector('[data-save]');
      var payload = {};
      var errors = [];

      entity.fields.forEach(function (f) {
        var input = form.elements[f.name];
        var value = input ? input.value : '';
        if (f.required && !String(value).trim()) {
          errors.push(f.label + ' is required.');
          Validate.setFieldError(input, f.label + ' is required.');
        }
        payload[f.name] = value;
      });

      if (errors.length) { UI.toast(errors[0], 'danger'); return; }

      /* Normalise typed values */
      if (payload.amount !== undefined) payload.amount = Utils.toNumber(payload.amount);
      if (payload.capacity !== undefined) payload.capacity = Utils.toNumber(payload.capacity);
      if (payload.mandatory !== undefined) payload.mandatory = payload.mandatory === 'Yes';
      if (payload.active !== undefined) payload.active = payload.active === 'Active';
      if (payload.status !== undefined && entityName !== 'fees') { /* keep status label */ }

      var nowISO = Utils.isoNow();
      var user = Auth.currentUser();

      if (record) {
        Storage.upsert(entity.key, Object.assign({}, record, payload, { updatedAt: nowISO }));
        API.createAuditLog(user, entity.title + ' updated', entity.title, 'Record updated.', record.id);
        UI.toast(entity.title + ' updated.', 'success');
      } else {
        var newRec = Object.assign({
          id: Utils.uid(entity.idPrefix),
          schoolId: 'SCH-001',
          sessionId: (API.getActiveSession() || {}).id,
          sessionLabel: (API.getActiveSession() || {}).label,
          createdAt: nowISO
        }, payload);
        if (entityName === 'sessions') {
          newRec.status = payload.status || 'Upcoming';
          newRec.schoolId = 'SCH-001';
        }
        if (entityName === 'staff') {
          newRec.password = newRec.role === 'finance' ? 'Finance123!' : 'Admin123!';
          newRec.verified = true;
          newRec.createdAt = nowISO;
        }
        if (entityName === 'parents') newRec.linkedStudentIds = [];
        Storage.upsert(entity.key, newRec);
        API.createAuditLog(user, entity.title + ' created', entity.title, 'New record created.', newRec.id);
        UI.toast(entity.title + ' created.', 'success');
      }

      saveBtn.disabled = false;
      modal.close();
      Tables.refresh(entityName === 'sessions' ? 'sessions' : (entityName === 'staff' ? 'staff' : entityName));
    });
  }

  Pages.adminEntity = function (entityName) {
    var entity = CRUD[entityName];
    if (!entity) return;

    Tables.register(entityName, Object.assign({
      defaultSort: entityName === 'fees' ? 'name' : 'name',
      defaultDir: 'asc',
      exportName: 'edupay-' + entityName + '.csv',
      emptyMessage: 'No records yet. Use the button above to create one.',
      stackOnMobile: true
    }, entity.table));

    var sessionFilter = Utils.qs('[data-filter="sessionId"]');
    if (sessionFilter) {
      API.getAcademicSessions().then(function (res) {
        if (!res.ok) return;
        sessionFilter.innerHTML = '<option value="">All sessions</option>' + res.data.map(function (s) {
          return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.label) + '</option>';
        }).join('');
      });
    }

    Utils.qsa('[data-new-record]').forEach(function (btn) {
      Utils.on(btn, 'click', function () { openEntityForm(entityName, null); });
    });

    Utils.on(document, 'click', function (e) {
      var target = e.target.closest ? e.target.closest('[data-edit],[data-toggle-status],[data-toggle-fee],[data-activate-session],[data-link-parent]') : null;
      if (!target) return;

      if (target.hasAttribute('data-edit')) {
        openEntityForm(entityName, target.getAttribute('data-edit'));
        return;
      }

      if (target.hasAttribute('data-toggle-status')) {
        var id = target.getAttribute('data-toggle-status');
        var rec = Storage.findById(entity.key, id);
        if (!rec) return;
        var next = rec.status === 'Active' ? 'Inactive' : 'Active';
        UI.confirm({
          title: (next === 'Inactive' ? 'Deactivate' : 'Activate') + ' record',
          message: 'Set ' + (rec.name || rec.studentCode) + ' to ' + next + '?',
          confirmLabel: next === 'Inactive' ? 'Deactivate' : 'Activate',
          danger: next === 'Inactive'
        }).then(function (okay) {
          if (!okay) return;
          rec.status = next;
          rec.updatedAt = Utils.isoNow();
          Storage.upsert(entity.key, rec);
          API.createAuditLog(Auth.currentUser(), 'Status change', entity.title, (rec.name || rec.id) + ' set to ' + next + '.', rec.id);
          UI.toast('Record set to ' + next + '.', 'success');
          Tables.refresh(entityName);
        });
        return;
      }

      if (target.hasAttribute('data-toggle-fee')) {
        var feeId = target.getAttribute('data-toggle-fee');
        var fee = Storage.findById(CONFIG.keys.fees, feeId);
        if (!fee) return;
        UI.confirm({
          title: fee.active ? 'Deactivate fee structure' : 'Activate fee structure',
          message: fee.active
            ? 'Deactivating keeps every linked transaction intact — records are never deleted.'
            : 'Activate "' + fee.name + '" for ' + fee.sessionLabel + '?',
          confirmLabel: fee.active ? 'Deactivate' : 'Activate',
          danger: fee.active
        }).then(function (okay) {
          if (!okay) return;
          fee.active = !fee.active;
          fee.updatedAt = Utils.isoNow();
          Storage.upsert(CONFIG.keys.fees, fee);
          API.createAuditLog(Auth.currentUser(), 'Fee change', 'Fee structure',
            fee.name + ' set to ' + (fee.active ? 'active' : 'inactive') + '.', fee.id);
          UI.toast('Fee structure ' + (fee.active ? 'activated' : 'deactivated') + '.', 'success');
          Tables.refresh('fees');
        });
        return;
      }

      if (target.hasAttribute('data-activate-session')) {
        var sid = target.getAttribute('data-activate-session');
        var ses = Storage.findById(CONFIG.keys.sessions, sid);
        if (!ses) return;
        UI.confirm({
          title: 'Set active session',
          message: 'Set ' + ses.label + ' as the active academic session?',
          confirmLabel: 'Set active'
        }).then(function (okay) {
          if (!okay) return;
          Storage.collection(CONFIG.keys.sessions).forEach(function (s) {
            s.status = s.id === sid ? 'Active' : (s.status === 'Active' ? 'Completed' : s.status);
            Storage.upsert(CONFIG.keys.sessions, s);
          });
          API.saveSettings({ currentSessionId: sid });
          API.createAuditLog(Auth.currentUser(), 'Academic session activated', 'Session',
            ses.label + ' set as active.', sid);
          UI.toast(ses.label + ' is now the active session.', 'success');
          Tables.refresh('sessions');
        });
        return;
      }

      if (target.hasAttribute('data-link-parent')) {
        var parentId = target.getAttribute('data-link-parent');
        var parent = Storage.findById(CONFIG.keys.parents, parentId);
        if (!parent) return;
        var students = Storage.collection(CONFIG.keys.students);
        var modal = UI.modal({
          title: 'Link students to ' + parent.name,
          body: '<p class="text-sm text-muted">Select the students this parent may access. ' +
            'Knowing a student ID must never grant access on its own.</p>' +
            '<div class="field"><label for="linkStudentSelect">Student</label>' +
            '<select id="linkStudentSelect" class="select">' + students.map(function (s) {
              return '<option value="' + Utils.esc(s.id) + '">' + Utils.esc(s.name + ' · ' + s.studentCode) + '</option>';
            }).join('') + '</select></div>' +
            '<div class="detail-list">' + students.filter(function (s) {
              return (parent.linkedStudentIds || []).indexOf(s.id) >= 0;
            }).map(function (s) {
              return '<div><dt>' + Utils.esc(s.name) + '</dt><dd><button class="btn btn--soft btn--sm" type="button" data-unlink="' +
                Utils.esc(s.id) + '">Remove</button></dd></div>';
            }).join('') + '</div>',
          footer: '<button class="btn btn--soft" type="button" data-close>Close</button>' +
            '<button class="btn btn--primary" type="button" data-add-link>Add link</button>'
        });

        Utils.on(modal.querySelector('[data-add-link]'), 'click', function () {
          var sel = modal.querySelector('#linkStudentSelect');
          var studentId = sel.value;
          parent.linkedStudentIds = parent.linkedStudentIds || [];
          if (parent.linkedStudentIds.indexOf(studentId) < 0) {
            parent.linkedStudentIds.push(studentId);
            Storage.upsert(CONFIG.keys.parents, parent);
            var st = Storage.findById(CONFIG.keys.students, studentId);
            if (st) {
              st.guardianIds = st.guardianIds || [];
              if (st.guardianIds.indexOf(parent.id) < 0) st.guardianIds.push(parent.id);
              Storage.upsert(CONFIG.keys.students, st);
            }
            API.createAuditLog(Auth.currentUser(), 'Parent linked', 'Student', parent.name + ' linked to student.', studentId);
            UI.toast('Student linked to parent.', 'success');
          } else {
            UI.toast('That student is already linked.', 'info');
          }
        });

        Utils.qsa('[data-unlink]', modal).forEach(function (btn) {
          Utils.on(btn, 'click', function () {
            var studentId = btn.getAttribute('data-unlink');
            parent.linkedStudentIds = (parent.linkedStudentIds || []).filter(function (id) { return id !== studentId; });
            Storage.upsert(CONFIG.keys.parents, parent);
            var st = Storage.findById(CONFIG.keys.students, studentId);
            if (st) {
              st.guardianIds = (st.guardianIds || []).filter(function (id) { return id !== parent.id; });
              Storage.upsert(CONFIG.keys.students, st);
            }
            UI.toast('Link removed.', 'success');
          });
        });
      }
    });
  };

  Pages.adminDashboard = function () {
    var metrics = API.getDashboardMetrics({});
    setText('[data-total-students]', Utils.formatNumber(metrics.totalStudents));
    setText('[data-fees-assessed]', Utils.formatCurrency(metrics.feesAssessed));
    setText('[data-collections]', Utils.formatCurrency(metrics.collections));
    setText('[data-outstanding]', Utils.formatCurrency(metrics.outstanding));
    setText('[data-pending-count]', Utils.formatNumber(metrics.pendingCount));
    setText('[data-failed-count]', Utils.formatNumber(metrics.failedCount));
    setText('[data-active-fees]', Utils.formatNumber(metrics.activeFeeStructures));
    setText('[data-collection-rate]', metrics.collectionRate.toFixed(1) + '%');

    var classHost = Utils.qs('[data-balances-by-class]');
    if (classHost) {
      var keys = Object.keys(metrics.byClass);
      classHost.innerHTML = keys.length ? '<div class="detail-list">' + keys.map(function (k) {
        return '<div><dt>' + Utils.esc(k) + '</dt><dd>' + Utils.formatCurrency(metrics.byClass[k]) + '</dd></div>';
      }).join('') + '</div>' : UI.empty('No balances to display.');
    }

    var categoryHost = Utils.qs('[data-collections-by-category]');
    if (categoryHost) {
      var ckeys = Object.keys(metrics.byCategory);
      categoryHost.innerHTML = ckeys.length ? '<div class="detail-list">' + ckeys.map(function (k) {
        return '<div><dt>' + Utils.esc(k) + '</dt><dd>' + Utils.formatCurrency(metrics.byCategory[k]) + '</dd></div>';
      }).join('') + '</div>' : UI.empty('No confirmed collections by category.');
    }

    var trendHost = Utils.qs('[data-collection-trend]');
    if (trendHost) {
      var months = Object.keys(metrics.byMonth).sort();
      if (!months.length) trendHost.innerHTML = UI.empty('No collections to chart yet.');
      else {
        var max = Math.max.apply(null, months.map(function (m) { return metrics.byMonth[m]; })) || 1;
        trendHost.innerHTML = '<div class="bars" role="img" aria-label="Collection trend">' +
          months.map(function (m) {
            return '<i style="height:' + Math.max(6, Math.round((metrics.byMonth[m] / max) * 100)) + '%" title="' +
              Utils.esc(m) + '"></i>';
          }).join('') + '</div>';
      }
    }

    var queueHost = Utils.qs('[data-verification-queue]');
    if (queueHost) {
      API.getTransactions({}).then(function (res) {
        if (!res.ok) return;
        var queue = res.data.filter(function (t) {
          return t.status === 'Pending' || t.status === 'Under Review';
        }).slice(0, 5);
        queueHost.innerHTML = queue.length ? '<div class="detail-list">' + queue.map(function (t) {
          return '<div><dt class="mono">' + Utils.esc(t.reference) + '</dt><dd>' +
            Utils.esc(t.studentName) + ' · ' + Utils.formatCurrency(t.amount) + '</dd></div>';
        }).join('') + '</div>' : UI.empty('No transactions awaiting review.');
      });
    }

    Tables.register('admin-recent', {
      pageSize: 8,
      defaultSort: 'createdAt',
      defaultDir: 'desc',
      exportName: 'edupay-admin-recent.csv',
      emptyMessage: 'No transactions recorded.',
      columns: [
        { key: 'reference', label: 'Reference', render: function (r) { return '<span class="mono">' + Utils.esc(r.reference) + '</span>'; } },
        { key: 'studentName', label: 'Student' },
        { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return Utils.formatCurrency(r.amount); } },
        { key: 'method', label: 'Method' },
        { key: 'createdAt', label: 'Date', render: function (r) { return Utils.formatDate(r.createdAt); } },
        { key: 'status', label: 'Status', render: function (r) { return Utils.badge(r.status); } }
      ],
      exportColumns: [
        { label: 'Reference', key: 'reference' },
        { label: 'Student', key: 'studentName' },
        { label: 'Amount', key: 'amount' },
        { label: 'Method', key: 'method' },
        { label: 'Date', key: 'createdAt' },
        { label: 'Status', key: 'status' }
      ],
      load: function () { return API.getTransactions({}); }
    });
  };

  Pages.auditLogs = function () {
    Tables.register('audit-logs', {
      defaultSort: 'createdAt',
      defaultDir: 'desc',
      exportName: 'edupay-audit-logs.csv',
      emptyTitle: 'No audit events',
      emptyMessage: 'Sensitive actions will be recorded here.',
      columns: [
        { key: 'createdAt', label: 'Timestamp', render: function (r) { return Utils.formatDateTime(r.createdAt); } },
        { key: 'actorName', label: 'Actor' },
        { key: 'action', label: 'Action' },
        { key: 'target', label: 'Target' },
        { key: 'summary', label: 'Summary' },
        { key: 'reference', label: 'Reference', render: function (r) { return '<span class="mono">' + Utils.esc(r.reference || '—') + '</span>'; } }
      ],
      exportColumns: [
        { label: 'Timestamp', key: 'createdAt' },
        { label: 'Actor', key: 'actorName' },
        { label: 'Action', key: 'action' },
        { label: 'Target', key: 'target' },
        { label: 'Summary', key: 'summary' },
        { label: 'Reference', key: 'reference' }
      ],
      load: function (state) {
        return API.getAuditLogs({ search: state.search, action: state.filters.action || null });
      }
    });
  };

  Pages.settings = function () {
    var form = document.getElementById('settingsForm');
    if (!form) return;
    var settings = API.getSettings();

    Object.keys(settings).forEach(function (k) {
      var input = form.elements[k];
      if (!input) return;
      if (input.type === 'checkbox') input.checked = !!settings[k];
      else input.value = settings[k];
    });

    var sessionSelect = form.elements.currentSessionId;
    if (sessionSelect) {
      API.getAcademicSessions().then(function (res) {
        if (!res.ok) return;
        sessionSelect.innerHTML = res.data.map(function (s) {
          return '<option value="' + Utils.esc(s.id) + '"' +
            (s.id === settings.currentSessionId ? ' selected' : '') + '>' + Utils.esc(s.label) + '</option>';
        }).join('');
      });
    }

    Utils.on(form, 'submit', function (e) {
      e.preventDefault();
      var patch = {};
      Object.keys(settings).forEach(function (k) {
        var input = form.elements[k];
        if (!input) return;
        patch[k] = input.type === 'checkbox' ? input.checked : input.value;
      });
      UI.setLoading(form.querySelector('[type="submit"]'), true, 'Saving…');
      API.saveSettings(patch).then(function (res) {
        UI.setLoading(form.querySelector('[type="submit"]'), false);
        if (!res.ok) { UI.toast(res.error, 'danger'); return; }
        API.createAuditLog(Auth.currentUser(), 'Settings updated', 'Settings', 'School settings saved.', 'SCH-001');
        UI.toast('Settings saved.', 'success');
      });
    });
  };

  Pages.notificationsAdmin = function () {
    var form = document.getElementById('announcementForm');
    if (!form) return;
    Utils.on(form, 'submit', function (e) {
      e.preventDefault();
      var result = Validate.form(form, {
        title: function (v) { return Validate.required(v, 'Announcement title'); },
        body: function (v) { return Validate.required(v, 'Message'); }
      });
      if (!result.valid) { UI.toast(result.errors[0], 'danger'); return; }

      var audience = form.elements.audience ? form.elements.audience.value : 'all';
      var users = Storage.collection(CONFIG.keys.users);
      var targets = users.filter(function (u) {
        if (audience === 'all') return true;
        if (audience === 'students') return u.role === 'student';
        if (audience === 'parents') return u.role === 'parent';
        if (audience === 'staff') return u.role === 'finance' || u.role === 'admin' || u.role === 'superadmin';
        return false;
      });
      targets.forEach(function (u) {
        API.notify(u.id, result.values.title, result.values.body, 'info', 'notifications.html');
      });
      API.createAuditLog(Auth.currentUser(), 'Notification sent', 'Announcement',
        result.values.title + ' sent to ' + targets.length + ' demo account(s) in-app.', '');
      UI.toast('Announcement recorded for ' + targets.length + ' account(s) in this demonstration.', 'success');
      form.reset();
    });
  };

  /* ========================================================================
     17. NOTIFICATIONS, PROFILE, SUPPORT
     ======================================================================== */
  Pages.notifications = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (!session) return;
    var host = Utils.qs('[data-notification-list]');
    var filter = 'all';

    function render() {
      if (!host) return;
      host.innerHTML = '<div class="skeleton skeleton--block"></div>';
      API.getNotifications(session.userId, filter === 'unread' ? 'unread' : null).then(function (res) {
        var rows = res.ok ? res.data : [];
        if (!rows.length) {
          host.innerHTML = UI.empty('You have no notifications for this filter.', 'Nothing to show');
          return;
        }
        host.innerHTML = rows.map(function (n) {
          return '<div class="card card--static mb-4' + (n.read ? '' : ' is-unread') + '">' +
            '<div class="card__head"><h3>' + Utils.esc(n.title) + '</h3>' + Utils.badge(n.type === 'success' ? 'Successful' : n.type === 'warning' ? 'Pending' : n.type === 'danger' ? 'Failed' : 'Initiated') + '</div>' +
            '<p>' + Utils.esc(n.body) + '</p>' +
            '<div class="form-actions">' +
            (n.link ? '<a class="btn btn--soft btn--sm" href="' + Utils.esc(n.link) + '">Open</a>' : '') +
            (n.read ? '' : '<button class="btn btn--soft btn--sm" type="button" data-read="' + Utils.esc(n.id) + '">Mark as read</button>') +
            '<span class="text-xs text-muted">' + Utils.relativeTime(n.createdAt) + '</span>' +
            '</div></div>';
        }).join('');

        Utils.qsa('[data-read]', host).forEach(function (btn) {
          Utils.on(btn, 'click', function () {
            API.markNotificationRead(btn.getAttribute('data-read')).then(function () { render(); });
          });
        });
      });
    }

    Utils.qsa('[data-notification-filter]').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        filter = btn.getAttribute('data-notification-filter');
        Utils.qsa('[data-notification-filter]').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        render();
      });
    });

    Utils.qsa('[data-mark-all-read]').forEach(function (btn) {
      Utils.on(btn, 'click', function () {
        API.markAllNotificationsRead(session.userId).then(function () {
          UI.toast('All notifications marked as read.', 'success');
          render();
        });
      });
    });

    render();
  };

  Pages.profile = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (!session) return;
    var form = document.getElementById('profileForm');
    var user = API.getCurrentUser();
    if (!user) return;

    setText('[data-profile-name]', user.name);
    setText('[data-profile-email]', user.email);
    setText('[data-profile-role]', (CONFIG.roles[user.role] || {}).label || user.role);

    if (form) {
      if (form.elements.name) form.elements.name.value = user.name || '';
      if (form.elements.phone) form.elements.phone.value = user.phone || '';
      if (form.elements.email) form.elements.email.value = user.email || '';

      Utils.on(form, 'submit', function (e) {
        e.preventDefault();
        var result = Validate.form(form, {
          name: function (v) { return Validate.required(v, 'Full name'); },
          phone: function (v) { return v ? Validate.phone(v) : null; }
        });
        if (!result.valid) { UI.toast(result.errors[0], 'danger'); return; }

        var record = Storage.findById(CONFIG.keys.users, user.id);
        if (!record) return;
        record.name = result.values.name;
        record.phone = result.values.phone;
        Storage.upsert(CONFIG.keys.users, record);

        session.name = record.name;
        Storage.set(CONFIG.keys.session, session);
        API.createAuditLog(record, 'Profile updated', 'User account', 'Profile details changed.', record.id);
        UI.toast('Profile updated.', 'success');
        setTimeout(function () { window.location.reload(); }, 700);
      });
    }

    var passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      Utils.on(passwordForm, 'submit', function (e) {
        e.preventDefault();
        var result = Validate.form(passwordForm, {
          currentPassword: function (v) { return Validate.required(v, 'Current password'); },
          password: Validate.password,
          confirmPassword: function (v, values) { return Validate.confirm(values.password, v); }
        });
        if (!result.valid) { UI.toast(result.errors[0], 'danger'); return; }

        var record = Storage.findById(CONFIG.keys.users, user.id);
        if (!record || record.password !== result.values.currentPassword) {
          Validate.setFieldError(passwordForm.elements.currentPassword, 'Current password is incorrect.');
          UI.toast('Current password is incorrect.', 'danger');
          return;
        }
        record.password = result.values.password;
        Storage.upsert(CONFIG.keys.users, record);
        API.createAuditLog(record, 'Password changed', 'User account', 'Password updated from profile.', record.id);
        UI.toast('Password updated.', 'success');
        passwordForm.reset();
      });
    }
  };

  Pages.support = function () {
    var form = document.getElementById('supportForm');
    if (!form) return;
    var session = Storage.get(CONFIG.keys.session, null);
    var host = Utils.qs('[data-support-history]');

    function renderTickets() {
      if (!host) return;
      var tickets = Storage.get('edupay_support_requests', []) || [];
      var mine = session ? tickets.filter(function (t) { return t.userId === session.userId; }) : tickets;
      host.innerHTML = mine.length ? '<div class="detail-list">' + mine.map(function (t) {
        return '<div><dt>' + Utils.esc(t.subject) + '<br><small class="text-muted">' +
          Utils.formatDateTime(t.createdAt) + '</small></dt><dd>' + Utils.badge('Pending') + '</dd></div>';
      }).join('') + '</div>' : UI.empty('You have not submitted any support requests yet.');
    }

    Utils.on(form, 'submit', function (e) {
      e.preventDefault();
      var result = Validate.form(form, {
        subject: function (v) { return Validate.required(v, 'Subject'); },
        message: function (v) { return Validate.required(v, 'Message'); }
      });
      if (!result.valid) { UI.toast(result.errors[0], 'danger'); return; }

      var tickets = Storage.get('edupay_support_requests', []) || [];
      tickets.unshift({
        id: Utils.uid('SUP'),
        userId: session ? session.userId : null,
        name: session ? session.name : 'Guest',
        email: session ? session.email : (form.elements.email ? form.elements.email.value : ''),
        subject: result.values.subject,
        message: result.values.message,
        status: 'Open',
        createdAt: Utils.isoNow()
      });
      Storage.set('edupay_support_requests', tickets);
      if (session) API.notify(session.userId, 'Support request received',
        'Your request "' + result.values.subject + '" has been recorded for this demonstration.', 'info', 'support.html');
      UI.toast('Your support request has been recorded for this demonstration.', 'success');
      form.reset();
      renderTickets();
    });

    renderTickets();
  };

  Pages.feeStructure = function () {
    var session = Storage.get(CONFIG.keys.session, null);
    if (!session) return;
    var host = Utils.qs('[data-fee-structure-host]');
    if (!host) return;

    var studentId = session.studentId;
    if (session.role === 'parent') {
      var students = API.getParentById(session.parentId);
      studentId = students && students.linkedStudentIds.length ? students.linkedStudentIds[0] : null;
    }

    API.getStudentById(studentId).then(function (res) {
      if (!res.ok) { host.innerHTML = UI.empty('No student record is linked to your account.'); return; }
      var student = res.data;
      var fees = API.getApplicableFees(student, student.sessionId);
      if (!fees.length) { host.innerHTML = UI.empty('No active fee structures for this class and session.'); return; }
      host.innerHTML = '<div class="table-wrap"><table class="data-table table--stack">' +
        '<thead><tr><th>Fee</th><th>Category</th><th>Type</th><th>Due date</th>' +
        '<th style="text-align:right">Amount</th><th>Payment plan</th></tr></thead><tbody>' +
        fees.map(function (f) {
          return '<tr>' +
            '<td data-label="Fee">' + Utils.esc(f.name) + '</td>' +
            '<td data-label="Category">' + Utils.esc(f.category) + '</td>' +
            '<td data-label="Type">' + (f.mandatory ? 'Mandatory' : 'Optional') + '</td>' +
            '<td data-label="Due date">' + Utils.formatDate(f.dueDate) + '</td>' +
            '<td data-label="Amount" class="num">' + Utils.formatCurrency(f.amount) + '</td>' +
            '<td data-label="Payment plan">' + (f.paymentPlan && f.paymentPlan.allowed ? 'Available' : 'Not available') + '</td>' +
            '</tr>';
        }).join('') + '</tbody></table></div>';
    });
  };

  /* ========================================================================
     18. BOOT
     ======================================================================== */
  function setText(selector, value) {
    Utils.qsa(selector).forEach(function (el) { el.textContent = value; });
  }
  NS.setText = setText;

  var ROUTES = {
    'landing': Pages.landing,
    'login': Pages.login,
    'register': Pages.register,
    'forgot-password': Pages.forgotPassword,
    'reset-password': Pages.resetPassword,
    'verify-account': Pages.verifyAccount,
    'student-dashboard': Pages.studentDashboard,
    'parent-dashboard': Pages.parentDashboard,
    'payment': Pages.payment,
    'payment-history': Pages.paymentHistory,
    'payment-details': Pages.paymentDetails,
    'receipt': Pages.receipt,
    'receipt-verification': Pages.receipt,
    'fee-statement': Pages.feeStatement,
    'fee-structure': Pages.feeStructure,
    'notifications': Pages.notifications,
    'profile': Pages.profile,
    'support': Pages.support,
    'finance-dashboard': Pages.financeDashboard,
    'transactions': Pages.transactions,
    'verify-payment': Pages.verification,
    'reconciliation': Pages.reconciliation,
    'reports': Pages.reports,
    'receipts': Pages.receiptManagement,
    'admin-dashboard': Pages.adminDashboard,
    'students': function () { Pages.adminEntity('students'); },
    'parents': function () { Pages.adminEntity('parents'); },
    'staff': function () { Pages.adminEntity('staff'); },
    'fee-management': function () { Pages.adminEntity('fees'); },
    'academic-sessions': function () { Pages.adminEntity('sessions'); },
    'classes': function () { Pages.adminEntity('classes'); },
    'audit-logs': Pages.auditLogs,
    'settings': Pages.settings,
    'notifications-admin': Pages.notificationsAdmin
  };

  function boot() {
    /* 1. Demo data first, then guards, then UI. */
    Seed.install(false);

    UI.initTheme();
    Auth.guard();

    UI.initNav();
    UI.initReveal();
    UI.initAccordion();
    UI.initTabs();
    UI.initDropdowns();
    UI.initMisc();

    /* 2. Page controller from <body data-page="…"> */
    var page = document.body.getAttribute('data-page');
    if (page && ROUTES[page]) {
      try {
        ROUTES[page]();
      } catch (err) {
        if (window.console && console.error) console.error('[EduPay] page error:', err);
        UI.toast('Something went wrong while loading this page.', 'danger');
      }
    }

    /* 3. Any tables declared in the markup */
    Tables.mountAll();

    /* 4. Welcome nudge for signed-in users on the landing page */
    if (page === 'landing') {
      var session = Storage.get(CONFIG.keys.session, null);
      if (session) {
        var banner = Utils.qs('[data-session-banner]');
        if (banner) {
          banner.hidden = false;
          banner.innerHTML = '<div class="alert alert--info"><div>Signed in as <b>' +
            Utils.esc(session.name) + '</b> (' + Utils.esc((CONFIG.roles[session.role] || {}).label || session.role) +
            '). <a href="' + Utils.esc(Auth.homeFor(session.role)) + '">Go to dashboard</a> · ' +
            '<a href="#" data-logout>Sign out</a></div></div>';
          Utils.qsa('[data-logout]', banner).forEach(function (b) {
            Utils.on(b, 'click', function (e) { e.preventDefault(); Auth.logout(); });
          });
        }
      }
    }

    UI.emit('app:ready', { page: page });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window, document);