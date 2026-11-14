/* Make a plan page: synced evening basket, filters, interval conflict detection,
 * 3-step wizard with Sign Up / Log In verification, Member Profile & Guest Pass, and .ics export.
 * Integrates with OFFLINE.plan, OFFLINE.account, OFFLINE.bookmarks (core.js) and OFFLINE.gatherings. */
'use strict';

(function ($, OFFLINE) {
  const QUIZ_KEY = 'offline-quiz-result-v1';
  const QUIZ_LABELS = {
    make: 'Make · A hands-on evening',
    play: 'Play · Games & new faces',
    slow: 'Slow down · Unhurried & warm',
  };

  // Wizard tabs & panels
  const wizardTabs = [
    document.querySelector('#wizard-tab-1'),
    document.querySelector('#wizard-tab-2'),
    document.querySelector('#wizard-tab-3'),
  ];
  const wizardPanels = [
    document.querySelector('#wizard-step-1'),
    document.querySelector('#wizard-step-2'),
    document.querySelector('#pass-section'),
  ];

  // Step 1 filter & basket elements
  const filterButtons = Array.from(document.querySelectorAll('[data-plan-filter]'));
  const searchInput = document.querySelector('#planner-search');
  const eveningsGrid = document.querySelector('#planner-evenings-list');
  const plannerEmpty = document.querySelector('#planner-empty');
  const btnResetFilter = document.querySelector('#btn-reset-plan-filter');

  const basketBadge = document.querySelector('#basket-badge');
  const basketList = document.querySelector('#basket-items-list');
  const conflictError = document.querySelector('#basket-conflict-error');
  const totalEveningsEl = document.querySelector('#basket-total-evenings strong');
  const totalHoursEl = document.querySelector('#basket-total-hours strong');
  const btnClearBasket = document.querySelector('#btn-clear-basket');
  const btnStep1Next = document.querySelector('#btn-step-1-next');
  const btnBackToStep1 = document.querySelector('#btn-back-to-step-1');
  const btnCancelToStep1 = document.querySelector('#btn-cancel-to-step-1');

  // Step 2 auth tabs & forms
  const tabSignup = document.querySelector('#tab-signup');
  const tabLogin = document.querySelector('#tab-login');
  const plannerForm = document.querySelector('#planner-form');
  const loginForm = document.querySelector('#login-form');
  const btnSwitchToSignup = document.querySelector('#btn-switch-to-signup');
  const passwordInput = document.querySelector('#planner-password');
  const togglePwBtn = document.querySelector('#toggle-pw');
  const loginPasswordInput = document.querySelector('#login-password');
  const toggleLoginPwBtn = document.querySelector('#toggle-login-pw');
  const passwordMeterBar = document.querySelector('#password-meter-bar');
  const passwordMeterText = document.querySelector('#password-meter-text');

  // Step 3 pass elements
  const passSerial = document.querySelector('#pass-serial');
  const passTitle = document.querySelector('#pass-title');
  const passContact = document.querySelector('#pass-contact');
  const passEveningsCount = document.querySelector('#pass-evenings-count');
  const passHours = document.querySelector('#pass-hours');
  const passParty = document.querySelector('#pass-party');
  const passFirstDate = document.querySelector('#pass-first-date');
  const passQuizMatch = document.querySelector('#pass-quiz-match');
  const passNotesCount = document.querySelector('#pass-notes-count');
  const passScheduleList = document.querySelector('#pass-schedule-list');
  const btnDownloadCalendar = document.querySelector('#btn-download-calendar');
  const btnEditPass = document.querySelector('#btn-edit-pass');
  const btnLogoutPass = document.querySelector('#btn-logout-pass');
  const btnDeletePass = document.querySelector('#btn-delete-pass');

  let currentStep = 1;
  let stepToken = 0;
  let activeAuthMode = 'signup';
  let activeCategory = 'all';
  let activeQuery = '';
  let isDeletingAccount = false;

  const SIGNUP_FIELDS = ['name', 'email', 'phone', 'password', 'confirm', 'firstVisitDate', 'guests', 'consent'];
  const LOGIN_FIELDS = ['email', 'password'];

  const formatHours = (minutes) => {
    const num = (minutes / 60).toFixed(1).replace('.0', '');
    return `${num} ${num === '1' ? 'hour' : 'hours'}`;
  };

  /* ---------- Conflict Detection ---------- */
  const checkTimeConflict = (eventA, eventB) => {
    if (eventA.date !== eventB.date) return false;
    const [startA, endA] = [eventA.start, eventA.end];
    const [startB, endB] = [eventB.start, eventB.end];
    return !(endA <= startB || endB <= startA);
  };

  const findConflicts = (ids) => {
    const events = ids.map((id) => OFFLINE.getGathering(id)).filter(Boolean);
    const conflicts = [];

    for (let i = 0; i < events.length; i += 1) {
      for (let j = i + 1; j < events.length; j += 1) {
        if (checkTimeConflict(events[i], events[j])) {
          conflicts.push([events[i], events[j]]);
        }
      }
    }
    return conflicts;
  };

  /* ---------- Filtering & Step 1 Grid ---------- */
  const matchesFilters = (event) => {
    if (activeCategory !== 'all' && event.category !== activeCategory) return false;
    if (!activeQuery) return true;
    const haystack = `${event.title} ${event.place} ${event.category} ${(event.tags || []).join(' ')}`.toLowerCase();
    return haystack.includes(activeQuery);
  };

  const renderEveningSelectors = () => {
    const selectedIds = OFFLINE.plan.getIds();
    const visibleEvents = OFFLINE.gatherings.filter(matchesFilters);
    eveningsGrid.replaceChildren();
    plannerEmpty.hidden = visibleEvents.length > 0;

    visibleEvents.forEach((event) => {
      const isSelected = selectedIds.includes(event.id);
      const free = OFFLINE.seatsLeft(event);
      const isSoldOut = free === 0 && !isSelected;

      const copy = OFFLINE.el('div', { class: 'p-3 flex-grow-1 d-flex flex-column' }, [
        OFFLINE.el('div', { class: 'd-flex justify-content-between align-items-center mb-2' }, [
          OFFLINE.el('span', { class: `tag cat-badge cat-badge-${event.category}`, text: event.category.toUpperCase() }),
          OFFLINE.el('span', { class: 'small text-muted', text: `${free} left` }),
        ]),
        OFFLINE.el('h3', { class: 'h6 fw-bold mb-1', text: event.title }),
        OFFLINE.el('p', { class: 'small text-muted mb-2', text: `${OFFLINE.formatDate(event.date, { short: true })} · ${event.start}–${event.end}` }),
        OFFLINE.el('button', {
          type: 'button',
          class: `button button-small w-100 mt-auto ${isSelected ? 'button-outline' : ''}`,
          'data-id': event.id,
          disabled: isSoldOut,
          'aria-pressed': String(isSelected),
          text: isSelected ? '✓ In your plan' : (isSoldOut ? 'Sold out' : '+ Add to plan'),
        }),
      ]);

      eveningsGrid.append(
        OFFLINE.el('article', {
          class: `planner-choice-card card-cat-${event.category} ${isSelected ? 'is-chosen' : ''}`,
        }, [OFFLINE.categoryArt(event.category), copy])
      );
    });
  };

  /* ---------- Render Basket ---------- */
  const renderBasket = () => {
    const selectedIds = OFFLINE.plan.getIds();
    const selectedEvents = selectedIds.map((id) => OFFLINE.getGathering(id)).filter(Boolean);
    basketBadge.textContent = `${selectedEvents.length} selected`;

    basketList.replaceChildren();
    if (selectedEvents.length === 0) {
      basketList.append(
        OFFLINE.el('li', { class: 'empty-basket-note', text: 'No evenings selected yet. Click "+ Add to plan" on any evening above.' })
      );
    } else {
      selectedEvents.forEach((event) => {
        basketList.append(
          OFFLINE.el('li', { class: 'basket-item d-flex justify-content-between align-items-center gap-2 py-2 border-bottom' }, [
            OFFLINE.el('div', {}, [
              OFFLINE.el('strong', { class: 'd-block basket-item-title', text: event.title }),
              OFFLINE.el('span', { class: 'small text-muted', text: `${OFFLINE.formatDate(event.date, { short: true })} · ${event.start}–${event.end} (${event.place})` }),
            ]),
            OFFLINE.el('button', {
              type: 'button',
              class: 'btn-remove-basket-item',
              'data-id': event.id,
              'aria-label': `Remove ${event.title} from plan`,
              text: '× Remove',
            }),
          ])
        );
      });
    }

    const totalMinutes = selectedEvents.reduce((sum, e) => sum + OFFLINE.durationMinutes(e), 0);
    totalEveningsEl.textContent = selectedEvents.length;
    totalHoursEl.textContent = (totalMinutes / 60).toFixed(1).replace('.0', '');

    const conflicts = findConflicts(selectedIds);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      conflictError.textContent = `Time conflict detected: "${c[0].title}" and "${c[1].title}" take place at the same date and overlapping hours. Please remove one.`;
      conflictError.hidden = false;
    } else {
      conflictError.hidden = true;
      conflictError.textContent = '';
    }
  };

  /* ---------- Auth Tab Switching ---------- */
  const switchAuthTab = (mode) => {
    activeAuthMode = mode === 'login' ? 'login' : 'signup';
    const isLogin = activeAuthMode === 'login';

    tabSignup.classList.toggle('active', !isLogin);
    tabSignup.setAttribute('aria-pressed', String(!isLogin));
    tabLogin.classList.toggle('active', isLogin);
    tabLogin.setAttribute('aria-pressed', String(isLogin));

    plannerForm.hidden = isLogin;
    loginForm.hidden = !isLogin;

    SIGNUP_FIELDS.forEach((name) => OFFLINE.clearFormError(plannerForm, name));
    LOGIN_FIELDS.forEach((name) => OFFLINE.clearFormError(loginForm, name));
  };

  /* ---------- Wizard Step Navigation ---------- */
  const syncStep3TabState = () => {
    const user = OFFLINE.account.current();
    if (wizardTabs[2]) {
      wizardTabs[2].disabled = !user;
    }
  };

  const goToStep = (step, { instant = false, focus = true } = {}) => {
    if (step === 3 && !OFFLINE.account.current()) return;

    const toPanel = wizardPanels[step - 1];
    if (!toPanel) return;

    stepToken += 1;
    const myToken = stepToken;
    currentStep = step;
    syncStep3TabState();

    wizardTabs.forEach((tab, idx) => {
      if (!tab) return;
      const active = idx + 1 === step;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-current', active ? 'step' : 'false');
    });

    const focusTarget = () => {
      if (myToken !== stepToken || !focus) return;
      if (step === 2) {
        const firstField = activeAuthMode === 'login' ? loginForm.elements.email : plannerForm.elements.name;
        if (firstField) firstField.focus();
      } else if (step === 3) {
        toPanel.focus();
      }
    };

    const otherPanels = wizardPanels.filter((p) => p && p !== toPanel);
    if (instant) {
      otherPanels.forEach((p) => { $(p).stop(true, false).hide(); p.hidden = true; });
      toPanel.hidden = false;
      $(toPanel).stop(true, false).show();
      focusTarget();
      return;
    }

    const visibleFrom = otherPanels.find((p) => !p.hidden);
    if (!visibleFrom) {
      otherPanels.forEach((p) => { $(p).stop(true, false).hide(); p.hidden = true; });
      toPanel.hidden = false;
      $(toPanel).stop(true, false).hide().fadeIn(OFFLINE.speed, focusTarget);
      return;
    }

    otherPanels.filter((p) => p !== visibleFrom).forEach((p) => {
      $(p).stop(true, false).hide();
      p.hidden = true;
    });

    $(visibleFrom).stop(true, false).fadeOut(OFFLINE.speed, () => {
      if (myToken !== stepToken) return;
      visibleFrom.hidden = true;
      toPanel.hidden = false;
      $(toPanel).stop(true, false).hide().fadeIn(OFFLINE.speed, focusTarget);
    });
  };

  /* ---------- Password Helpers ---------- */
  const bindPasswordToggle = (input, button) => {
    if (!input || !button) return;
    button.addEventListener('click', () => {
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      button.textContent = isText ? 'Show' : 'Hide';
      button.setAttribute('aria-pressed', String(!isText));
    });
  };

  const updatePasswordStrength = (val) => {
    let score = 0;
    if (val.length >= 8) score += 1;
    if (val.length >= 12) score += 1;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 1;
    if (/\d/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;

    let width = 0;
    let label = 'Use 8+ characters, mix letters and numbers.';
    let color = 'var(--error)';

    if (val.length > 0) {
      if (score <= 2) {
        width = 30;
        label = 'Weak — add capital letter or number';
        color = 'var(--error)';
      } else if (score <= 4) {
        width = 70;
        label = 'Good password';
        color = 'var(--accent)';
      } else {
        width = 100;
        label = 'Strong password';
        color = 'var(--ok)';
      }
    }

    $(passwordMeterBar).stop(true, false).animate({ width: `${width}%` }, OFFLINE.speed);
    passwordMeterBar.style.backgroundColor = color;
    passwordMeterText.textContent = label;
  };

  /* ---------- Member Profile & Guest Pass ---------- */
  const getQuizMatchLabel = () => {
    const saved = OFFLINE.storage.get(QUIZ_KEY, null);
    if (!saved || typeof saved !== 'object') return 'Not taken yet';
    if (saved.winner && QUIZ_LABELS[saved.winner]) return QUIZ_LABELS[saved.winner];
    if (saved.label) return saved.title ? `${saved.label} · ${saved.title}` : saved.label;
    return 'Not taken yet';
  };

  const renderPassMeta = () => {
    if (passQuizMatch) passQuizMatch.textContent = getQuizMatchLabel();
    if (passNotesCount) passNotesCount.textContent = OFFLINE.plural(OFFLINE.bookmarks.getIds().length, 'saved note');
  };

  const renderPassCard = (account) => {
    if (!account) return;
    const ids = OFFLINE.plan.getIds();
    const events = ids.map((id) => OFFLINE.getGathering(id)).filter(Boolean);
    const totalMinutes = events.reduce((sum, e) => sum + OFFLINE.durationMinutes(e), 0);

    passTitle.textContent = account.name;
    passContact.textContent = [account.email, account.phone].filter(Boolean).join(' · ');
    passSerial.textContent = account.serial || 'OFF-2026-0000';
    passEveningsCount.textContent = OFFLINE.plural(events.length, 'gathering');
    passHours.textContent = formatHours(totalMinutes);

    const guests = Number(account.guests) || 1;
    passParty.textContent = `${OFFLINE.plural(guests, 'person', 'people')}${account.firstTime ? ' (First-time guest)' : ''}`;
    passFirstDate.textContent = account.firstVisitDate ? OFFLINE.formatDate(account.firstVisitDate) : 'Not specified';
    renderPassMeta();

    passScheduleList.replaceChildren();
    if (events.length === 0) {
      passScheduleList.append(
        OFFLINE.el('li', { class: 'empty-basket-note', text: 'No evenings in your schedule yet. Click "Edit plan / profile" or add some on Gatherings.' })
      );
    } else {
      events.forEach((ev) => {
        passScheduleList.append(
          OFFLINE.el('li', { class: 'pass-schedule-item' }, [
            OFFLINE.el('div', {}, [
              OFFLINE.el('strong', { text: ev.title }),
              OFFLINE.el('span', { class: 'ms-2 text-muted', text: `· ${OFFLINE.formatDate(ev.date, { short: true })} (${ev.start}–${ev.end}) at ${ev.place}` }),
            ]),
            OFFLINE.el('button', {
              type: 'button',
              class: 'btn-remove-basket-item',
              'data-pass-remove': ev.id,
              'aria-label': `Remove ${ev.title} from pass schedule`,
              text: '× Remove',
            }),
          ])
        );
      });
    }
    syncStep3TabState();
  };

  const prefillSignupForm = (account) => {
    if (!account) return;
    plannerForm.elements.name.value = account.name || '';
    plannerForm.elements.email.value = account.email || '';
    plannerForm.elements.phone.value = account.phone || '';
    plannerForm.elements.firstVisitDate.value = account.firstVisitDate || '';
    plannerForm.elements.guests.value = String(account.guests || 1);
    const firstYes = plannerForm.querySelector('#first-yes');
    const firstNo = plannerForm.querySelector('#first-no');
    if (firstYes && firstNo) {
      firstYes.checked = account.firstTime !== false;
      firstNo.checked = account.firstTime === false;
    }
  };

  /* ---------- Generate Multi-Event .ics Calendar ---------- */
  const downloadIcs = () => {
    const events = OFFLINE.plan.getIds().map((id) => OFFLINE.getGathering(id)).filter(Boolean);
    if (events.length === 0) {
      OFFLINE.toast('No evenings in your plan to add to calendar.');
      return;
    }

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OFFLINE Club//Astana Student Plan//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    events.forEach((ev) => {
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      lines.push(
        'BEGIN:VEVENT',
        `UID:offline-${ev.id}-${ev.date}@offline.example`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${OFFLINE.toUtcStamp(ev.date, ev.start)}`,
        `DTEND:${OFFLINE.toUtcStamp(ev.date, ev.end)}`,
        `SUMMARY:OFFLINE Club · ${ev.title}`,
        `LOCATION:${ev.place}\\, Astana`,
        'DESCRIPTION:Screen-free student creative session. Sample reminder\\, no seat booked.',
        'STATUS:TENTATIVE',
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR', '');
    OFFLINE.downloadText('offline-club-schedule.ics', lines.join('\r\n'), 'text/calendar');
    OFFLINE.toast('Schedule downloaded as .ics calendar reminder!');
  };

  /* ---------- Sign Up & Log In Form Initialization ---------- */
  const initAuthForms = () => {
    const { rules } = OFFLINE;

    OFFLINE.initForm(plannerForm, {
      name: [rules.required('Please enter your name or nickname.'), rules.personName(), rules.minLength(2)],
      email: [rules.required('Email is required for your pass.'), rules.email()],
      phone: [rules.required('Phone is required.'), rules.phone()],
      password: [
        rules.required('Password is required.'),
        rules.password({ min: 8, capital: true }),
      ],
      confirm: [
        rules.required('Please confirm your password.'),
        rules.matches('password', 'Passwords do not match.'),
      ],
      firstVisitDate: [
        rules.required('Select your first intended visit date.'),
        rules.futureDate({ maxDays: 120, message: 'Please pick an upcoming date.' }),
      ],
      guests: [
        rules.required('Specify number of guests.'),
        rules.integer(),
        rules.range(1, 4, 'Between 1 and 4 people.'),
      ],
      consent: [rules.checked('Please tick the consent box to proceed.')],
    }, (values) => {
      const ids = OFFLINE.plan.getIds();
      if (findConflicts(ids).length > 0) {
        goToStep(1);
        OFFLINE.toast('Please remove overlapping evenings before saving your pass.');
        return false;
      }

      const existingSession = OFFLINE.account.current();
      const cleanEmail = values.email.trim().toLowerCase();
      const isEditingSameEmail = Boolean(
        existingSession && String(existingSession.email || '').toLowerCase() === cleanEmail
      );

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const profilePayload = {
        serial: isEditingSameEmail && existingSession.serial ? existingSession.serial : `OFF-2026-${randomSuffix}`,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
        firstVisitDate: values.firstVisitDate,
        guests: Number(values.guests),
        firstTime: values.firstTime === 'yes',
        eveningIds: [...ids],
        createdAt: isEditingSameEmail && existingSession.createdAt ? existingSession.createdAt : new Date().toISOString(),
      };

      const result = OFFLINE.account.signUp(profilePayload, { allowUpdate: isEditingSameEmail });
      if (result && result.ok === false) {
        OFFLINE.showFormError(plannerForm, result.field || 'email', result.message);
        const field = plannerForm.elements[result.field || 'email'];
        if (field) field.focus();
        return false;
      }

      updatePasswordStrength('');
      renderPassCard(result);
      goToStep(3);
      OFFLINE.toast(
        isEditingSameEmail
          ? `Updated profile & pass for ${result.name}.`
          : `Welcome to OFFLINE, ${result.name}! Your account and pass are ready.`
      );
      return true;
    });

    OFFLINE.initForm(loginForm, {
      email: [rules.required('Enter your registered email address.'), rules.email()],
      password: [rules.required('Enter your password.')],
    }, (values) => {
      const result = OFFLINE.account.logIn(values.email, values.password);
      if (!result || !result.ok) {
        const fieldName = (result && result.field) || 'password';
        OFFLINE.showFormError(loginForm, fieldName, (result && result.message) || 'Could not log in.');
        if (loginForm.elements[fieldName]) loginForm.elements[fieldName].focus();
        return false;
      }

      refreshPlanViews();
      renderPassCard(result.user);
      goToStep(3);
      OFFLINE.toast(`Welcome back, ${result.user.name}! Your pass is loaded.`);
      return true;
    });

    bindPasswordToggle(passwordInput, togglePwBtn);
    bindPasswordToggle(loginPasswordInput, toggleLoginPwBtn);

    passwordInput.addEventListener('input', () => {
      updatePasswordStrength(passwordInput.value);
    });
  };

  /* ---------- Cross-Page & Hash Routing ---------- */
  const refreshPlanViews = () => {
    renderEveningSelectors();
    renderBasket();
    const user = OFFLINE.account.current();
    if (user) {
      renderPassCard(user);
    }
  };

  const applyHashRoute = ({ instant = false, focus = false } = {}) => {
    const hash = window.location.hash.toLowerCase();
    const user = OFFLINE.account.current();

    if (hash === '#login') {
      switchAuthTab('login');
      goToStep(2, { instant, focus });
      return true;
    }
    if (hash === '#signup') {
      switchAuthTab('signup');
      goToStep(2, { instant, focus });
      return true;
    }
    if (hash === '#profile' || hash === '#pass-section') {
      if (user) {
        renderPassCard(user);
        goToStep(3, { instant, focus });
      } else {
        switchAuthTab('login');
        goToStep(2, { instant, focus });
        OFFLINE.toast('Log in or sign up to view your Member Profile.');
      }
      return true;
    }
    return false;
  };

  /* ---------- Page Init & Events ---------- */
  $(function () {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    const hasSessionParam = Boolean(sessionParam && OFFLINE.getGathering(sessionParam));
    if (hasSessionParam) {
      OFFLINE.plan.add(sessionParam);
    }

    initAuthForms();
    refreshPlanViews();
    syncStep3TabState();

    // Route initially based on hash, query param, or active member session
    if (!applyHashRoute({ instant: true, focus: false })) {
      const currentUser = OFFLINE.account.current();
      if (currentUser && !hasSessionParam) {
        renderPassCard(currentUser);
        goToStep(3, { instant: true, focus: false });
      } else {
        goToStep(1, { instant: true, focus: false });
      }
    }

    window.addEventListener('hashchange', () => applyHashRoute({ instant: false, focus: true }));
    window.addEventListener('offline:plan-change', refreshPlanViews);
    window.addEventListener('offline:bookmarks-change', renderPassMeta);
    window.addEventListener('offline:auth-change', (event) => {
      syncStep3TabState();
      const user = event.detail && event.detail.user;
      if (!user && !isDeletingAccount && currentStep === 3) {
        switchAuthTab('login');
        goToStep(2);
      }
    });

    // Step 1 filter pills & search
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.planFilter || 'all';
        filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        renderEveningSelectors();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', OFFLINE.debounce(() => {
        activeQuery = searchInput.value.trim().toLowerCase();
        renderEveningSelectors();
      }, 140));
    }

    if (btnResetFilter) {
      btnResetFilter.addEventListener('click', () => {
        activeCategory = 'all';
        activeQuery = '';
        if (searchInput) searchInput.value = '';
        filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.planFilter === 'all')));
        renderEveningSelectors();
      });
    }

    // Step 1 grid & basket actions
    eveningsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-id]');
      if (btn) OFFLINE.plan.toggle(btn.dataset.id);
    });

    basketList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-basket-item');
      if (btn) OFFLINE.plan.remove(btn.dataset.id);
    });

    btnClearBasket.addEventListener('click', () => {
      OFFLINE.plan.clear();
      OFFLINE.toast('Your plan has been cleared.');
    });

    // Wizard tab & step buttons
    btnStep1Next.addEventListener('click', () => {
      if (findConflicts(OFFLINE.plan.getIds()).length > 0) {
        OFFLINE.toast('Please remove one of the overlapping evenings before continuing.');
        return;
      }
      if (OFFLINE.account.current()) prefillSignupForm(OFFLINE.account.current());
      switchAuthTab('signup');
      goToStep(2);
    });

    if (wizardTabs[0]) wizardTabs[0].addEventListener('click', () => goToStep(1));
    if (wizardTabs[1]) {
      wizardTabs[1].addEventListener('click', () => {
        if (OFFLINE.account.current()) prefillSignupForm(OFFLINE.account.current());
        goToStep(2);
      });
    }
    if (wizardTabs[2]) {
      wizardTabs[2].addEventListener('click', () => {
        const user = OFFLINE.account.current();
        if (!user) return;
        renderPassCard(user);
        goToStep(3);
      });
    }

    btnBackToStep1.addEventListener('click', () => goToStep(1));
    btnCancelToStep1.addEventListener('click', () => goToStep(1));

    // Auth switcher buttons
    tabSignup.addEventListener('click', () => switchAuthTab('signup'));
    tabLogin.addEventListener('click', () => switchAuthTab('login'));
    btnSwitchToSignup.addEventListener('click', () => {
      switchAuthTab('signup');
      if (plannerForm.elements.name) plannerForm.elements.name.focus();
    });

    // Step 3 pass actions
    passScheduleList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pass-remove]');
      if (btn) {
        OFFLINE.plan.remove(btn.dataset.passRemove);
        OFFLINE.toast('Gathering removed from your schedule.');
      }
    });

    btnDownloadCalendar.addEventListener('click', downloadIcs);

    btnEditPass.addEventListener('click', () => {
      const user = OFFLINE.account.current();
      if (user) prefillSignupForm(user);
      goToStep(1);
    });

    btnLogoutPass.addEventListener('click', () => {
      OFFLINE.account.logOut();
      switchAuthTab('login');
      goToStep(2);
      OFFLINE.toast('Logged out. You can log back in anytime with your email and password.');
    });

    btnDeletePass.addEventListener('click', () => {
      isDeletingAccount = true;
      OFFLINE.account.deleteAccount();
      isDeletingAccount = false;
      OFFLINE.plan.clear();
      plannerForm.reset();
      loginForm.reset();
      updatePasswordStrength('');
      syncStep3TabState();
      goToStep(1);
      OFFLINE.toast('Your account and pass have been deleted.');
    });
  });
}(window.jQuery, window.OFFLINE));
