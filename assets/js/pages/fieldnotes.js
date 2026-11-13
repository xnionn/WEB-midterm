/* Field notes page: search, tag filters, sorting, live summary,
 * jQuery slideToggle expandable notes, persistent cross-page bookmarks,
 * and a validated "Write a note" form saving visitor notes in localStorage.
 * Data: OFFLINE.notes (data/notes.js). */
'use strict';

(function ($, OFFLINE) {
  const listEl = document.querySelector('#notes-list');
  const searchInput = document.querySelector('#notes-search');
  const tagsContainer = document.querySelector('#notes-tags');
  const sortSelect = document.querySelector('#notes-sort');
  const summaryEl = document.querySelector('#notes-summary');
  const savedBarEl = document.querySelector('#saved-notes-bar');
  const emptyState = document.querySelector('#notes-empty');
  const resetBtn = document.querySelector('#notes-reset');
  const noteForm = document.querySelector('#write-note-form');

  const VISITOR_NOTES_KEY = 'offline-visitor-notes-v1';
  const MAX_TEXT_LENGTH = 600;

  let activeTag = 'All';
  let searchQuery = '';
  let activeSort = 'newest';

  /* ---------- Storage Helpers ---------- */
  const getVisitorNotes = () => {
    const stored = OFFLINE.storage.get(VISITOR_NOTES_KEY, []);
    return Array.isArray(stored) ? stored : [];
  };

  const saveVisitorNotes = (notes) => {
    OFFLINE.storage.set(VISITOR_NOTES_KEY, notes);
  };

  const getAllNotes = () => [...getVisitorNotes(), ...OFFLINE.notes];

  /* ---------- Data Combination & Filtering ---------- */
  const getFilteredNotes = () => {
    const all = getAllNotes();
    const bookmarks = OFFLINE.bookmarks.getIds();
    const q = searchQuery.trim().toLowerCase();

    const filtered = all.filter((note) => {
      if (activeTag === 'Saved') {
        if (!bookmarks.includes(note.id)) return false;
      } else if (activeTag !== 'All' && note.tag !== activeTag) {
        return false;
      }
      if (q) {
        const hay = `${note.title} ${note.text} ${note.author} ${note.tag}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (activeSort === 'shortest') return a.minutes - b.minutes;
      if (activeSort === 'az') return a.title.localeCompare(b.title);
      return b.date.localeCompare(a.date);
    });

    return filtered;
  };

  /* ---------- Render Saved Reading List Bar ---------- */
  const renderSavedBar = () => {
    if (!savedBarEl) return;
    const all = getAllNotes();
    const bookmarkIds = OFFLINE.bookmarks.getIds();
    const savedNotes = bookmarkIds.map((id) => all.find((n) => n.id === id)).filter(Boolean);

    savedBarEl.replaceChildren();
    if (savedNotes.length === 0) {
      savedBarEl.hidden = true;
      return;
    }

    savedBarEl.hidden = false;
    const totalMinutes = savedNotes.reduce((sum, n) => sum + (Number(n.minutes) || 1), 0);

    const header = OFFLINE.el('div', { class: 'd-flex flex-wrap justify-content-between align-items-center gap-2 mb-2' }, [
      OFFLINE.el('div', {}, [
        OFFLINE.el('strong', { text: `${OFFLINE.plural(savedNotes.length, 'saved note')} (${totalMinutes} min reading total)` }),
        OFFLINE.el('span', { class: 'ms-2 meta', text: '· Shown in your Toolkit pause kit' }),
      ]),
      OFFLINE.el('div', { class: 'd-flex flex-wrap gap-3 align-items-center' }, [
        OFFLINE.el('a', { class: 'text-link', href: 'toolkit.html#saved-notes-kit' }, ['Open in The toolkit ', OFFLINE.el('span', { 'aria-hidden': 'true', text: '↗' })]),
        OFFLINE.el('button', { type: 'button', class: 'btn-delete-note', id: 'btn-clear-bookmarks', text: 'Clear all saved' }),
      ]),
    ]);

    const chips = OFFLINE.el('div', { class: 'd-flex flex-wrap gap-2' });
    savedNotes.forEach((note) => {
      chips.append(OFFLINE.el('span', { class: 'saved-gathering-chip' }, [
        OFFLINE.el('span', { text: note.title }),
        OFFLINE.el('button', {
          type: 'button',
          class: 'chip-remove-btn',
          'data-unbookmark-id': note.id,
          'aria-label': `Remove ${note.title} from saved notes`,
          text: '×',
        }),
      ]));
    });

    savedBarEl.append(header, chips);
  };

  /* ---------- Build Note Card Element ---------- */
  const buildNoteCard = (note, isVisitor, query) => {
    const isBookmarked = OFFLINE.bookmarks.has(note.id);
    const panelId = `note-body-${note.id}`;

    const metaLeft = OFFLINE.el('div', { class: 'd-flex align-items-center gap-2 flex-wrap' }, [
      OFFLINE.el('span', { class: 'tag', text: note.tag }),
      OFFLINE.el('span', { class: 'meta-reading', text: `${note.minutes} min read` }),
      isVisitor ? OFFLINE.el('span', { class: 'badge-visitor', text: 'Added by you' }) : null,
    ]);

    const bookmarkBtn = OFFLINE.el('button', {
      type: 'button',
      class: `btn-bookmark ${isBookmarked ? 'is-bookmarked' : ''}`,
      'data-note-id': note.id,
      'aria-label': isBookmarked ? 'Remove bookmark' : 'Bookmark this note',
      'aria-pressed': String(isBookmarked),
      text: isBookmarked ? '★ Saved' : '☆ Save',
    });

    const header = OFFLINE.el('div', { class: 'note-card-header d-flex justify-content-between align-items-center' }, [
      metaLeft,
      bookmarkBtn,
    ]);

    const titleBtn = OFFLINE.el('button', {
      type: 'button',
      class: 'note-toggle-button',
      'aria-expanded': 'true',
      'aria-controls': panelId,
    });
    const titleSpan = OFFLINE.el('span');
    titleSpan.append(OFFLINE.highlight(note.title, query));
    titleBtn.append(titleSpan, OFFLINE.el('span', { class: 'toggle-indicator', 'aria-hidden': 'true', text: '▾' }));
    const h3 = OFFLINE.el('h3', { class: 'note-card-title' }, [titleBtn]);

    const bodyText = OFFLINE.el('p', { class: 'note-card-text' });
    bodyText.append(OFFLINE.highlight(note.text, query));

    const children = [bodyText];
    if (note.prompt) {
      children.push(OFFLINE.el('div', { class: 'note-card-prompt' }, [
        OFFLINE.el('strong', { text: 'Try it: ' }),
        document.createTextNode(note.prompt),
      ]));
    }

    const footerParts = [
      OFFLINE.el('span', { class: 'note-author-info', text: `By ${note.author} · ${OFFLINE.formatDate(note.date, { short: true })}` }),
    ];

    if (isVisitor) {
      footerParts.push(
        OFFLINE.el('button', {
          type: 'button',
          class: 'btn-delete-note',
          'data-note-id': note.id,
          text: 'Delete note',
        })
      );
    }

    const footer = OFFLINE.el('div', { class: 'note-card-footer d-flex justify-content-between align-items-center pt-3' }, footerParts);
    children.push(footer);

    const bodyPanel = OFFLINE.el('div', {
      id: panelId,
      class: 'note-card-body',
      hidden: false,
    }, children);

    const card = OFFLINE.el('article', {
      class: `note-card ${isVisitor ? 'is-visitor' : ''}`,
      id: `note-${note.id}`,
    }, [header, h3, bodyPanel]);

    return card;
  };

  /* ---------- Update Summary ---------- */
  const updateSummary = (items) => {
    const count = items.length;
    const totalMinutes = items.reduce((sum, n) => sum + (Number(n.minutes) || 1), 0);
    const savedCount = OFFLINE.bookmarks.getIds().length;

    summaryEl.replaceChildren(
      OFFLINE.el('span', {}, [
        OFFLINE.el('strong', { text: count }),
        ` ${count === 1 ? 'note' : 'notes'} shown`,
      ]),
      OFFLINE.el('span', {}, [
        'Total reading time: ',
        OFFLINE.el('strong', { text: `${totalMinutes} min` }),
      ]),
      OFFLINE.el('span', {}, [
        OFFLINE.el('strong', { text: savedCount }),
        ' bookmarked for Toolkit',
      ])
    );
  };

  /* ---------- Render Notes ---------- */
  const renderNotes = () => {
    const items = getFilteredNotes();
    updateSummary(items);
    renderSavedBar();
    const query = searchQuery.trim();
    const visitorNotes = getVisitorNotes();
    const visitorIds = new Set(visitorNotes.map((n) => n.id));

    $(listEl).stop(true, true).fadeOut(OFFLINE.speed, () => {
      listEl.replaceChildren();

      if (items.length === 0) {
        emptyState.hidden = false;
        listEl.hidden = true;
      } else {
        emptyState.hidden = true;
        listEl.hidden = false;
        items.forEach((note) => {
          listEl.append(buildNoteCard(note, visitorIds.has(note.id), query));
        });
      }

      $(listEl).fadeIn(OFFLINE.speed);
    });
  };

  /* ---------- Tag Filter Buttons ---------- */
  const initTags = () => {
    const tags = ['All', 'Ideas', 'Make', 'Play', 'Slow', 'Saved'];
    tagsContainer.replaceChildren();
    tags.forEach((tag) => {
      const btn = OFFLINE.el('button', {
        type: 'button',
        class: 'filter-button',
        'data-tag': tag,
        'aria-pressed': String(tag === activeTag),
        text: tag === 'Saved' ? '★ Saved' : tag,
      });
      tagsContainer.append(btn);
    });

    tagsContainer.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-tag]');
      if (!btn) return;
      activeTag = btn.dataset.tag;
      tagsContainer.querySelectorAll('[data-tag]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderNotes();
    });
  };

  /* ---------- Event Bindings ---------- */
  const bindEvents = () => {
    searchInput.addEventListener('input', OFFLINE.debounce(() => {
      searchQuery = searchInput.value;
      renderNotes();
    }, 180));

    sortSelect.addEventListener('change', () => {
      activeSort = sortSelect.value;
      renderNotes();
    });

    resetBtn.addEventListener('click', () => {
      searchQuery = '';
      activeTag = 'All';
      activeSort = 'newest';

      searchInput.value = '';
      sortSelect.value = 'newest';
      tagsContainer.querySelectorAll('[data-tag]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.tag === 'All'));
      });

      renderNotes();
      searchInput.focus();
    });

    $(listEl).on('click', '.note-toggle-button', function () {
      const $btn = $(this);
      const $panel = $(`#${$btn.attr('aria-controls')}`);
      if ($panel.is(':animated')) return;

      const expanded = $btn.attr('aria-expanded') === 'true';
      $btn.attr('aria-expanded', String(!expanded));
      $btn.find('.toggle-indicator').text(expanded ? '▸' : '▾');

      if (expanded) {
        $panel.slideUp(OFFLINE.speed, () => $panel.prop('hidden', true));
      } else {
        $panel.prop('hidden', false).hide().slideDown(OFFLINE.speed);
      }
    });

    $(listEl).on('click', '.btn-bookmark', function () {
      const $btn = $(this);
      const noteId = String($btn.data('note-id'));
      const isSaved = OFFLINE.bookmarks.toggle(noteId);

      $btn.toggleClass('is-bookmarked', isSaved);
      $btn.attr('aria-pressed', String(isSaved));
      $btn.attr('aria-label', isSaved ? 'Remove bookmark' : 'Bookmark this note');
      $btn.text(isSaved ? '★ Saved' : '☆ Save');

      $btn.addClass('is-bouncing');
      setTimeout(() => $btn.removeClass('is-bouncing'), 180);

      updateSummary(getFilteredNotes());
      renderSavedBar();
      if (activeTag === 'Saved' && !isSaved) {
        renderNotes();
      }
      OFFLINE.toast(isSaved ? 'Saved to bookmarks & Toolkit reading list' : 'Bookmark removed');
    });

    $(listEl).on('click', '.btn-delete-note', function () {
      const noteId = String($(this).data('note-id'));
      const existing = getVisitorNotes();
      const updated = existing.filter((n) => n.id !== noteId);
      saveVisitorNotes(updated);
      OFFLINE.bookmarks.remove(noteId);
      renderNotes();
      OFFLINE.toast('Your note has been removed.');
    });

    if (savedBarEl) {
      savedBarEl.addEventListener('click', (e) => {
        const unbookmarkBtn = e.target.closest('[data-unbookmark-id]');
        if (unbookmarkBtn) {
          OFFLINE.bookmarks.remove(unbookmarkBtn.dataset.unbookmarkId);
          renderNotes();
          OFFLINE.toast('Removed from saved notes.');
          return;
        }
        if (e.target.closest('#btn-clear-bookmarks')) {
          OFFLINE.bookmarks.clear();
          renderNotes();
          OFFLINE.toast('All saved bookmarks cleared.');
        }
      });
    }
  };

  /* ---------- Write a Note Form ---------- */
  const initNoteForm = () => {
    if (!noteForm) return;

    const textarea = noteForm.elements.text;
    const counter = document.querySelector('#note-char-count');

    const updateCharCounter = () => {
      const len = textarea.value.length;
      counter.textContent = `${len} of ${MAX_TEXT_LENGTH} characters. At least 50.`;
    };

    textarea.addEventListener('input', updateCharCounter);
    noteForm.addEventListener('reset', () => setTimeout(updateCharCounter));

    const { rules } = OFFLINE;

    OFFLINE.initForm(noteForm, {
      author: [rules.required('Please enter your name.'), rules.personName(), rules.minLength(2)],
      email: [rules.required('Email is required.'), rules.email()],
      title: [
        rules.required('Enter a title for your note.'),
        rules.minLength(5, 'Title must be at least 5 characters.'),
        rules.custom((title) => {
          const all = getAllNotes();
          return !all.some((n) => n.title.toLowerCase() === title.trim().toLowerCase());
        }, 'A note with this title already exists.'),
      ],
      tag: [rules.required('Choose a category for your note.')],
      text: [
        rules.required('Write your observation.'),
        rules.minLength(50, 'Please write at least 50 characters.'),
        rules.maxLength(MAX_TEXT_LENGTH, `Please keep it under ${MAX_TEXT_LENGTH} characters.`),
      ],
      consent: [rules.checked('Please confirm before posting.')],
    }, (values) => {
      const newNote = {
        id: `visitor-${Date.now()}`,
        title: values.title.trim(),
        author: values.author.trim(),
        tag: values.tag,
        minutes: Math.max(1, Math.round(values.text.trim().split(/\s+/).length / 100)),
        date: OFFLINE.toIso(new Date()),
        text: values.text.trim(),
        prompt: 'Inspired by a visitor to the OFFLINE club.',
      };

      const existing = getVisitorNotes();
      existing.unshift(newNote);
      saveVisitorNotes(existing);
      OFFLINE.bookmarks.toggle(newNote.id);

      renderNotes();
      OFFLINE.toast('Note added to the board and saved to your Toolkit!');

      setTimeout(() => {
        const el = document.querySelector(`#note-${newNote.id}`);
        if (el) {
          $('html, body').stop(true).animate({ scrollTop: $(el).offset().top - 20 }, OFFLINE.speed * 2);
        }
      }, 300);

      return `Thank you, ${newNote.author}. Your note has been pinned to the board!`;
    });
  };

  /* ---------- Page Init ---------- */
  $(function () {
    initTags();
    bindEvents();
    initNoteForm();
    renderNotes();
  });
}(window.jQuery, window.OFFLINE));
