/* Shared interactions. Page-specific controls are checked before use. */
'use strict';

const filterButtons = document.querySelectorAll('[data-filter]');
const sessionCards = document.querySelectorAll('[data-category]');
const sessionCount = document.querySelector('#session-count');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const category = button.dataset.filter;
    let visible = 0;
    sessionCards.forEach((card) => {
      card.hidden = category !== 'all' && card.dataset.category !== category;
      if (!card.hidden) visible += 1;
    });
    filterButtons.forEach((filter) => {
      filter.setAttribute('aria-pressed', String(filter === button));
    });
    if (sessionCount) {
      sessionCount.textContent = `${visible} evening${visible === 1 ? '' : 's'} · All materials included`;
    }
  });
});

document.querySelector('[data-print-guide]')?.addEventListener('click', () => window.print());

const plannerForm = document.querySelector('#planner-form');

if (plannerForm) {
  const sessions = {
    print: { title: 'Happy accidents print club', date: 'Friday 16 October · 18:30–20:00', location: 'Studio table', start: '20261016T133000Z', end: '20261016T150000Z' },
    games: { title: 'Your move. No loading screen.', date: 'Friday 23 October · 18:30–20:00', location: 'Common room', start: '20261023T133000Z', end: '20261023T150000Z' },
    sketch: { title: 'Tea, pencils and no rush.', date: 'Friday 30 October · 18:30–20:00', location: 'Quiet corner', start: '20261030T133000Z', end: '20261030T150000Z' },
  };
  const storageKey = 'offline-plan-v1';
  const savedPanel = document.querySelector('#saved-plan');
  const status = document.querySelector('#plan-status');
  const emptyNote = document.querySelector('#empty-plan-note');
  const nameInput = document.querySelector('#planner-name');
  let currentPlan = null;

  // Browser storage can be unavailable in privacy mode or blocked by policy.
  const readPlan = () => {
    try {
      const plan = JSON.parse(localStorage.getItem(storageKey));
      if (!plan || plan.version !== 1 || !Object.hasOwn(sessions, plan.session) ||
          typeof plan.name !== 'string' || !plan.name.trim() || plan.name.length > 40 ||
          !Number.isInteger(plan.guests) || plan.guests < 1 || plan.guests > 4 ||
          typeof plan.firstTime !== 'boolean') return null;
      return plan;
    } catch {
      return null;
    }
  };

  const fillForm = (plan) => {
    plannerForm.elements.session.value = plan.session;
    plannerForm.elements.name.value = plan.name;
    plannerForm.elements.guests.value = plan.guests;
    plannerForm.elements.firstTime.value = plan.firstTime ? 'yes' : 'no';
  };

  const showPlan = (plan, message, focus = true) => {
    currentPlan = plan;
    const session = sessions[plan.session];
    document.querySelector('#plan-name').textContent = plan.name;
    document.querySelector('#plan-session').textContent = session.title;
    document.querySelector('#plan-date').textContent = session.date;
    document.querySelector('#plan-location').textContent = session.location;
    document.querySelector('#plan-guests').textContent = plan.guests === 1 ? 'Just you' : `${plan.guests} people, including you`;
    status.textContent = message;
    plannerForm.hidden = true;
    savedPanel.hidden = false;
    emptyNote.hidden = true;
    if (focus) savedPanel.focus();
  };

  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));
  plannerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    nameInput.setCustomValidity(name ? '' : 'Please enter a name or nickname.');
    if (!plannerForm.reportValidity()) return;
    const plan = {
      version: 1,
      name,
      session: plannerForm.elements.session.value,
      guests: Number(plannerForm.elements.guests.value),
      firstTime: plannerForm.elements.firstTime.value === 'yes',
    };
    if (!Object.hasOwn(sessions, plan.session) || !Number.isInteger(plan.guests) || plan.guests < 1 || plan.guests > 4) return;
    let message = 'Saved in this browser. Your evening is ready to add to your calendar.';
    try {
      localStorage.setItem(storageKey, JSON.stringify(plan));
    } catch {
      message = 'Your plan is ready for this visit. Browser storage is unavailable; download a calendar reminder to keep it.';
    }
    showPlan(plan, message);
  });

  document.querySelector('#edit-plan').addEventListener('click', () => {
    fillForm(currentPlan);
    savedPanel.hidden = true;
    plannerForm.hidden = false;
    document.querySelector('#planner-session').focus();
  });

  document.querySelector('#clear-plan').addEventListener('click', () => {
    let message = 'Your saved plan has been deleted. Make a new one whenever you like.';
    try {
      localStorage.removeItem(storageKey);
    } catch {
      message = 'This visit’s plan has been cleared. Browser storage is unavailable; use your browser’s site-data settings to remove any older saved plan.';
    }
    currentPlan = null;
    plannerForm.reset();
    nameInput.setCustomValidity('');
    savedPanel.hidden = true;
    plannerForm.hidden = false;
    emptyNote.textContent = message;
    emptyNote.hidden = false;
    document.querySelector('#planner-session').focus();
  });

  document.querySelector('#calendar-download').addEventListener('click', () => {
    if (!currentPlan) return;
    const session = sessions[currentPlan.session];
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OFFLINE Club//Personal Planner//EN',
      'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:offline-${currentPlan.session}-2026@offline.example`,
      `DTSTAMP:${stamp}`, `DTSTART:${session.start}`, `DTEND:${session.end}`,
      `SUMMARY:OFFLINE - ${session.title}`, `LOCATION:${session.location}`,
      'DESCRIPTION:Student concept. Sample event; no seat reserved.',
      'STATUS:TENTATIVE', 'END:VEVENT', 'END:VCALENDAR', '',
    ];
    // iCalendar TEXT escapes punctuation. No user-provided text is included.
    const calendar = lines.map((line) => line.startsWith('DESCRIPTION:') ? line.replace(';', '\\;') : line).join('\r\n');
    const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `offline-${currentPlan.session}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Calendar reminder downloaded. It uses Astana time (UTC+5).';
  });

  const existingPlan = readPlan();
  const requestedSession = new URLSearchParams(location.search).get('session');
  if (requestedSession && Object.hasOwn(sessions, requestedSession)) {
    if (existingPlan) fillForm(existingPlan);
    plannerForm.elements.session.value = requestedSession;
  } else if (existingPlan) {
    showPlan(existingPlan, 'Your saved plan, kept on this device. You can edit or delete it below.', false);
  }
}
