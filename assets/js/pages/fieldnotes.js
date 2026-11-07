/* Field notes page: search, tag filters, sorting, live summary,
 * jQuery slideToggle expandable notes, like/bookmark count,
 * and a validated "Write a note" form saving visitor notes in localStorage.
 * Data: OFFLINE.notes (data/notes.js). */
'use strict';

(function ($, OFFLINE) {
  const listEl = document.querySelector('#notes-list');
  const searchInput = document.querySelector('#notes-search');
  const tagsContainer = document.querySelector('#notes-tags');
  const sortSelect = document.querySelector('#notes-sort');
  const summaryEl = document.querySelector('#notes-summary');
  const emptyState = document.querySelector('#notes-empty');
  const resetBtn = document.querySelector('#notes-reset');
  const noteForm = document.querySelector('#write-note-form');

  const VISITOR_NOTES_KEY = 'offline-visitor-notes-v1';
  const BOOKMARKS_KEY = 'offline-bookmarks-v1';
  const MAX_TEXT_LENGTH = 600;

  let activeTag = 'All';
  let searchQuery = '';
  let activeSort = 'newest';

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

  /* ---------- Storage Helpers ---------- */
  const getVisitorNotes = () => {
    const stored = OFFLINE.storage.get(VISITOR_NOTES_KEY, []);
    return Array.isArray(stored) ? stored : [];
  };

  const saveVisitorNotes = (notes) => {
    OFFLINE.storage.set(VISITOR_NOTES_KEY, notes);
  };

  const getBookmarks = () => {
    const stored = OFFLINE.storage.get(BOOKMARKS_KEY, []);
    return Array.isArray(stored) ? stored : [];
  };

  const toggleBookmark = (noteId) => {
    const bmarks = getBookmarks();
    const idx = bmarks.indexOf(noteId);
    if (idx === -1) {
      bmarks.push(noteId);
    } else {
      bmarks.splice(idx, 1);
    }
    OFFLINE.storage.set(BOOKMARKS_KEY, bmarks);
    return bmarks.includes(noteId);
  };

  /* ---------- Data Combination & Filtering ---------- */
  const getAllNotes = () => {
    const visitorNotes = getVisitorNotes();
    // Visitor notes come first
    return [...visitorNotes, ...OFFLINE.notes];
  };

  const getFilteredNotes = () => {
    const all = getAllNotes();
    const q = searchQuery.trim().toLowerCase();

    let filtered = all.filter((note) => {
      if (activeTag !== 'All' && note.tag !== activeTag) return false;
      if (q) {
        const hay = `${note.title} ${note.text} ${note.author} ${note.tag}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (activeSort === 'shortest') return a.minutes - b.minutes;
      if (activeSort === 'az') return a.title.localeCompare(b.title);
      // default: newest
      return b.date.localeCompare(a.date);
    });

    return filtered;
  };

  /* ---------- Build Note Card Element ---------- */
  const buildNoteCard = (note, isVisitor, query) => {
    const bookmarks = getBookmarks();
    const isBookmarked = bookmarks.includes(note.id);
    const panelId = `note-body-${note.id}`;

    // Tag and meta row
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

    // Title button for expandable toggle
    const titleBtn = OFFLINE.el('button', {
      type: 'button',
      class: 'note-toggle-button',
      'aria-expanded': 'true',
      'aria-controls': panelId,
    });
    const h3 = OFFLINE.el('h3', { class: 'note-card-title' });
    h3.append(highlight(note.title, query));
    titleBtn.append(h3, OFFLINE.el('span', { class: 'toggle-indicator', 'aria-hidden': 'true', text: '▾' }));

    // Note body (jQuery slideToggle target)
    const bodyText = OFFLINE.el('p', { class: 'note-card-text' });
    bodyText.append(highlight(note.text, query));

    const children = [bodyText];
    if (note.prompt) {
      children.push(OFFLINE.el('div', { class: 'note-card-prompt' }, [
        OFFLINE.el('strong', { text: 'Try it: ' }),
        document.createTextNode(note.prompt),
      ]));
    }

    // Author info & Delete button if visitor note
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
    }, [header, titleBtn, bodyPanel]);

    return card;
  };

  /* ---------- Update Summary ---------- */
  const updateSummary = (items) => {
    const count = items.length;
    const totalMinutes = items.reduce((sum, n) => sum + (Number(n.minutes) || 1), 0);

    summaryEl.replaceChildren(
      OFFLINE.el('span', {}, [
        OFFLINE.el('strong', { text: count }),
        ` ${count === 1 ? 'note' : 'notes'} shown`,
      ]),
      OFFLINE.el('span', {}, [
        'Total reading time: ',
        OFFLINE.el('strong', { text: `${totalMinutes} min` }),
      ])
    );
  };

  /* ---------- Render Notes ---------- */
  const renderNotes = () => {
    const items = getFilteredNotes();
    updateSummary(items);
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
    const tags = ['All', 'Ideas', 'Make', 'Play', 'Slow'];
    tags.forEach((tag) => {
      const btn = OFFLINE.el('button', {
        type: 'button',
        class: 'filter-button',
        'data-tag': tag,
        'aria-pressed': String(tag === activeTag),
        text: tag,
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
    // Search
    searchInput.addEventListener('input', OFFLINE.debounce(() => {
      searchQuery = searchInput.value;
      renderNotes();
    }, 180));

    // Sort
    sortSelect.addEventListener('change', () => {
      activeSort = sortSelect.value;
      renderNotes();
    });

    // Reset button
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

    // jQuery effect: slideToggle note details
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

    // Bookmark button
    $(listEl).on('click', '.btn-bookmark', function () {
      const $btn = $(this);
      const noteId = $btn.data('note-id');
      const isSaved = toggleBookmark(noteId);

      $btn.toggleClass('is-bookmarked', isSaved);
      $btn.attr('aria-pressed', String(isSaved));
      $btn.attr('aria-label', isSaved ? 'Remove bookmark' : 'Bookmark this note');
      $btn.text(isSaved ? '★ Saved' : '☆ Save');

      // Small bounce effect with jQuery
      $btn.stop(true, true).animate({ transform: 'scale(1.15)' }, 100)
        .animate({ transform: 'scale(1)' }, 100);

      OFFLINE.toast(isSaved ? 'Saved to bookmarks' : 'Bookmark removed');
    });

    // Delete visitor note
    $(listEl).on('click', '.btn-delete-note', function () {
      const noteId = $(this).data('note-id');
      const existing = getVisitorNotes();
      const updated = existing.filter((n) => n.id !== noteId);
      saveVisitorNotes(updated);
      renderNotes();
      OFFLINE.toast('Your note has been removed.');
    });
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

      renderNotes();
      OFFLINE.toast('Note added to the board!');

      // Smooth scroll to the newly added note
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

