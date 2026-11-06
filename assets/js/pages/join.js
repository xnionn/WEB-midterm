/* Make a plan page: multi-event basket, conflict detection,
 * two-step wizard with animated password strength meter,
 * full form validation, and an interactive "Offline Pass" card with .ics export.
 * Data: OFFLINE.gatherings (data/gatherings.js). */
'use strict';

(function ($, OFFLINE) {
  const PLAN_KEY = 'offline-plan-v2';
  const PASS_KEY = 'offline-pass-v1';
  const OLD_PLAN_KEY = 'offline-plan-v1';

  // Elements
  const tabStep1 = document.querySelector('#wizard-tab-1');
  const tabStep2 = document.querySelector('#wizard-tab-2');
  const panelStep1 = document.querySelector('#wizard-step-1');
  const panelStep2 = document.querySelector('#wizard-step-2');

  const eveningsGrid = document.querySelector('#planner-evenings-list');
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
  let selectedEveningIds = [];

  /* ---------- Storage & Migration ---------- */
  const loadPlanIds = () => {
    // Migration check
    const oldPlan = OFFLINE.storage.get(OLD_PLAN_KEY);
    const existing = OFFLINE.storage.get(PLAN_KEY);

    if (existing && Array.isArray(existing)) {
      return existing;
    }

    if (oldPlan && oldPlan.session) {
      const migrated = [oldPlan.session];
      OFFLINE.storage.set(PLAN_KEY, migrated);
      return migrated;
    }

    return [];
  };

  const savePlanIds = (ids) => {
    OFFLINE.storage.set(PLAN_KEY, ids);
  };

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

  /* ---------- Render Evenings in Step 1 ---------- */
  const renderEveningSelectors = () => {
    eveningsGrid.replaceChildren();

    OFFLINE.gatherings.forEach((event) => {
      const isSelected = selectedEveningIds.includes(event.id);
      const free = OFFLINE.seatsLeft(event);
      const isSoldOut = free === 0 && !isSelected;

      const art = OFFLINE.categoryArt(event.category);

      const copy = OFFLINE.el('div', { class: 'p-3 flex-grow-1 d-flex flex-column' }, [
        OFFLINE.el('div', { class: 'd-flex justify-content-between mb-1' }, [
          OFFLINE.el('span', { class: 'tag', text: event.category.toUpperCase() }),
          OFFLINE.el('span', { class: 'small text-muted', text: `${free} left` }),
        ]),
        OFFLINE.el('h4', { class: 'h6 fw-bold mb-1', text: event.title }),
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
    const selectedEvents = selectedEveningIds.map((id) => OFFLINE.getGathering(id)).filter(Boolean);
    basketBadge.textContent = `${selectedEvents.length} selected`;

    basketList.replaceChildren();

    if (selectedEvents.length === 0) {
      basketList.append(
        OFFLINE.el('li', { class: 'empty-basket-note', text: 'No evenings selected yet. Click "+ Add to plan" on any evening above.' })
      );
    } else {
      selectedEvents.forEach((event) => {
        const item = OFFLINE.el('li', { class: 'basket-item d-flex justify-content-between align-items-center py-2 border-bottom' }, [
          OFFLINE.el('div', {}, [
            OFFLINE.el('strong', { class: 'd-block text-dark', text: event.title }),
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

    // Totals
    const totalMinutes = selectedEvents.reduce((sum, e) => sum + OFFLINE.durationMinutes(e), 0);
    const totalHours = (totalMinutes / 60).toFixed(1).replace('.0', '');
    totalEveningsEl.textContent = selectedEvents.length;
    totalHoursEl.textContent = totalHours;

    // Conflicts check
    const conflicts = findConflicts(selectedEveningIds);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      conflictError.textContent = `Time conflict detected: "${c[0].title}" and "${c[1].title}" take place at the same date and overlapping hours. Please remove one.`;
      conflictError.hidden = false;
    } else {
      conflictError.hidden = true;
      conflictError.textContent = '';
    }
  };

  /* ---------- Toggle Evening in Basket ---------- */
  const toggleEveningInPlan = (id) => {
    const idx = selectedEveningIds.indexOf(id);
    if (idx === -1) {
      selectedEveningIds.push(id);
    } else {
      selectedEveningIds.splice(idx, 1);
    }
    savePlanIds(selectedEveningIds);
    renderEveningSelectors();
    renderBasket();
  };

  /* ---------- Wizard Step Navigation ---------- */
  const goToStep = (step) => {
    if (isWizardBusy || step === currentStep) return;

    if (step === 2 && selectedEveningIds.length === 0) {
      OFFLINE.toast('Please select at least one evening before continuing.');
      return;
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
    let label = 'Too short';
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
    passTitle.textContent = pass.name;
    passSerial.textContent = pass.serial;
    passEveningsCount.textContent = `${pass.eveningIds.length} ${pass.eveningIds.length === 1 ? 'gathering' : 'gatherings'}`;

    const events = pass.eveningIds.map((id) => OFFLINE.getGathering(id)).filter(Boolean);
    const totalMinutes = events.reduce((sum, e) => sum + OFFLINE.durationMinutes(e), 0);
    passHours.textContent = `${(totalMinutes / 60).toFixed(1).replace('.0', '')} hours`;
    passParty.textContent = `${pass.guests} ${pass.guests === 1 ? 'person' : 'people'}`;
    passFirstDate.textContent = pass.firstVisitDate ? OFFLINE.formatDate(pass.firstVisitDate) : 'Not specified';

    passScheduleList.replaceChildren();
    events.forEach((ev) => {
      passScheduleList.append(
        OFFLINE.el('li', { class: 'pass-schedule-item' }, [
          OFFLINE.el('strong', { text: ev.title }),
          OFFLINE.el('span', { class: 'ms-2 text-muted', text: `· ${OFFLINE.formatDate(ev.date, { short: true })} (${ev.start}–${ev.end}) at ${ev.place}` }),
        ])
      );
    });

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
    const ids = pass ? pass.eveningIds : selectedEveningIds;
    const events = ids.map((id) => OFFLINE.getGathering(id)).filter(Boolean);

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
    const icsContent = lines.join('\r\n');
    OFFLINE.downloadText('offline-club-schedule.ics', icsContent, 'text/calendar');
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
      if (selectedEveningIds.length === 0) {
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
        eveningIds: [...selectedEveningIds],
        createdAt: new Date().toISOString(),
      };

      savePass(newPass);
      renderPassCard(newPass);
      OFFLINE.toast(`Welcome to OFFLINE, ${newPass.name}! Your pass is ready.`);
      return true;
    });

    // Password visibility toggle
    togglePwBtn.addEventListener('click', () => {
      const isText = passwordInput.type === 'text';
      passwordInput.type = isText ? 'password' : 'text';
      togglePwBtn.textContent = isText ? 'Show' : 'Hide';
      togglePwBtn.setAttribute('aria-pressed', String(!isText));
    });

    // Password strength indicator on typing
    passwordInput.addEventListener('input', () => {
      updatePasswordStrength(passwordInput.value);
    });
  };

  /* ---------- Page Init & Events ---------- */
  $(function () {
    selectedEveningIds = loadPlanIds();

    // Check query param (?session=print)
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    if (sessionParam && OFFLINE.getGathering(sessionParam)) {
      if (!selectedEveningIds.includes(sessionParam)) {
        selectedEveningIds.push(sessionParam);
        savePlanIds(selectedEveningIds);
      }
    }

    renderEveningSelectors();
    renderBasket();
    initPlannerForm();

    // Check if user already has a saved pass
    const savedPass = loadPass();
    if (savedPass && savedPass.eveningIds && savedPass.eveningIds.length > 0) {
      renderPassCard(savedPass);
    }

    // Step 1 grid buttons
    eveningsGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-id]');
      if (btn) {
        toggleEveningInPlan(btn.dataset.id);
      }
    });

    // Basket remove button
    basketList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-basket-item');
      if (btn) {
        toggleEveningInPlan(btn.dataset.id);
      }
    });

    // Clear basket
    btnClearBasket.addEventListener('click', () => {
      selectedEveningIds = [];
      savePlanIds([]);
      renderEveningSelectors();
      renderBasket();
      OFFLINE.toast('Your plan has been cleared.');
    });

    // Wizard navigation
    btnStep1Next.addEventListener('click', () => goToStep(2));
    tabStep1.addEventListener('click', () => goToStep(1));
    tabStep2.addEventListener('click', () => goToStep(2));
    btnBackToStep1.addEventListener('click', () => goToStep(1));
    btnCancelToStep1.addEventListener('click', () => goToStep(1));

    // Pass actions
    btnDownloadCalendar.addEventListener('click', downloadIcs);

    btnEditPass.addEventListener('click', () => {
      passSection.hidden = true;
      goToStep(1);
    });

    btnDeletePass.addEventListener('click', () => {
      removePass();
      savePlanIds([]);
      selectedEveningIds = [];
      plannerForm.reset();
      updatePasswordStrength('');
      renderEveningSelectors();
      renderBasket();

      $(passSection).slideUp(OFFLINE.speed, () => {
        passSection.hidden = true;
        goToStep(1);
      });
      OFFLINE.toast('Your pass has been deleted.');
    });
  });
}(window.jQuery, window.OFFLINE));

