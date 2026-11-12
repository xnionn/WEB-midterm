/* Gatherings page: search, filtering, sorting, live summary, details toggle,
 * cross-page plan toggle, seat reservation management, and Bootstrap booking modal.
 * Data: OFFLINE.gatherings (data/gatherings.js). */
'use strict';

(function ($, OFFLINE) {
  const grid = document.querySelector('#evening-grid');
  const emptyState = document.querySelector('#evening-empty');
  const searchInput = document.querySelector('#evening-search');
  const levelSelect = document.querySelector('#evening-level');
  const sortSelect = document.querySelector('#evening-sort');
  const filterButtons = document.querySelectorAll('.session-filters [data-filter]');
  const hideSoldOutCheckbox = document.querySelector('#hide-sold-out');
  const clearFiltersBtn = document.querySelector('#clear-filters');
  const savedBar = document.querySelector('#gatherings-saved-bar');

  // Stats
  const statShown = document.querySelector('#stat-shown');
  const statFree = document.querySelector('#stat-free');
  const statFull = document.querySelector('#stat-full');
  const summaryText = document.querySelector('#summary-text');

  // Booking elements
  const bookingModalEl = document.querySelector('#booking-modal');
  const bookingEveningSelect = document.querySelector('#booking-evening');
  const bookingForm = document.querySelector('#booking-form');

  let filterCategory = 'all';
  let filterLevel = 'all';
  let filterQuery = '';
  let filterHideSoldOut = false;
  let sortBy = 'soonest';

  /* ---------- Initialize Dropdowns ---------- */
  const initFilterControls = () => {
    const levels = [...new Set(OFFLINE.gatherings.map((g) => g.level))];
    levels.forEach((lvl) => {
      levelSelect.append(OFFLINE.el('option', { value: lvl, text: lvl }));
    });

    populateBookingSelect();

    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('category');
    if (catParam && ['make', 'play', 'slow'].includes(catParam)) {
      filterCategory = catParam;
      filterButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.filter === catParam));
      });
    }
  };

  const populateBookingSelect = () => {
    bookingEveningSelect.replaceChildren(OFFLINE.el('option', { value: '', text: 'Choose an evening' }));
    OFFLINE.gatherings.forEach((event) => {
      const free = OFFLINE.seatsLeft(event);
      const text = `${event.title} · ${OFFLINE.formatDate(event.date, { short: true })} (${free > 0 ? `${free} left` : 'Sold out'})`;
      const opt = OFFLINE.el('option', { value: event.id, text });
      if (free === 0) opt.disabled = true;
      bookingEveningSelect.append(opt);
    });
  };

  /* ---------- Filter & Sort Logic ---------- */
  const getFilteredGatherings = () => {
    const q = filterQuery.trim().toLowerCase();

    const list = OFFLINE.gatherings.filter((event) => {
      if (filterCategory !== 'all' && event.category !== filterCategory) return false;
      if (filterLevel !== 'all' && event.level !== filterLevel) return false;
      if (filterHideSoldOut && OFFLINE.seatsLeft(event) === 0) return false;
      if (q) {
        const hay = `${event.title} ${event.blurb} ${event.place} ${event.tags.join(' ')} ${event.level}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'places') return OFFLINE.seatsLeft(b) - OFFLINE.seatsLeft(a);
      if (sortBy === 'az') return a.title.localeCompare(b.title);
      return a.date.localeCompare(b.date) || a.start.localeCompare(b.start);
    });

    return list;
  };

  /* ---------- Render Saved Plan & Reservations Summary Bar ---------- */
  const renderSavedBar = () => {
    if (!savedBar) return;
    const planIds = OFFLINE.plan.getIds();
    const plannedEvents = planIds.map((id) => OFFLINE.getGathering(id)).filter(Boolean);
    const bookedList = OFFLINE.getAllBookings();

    savedBar.replaceChildren();

    if (plannedEvents.length === 0 && bookedList.length === 0) {
      savedBar.hidden = true;
      return;
    }

    savedBar.hidden = false;
    const totalMinutes = plannedEvents.reduce((sum, ev) => sum + OFFLINE.durationMinutes(ev), 0);
    const totalHours = (totalMinutes / 60).toFixed(1).replace('.0', '');
    const totalSeatsBooked = bookedList.reduce((sum, item) => sum + item.seats, 0);

    const header = OFFLINE.el('div', { class: 'd-flex flex-wrap justify-content-between align-items-center gap-2 mb-2' }, [
      OFFLINE.el('div', {}, [
        OFFLINE.el('strong', { text: `${OFFLINE.plural(plannedEvents.length, 'evening')} in your plan (${totalHours}h)` }),
        totalSeatsBooked > 0 && OFFLINE.el('span', { class: 'ms-2 meta', text: `· ${OFFLINE.plural(totalSeatsBooked, 'seat')} reserved on this device` }),
      ]),
      OFFLINE.el('div', { class: 'd-flex flex-wrap gap-3 align-items-center' }, [
        OFFLINE.el('a', { class: 'text-link', href: 'join.html' }, [`Open Make a plan (${plannedEvents.length}) `, OFFLINE.el('span', { 'aria-hidden': 'true', text: '↗' })]),
        OFFLINE.el('button', { type: 'button', class: 'btn-delete-note', id: 'btn-clear-all-gatherings', text: 'Clear all saved' }),
      ]),
    ]);

    const chipsWrap = OFFLINE.el('div', { class: 'd-flex flex-wrap gap-2' });

    plannedEvents.forEach((ev) => {
      const reservedCount = OFFLINE.getBookedSeats(ev.id);
      const labelText = reservedCount > 0
        ? `${ev.title} (${reservedCount} reserved)`
        : ev.title;
      const chip = OFFLINE.el('span', { class: 'saved-gathering-chip' }, [
        OFFLINE.el('span', { text: labelText }),
        OFFLINE.el('button', {
          type: 'button',
          class: 'chip-remove-btn',
          'data-remove-saved': ev.id,
          'aria-label': `Remove ${ev.title} from saved plan`,
          text: '×',
        }),
      ]);
      chipsWrap.append(chip);
    });

    bookedList.forEach(({ event, seats }) => {
      if (planIds.includes(event.id)) return;
      const chip = OFFLINE.el('span', { class: 'saved-gathering-chip' }, [
        OFFLINE.el('span', { text: `${event.title} (${seats} reserved)` }),
        OFFLINE.el('button', {
          type: 'button',
          class: 'chip-remove-btn',
          'data-cancel-booking': event.id,
          'aria-label': `Cancel seat reservation for ${event.title}`,
          text: '×',
        }),
      ]);
      chipsWrap.append(chip);
    });

    savedBar.append(header, chipsWrap);
  };

  /* ---------- Render Card with DOM ---------- */
  const buildCard = (event, index, query) => {
    const free = OFFLINE.seatsLeft(event);
    const isSoldOut = free === 0;
    const inPlan = OFFLINE.plan.has(event.id);
    const bookedByVisitor = OFFLINE.getBookedSeats(event.id);

    const art = OFFLINE.categoryArt(event.category);
    const copy = OFFLINE.el('div', { class: 'session-card-copy' });

    const headerRow = OFFLINE.el('div', { class: 'd-flex justify-content-between align-items-center mb-2 gap-2 flex-wrap' }, [
      OFFLINE.el('span', { class: 'tag', text: `${event.category.toUpperCase()} · 0${index + 1}` }),
      OFFLINE.el('div', { class: 'd-flex gap-1 align-items-center' }, [
        bookedByVisitor > 0 && OFFLINE.el('span', { class: 'badge-seats', text: `${bookedByVisitor} booked by you` }),
        isSoldOut
          ? OFFLINE.el('span', { class: 'badge-soldout', text: 'Sold out' })
          : OFFLINE.el('span', { class: 'badge-seats', text: `${free} places left` }),
      ]),
    ]);

    const h3 = OFFLINE.el('h3', { class: 'session-title' });
    h3.append(OFFLINE.highlight(event.title, query));

    const blurb = OFFLINE.el('p', { class: 'session-blurb' });
    blurb.append(OFFLINE.highlight(event.blurb, query));

    const meta = OFFLINE.el('div', { class: 'session-meta' }, [
      OFFLINE.el('span', { text: `${OFFLINE.formatDate(event.date)} · ${event.start}–${event.end}` }),
      OFFLINE.el('span', { text: `${event.place} · Level: ${event.level}` }),
    ]);

    const detailsId = `details-${event.id}`;
    const detailsToggleBtn = OFFLINE.el('button', {
      type: 'button',
      class: 'session-details-btn',
      'aria-expanded': 'false',
      'aria-controls': detailsId,
      text: 'What to expect ▾',
    });

    const detailsPanel = OFFLINE.el('div', {
      id: detailsId,
      class: 'session-details-panel',
      hidden: true,
    }, [
      OFFLINE.el('p', { class: 'small mb-1', text: `Duration: ${OFFLINE.durationMinutes(event)} minutes of unrushed time.` }),
      OFFLINE.el('div', { class: 'd-flex flex-wrap gap-1 mt-2' },
        event.tags.map((tag) => OFFLINE.el('span', { class: 'badge-tag', text: `#${tag}` }))
      ),
    ]);

    const actions = OFFLINE.el('div', { class: 'session-actions mt-auto pt-3' }, [
      isSoldOut
        ? OFFLINE.el('button', { type: 'button', class: 'button button-small w-100 mb-2', disabled: true, text: 'No seats available' })
        : OFFLINE.el('button', {
            type: 'button',
            class: 'button button-small w-100 mb-2 btn-reserve-seat',
            'data-event-id': event.id,
            text: 'Reserve a seat ↗',
          }),
      OFFLINE.el('button', {
        type: 'button',
        class: `button button-small button-outline w-100 btn-toggle-plan ${inPlan ? 'is-in-plan' : ''}`.trim(),
        'data-plan-id': event.id,
        'aria-pressed': String(inPlan),
        text: inPlan ? '✓ Saved in your plan' : '+ Save to my plan',
      }),
    ]);

    copy.append(headerRow, h3, blurb, meta, detailsToggleBtn, detailsPanel, actions);

    const card = OFFLINE.el('article', {
      class: `session-card ${isSoldOut ? 'is-sold-out' : ''}`,
      'data-category': event.category,
      'data-id': event.id,
    }, [art, copy]);

    return card;
  };

  /* ---------- Update Summary Numbers ---------- */
  const updateSummary = (items) => {
    const totalShown = items.length;
    const totalFree = items.reduce((sum, e) => sum + OFFLINE.seatsLeft(e), 0);
    const totalSeats = items.reduce((sum, e) => sum + e.seats, 0);
    const percentFull = totalSeats > 0 ? Math.round(((totalSeats - totalFree) / totalSeats) * 100) : 0;

    statShown.textContent = totalShown;
    statFree.textContent = totalFree;
    statFull.textContent = `${percentFull}%`;

    const speech = `${totalShown} evenings shown, ${totalFree} free places remaining, averaging ${percentFull}% full.`;
    summaryText.textContent = speech;
  };

  /* ---------- Render All Cards with jQuery Fade ---------- */
  const renderCards = () => {
    const items = getFilteredGatherings();
    updateSummary(items);
    renderSavedBar();

    const query = filterQuery.trim();

    $(grid).stop(true, true).fadeOut(OFFLINE.speed, () => {
      grid.replaceChildren();

      if (items.length === 0) {
        emptyState.hidden = false;
        grid.hidden = true;
      } else {
        emptyState.hidden = true;
        grid.hidden = false;
        items.forEach((event, idx) => {
          grid.append(buildCard(event, idx, query));
        });
      }

      $(grid).fadeIn(OFFLINE.speed);
    });
  };

  /* ---------- Event Listeners ---------- */
  const bindEvents = () => {
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterCategory = btn.dataset.filter;
        filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        renderCards();
      });
    });

    searchInput.addEventListener('input', OFFLINE.debounce(() => {
      filterQuery = searchInput.value;
      renderCards();
    }, 180));

    levelSelect.addEventListener('change', () => {
      filterLevel = levelSelect.value;
      renderCards();
    });

    sortSelect.addEventListener('change', () => {
      sortBy = sortSelect.value;
      renderCards();
    });

    hideSoldOutCheckbox.addEventListener('change', () => {
      filterHideSoldOut = hideSoldOutCheckbox.checked;
      renderCards();
    });

    clearFiltersBtn.addEventListener('click', () => {
      filterCategory = 'all';
      filterLevel = 'all';
      filterQuery = '';
      filterHideSoldOut = false;
      sortBy = 'soonest';

      searchInput.value = '';
      levelSelect.value = 'all';
      sortSelect.value = 'soonest';
      hideSoldOutCheckbox.checked = false;
      filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));

      renderCards();
      searchInput.focus();
    });

    $(grid).on('click', '.session-details-btn', function () {
      const $btn = $(this);
      const $panel = $(`#${$btn.attr('aria-controls')}`);
      if ($panel.is(':animated')) return;

      const expanded = $btn.attr('aria-expanded') === 'true';
      $btn.attr('aria-expanded', String(!expanded));
      $btn.text(expanded ? 'What to expect ▾' : 'Hide details ▴');

      if (!expanded) {
        $panel.prop('hidden', false).hide().slideDown(OFFLINE.speed);
      } else {
        $panel.slideUp(OFFLINE.speed, () => $panel.prop('hidden', true));
      }
    });

    $(grid).on('click', '.btn-reserve-seat', function () {
      const eventId = $(this).data('event-id');
      bookingEveningSelect.value = eventId;
      const user = OFFLINE.account.current();
      if (user) {
        if (!bookingForm.elements.name.value && user.name) bookingForm.elements.name.value = user.name;
        if (!bookingForm.elements.email.value && user.email) bookingForm.elements.email.value = user.email;
        if (!bookingForm.elements.phone.value && user.phone) bookingForm.elements.phone.value = user.phone;
      }
      const modal = bootstrap.Modal.getOrCreateInstance(bookingModalEl);
      modal.show();
    });

    $(grid).on('click', '.btn-toggle-plan', function () {
      const $btn = $(this);
      const id = $btn.data('plan-id');
      const added = OFFLINE.plan.toggle(id);
      $btn.toggleClass('is-in-plan', added);
      $btn.attr('aria-pressed', String(added));
      $btn.text(added ? '✓ Saved in your plan' : '+ Save to my plan');
      renderSavedBar();
      const ev = OFFLINE.getGathering(id);
      OFFLINE.toast(added ? `"${ev.title}" added to your plan!` : `"${ev.title}" removed from your plan.`);
    });

    if (savedBar) {
      savedBar.addEventListener('click', (e) => {
        const removePlanBtn = e.target.closest('[data-remove-saved]');
        if (removePlanBtn) {
          const id = removePlanBtn.dataset.removeSaved;
          OFFLINE.plan.remove(id);
          OFFLINE.cancelBooking(id);
          populateBookingSelect();
          renderCards();
          OFFLINE.toast('Removed from your saved evenings.');
          return;
        }
        const cancelBookBtn = e.target.closest('[data-cancel-booking]');
        if (cancelBookBtn) {
          const id = cancelBookBtn.dataset.cancelBooking;
          OFFLINE.cancelBooking(id);
          populateBookingSelect();
          renderCards();
          OFFLINE.toast('Seat reservation cancelled.');
          return;
        }
        if (e.target.closest('#btn-clear-all-gatherings')) {
          OFFLINE.plan.clear();
          OFFLINE.clearBookings();
          populateBookingSelect();
          renderCards();
          OFFLINE.toast('All saved evenings and reservations cleared.');
        }
      });
    }
  };

  /* ---------- Booking Form Validation & Submit ---------- */
  const initBookingForm = () => {
    const { rules } = OFFLINE;

    OFFLINE.initForm(bookingForm, {
      name: [rules.required('Please enter your full name.'), rules.personName(), rules.minLength(2)],
      email: [rules.required('Email is required for confirmation.'), rules.email()],
      phone: [rules.required('Phone is required.'), rules.phone()],
      evening: [
        rules.required('Please select an evening.'),
        rules.custom((id) => {
          const event = OFFLINE.getGathering(id);
          return event && OFFLINE.seatsLeft(event) > 0;
        }, 'This evening is already full.'),
      ],
      seats: [
        rules.required('Enter how many seats you need.'),
        rules.integer('Must be a whole number.'),
        rules.range(1, 4, 'You can reserve between 1 and 4 seats.'),
        rules.custom((val, ctx) => {
          const event = OFFLINE.getGathering(ctx.values.evening);
          if (!event) return true;
          return Number(val) <= OFFLINE.seatsLeft(event);
        }, 'Not enough seats left for this gathering.'),
      ],
      arrival: [rules.required('Please let us know your arrival time.')],
      consent: [rules.checked('Please check the box to confirm.')],
    }, (values) => {
      const seatsNum = Number(values.seats);
      const success = OFFLINE.bookSeats(values.evening, seatsNum);

      if (!success) {
        return false;
      }

      // Also include the reserved evening in the visitor's cross-page plan
      OFFLINE.plan.add(values.evening);

      populateBookingSelect();
      renderCards();

      const event = OFFLINE.getGathering(values.evening);
      const msg = `Reserved ${seatsNum} ${seatsNum === 1 ? 'seat' : 'seats'} for "${event.title}" and saved to your plan!`;

      OFFLINE.toast(msg);

      setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(bookingModalEl);
        if (modal) modal.hide();
      }, 1400);

      return msg;
    });

    bookingModalEl.addEventListener('hidden.bs.modal', () => {
      bookingForm.reset();
      $(bookingForm).find('.form-success').prop('hidden', true).empty();
    });
  };

  /* ---------- Page Init ---------- */
  $(function () {
    initFilterControls();
    bindEvents();
    initBookingForm();
    renderCards();
  });
}(window.jQuery, window.OFFLINE));
