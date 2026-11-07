/* Toolkit page: dynamic supply checklist, live readiness calculation,
 * animated progress bar, dynamically generated custom guide download,
 * and a 4-panel interactive step gallery.
 * Data: OFFLINE.supplies (data/supplies.js). */
'use strict';

(function ($, OFFLINE) {
  const checklistContainer = document.querySelector('#supplies-checklist');
  const statText = document.querySelector('#supplies-stat');
  const timeText = document.querySelector('#supplies-time');
  const progressBar = document.querySelector('#supplies-progress-bar');
  const statusNote = document.querySelector('#supplies-status-note');

  const btnSelectRequired = document.querySelector('#btn-select-required');
  const btnClearSupplies = document.querySelector('#btn-clear-supplies');
  const btnDownloadKit = document.querySelector('#btn-download-kit');
  const downloadError = document.querySelector('#download-error');
  const btnPrintGuide = document.querySelector('#btn-print-guide');

  // Gallery elements
  const stepsContainer = document.querySelector('#gallery-steps');
  const panels = document.querySelectorAll('.step-panel');
  const counterEl = document.querySelector('#gallery-counter');
  const dotsContainer = document.querySelector('#gallery-dots');
  const btnPrev = document.querySelector('#btn-prev-panel');
  const btnNext = document.querySelector('#btn-next-panel');

  let currentPanelIndex = 0;
  let isGalleryBusy = false;

  /* ---------- Render Supplies Checklist with DOM ---------- */
  const renderSupplies = () => {
    checklistContainer.replaceChildren();

    OFFLINE.supplies.forEach((item) => {
      const inputId = `supply-${item.id}`;
      const input = OFFLINE.el('input', {
        class: 'form-check-input supply-checkbox',
        type: 'checkbox',
        id: inputId,
        'data-id': item.id,
      });

      // Default check the required ones for smooth onboarding
      if (item.required) {
        input.checked = true;
      }

      const label = OFFLINE.el('label', {
        class: 'form-check-label d-flex flex-column',
        for: inputId,
      }, [
        OFFLINE.el('span', { class: 'supply-name' }, [
          document.createTextNode(item.name),
          item.required ? OFFLINE.el('span', { class: 'badge-required ms-2', text: 'Required' }) : null,
        ]),
        OFFLINE.el('span', { class: 'supply-hint', text: `${item.hint} · ~${item.minutes} min` }),
      ]);

      const wrapper = OFFLINE.el('div', { class: 'form-check supply-item mb-2' }, [input, label]);
      checklistContainer.append(wrapper);
    });

    updateReadiness();
  };

  /* ---------- Calculate & Animate Readiness ---------- */
  const updateReadiness = () => {
    const checkboxes = checklistContainer.querySelectorAll('.supply-checkbox');
    const checked = [];

    checkboxes.forEach((cb) => {
      if (cb.checked) {
        const item = OFFLINE.supplies.find((s) => s.id === cb.dataset.id);
        if (item) checked.push(item);
      }
    });

    const total = OFFLINE.supplies.length;
    const requiredItems = OFFLINE.supplies.filter((s) => s.required);
    const missingRequired = requiredItems.filter((req) => !checked.some((c) => c.id === req.id));
    const totalMinutes = checked.reduce((sum, item) => sum + item.minutes, 0);

    // Percentage based on required (60%) and optional (40%)
    let pct = 0;
    if (requiredItems.length > 0) {
      const reqChecked = requiredItems.length - missingRequired.length;
      pct = Math.round((reqChecked / requiredItems.length) * 80 + ((checked.length - reqChecked) / (total - requiredItems.length || 1)) * 20);
    }
    pct = Math.min(100, Math.max(0, pct));

    statText.textContent = `${checked.length} of ${total} ready`;
    timeText.textContent = `${totalMinutes} min setup`;

    // jQuery animate progress bar width
    $(progressBar).stop(true, false).animate({ width: `${pct}%` }, OFFLINE.speed * 2);
    progressBar.parentElement.setAttribute('aria-valuenow', pct);

    // Status message
    if (checked.length === 0) {
      statusNote.textContent = 'Select your supplies below to prepare your space.';
      statusNote.className = 'supply-status-note';
    } else if (missingRequired.length > 0) {
      statusNote.textContent = `Missing ${missingRequired.length} required ${missingRequired.length === 1 ? 'item' : 'items'}: ${missingRequired.map((m) => m.name).join(', ')}.`;
      statusNote.className = 'supply-status-note is-warning';
    } else {
      statusNote.textContent = '✓ All essential supplies ready. You have everything for your 20-minute pause!';
      statusNote.className = 'supply-status-note is-ready';
    }

    if (checked.length > 0) {
      downloadError.hidden = true;
      downloadError.textContent = '';
    }
  };

  /* ---------- Dynamic Custom Guide Download ---------- */
  const downloadCustomGuide = () => {
    const checkboxes = checklistContainer.querySelectorAll('.supply-checkbox:checked');
    if (checkboxes.length === 0) {
      downloadError.textContent = 'Please check at least one supply item to generate your guide.';
      downloadError.hidden = false;
      downloadError.focus();
      return;
    }

    downloadError.hidden = true;
    downloadError.textContent = '';

    const selected = [];
    checkboxes.forEach((cb) => {
      const item = OFFLINE.supplies.find((s) => s.id === cb.dataset.id);
      if (item) selected.push(item);
    });

    const lines = [
      '==================================================',
      '           OFFLINE CLUB · FIELD KIT 01           ',
      '          The 20-Minute Four-Panel Pause         ',
      '==================================================',
      '',
      `Generated on: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      'Astana · Good company · No notifications',
      '',
      '--------------------------------------------------',
      'YOUR PREPARED SUPPLIES',
      '--------------------------------------------------',
    ];

    selected.forEach((item, idx) => {
      lines.push(` [✓] 0${idx + 1}. ${item.name} (${item.category}, ~${item.minutes} min)`);
      lines.push(`      Note: ${item.hint}`);
    });

    lines.push(
      '',
      '--------------------------------------------------',
      'THE FOUR-PANEL PAUSE (5 MINUTES EACH)',
      '--------------------------------------------------',
      'Take your sheet of paper. Fold it in half, then in half again.',
      'Unfold: you now have four clean panels. Set a timer for 20 mins.',
      '',
      'PANEL 01 / NOTICE (5 min)',
      'Choose an ordinary object near you (keys, mug, paperclip).',
      'Write down 5 subtle details: weight, temperature, scratches, shadows.',
      '',
      'PANEL 02 / DRAW (5 min)',
      'Keep your pen in contact with the paper without lifting.',
      'Draw the outline and interior contours in one continuous wandering line.',
      'Accurate likeness is completely optional; looking closely is the point.',
      '',
      'PANEL 03 / IMAGINE (5 min)',
      'Reinvent the object. What if this mug was a tiny stadium?',
      'What if this key was an ancient bird? Sketch or write its new life.',
      '',
      'PANEL 04 / KEEP (5 min)',
      'Write one honest sentence beginning with: "Today around the table, I noticed..."',
      'Sign and date the lower corner. Fold it up and carry it with you.',
      '',
      '==================================================',
      'Keep leaving room for the unexpected.',
      'https://xnionn.github.io/WEB-midterm/',
      '=================================================='
    );

    const content = lines.join('\r\n');
    OFFLINE.downloadText('OFFLINE-custom-field-kit.txt', content);
    OFFLINE.toast('Custom field kit guide downloaded!');
  };

  /* ---------- Interactive Gallery (Four-Panel Pause) ---------- */
  const initGallery = () => {
    // Generate dot indicators
    dotsContainer.replaceChildren();
    panels.forEach((_, idx) => {
      const dot = OFFLINE.el('button', {
        type: 'button',
        class: `gallery-dot ${idx === 0 ? 'active' : ''}`,
        'data-index': idx,
        'aria-label': `Go to panel ${idx + 1}`,
      });
      dotsContainer.append(dot);
    });

    showPanel(0, false);

    btnPrev.addEventListener('click', () => {
      const nextIdx = (currentPanelIndex - 1 + panels.length) % panels.length;
      showPanel(nextIdx, true);
    });

    btnNext.addEventListener('click', () => {
      const nextIdx = (currentPanelIndex + 1) % panels.length;
      showPanel(nextIdx, true);
    });

    dotsContainer.addEventListener('click', (e) => {
      const dot = e.target.closest('.gallery-dot');
      if (dot) {
        showPanel(Number(dot.dataset.index), true);
      }
    });

    // Keyboard navigation
    stepsContainer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        btnNext.click();
      } else if (e.key === 'ArrowLeft') {
        btnPrev.click();
      }
    });
  };

  const showPanel = (index, animate = true) => {
    if (isGalleryBusy && animate) return;
    isGalleryBusy = true;

    currentPanelIndex = index;
    counterEl.textContent = `Panel ${index + 1} of ${panels.length}`;

    // Update dots
    dotsContainer.querySelectorAll('.gallery-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === index);
      dot.setAttribute('aria-current', String(idx === index));
    });

    const activePanel = panels[index];

    if (!animate) {
      panels.forEach((p, idx) => {
        p.classList.toggle('active', idx === index);
      });
      isGalleryBusy = false;
      return;
    }

    // jQuery effect: smooth panel fade transition
    const $active = $(activePanel);
    const $others = $(panels).not($active);

    $others.stop(true, true).removeClass('active').hide();
    $active.stop(true, true).addClass('active').hide().fadeIn(OFFLINE.speed, () => {
      isGalleryBusy = false;
    });
  };

  /* ---------- Page Init ---------- */
  $(function () {
    renderSupplies();
    initGallery();

    checklistContainer.addEventListener('change', (e) => {
      if (e.target.classList.contains('supply-checkbox')) {
        updateReadiness();
      }
    });

    btnSelectRequired.addEventListener('click', () => {
      checklistContainer.querySelectorAll('.supply-checkbox').forEach((cb) => {
        const item = OFFLINE.supplies.find((s) => s.id === cb.dataset.id);
        if (item && item.required) cb.checked = true;
      });
      updateReadiness();
    });

    btnClearSupplies.addEventListener('click', () => {
      checklistContainer.querySelectorAll('.supply-checkbox').forEach((cb) => {
        cb.checked = false;
      });
      updateReadiness();
    });

    btnDownloadKit.addEventListener('click', downloadCustomGuide);

    btnPrintGuide.addEventListener('click', () => {
      window.print();
    });
  });
}(window.jQuery, window.OFFLINE));
