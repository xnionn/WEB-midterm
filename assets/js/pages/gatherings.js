/* Gatherings page: search, filtering, sorting, live summary, details toggle,
 * and seat reservation in a Bootstrap modal.
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

  /* ---------- Safe Text Highlighting ---------- */
  const highlight = (text, query) => {
    const fragment = document.createDocumentFragment();
    if (!query) {
      fragment.append(text);
      return fragment;
    }
    const pattern = new RegExp(`(${OFFLINE.escapeRegExp(query)})`, 'ig');
    text.split(pattern).forEach((part) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        fragment.append(OFFLINE.el('mark', { class: 'search-hit', text: part }));
      } else if (part) {
        fragment.append(part);
      }
    });
    return fragment;
  };

  /* ---------- Initialize Dropdowns ---------- */
  const initFilterControls = () => {
    // Populate levels
    const levels = [...new Set(OFFLINE.gatherings.map((g) => g.level))];
    levels.forEach((lvl) => {
      levelSelect.append(OFFLINE.el('option', { value: lvl, text: lvl }));
    });

    // Populate booking select
    populateBookingSelect();

    // Check URL parameters (e.g. ?category=make)
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
      const opt = OFFLINE.el('option', { value: event.id, text: text });
      if (free === 0) opt.disabled = true;
      bookingEveningSelect.append(opt);
    });
  };

  /* ---------- Filter & Sort Logic ---------- */
  const getFilteredGatherings = () => {
    const q = filterQuery.trim().toLowerCase();

    let list = OFFLINE.gatherings.filter((event) => {
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
      // default: soonest
      return a.date.localeCompare(b.date) || a.start.localeCompare(b.start);
    });

    return list;
  };

  /* ---------- Render Card with DOM ---------- */
  const buildCard = (event, index, query) => {
    const free = OFFLINE.seatsLeft(event);
    const isSoldOut = free === 0;

    // Art
    const art = OFFLINE.categoryArt(event.category);

    // Copy container
    const copy = OFFLINE.el('div', { class: 'session-card-copy' });

    // Header badge
    const headerRow = OFFLINE.el('div', { class: 'd-flex justify-content-between align-items-center mb-2' }, [
      OFFLINE.el('span', { class: 'tag', text: `${event.category.toUpperCase()} · 0${index + 1}` }),
      isSoldOut
        ? OFFLINE.el('span', { class: 'badge-soldout', text: 'Sold out' })
        : OFFLINE.el('span', { class: 'badge-seats', text: `${free} places left` }),
    ]);

    // Title
    const h3 = OFFLINE.el('h3', { class: 'session-title' });
    h3.append(highlight(event.title, query));

    // Blurb
    const blurb = OFFLINE.el('p', { class: 'session-blurb' });
    blurb.append(highlight(event.blurb, query));

    // Meta
    const meta = OFFLINE.el('div', { class: 'session-meta' }, [
      OFFLINE.el('span', { text: `${OFFLINE.formatDate(event.date)} · ${event.start}–${event.end}` }),
      OFFLINE.el('span', { text: `${event.place} · Level: ${event.level}` }),
    ]);

    // Expandable details (jQuery slideToggle target)
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

    // Action buttons
    const actions = OFFLINE.el('div', { class: 'session-actions mt-auto pt-3' }, [
      isSoldOut
        ? OFFLINE.el('button', { type: 'button', class: 'button button-small w-100 mb-2', disabled: true, text: 'No seats available' })
        : OFFLINE.el('button', {
            type: 'button',
            class: 'button button-small w-100 mb-2 btn-reserve-seat',
            'data-event-id': event.id,
            text: 'Reserve a seat ↗',
          }),
      OFFLINE.el('a', {
        class: 'text-link justify-content-between w-100',
        href: `join.html?session=${event.id}`,
      }, ['Plan this evening ', OFFLINE.el('span', { 'aria-hidden': 'true', text: '↗' })]),
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

    const query = filterQuery.trim();

    // jQuery effect 1: smooth card transition
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
    // 1. Category filter buttons
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterCategory = btn.dataset.filter;
        filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        renderCards();
      });
    });

    // 2. Search box (debounced)
    searchInput.addEventListener('input', OFFLINE.debounce(() => {
      filterQuery = searchInput.value;
      renderCards();
    }, 180));

    // 3. Level dropdown
    levelSelect.addEventListener('change', () => {
      filterLevel = levelSelect.value;
      renderCards();
    });

    // 4. Sort dropdown
    sortSelect.addEventListener('change', () => {
      sortBy = sortSelect.value;
      renderCards();
    });

    // 5. Hide sold out checkbox
    hideSoldOutCheckbox.addEventListener('change', () => {
      filterHideSoldOut = hideSoldOutCheckbox.checked;
      renderCards();
    });

    // 6. Clear filters button
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

    // 7. jQuery effect 2: slideToggle details on card
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

    // 8. Open booking modal when "Reserve a seat" is clicked
    $(grid).on('click', '.btn-reserve-seat', function () {
      const eventId = $(this).data('event-id');
      bookingEveningSelect.value = eventId;
      const modal = bootstrap.Modal.getOrCreateInstance(bookingModalEl);
      modal.show();
    });
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

      // Re-populate and re-render
      populateBookingSelect();
      renderCards();

      const event = OFFLINE.getGathering(values.evening);
      const msg = `Reserved ${seatsNum} ${seatsNum === 1 ? 'seat' : 'seats'} for "${event.title}". See you there!`;

      // Show toast via OFFLINE.toast (jQuery effect 3)
      OFFLINE.toast(msg);

      // Close modal automatically after brief pause
      setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(bookingModalEl);
        if (modal) modal.hide();
      }, 1400);

      return msg;
    });

    // Reset errors when modal is closed
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
