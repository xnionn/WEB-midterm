/* About page: searchable FAQ (jQuery accordion) and the "Ask the club" form.
 * Data: OFFLINE.faq and OFFLINE.faqTopics (data/faq.js). */
'use strict';

(function ($, OFFLINE) {
  const list = document.querySelector('#club-faq');
  const topicBox = document.querySelector('#faq-topics');
  const searchInput = document.querySelector('#faq-search');
  const countLine = document.querySelector('#faq-count');
  const emptyState = document.querySelector('#faq-empty');
  const ALL = 'All';

  const state = { query: '', topic: ALL };

  /* ---------- FAQ ---------- */
  // Returns a fragment where every match of `query` is wrapped in <mark>. Uses text nodes, so it is safe.
  const highlight = (text, query) => {
    const fragment = document.createDocumentFragment();
    if (!query) {
      fragment.append(text);
      return fragment;
    }
    const pattern = new RegExp(`(${OFFLINE.escapeRegExp(query)})`, 'ig');
    text.split(pattern).forEach((part) => {
      if (part.toLowerCase() === query.toLowerCase()) fragment.append(OFFLINE.el('mark', { class: 'search-hit', text: part }));
      else if (part) fragment.append(part);
    });
    return fragment;
  };

  const matchingItems = () => {
    const query = state.query.trim().toLowerCase();
    return OFFLINE.faq.filter((item) => {
      const topicOk = state.topic === ALL || item.topic === state.topic;
      const textOk = !query || `${item.question} ${item.answer} ${item.topic}`.toLowerCase().includes(query);
      return topicOk && textOk;
    });
  };

  const buildItem = (item, isOpen, query) => {
    const buttonId = `faq-button-${item.id}`;
    const panelId = `faq-panel-${item.id}`;
    const button = OFFLINE.el('button', {
      class: `accordion-button${isOpen ? '' : ' collapsed'}`,
      type: 'button',
      id: buttonId,
      'aria-expanded': String(isOpen),
      'aria-controls': panelId,
    });
    button.append(highlight(item.question, query));

    const body = OFFLINE.el('div', { class: 'accordion-body' });
    body.append(highlight(item.answer, query));
    const panel = OFFLINE.el('div', { class: 'faq-panel', id: panelId, role: 'region', 'aria-labelledby': buttonId, hidden: !isOpen }, [body]);

    return OFFLINE.el('div', { class: 'accordion-item' }, [OFFLINE.el('h3', { class: 'accordion-header' }, [button]), panel]);
  };

  const renderFaq = () => {
    const items = matchingItems();
    const query = state.query.trim();
    // The first answer is open by default; a single search result opens by itself.
    const openFirst = items.length === 1 || (!query && state.topic === ALL);
    list.replaceChildren(...items.map((item, index) => buildItem(item, openFirst && index === 0, query)));
    emptyState.hidden = items.length > 0;
    list.hidden = items.length === 0;
    countLine.replaceChildren(
      OFFLINE.el('span', {}, [OFFLINE.el('strong', { text: items.length }), ` of ${OFFLINE.faq.length} questions`]),
      state.topic !== ALL && OFFLINE.el('span', { text: `Topic: ${state.topic}` }),
    );
    // New content fades in. stop(true, true) finishes any fade still running, so quick typing never stacks effects.
    $(list).stop(true, true).hide().fadeIn(OFFLINE.speed);
  };

  const renderTopics = () => {
    const buttons = [ALL, ...OFFLINE.faqTopics].map((topic) => OFFLINE.el('button', {
      class: 'filter-button',
      type: 'button',
      'data-topic': topic,
      'aria-pressed': String(topic === state.topic),
      text: topic === ALL ? 'All questions' : topic,
    }));
    topicBox.replaceChildren(...buttons);
  };

  // Accordion: one panel open at a time. Ignore clicks on a panel that is still moving.
  const togglePanel = (button) => {
    const $panel = $(`#${button.getAttribute('aria-controls')}`);
    if ($panel.is(':animated')) return;
    const opening = button.getAttribute('aria-expanded') !== 'true';

    $(list).find('.accordion-button[aria-expanded="true"]').not(button).each(function () {
      const $other = $(`#${this.getAttribute('aria-controls')}`);
      this.setAttribute('aria-expanded', 'false');
      this.classList.add('collapsed');
      $other.stop(true, true).slideUp(OFFLINE.speed, () => $other.prop('hidden', true));
    });

    button.setAttribute('aria-expanded', String(opening));
    button.classList.toggle('collapsed', !opening);
    if (opening) $panel.prop('hidden', false).hide().slideDown(OFFLINE.speed);
    else $panel.slideUp(OFFLINE.speed, () => $panel.prop('hidden', true));
  };

  const resetFilters = () => {
    state.query = '';
    state.topic = ALL;
    searchInput.value = '';
    renderTopics();
    renderFaq();
  };

  const initFaq = () => {
    if (!list) return;
    renderTopics();
    renderFaq();

    list.addEventListener('click', (event) => {
      const button = event.target.closest('.accordion-button');
      if (button) togglePanel(button);
    });
    searchInput.addEventListener('input', OFFLINE.debounce(() => {
      state.query = searchInput.value;
      renderFaq();
    }, 150));
    // Escape clears the search field.
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && searchInput.value) {
        searchInput.value = '';
        state.query = '';
        renderFaq();
      }
    });
    topicBox.addEventListener('click', (event) => {
      const button = event.target.closest('[data-topic]');
      if (!button) return;
      state.topic = button.dataset.topic;
      topicBox.querySelectorAll('[data-topic]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      renderFaq();
    });
    document.querySelector('#faq-reset').addEventListener('click', () => {
      resetFilters();
      searchInput.focus();
    });
  };

  /* ---------- Ask the club form ---------- */
  const QUESTIONS_KEY = 'offline-questions-v1';
  const MAX_MESSAGE = 500;

  const savedQuestions = () => {
    const stored = OFFLINE.storage.get(QUESTIONS_KEY, []);
    return Array.isArray(stored) ? stored : [];
  };

  const updateSavedCount = () => {
    const box = document.querySelector('#ask-saved');
    const count = savedQuestions().length;
    box.textContent = count ? `${OFFLINE.plural(count, 'question')} saved on this device.` : '';
  };

  const initAskForm = () => {
    const form = document.querySelector('#ask-form');
    if (!form) return;
    const message = form.elements.message;
    const counter = document.querySelector('#ask-count');

    const updateCounter = () => {
      counter.textContent = `${message.value.length} of ${MAX_MESSAGE} characters. At least 20.`;
    };
    message.addEventListener('input', updateCounter);
    form.addEventListener('reset', () => setTimeout(updateCounter));

    const { rules } = OFFLINE;
    OFFLINE.initForm(form, {
      name: [rules.required('Please tell us your name.'), rules.personName(), rules.minLength(2)],
      email: [rules.required('Add an email so we know who is asking.'), rules.email()],
      topic: [rules.required('Choose the closest topic.')],
      message: [
        rules.required('Write your question here.'),
        rules.minLength(20, 'Add a little more detail: at least 20 characters.'),
        rules.maxLength(MAX_MESSAGE, `Please keep it under ${MAX_MESSAGE} characters.`),
      ],
      replyTime: [rules.required('Choose a time that suits you.')],
      consent: [rules.checked('Please confirm you understand how this works.')],
    }, (values) => {
      const saved = savedQuestions();
      saved.push({ id: Date.now(), name: values.name.trim(), topic: values.topic, message: values.message.trim(), replyTime: values.replyTime });
      const stored = OFFLINE.storage.set(QUESTIONS_KEY, saved);
      updateSavedCount();
      OFFLINE.toast('Question saved.');
      const name = values.name.trim();
      return stored
        ? `Thank you, ${name}. Your question is saved in this browser. This is a student concept, so nothing was sent.`
        : `Thank you, ${name}. Your browser blocks storage, so the question was not saved. Nothing was sent.`;
    });
    updateSavedCount();
  };

  $(function () {
    initFaq();
    initAskForm();
  });
}(window.jQuery, window.OFFLINE));

