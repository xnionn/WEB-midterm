/* Make a plan page: Step 1 synced evening basket, category/search filters, and interval conflict detection.
 * Uses shared OFFLINE.plan API (core.js) and OFFLINE.gatherings (data/gatherings.js). */
'use strict';

(function ($, OFFLINE) {
  const PASS_KEY = 'offline-pass-v1';

  // Elements
  const tabStep1 = document.querySelector('#wizard-tab-1');
  const tabStep2 = document.querySelector('#wizard-tab-2');
  const tabStep3 = document.querySelector('#wizard-tab-3');
  const panelStep1 = document.querySelector('#wizard-step-1');
  const panelStep2 = document.querySelector('#wizard-step-2');

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

  // Form & Password
  const plannerForm = document.querySelector('#planner-form');
  const passwordInput = document.querySelector('#planner-password');
  const togglePwBtn = document.querySelector('#toggle-pw');
  const passwordMeterBar = document.querySelector('#password-meter-bar');
  const passwordMeterText = document.querySelector('#password-meter-text');

  // Pass section
  const passSection = document.querySelector('#pass-section');
  const passSerial = document.querySelector('#pass-serial');
  const passTitle = document.querySelector('#pass-title');
  const passContact = document.querySelector('#pass-contact');
  const passEveningsCount = document.querySelector('#pass-evenings-count');
  const passHours = document.querySelector('#pass-hours');
  const passParty = document.querySelector('#pass-party');
  const passFirstDate = document.querySelector('#pass-first-date');
  const passScheduleList = document.querySelector('#pass-schedule-list');
  const btnDownloadCalendar = document.querySelector('#btn-download-calendar');
  const btnEditPass = document.querySelector('#btn-edit-pass');
  const btnDeletePass = document.querySelector('#btn-delete-pass');

  let currentStep = 1;
  let isWizardBusy = false;
  let activeCategory = 'all';
  let activeQuery = '';

  const loadPass = () => OFFLINE.storage.get(PASS_KEY, null);
  const savePass = (pass) => OFFLINE.storage.set(PASS_KEY, pass);
  const removePass = () => OFFLINE.storage.remove(PASS_KEY);

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

      const art = OFFLINE.categoryArt(event.category);

      const copy = OFFLINE.el('div', { class: 'p-3 flex-grow-1 d-flex flex-column' }, [
        OFFLINE.el('div', { class: 'd-flex justify-content-between mb-1' }, [
          OFFLINE.el('span', { class: 'tag', text: event.category.toUpperCase() }),
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

      const card = OFFLINE.el('article', {
        class: `planner-choice-card ${isSelected ? 'is-chosen' : ''}`,
      }, [art, copy]);

      eveningsGrid.append(card);
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
        const item = OFFLINE.el('li', { class: 'basket-item d-flex justify-content-between align-items-center gap-2 py-2 border-bottom' }, [
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
        ]);
        basketList.append(item);
      });
    }

    const totalMinutes = selectedEvents.reduce((sum, e) => sum + OFFLINE.durationMinutes(e), 0);
    const totalHours = (totalMinutes / 60).toFixed(1).replace('.0', '');
    totalEveningsEl.textContent = selectedEvents.length;
    totalHoursEl.textContent = totalHours;

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

  const refreshPlanViews = () => {
    renderEveningSelectors();
    renderBasket();
  };

  /* ---------- Wizard Step Navigation ---------- */
  const goToStep = (step) => {
    if (isWizardBusy || step === currentStep) return;

    const selectedIds = OFFLINE.plan.getIds();
    if (step === 2) {
      if (selectedIds.length === 0) {
        OFFLINE.toast('Please select at least one evening before continuing.');
        return;
      }
      if (findConflicts(selectedIds).length > 0) {
        OFFLINE.toast('Please resolve the time conflict before continuing.');
        return;
      }
    }

    isWizardBusy = true;
    currentStep = step;

    tabStep1.classList.toggle('active', step === 1);
    tabStep1.setAttribute('aria-current', step === 1 ? 'step' : 'false');
    tabStep2.classList.toggle('active', step === 2);
    tabStep2.setAttribute('aria-current', step === 2 ? 'step' : 'false');

    const fromPanel = step === 1 ? panelStep2 : panelStep1;
    const toPanel = step === 1 ? panelStep1 : panelStep2;

    $(fromPanel).stop(true, true).fadeOut(OFFLINE.speed, () => {
      fromPanel.hidden = true;
      toPanel.hidden = false;
      $(toPanel).hide().fadeIn(OFFLINE.speed, () => {
        isWizardBusy = false;
        if (step === 2) {
          plannerForm.elements.name.focus();
        }
      });
    });
  };

  /* ---------- Password Strength Calculation & Meter ---------- */
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

  /* ---------- Display Generated Pass Card ---------- */
  const renderPassCard = (pass) => {
    const ids = OFFLINE.plan.getIds();
    const activeIds = ids.length > 0 ? ids : (pass.eveningIds || []);
    const events = activeIds.map((id) => OFFLINE.getGathering(id)).filter(Boolean);
    const totalMinutes = events.reduce((sum, e) => sum + OFFLINE.durationMinutes(e), 0);

    passTitle.textContent = pass.name;
    if (passContact) {
      passContact.textContent = [pass.email, pass.phone].filter(Boolean).join(' · ');
    }
    passSerial.textContent = pass.serial;
    passEveningsCount.textContent = OFFLINE.plural(events.length, 'gathering');
    passHours.textContent = `${(totalMinutes / 60).toFixed(1).replace('.0', '')} hours`;
    passParty.textContent = OFFLINE.plural(pass.guests, 'person', 'people');
    passFirstDate.textContent = pass.firstVisitDate ? OFFLINE.formatDate(pass.firstVisitDate) : 'Not specified';

    passScheduleList.replaceChildren();
    events.forEach((ev) => {
      passScheduleList.append(
        OFFLINE.el('li', { class: 'pass-schedule-item' }, [
          OFFLINE.el('div', {}, [
            OFFLINE.el('strong', { text: ev.title }),
            OFFLINE.el('span', { class: 'ms-2 text-muted', text: `· ${OFFLINE.formatDate(ev.date, { short: true })} (${ev.start}–${ev.end}) at ${ev.place}` }),
          ]),
        ])
      );
    });

    if (tabStep3) tabStep3.disabled = false;
    passSection.hidden = false;
    panelStep1.hidden = true;
    panelStep2.hidden = true;

    $(passSection).stop(true, true).hide().slideDown(OFFLINE.speed * 2, () => {
      passSection.focus();
    });
  };

  /* ---------- Generate Multi-Event .ics Calendar ---------- */
  const downloadIcs = () => {
    const pass = loadPass();
    const ids = OFFLINE.plan.getIds();
    const activeIds = ids.length > 0 ? ids : (pass ? pass.eveningIds : []);
    const events = activeIds.map((id) => OFFLINE.getGathering(id)).filter(Boolean);

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
      const dtStart = OFFLINE.toUtcStamp(ev.date, ev.start);
      const dtEnd = OFFLINE.toUtcStamp(ev.date, ev.end);

      lines.push(
        'BEGIN:VEVENT',
        `UID:offline-${ev.id}-${ev.date}@offline.example`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
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

  /* ---------- Form Validation & Pass Creation ---------- */
  const initPlannerForm = () => {
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
      if (ids.length === 0) {
        goToStep(1);
        OFFLINE.toast('Please select at least one gathering for your pass.');
        return false;
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newPass = {
        serial: `OFF-2026-${randomSuffix}`,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        firstVisitDate: values.firstVisitDate,
        guests: Number(values.guests),
        firstTime: values.firstTime === 'yes',
        eveningIds: [...ids],
        createdAt: new Date().toISOString(),
      };

      savePass(newPass);
      renderPassCard(newPass);
      OFFLINE.toast(`Welcome to OFFLINE, ${newPass.name}! Your pass is ready.`);
      return true;
    });

    togglePwBtn.addEventListener('click', () => {
      const isText = passwordInput.type === 'text';
      passwordInput.type = isText ? 'password' : 'text';
      togglePwBtn.textContent = isText ? 'Show' : 'Hide';
      togglePwBtn.setAttribute('aria-pressed', String(!isText));
    });

    passwordInput.addEventListener('input', () => {
      updatePasswordStrength(passwordInput.value);
    });
  };

  /* ---------- Page Init & Events ---------- */
  $(function () {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    if (sessionParam && OFFLINE.getGathering(sessionParam)) {
      OFFLINE.plan.add(sessionParam);
    }

    refreshPlanViews();
    initPlannerForm();

    window.addEventListener('offline:plan-change', refreshPlanViews);

    const savedPass = loadPass();
    if (savedPass && savedPass.eveningIds && savedPass.eveningIds.length > 0 && !savedPass.loggedOut) {
      renderPassCard(savedPass);
    }

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

    eveningsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-id]');
      if (btn) {
        OFFLINE.plan.toggle(btn.dataset.id);
      }
    });

    basketList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-basket-item');
      if (btn) {
        OFFLINE.plan.remove(btn.dataset.id);
      }
    });

    btnClearBasket.addEventListener('click', () => {
      OFFLINE.plan.clear();
      OFFLINE.toast('Your plan has been cleared.');
    });

    btnStep1Next.addEventListener('click', () => goToStep(2));
    tabStep1.addEventListener('click', () => goToStep(1));
    tabStep2.addEventListener('click', () => goToStep(2));
    btnBackToStep1.addEventListener('click', () => goToStep(1));
    btnCancelToStep1.addEventListener('click', () => goToStep(1));

    btnDownloadCalendar.addEventListener('click', downloadIcs);

    btnEditPass.addEventListener('click', () => {
      passSection.hidden = true;
      goToStep(1);
    });

    btnDeletePass.addEventListener('click', () => {
      removePass();
      OFFLINE.plan.clear();
      plannerForm.reset();
      updatePasswordStrength('');
      if (tabStep3) tabStep3.disabled = true;

      $(passSection).slideUp(OFFLINE.speed, () => {
        passSection.hidden = true;
        goToStep(1);
      });
      OFFLINE.toast('Your pass has been deleted.');
    });
  });
}(window.jQuery, window.OFFLINE));
