/* Home page: the "next evening" card with a countdown, and the "Which evening is yours?" quiz.
 * Persists quiz results in localStorage ('offline-quiz-result-v1') and syncs with the cross-page plan basket.
 * Data: OFFLINE.gatherings (data/gatherings.js) and OFFLINE.quiz (data/quiz.js). */
'use strict';

(function ($, OFFLINE) {
  const QUIZ_KEY = 'offline-quiz-result-v1';

  /* ---------- Next evening ---------- */
  const countdownText = (days) => {
    if (days === 0) return 'Tonight';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  const findNextGathering = () => OFFLINE.gatherings.find((event) => OFFLINE.daysUntil(event.date) >= 0 && OFFLINE.seatsLeft(event) > 0);

  const renderNextGathering = () => {
    const card = document.querySelector('#next-gathering');
    const summary = document.querySelector('#next-summary');
    const event = findNextGathering();
    if (!card) return;
    if (!event) {
      card.replaceChildren(OFFLINE.el('div', { class: 'next-copy' }, [
        OFFLINE.el('h3', { text: 'No evenings right now.' }),
        OFFLINE.el('p', { text: 'New sample evenings appear every week. Check back soon.' }),
      ]));
      return;
    }

    const art = OFFLINE.categoryArt(event.category);
    art.append(OFFLINE.el('span', { class: 'art-label', text: `${event.level} / ${event.category}` }));

    const places = OFFLINE.seatsLeft(event);
    const inPlan = OFFLINE.plan.has(event.id);

    const togglePlanBtn = OFFLINE.el('button', {
      type: 'button',
      class: `button ${inPlan ? 'button-outline' : ''}`,
      'data-plan-toggle': event.id,
      'aria-pressed': String(inPlan),
      text: inPlan ? '✓ Saved in your plan' : '+ Save to my plan',
    });

    const copy = OFFLINE.el('div', { class: 'next-copy' }, [
      OFFLINE.el('span', { class: 'tag', text: `${countdownText(OFFLINE.daysUntil(event.date))} · ${event.level} friendly` }),
      OFFLINE.el('h3', { text: event.title }),
      OFFLINE.el('p', { text: event.blurb }),
      OFFLINE.el('div', { class: 'session-meta' }, [
        OFFLINE.el('span', { text: OFFLINE.formatDate(event.date) }),
        OFFLINE.el('span', { text: `${event.start}–${event.end}` }),
        OFFLINE.el('span', { text: `${event.place} · ${OFFLINE.plural(places, 'place')} left` }),
      ]),
      OFFLINE.el('div', { class: 'd-flex flex-wrap gap-3 align-items-center mt-2' }, [
        togglePlanBtn,
        OFFLINE.el('a', { class: 'text-link', href: `join.html?session=${event.id}` }, ['Open planner ', OFFLINE.el('span', { 'aria-hidden': 'true', text: '↗' })]),
      ]),
    ]);
    card.replaceChildren(art, copy);

    const upcoming = OFFLINE.gatherings.filter((item) => OFFLINE.daysUntil(item.date) >= 0);
    const freePlaces = upcoming.reduce((total, item) => total + OFFLINE.seatsLeft(item), 0);
    const plannedCount = OFFLINE.plan.getIds().length;
    if (summary) {
      summary.replaceChildren(
        OFFLINE.el('span', {}, [OFFLINE.el('strong', { text: upcoming.length }), ' evenings coming up']),
        OFFLINE.el('span', {}, [OFFLINE.el('strong', { text: freePlaces }), ' places still free']),
        OFFLINE.el('span', {}, [OFFLINE.el('strong', { text: plannedCount }), ' saved in your plan']),
      );
    }
  };

  /* ---------- Quiz ---------- */
  const stage = document.querySelector('#quiz-stage');
  const CATEGORY_ORDER = ['make', 'play', 'slow'];

  let questionIndex = 0;
  let answers = [];
  let busy = false;

  const scoreAnswers = () => {
    const counts = { make: 0, play: 0, slow: 0 };
    answers.forEach((category) => { counts[category] += 1; });
    const percents = {};
    CATEGORY_ORDER.forEach((category) => { percents[category] = Math.round((counts[category] / answers.length) * 100); });
    return { counts, percents };
  };

  const pickWinner = (counts) => {
    const best = Math.max(...Object.values(counts));
    for (let i = answers.length - 1; i >= 0; i -= 1) {
      if (counts[answers[i]] === best) return answers[i];
    }
    return CATEGORY_ORDER[0];
  };

  const recommendedEvening = (category) => {
    const matches = OFFLINE.gatherings.filter((event) => event.category === category && OFFLINE.daysUntil(event.date) >= 0);
    return matches.find((event) => OFFLINE.seatsLeft(event) > 0) || matches[0] || null;
  };

  const progressBar = () => {
    const percent = Math.round((questionIndex / OFFLINE.quiz.length) * 100);
    const bar = OFFLINE.el('div', { class: 'quiz-progress-bar' });
    bar.style.width = `${percent}%`;
    return OFFLINE.el('div', { class: 'quiz-progress', role: 'progressbar', 'aria-label': 'Quiz progress', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percent }, [bar]);
  };

  const buildQuestion = () => {
    const question = OFFLINE.quiz[questionIndex];
    const isLast = questionIndex === OFFLINE.quiz.length - 1;

    const options = question.options.map((option, position) => {
      const id = `quiz-${question.id}-${option.id}`;
      const input = OFFLINE.el('input', { class: 'quiz-radio', type: 'radio', name: 'answer', id, value: option.category });
      if (answers[questionIndex] === option.category) input.checked = true;
      return OFFLINE.el('div', { class: 'quiz-option' }, [
        input,
        OFFLINE.el('label', { for: id }, [OFFLINE.el('span', { class: 'quiz-key', 'aria-hidden': 'true', text: position + 1 }), option.label]),
      ]);
    });

    const legend = OFFLINE.el('legend', { class: 'quiz-question', tabindex: '-1', text: question.text });
    const form = OFFLINE.el('form', { class: 'quiz-form', id: 'quiz-form', novalidate: true }, [
      OFFLINE.el('p', { class: 'quiz-counter', text: `Question ${questionIndex + 1} of ${OFFLINE.quiz.length}` }),
      progressBar(),
      OFFLINE.el('fieldset', { class: 'form-field' }, [legend, OFFLINE.el('p', { class: 'form-hint', text: question.hint }), ...options]),
      OFFLINE.el('div', { class: 'quiz-actions' }, [
        questionIndex > 0 && OFFLINE.el('button', { class: 'button button-outline', type: 'button', 'data-quiz-back': true, text: 'Back' }),
        OFFLINE.el('button', { class: 'button', type: 'submit' }, [isLast ? 'See my evening ' : 'Next ', OFFLINE.el('span', { 'aria-hidden': 'true', text: '↗' })]),
      ]),
    ]);
    return form;
  };

  const buildResultView = (resultData, { isRestored = false } = {}) => {
    const { winner, percents } = resultData;
    const info = OFFLINE.quizResults[winner] || OFFLINE.quizResults.make;
    const event = recommendedEvening(winner);

    const scores = CATEGORY_ORDER.map((category) => {
      const pct = Number(percents && percents[category]) || 0;
      const bar = OFFLINE.el('span', { class: 'quiz-score-bar' });
      bar.dataset.width = pct;
      return OFFLINE.el('li', { class: category === winner ? 'is-winner' : '' }, [
        OFFLINE.el('span', { class: 'quiz-score-label', text: OFFLINE.quizResults[category].label }),
        OFFLINE.el('span', { class: 'quiz-score-track' }, [bar]),
        OFFLINE.el('span', { class: 'quiz-score-value', text: `${pct}%` }),
      ]);
    });

    const inPlan = event ? OFFLINE.plan.has(event.id) : false;
    const evening = event
      ? OFFLINE.el('div', { class: 'quiz-match' }, [
        OFFLINE.el('p', { class: 'eyebrow', text: 'Your matched evening' }),
        OFFLINE.el('h4', { text: event.title }),
        OFFLINE.el('p', { class: 'quiz-match-meta', text: `${OFFLINE.gatheringWhen(event)} · ${event.place} · ${OFFLINE.plural(OFFLINE.seatsLeft(event), 'place')} left` }),
        OFFLINE.el('div', { class: 'd-flex flex-wrap gap-3 align-items-center' }, [
          OFFLINE.el('button', {
            type: 'button',
            class: `button ${inPlan ? 'button-outline' : ''}`,
            'data-quiz-plan-id': event.id,
            'aria-pressed': String(inPlan),
            text: inPlan ? '✓ Saved in your plan' : '+ Save evening to plan',
          }),
          OFFLINE.el('a', { class: 'text-link', href: `join.html?session=${event.id}` }, ['Open in planner ', OFFLINE.el('span', { 'aria-hidden': 'true', text: '↗' })]),
        ]),
      ])
      : OFFLINE.el('p', { text: 'No matching evening is open right now. Check the Gatherings page soon.' });

    return OFFLINE.el('div', { class: 'quiz-result' }, [
      OFFLINE.el('div', { class: 'd-flex flex-wrap justify-content-between align-items-center gap-2' }, [
        OFFLINE.el('span', { class: 'tag', text: `Result · ${info.label}` }),
        isRestored && OFFLINE.el('span', { class: 'meta', text: 'Saved on this device' }),
      ]),
      OFFLINE.el('h3', { class: 'quiz-result-title', id: 'quiz-result-title', tabindex: '-1', text: info.title }),
      OFFLINE.el('p', { text: info.text }),
      OFFLINE.el('ul', { class: 'quiz-scores', 'aria-label': 'Your mix' }, scores),
      evening,
      OFFLINE.el('div', { class: 'd-flex flex-wrap gap-3 align-items-center mt-2' }, [
        OFFLINE.el('button', { class: 'text-link quiz-restart', type: 'button', 'data-quiz-restart': true, text: 'Take the quiz again' }),
        OFFLINE.el('button', { class: 'text-link quiz-restart', type: 'button', 'data-quiz-clear': true, text: 'Clear saved result' }),
      ]),
    ]);
  };

  const buildResult = () => {
    const { counts, percents } = scoreAnswers();
    const winner = pickWinner(counts);
    const info = OFFLINE.quizResults[winner] || OFFLINE.quizResults.make;
    const event = recommendedEvening(winner);
    const payload = {
      winner,
      label: info.label,
      title: info.title,
      counts,
      percents,
      eventId: event ? event.id : null,
      savedAt: new Date().toISOString(),
    };
    OFFLINE.storage.set(QUIZ_KEY, payload);
    return buildResultView(payload, { isRestored: false });
  };

  const animateBars = () => {
    $(stage).find('.quiz-score-bar').each(function () {
      $(this).stop(true, false).css('width', 0).animate({ width: `${this.dataset.width}%` }, OFFLINE.speed * 3);
    });
    $(stage).find('.quiz-progress-bar').each(function () {
      const target = this.style.width;
      $(this).css('width', 0).animate({ width: target }, OFFLINE.speed * 2);
    });
  };

  const showView = (build, focusSelector) => {
    if (busy) return;
    busy = true;
    $(stage).stop(true, true).fadeOut(OFFLINE.speed, () => {
      stage.replaceChildren(build());
      $(stage).fadeIn(OFFLINE.speed, () => {
        busy = false;
        const focusTarget = stage.querySelector(focusSelector);
        if (focusTarget) focusTarget.focus({ preventScroll: true });
        animateBars();
      });
    });
  };

  const showQuestion = () => showView(buildQuestion, '.quiz-question');
  const showResult = () => showView(buildResult, '.quiz-result-title');

  const restart = () => {
    questionIndex = 0;
    answers = [];
    showQuestion();
  };

  const clearSavedQuiz = () => {
    OFFLINE.storage.remove(QUIZ_KEY);
    OFFLINE.toast('Saved quiz result cleared.');
    restart();
  };

  const submitAnswer = (event) => {
    event.preventDefault();
    if (busy) return;
    const form = event.target;
    const chosen = form.elements.answer.value;
    if (!chosen) {
      OFFLINE.showFormError(form, 'answer', 'Pick an answer to continue.');
      return;
    }
    answers[questionIndex] = chosen;
    if (questionIndex === OFFLINE.quiz.length - 1) {
      showResult();
      OFFLINE.toast('Quiz match saved to this browser.');
    } else {
      questionIndex += 1;
      showQuestion();
    }
  };

  const initQuiz = () => {
    if (!stage) return;
    stage.addEventListener('submit', submitAnswer);
    stage.addEventListener('change', (event) => {
      if (event.target.name === 'answer') OFFLINE.clearFormError(event.target.form, 'answer');
    });
    stage.addEventListener('click', (event) => {
      if (event.target.closest('[data-quiz-restart]')) restart();
      if (event.target.closest('[data-quiz-clear]')) clearSavedQuiz();
      if (event.target.closest('[data-quiz-back]') && !busy && questionIndex > 0) {
        questionIndex -= 1;
        showQuestion();
      }
      const planBtn = event.target.closest('[data-quiz-plan-id]');
      if (planBtn) {
        const id = planBtn.dataset.quizPlanId;
        const added = OFFLINE.plan.toggle(id);
        planBtn.classList.toggle('button-outline', added);
        planBtn.setAttribute('aria-pressed', String(added));
        planBtn.textContent = added ? '✓ Saved in your plan' : '+ Save evening to plan';
        renderNextGathering();
        OFFLINE.toast(added ? 'Evening added to your plan!' : 'Evening removed from your plan.');
      }
    });
    stage.addEventListener('keydown', (event) => {
      const radios = stage.querySelectorAll('.quiz-radio');
      const position = Number(event.key) - 1;
      if (event.target.matches('button, a') || !radios.length || !Number.isInteger(position) || !radios[position]) return;
      radios[position].checked = true;
      radios[position].dispatchEvent(new Event('change', { bubbles: true }));
    });

    const saved = OFFLINE.storage.get(QUIZ_KEY, null);
    if (saved && saved.winner && OFFLINE.quizResults[saved.winner]) {
      stage.replaceChildren(buildResultView(saved, { isRestored: true }));
      animateBars();
    } else {
      stage.replaceChildren(buildQuestion());
    }
  };

  $(function () {
    renderNextGathering();
    initQuiz();

    const nextCard = document.querySelector('#next-gathering');
    if (nextCard) {
      nextCard.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-plan-toggle]');
        if (!btn) return;
        const added = OFFLINE.plan.toggle(btn.dataset.planToggle);
        renderNextGathering();
        OFFLINE.toast(added ? 'Evening saved to your plan!' : 'Evening removed from your plan.');
      });
    }
  });
}(window.jQuery, window.OFFLINE));
