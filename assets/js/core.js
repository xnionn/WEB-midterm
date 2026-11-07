/* Shared helpers and site-wide jQuery effects.
 * Every page loads this file after jQuery and before validation.js, the data files and its own page script.
 * All shared code lives on one namespace, OFFLINE, so page scripts stay small and never clash. */
'use strict';

window.OFFLINE = window.OFFLINE || {};

(function ($, OFFLINE) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // jQuery animation length in ms; 0 for visitors who asked for less motion.
  OFFLINE.speed = reducedMotion ? 0 : 220;

  /* ---------- Safe localStorage (can be blocked in private mode) ---------- */
  OFFLINE.storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };

  /* ---------- Small helpers ---------- */
  // Build a DOM element: OFFLINE.el('p', { class: 'tag', text: 'Hi' }, [child, 'text'])
  OFFLINE.el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([name, value]) => {
      if (value === false || value === null || value === undefined) return;
      if (name === 'text') node.textContent = value;
      else if (name === 'html') node.innerHTML = value; // only used with trusted, built-in markup
      else node.setAttribute(name, value === true ? '' : value);
    });
    [].concat(children).forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  };

  OFFLINE.plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

  OFFLINE.debounce = (fn, wait = 200) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  // Escape a user string before it is used inside a RegExp (for search highlighting).
  OFFLINE.escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // 'YYYY-MM-DD' -> local Date at noon (avoids time-zone day shifts).
  OFFLINE.parseDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 12);
  };
  OFFLINE.toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  OFFLINE.formatDate = (iso, { short = false } = {}) => {
    const date = OFFLINE.parseDate(iso);
    const day = short ? DAYS[date.getDay()].slice(0, 3) : DAYS[date.getDay()];
    const month = short ? MONTHS[date.getMonth()].slice(0, 3) : MONTHS[date.getMonth()];
    return `${day} ${date.getDate()} ${month}`;
  };
  // Whole days from today (local midnight) to an ISO date; negative when in the past.
  OFFLINE.daysUntil = (iso) => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const target = OFFLINE.parseDate(iso);
    const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return Math.round((end - start) / 86400000);
  };
  // Astana is UTC+5 all year. 'YYYY-MM-DD' + 'HH:MM' -> '20261016T133000Z' for .ics files.
  OFFLINE.toUtcStamp = (iso, time) => {
    const [y, m, d] = iso.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    return new Date(Date.UTC(y, m - 1, d, hh - 5, mm)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  OFFLINE.minutesBetween = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  // Trigger a real file download from text created in the browser.
  OFFLINE.downloadText = (filename, text, type = 'text/plain') => {
    const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    const link = OFFLINE.el('a', { href: url, download: filename });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ---------- Category illustrations (original vector art) ---------- */
  const ART = {
    make: '<div class="print-art"><svg viewBox="0 0 230 245" aria-hidden="true"><path d="M12 224V130A103 103 0 0 1 218 130v94Z" fill="#f45d32"/><path d="M115 41v170M38 130h154M57 72l116 116M57 188 173 72" stroke="#f5f2e9" stroke-width="14"/><circle cx="115" cy="130" r="35" fill="#f45d32"/></svg></div>',
    play: '<svg class="dice-art" viewBox="0 0 250 210" aria-hidden="true"><g transform="translate(15 55) rotate(-13 70 70)"><rect width="130" height="130" rx="16" fill="#f5f2e9" stroke="#24251f" stroke-width="2"/><g fill="#f45d32"><circle cx="35" cy="35" r="10"/><circle cx="95" cy="35" r="10"/><circle cx="65" cy="65" r="10"/><circle cx="35" cy="95" r="10"/><circle cx="95" cy="95" r="10"/></g></g><g transform="translate(131 13) rotate(14 50 50)"><rect width="96" height="96" rx="13" fill="#24251f"/><circle cx="26" cy="26" r="8" fill="#f5f2e9"/><circle cx="70" cy="70" r="8" fill="#f5f2e9"/></g></svg>',
    slow: '<svg viewBox="0 0 250 230" fill="none" aria-hidden="true"><path d="M19 126 101 141v65l-82-17zm82 15 130-17v66l-130 16" fill="#f5f2e9" stroke="#24251f" stroke-width="2"/><path d="m34 143 52 9m-52 6 47 9m40-13 87-12m-87 25 65-9" stroke="#24251f" stroke-width="2"/><path d="M82 47h78v43c0 47-78 47-78 0Z" fill="#f45d32" stroke="#24251f" stroke-width="2"/><path d="M160 58h9c34 0 34 34 0 34h-9M99 9c-13 14 12 16 0 30M120 8c-13 14 12 16 0 30M141 9c-13 14 12 16 0 30" stroke="#24251f" stroke-width="2"/></svg>',
  };
  const ART_LABEL = {
    make: 'An orange sun block print',
    play: 'Two illustrated dice on a tabletop',
    slow: 'A line drawing of a warm mug and an open sketchbook',
  };
  // Returns a ready-to-insert .session-art element for a category ('make' | 'play' | 'slow').
  OFFLINE.categoryArt = (category) => OFFLINE.el('div', {
    class: `session-art ${category === 'play' ? 'game-art' : category === 'slow' ? 'slow-art' : ''}`.trim(),
    role: 'img',
    'aria-label': ART_LABEL[category] || ART_LABEL.make,
    html: ART[category] || ART.make,
  });

  /* ---------- Toast: one short message after an action (jQuery slideDown / slideUp) ---------- */
  OFFLINE.toast = (message, { duration = 3600 } = {}) => {
    let $toast = $('#site-toast');
    if (!$toast.length) {
      $toast = $('<div id="site-toast" class="site-toast" role="status" aria-live="polite" hidden></div>').appendTo('body');
    }
    // stop(true, true) finishes a running animation so quick repeated actions never stack.
    $toast.stop(true, true).text(message).prop('hidden', false).hide().slideDown(OFFLINE.speed)
      .delay(duration).slideUp(OFFLINE.speed);
  };

  /* ---------- Site-wide jQuery effects ---------- */
  $(function () {
    // 1. Smooth scroll for in-page anchors (skip link included). Focus moves with the scroll.
    $(document).on('click', 'a[href^="#"]:not([href="#"])', function (event) {
      const target = $(this.hash);
      if (!target.length) return;
      event.preventDefault();
      $('html, body').stop(true).animate({ scrollTop: target.offset().top - 16 }, reducedMotion ? 0 : 450, () => {
        target.attr('tabindex', target.attr('tabindex') || '-1').trigger('focus');
        if (history.replaceState) history.replaceState(null, '', this.hash);
      });
    });

    // 2. Back-to-top button fades in after the visitor has scrolled down.
    const $top = $('<button type="button" class="back-to-top" aria-label="Back to top" hidden><span aria-hidden="true">↑</span></button>').appendTo('body');
    $top.on('click', () => $('html, body').stop(true).animate({ scrollTop: 0 }, reducedMotion ? 0 : 450));
    let topVisible = false;
    $(window).on('scroll', OFFLINE.debounce(() => {
      const show = $(window).scrollTop() > 600;
      if (show === topVisible) return;
      topVisible = show;
      if (show) $top.stop(true, true).prop('hidden', false).hide().fadeIn(OFFLINE.speed);
      else $top.stop(true, true).fadeOut(OFFLINE.speed, () => $top.prop('hidden', true));
    }, 60));

    // 3. Elements marked data-reveal fade and rise into view the first time they are seen.
    const $reveal = $('[data-reveal]');
    if ($reveal.length && 'IntersectionObserver' in window && !reducedMotion) {
      $reveal.addClass('is-waiting');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          $(entry.target).removeClass('is-waiting').addClass('is-revealed');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.15 });
      $reveal.each((_, node) => observer.observe(node));
    }
  });
}(window.jQuery, window.OFFLINE));

