/* Shared helpers, theme toggle, cross-page localStorage state, and site-wide jQuery effects.
 * Every page loads this file after jQuery and before validation.js, the data files and its own page script.
 * All shared code lives on one namespace, OFFLINE, so page scripts stay small and never clash. */
'use strict';

window.OFFLINE = window.OFFLINE || {};

(function ($, OFFLINE) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // jQuery animation length in ms; 0 for visitors who asked for less motion.
  OFFLINE.speed = reducedMotion ? 0 : 220;

  /* ---------- Safe localStorage (JSON serialized, resilient in private mode) ---------- */
  OFFLINE.storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };

  /* ---------- Light and Dark Mode (persisted in localStorage) ---------- */
  const THEME_KEY = 'offline-theme-v1';

  const readStoredTheme = () => {
    const val = OFFLINE.storage.get(THEME_KEY, null);
    if (val === 'dark' || val === 'light') return val;
    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (raw === 'dark' || raw === 'light') return raw;
    } catch {
      // ignore storage errors
    }
    return 'light';
  };

  const applyTheme = (mode, { save = false } = {}) => {
    const theme = mode === 'dark' ? 'dark' : 'light';
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-bs-theme', theme);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#151613' : '#f5f2e9');
    }

    if (save) {
      OFFLINE.storage.set(THEME_KEY, theme);
    }

    const btn = document.querySelector('#theme-toggle');
    if (btn) {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(isDark));
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      const icon = btn.querySelector('.theme-toggle-icon');
      const label = btn.querySelector('.theme-toggle-label');
      if (icon) icon.textContent = isDark ? '☀' : '☾';
      if (label) label.textContent = isDark ? 'Light' : 'Dark';
    }
    return theme;
  };

  OFFLINE.theme = {
    get: () => document.documentElement.getAttribute('data-theme') || readStoredTheme(),
    set: (mode) => applyTheme(mode, { save: true }),
    toggle: () => {
      const next = OFFLINE.theme.get() === 'dark' ? 'light' : 'dark';
      return applyTheme(next, { save: true });
    },
  };

  // Apply stored theme immediately when script executes to prevent flash
  applyTheme(readStoredTheme(), { save: false });

  /* ---------- Small DOM & Formatting Helpers ---------- */
  OFFLINE.el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([name, value]) => {
      if (value === false || value === null || value === undefined) return;
      if (name === 'text') node.textContent = value;
      else if (name === 'html') node.innerHTML = value;
      else node.setAttribute(name, value === true ? '' : value);
    });
    [].concat(children).forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  };

  OFFLINE.plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

  OFFLINE.debounce = (fn, wait = 200) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  OFFLINE.escapeRegExp = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Shared safe search highlighter used across About, Gatherings, and Field Notes.
  OFFLINE.highlight = (text, query) => {
    const fragment = document.createDocumentFragment();
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) {
      fragment.append(text);
      return fragment;
    }
    const pattern = new RegExp(`(${OFFLINE.escapeRegExp(cleanQuery)})`, 'ig');
    String(text).split(pattern).forEach((part) => {
      if (part.toLowerCase() === cleanQuery.toLowerCase()) {
        fragment.append(OFFLINE.el('mark', { class: 'search-hit', text: part }));
      } else if (part) {
        fragment.append(part);
      }
    });
    return fragment;
  };

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  OFFLINE.parseDate = (iso) => {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, m - 1, d, 12);
  };
  OFFLINE.toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  OFFLINE.formatDate = (iso, { short = false } = {}) => {
    const date = OFFLINE.parseDate(iso);
    const day = short ? DAYS[date.getDay()].slice(0, 3) : DAYS[date.getDay()];
    const month = short ? MONTHS[date.getMonth()].slice(0, 3) : MONTHS[date.getMonth()];
    return `${day} ${date.getDate()} ${month}`;
  };
  OFFLINE.daysUntil = (iso) => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const target = OFFLINE.parseDate(iso);
    const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return Math.round((end - start) / 86400000);
  };
  OFFLINE.toUtcStamp = (iso, time) => {
    const [y, m, d] = iso.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    return new Date(Date.UTC(y, m - 1, d, hh - 5, mm)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  OFFLINE.minutesBetween = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  OFFLINE.downloadText = (filename, text, type = 'text/plain') => {
    const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    const link = OFFLINE.el('a', { href: url, download: filename });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ---------- Cross-Page Saved Items: Plan Basket & Bookmarks ---------- */
  const PLAN_KEY = 'offline-plan-v2';
  const OLD_PLAN_KEY = 'offline-plan-v1';
  const BOOKMARKS_KEY = 'offline-bookmarks-v1';

  OFFLINE.plan = {
    getIds() {
      const existing = OFFLINE.storage.get(PLAN_KEY, null);
      if (Array.isArray(existing)) return existing.filter((id) => typeof id === 'string' && id);
      const oldPlan = OFFLINE.storage.get(OLD_PLAN_KEY, null);
      if (oldPlan && typeof oldPlan.session === 'string') {
        const migrated = [oldPlan.session];
        OFFLINE.storage.set(PLAN_KEY, migrated);
        return migrated;
      }
      return [];
    },
    setIds(ids) {
      const clean = [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && id))];
      OFFLINE.storage.set(PLAN_KEY, clean);
      // Keep active member profile schedule synchronized whenever the plan changes on any page
      if (OFFLINE.account && typeof OFFLINE.account.syncPlan === 'function') {
        OFFLINE.account.syncPlan(clean);
      }
      if (typeof OFFLINE.syncNav === 'function') OFFLINE.syncNav();
      window.dispatchEvent(new CustomEvent('offline:plan-change', { detail: { ids: clean } }));
      return clean;
    },
    has(id) {
      return this.getIds().includes(id);
    },
    add(id) {
      const ids = this.getIds();
      if (!ids.includes(id)) ids.push(id);
      return this.setIds(ids);
    },
    remove(id) {
      return this.setIds(this.getIds().filter((item) => item !== id));
    },
    toggle(id) {
      const ids = this.getIds();
      const idx = ids.indexOf(id);
      if (idx === -1) ids.push(id);
      else ids.splice(idx, 1);
      this.setIds(ids);
      return ids.includes(id);
    },
    clear() {
      return this.setIds([]);
    },
  };

  OFFLINE.bookmarks = {
    getIds() {
      const stored = OFFLINE.storage.get(BOOKMARKS_KEY, []);
      return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string' && id) : [];
    },
    setIds(ids) {
      const clean = [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && id))];
      OFFLINE.storage.set(BOOKMARKS_KEY, clean);
      window.dispatchEvent(new CustomEvent('offline:bookmarks-change', { detail: { ids: clean } }));
      return clean;
    },
    has(id) {
      return this.getIds().includes(id);
    },
    toggle(id) {
      const ids = this.getIds();
      const idx = ids.indexOf(id);
      if (idx === -1) ids.push(id);
      else ids.splice(idx, 1);
      this.setIds(ids);
      return ids.includes(id);
    },
    remove(id) {
      return this.setIds(this.getIds().filter((item) => item !== id));
    },
    clear() {
      return this.setIds([]);
    },
  };

  /* ---------- Demo Member Accounts (Sign Up / Log In / Profile / Log Out) ---------- */
  const ACCOUNTS_KEY = 'offline-accounts-v1';
  const SESSION_KEY = 'offline-session-v1';
  const PASS_KEY = 'offline-pass-v1';

  const getAccountsList = () => {
    const list = OFFLINE.storage.get(ACCOUNTS_KEY, []);
    return Array.isArray(list) ? list.filter((acc) => acc && typeof acc.email === 'string') : [];
  };

  const saveAccountsList = (list) => OFFLINE.storage.set(ACCOUNTS_KEY, list);

  OFFLINE.account = {
    getAll: getAccountsList,
    exists(email) {
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail) return false;
      return getAccountsList().some((a) => String(a.email).toLowerCase() === cleanEmail);
    },
    current() {
      const session = OFFLINE.storage.get(SESSION_KEY, null);
      if (session && typeof session === 'object' && session.email) {
        return session;
      }
      return null;
    },
    syncPlan(cleanIds) {
      const current = this.current();
      if (!current) return;
      const updated = { ...current, eveningIds: [...cleanIds], updatedAt: new Date().toISOString() };
      OFFLINE.storage.set(SESSION_KEY, updated);
      OFFLINE.storage.set(PASS_KEY, updated);
      const accounts = getAccountsList();
      const idx = accounts.findIndex((a) => String(a.email).toLowerCase() === String(updated.email).toLowerCase());
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], eveningIds: [...cleanIds], updatedAt: updated.updatedAt };
        saveAccountsList(accounts);
      }
    },
    signUp(profile, { allowUpdate = false } = {}) {
      const accounts = getAccountsList();
      const cleanEmail = String(profile.email || '').trim().toLowerCase();
      const existingIdx = accounts.findIndex((a) => String(a.email).toLowerCase() === cleanEmail);
      if (existingIdx >= 0 && !allowUpdate) {
        return { ok: false, field: 'email', message: 'An account with this email already exists on this browser. Switch to Log in above.' };
      }
      const record = {
        ...profile,
        email: String(profile.email || '').trim(),
        updatedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        accounts[existingIdx] = { ...accounts[existingIdx], ...record };
      } else {
        accounts.push(record);
      }
      saveAccountsList(accounts);

      const sessionData = { ...record };
      delete sessionData.password;
      OFFLINE.storage.set(SESSION_KEY, sessionData);
      OFFLINE.storage.set(PASS_KEY, sessionData);
      OFFLINE.plan.setIds(Array.isArray(record.eveningIds) ? record.eveningIds : []);
      if (typeof OFFLINE.syncNav === 'function') OFFLINE.syncNav();
      return sessionData;
    },
    logIn(email, password) {
      const cleanEmail = String(email || '').trim().toLowerCase();
      const accounts = getAccountsList();
      const found = accounts.find((a) => String(a.email).toLowerCase() === cleanEmail);

      if (!found) {
        return { ok: false, field: 'email', message: 'No account found with this email. Please sign up first.' };
      }
      if (!found.password || found.password !== String(password)) {
        return { ok: false, field: 'password', message: 'Incorrect password for this demo account. Please try again.' };
      }

      const sessionData = { ...found };
      delete sessionData.password;
      delete sessionData.loggedOut;
      OFFLINE.storage.set(SESSION_KEY, sessionData);
      OFFLINE.storage.set(PASS_KEY, sessionData);
      OFFLINE.plan.setIds(Array.isArray(sessionData.eveningIds) ? sessionData.eveningIds : []);
      if (typeof OFFLINE.syncNav === 'function') OFFLINE.syncNav();
      return { ok: true, user: sessionData };
    },
    updateProfile(patch) {
      const current = this.current();
      if (!current) return null;
      const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
      OFFLINE.storage.set(SESSION_KEY, updated);
      OFFLINE.storage.set(PASS_KEY, updated);

      const accounts = getAccountsList();
      const idx = accounts.findIndex((a) => String(a.email).toLowerCase() === String(updated.email).toLowerCase());
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], ...patch, updatedAt: updated.updatedAt };
        saveAccountsList(accounts);
      }
      if (typeof OFFLINE.syncNav === 'function') OFFLINE.syncNav();
      return updated;
    },
    logOut() {
      OFFLINE.storage.remove(SESSION_KEY);
      const pass = OFFLINE.storage.get(PASS_KEY, null);
      if (pass && typeof pass === 'object') {
        OFFLINE.storage.set(PASS_KEY, { ...pass, loggedOut: true });
      }
      if (typeof OFFLINE.syncNav === 'function') OFFLINE.syncNav();
      window.dispatchEvent(new CustomEvent('offline:auth-change', { detail: { user: null } }));
    },
    deleteAccount(email) {
      const target = String(email || (this.current() && this.current().email) || '').trim().toLowerCase();
      if (target) {
        const remaining = getAccountsList().filter((a) => String(a.email).toLowerCase() !== target);
        saveAccountsList(remaining);
      }
      OFFLINE.storage.remove(SESSION_KEY);
      OFFLINE.storage.remove(PASS_KEY);
      if (typeof OFFLINE.syncNav === 'function') OFFLINE.syncNav();
      window.dispatchEvent(new CustomEvent('offline:auth-change', { detail: { user: null } }));
    },
  };

  /* ---------- Category Illustrations (Original Vector Art) ---------- */
  const ART = {
    make: '<div class="print-art"><svg viewBox="0 0 230 245" aria-hidden="true"><path d="M12 224V130A103 103 0 0 1 218 130v94Z" fill="#f45d32"/><path d="M115 41v170M38 130h154M57 72l116 116M57 188 173 72" stroke="#f5f2e9" stroke-width="14"/><circle cx="115" cy="130" r="35" fill="#f45d32"/></svg></div>',
    play: '<svg class="dice-art" viewBox="0 0 250 210" aria-hidden="true"><g transform="translate(15 55) rotate(-13 70 70)"><rect width="130" height="130" rx="16" fill="#f5f2e9" stroke="#24251f" stroke-width="2"/><g fill="#f45d32"><circle cx="35" cy="35" r="10"/><circle cx="95" cy="35" r="10"/><circle cx="65" cy="65" r="10"/><circle cx="35" cy="95" r="10"/><circle cx="95" cy="95" r="10"/></g></g><g transform="translate(131 13) rotate(14 50 50)"><rect width="96" height="96" rx="13" fill="#24251f"/><circle cx="26" cy="26" r="8" fill="#f5f2e9"/><circle cx="70" cy="70" r="8" fill="#f5f2e9"/></g></svg>',
    slow: '<svg viewBox="0 0 250 230" fill="none" aria-hidden="true"><path d="M19 126 101 141v65l-82-17zm82 15 130-17v66l-130 16" fill="#f5f2e9" stroke="#24251f" stroke-width="2"/><path d="m34 143 52 9m-52 6 47 9m40-13 87-12m-87 25 65-9" stroke="#24251f" stroke-width="2"/><path d="M82 47h78v43c0 47-78 47-78 0Z" fill="#f45d32" stroke="#24251f" stroke-width="2"/><path d="M160 58h9c34 0 34 34 0 34h-9M99 9c-13 14 12 16 0 30M120 8c-13 14 12 16 0 30M141 9c-13 14 12 16 0 30" stroke="#24251f" stroke-width="2"/></svg>',
  };
  const ART_LABEL = {
    make: 'An orange sun block print',
    play: 'Two illustrated dice on a tabletop',
    slow: 'A line drawing of a warm mug and an open sketchbook',
  };
  OFFLINE.categoryArt = (category) => OFFLINE.el('div', {
    class: `session-art ${category === 'play' ? 'game-art' : category === 'slow' ? 'slow-art' : ''}`.trim(),
    role: 'img',
    'aria-label': ART_LABEL[category] || ART_LABEL.make,
    html: ART[category] || ART.make,
  });

  /* ---------- Toast Notification (jQuery slideDown / slideUp) ---------- */
  OFFLINE.toast = (message, { duration = 3600 } = {}) => {
    let $toast = $('#site-toast');
    if (!$toast.length) {
      $toast = $('<div id="site-toast" class="site-toast" role="status" aria-live="polite" hidden></div>').appendTo('body');
    }
    $toast.stop(true, true).text(message).prop('hidden', false).hide().slideDown(OFFLINE.speed)
      .delay(duration).slideUp(OFFLINE.speed);
  };

  /* ---------- Navigation Bar Synchronization (Theme Toggle, Saved Plan Count, Member State) ---------- */
  const ensureNavUtilities = () => {
    const collapse = document.querySelector('#site-navigation');
    if (!collapse) return;

    let actionsWrap = collapse.querySelector('.nav-utilities');
    if (!actionsWrap) {
      actionsWrap = OFFLINE.el('div', { class: 'nav-utilities' });
      const joinBtn = collapse.querySelector('.nav-join');
      if (joinBtn) {
        collapse.insertBefore(actionsWrap, joinBtn);
        actionsWrap.append(joinBtn);
      } else {
        collapse.append(actionsWrap);
      }
    }

    // Ensure Auth status area exists
    let authArea = actionsWrap.querySelector('#nav-auth-area');
    if (!authArea) {
      authArea = OFFLINE.el('div', { class: 'nav-auth-area', id: 'nav-auth-area' });
      actionsWrap.insertBefore(authArea, actionsWrap.firstChild);
    }

    // Ensure Theme Toggle button exists
    let themeBtn = actionsWrap.querySelector('#theme-toggle');
    if (!themeBtn) {
      themeBtn = OFFLINE.el('button', {
        type: 'button',
        class: 'theme-toggle',
        id: 'theme-toggle',
        'aria-pressed': 'false',
        'aria-label': 'Switch to dark mode',
      }, [
        OFFLINE.el('span', { class: 'theme-toggle-icon', 'aria-hidden': 'true', text: '☾' }),
        OFFLINE.el('span', { class: 'theme-toggle-label', text: 'Dark' }),
      ]);
      actionsWrap.append(themeBtn);
    }

    if (!themeBtn.dataset.bound) {
      themeBtn.dataset.bound = 'true';
      themeBtn.addEventListener('click', () => {
        const mode = OFFLINE.theme.toggle();
        OFFLINE.toast(mode === 'dark' ? 'Dark mode enabled.' : 'Light mode enabled.');
      });
    }

    applyTheme(OFFLINE.theme.get(), { save: false });
  };

  OFFLINE.syncNav = () => {
    ensureNavUtilities();

    const planCount = OFFLINE.plan.getIds().length;
    const joinBtn = document.querySelector('.nav-join');
    if (joinBtn) {
      let badge = joinBtn.querySelector('.nav-plan-badge');
      if (!badge) {
        badge = OFFLINE.el('span', { class: 'nav-plan-badge', id: 'nav-plan-count', hidden: true });
        const arrow = joinBtn.querySelector('span[aria-hidden="true"]');
        if (arrow) joinBtn.insertBefore(badge, arrow);
        else joinBtn.append(badge);
      }
      badge.textContent = String(planCount);
      badge.hidden = planCount === 0;
      badge.removeAttribute('aria-label');
      badge.setAttribute('title', `${planCount} saved in plan`);
    }

    const authArea = document.querySelector('#nav-auth-area');
    if (authArea) {
      const user = OFFLINE.account.current();
      authArea.replaceChildren();
      if (user && user.name) {
        const shortName = String(user.name).trim().split(/\s+/)[0];
        const profileLink = OFFLINE.el('a', {
          class: 'nav-profile-link',
          href: 'join.html#profile',
          title: `Signed in as ${user.name} (${user.email})`,
        }, [
          OFFLINE.el('span', { class: 'nav-profile-dot', 'aria-hidden': 'true' }),
          OFFLINE.el('span', { text: `Hi, ${shortName}` }),
        ]);
        const logoutBtn = OFFLINE.el('button', {
          type: 'button',
          class: 'nav-logout-btn',
          id: 'nav-logout-btn',
          'aria-label': `Log out ${shortName}`,
          text: 'Log out',
        });
        logoutBtn.addEventListener('click', () => {
          OFFLINE.account.logOut();
          OFFLINE.toast('You have logged out of your demo account.');
        });
        authArea.append(profileLink, logoutBtn);
      } else {
        const loginLink = OFFLINE.el('a', {
          class: 'nav-login-link',
          href: 'join.html#login',
          text: 'Log in',
        });
        authArea.append(loginLink);
      }
    }
  };

  /* ---------- Site-wide jQuery Effects ---------- */
  $(function () {
    OFFLINE.syncNav();

    // 1. Smooth scroll for in-page anchors (skip link included). Focus moves with the scroll.
    $(document).on('click', 'a[href^="#"]:not([href="#"])', function (event) {
      const target = $(this.hash);
      if (!target.length) return;
      event.preventDefault();
      $('html, body').stop(true).animate({ scrollTop: target.offset().top - 16 }, reducedMotion ? 0 : 450, () => {
        target.attr('tabindex', target.attr('tabindex') || '-1').trigger('focus');
        if (history.replaceState) history.replaceState(null, '', this.hash);
      });
    });

    // 2. Back-to-top button fades in after the visitor has scrolled down.
    const $top = $('<button type="button" class="back-to-top" aria-label="Back to top" hidden><span aria-hidden="true">↑</span></button>').appendTo('body');
    $top.on('click', () => $('html, body').stop(true).animate({ scrollTop: 0 }, reducedMotion ? 0 : 450));
    let topVisible = false;
    $(window).on('scroll', OFFLINE.debounce(() => {
      const show = $(window).scrollTop() > 600;
      if (show === topVisible) return;
      topVisible = show;
      if (show) $top.stop(true, true).prop('hidden', false).hide().fadeIn(OFFLINE.speed);
      else $top.stop(true, true).fadeOut(OFFLINE.speed, () => $top.prop('hidden', true));
    }, 60));

    // 3. Elements marked data-reveal fade and rise into view the first time they are seen.
    const $reveal = $('[data-reveal]');
    if ($reveal.length && 'IntersectionObserver' in window && !reducedMotion) {
      $reveal.addClass('is-waiting');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          $(entry.target).removeClass('is-waiting').addClass('is-revealed');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.15 });
      $reveal.each((_, node) => observer.observe(node));
    }
  });
}(window.jQuery, window.OFFLINE));
