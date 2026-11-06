/* Shared form validation. Replaces the browser's own pop-up bubbles with messages under each field.
 *
 * Usage on a page:
 *   OFFLINE.initForm('#my-form', {
 *     name:  [OFFLINE.rules.required('Please enter your name.'), OFFLINE.rules.minLength(2)],
 *     email: [OFFLINE.rules.required(), OFFLINE.rules.email()],
 *   }, (values, form) => { ...save values...; return 'Thanks! We saved it.'; });
 *
 * A rule is a function (value, context) that returns an error message, or '' when the value is fine.
 * Rules other than `required` ignore empty values, so every field reports only one problem at a time. */
'use strict';

(function ($, OFFLINE) {
  const rules = {
    required: (message = 'This field is required.') => (value) => (
      (typeof value === 'boolean' ? value : String(value).trim() !== '') ? '' : message
    ),
    checked: (message = 'Please tick this box to continue.') => (value) => (value === true ? '' : message),
    minLength: (min, message) => (value) => (
      !value || String(value).trim().length >= min ? '' : (message || `Use at least ${min} characters.`)
    ),
    maxLength: (max, message) => (value) => (
      !value || String(value).trim().length <= max ? '' : (message || `Use at most ${max} characters.`)
    ),
    email: (message = 'Enter an email like name@example.com.') => (value) => (
      !value || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim()) ? '' : message
    ),
    // 10–12 digits, optional leading +, spaces, dashes and brackets allowed: +7 701 123 45 67
    phone: (message = 'Enter a phone number like +7 701 123 45 67.') => (value) => {
      if (!value) return '';
      const text = String(value).trim();
      const digits = text.replace(/\D/g, '');
      return /^\+?[\d\s()-]+$/.test(text) && digits.length >= 10 && digits.length <= 12 ? '' : message;
    },
    pattern: (regex, message = 'This value is not in the expected format.') => (value) => (
      !value || regex.test(String(value).trim()) ? '' : message
    ),
    // Letters, spaces, dashes and apostrophes: names in any alphabet.
    personName: (message = 'Use letters only: no numbers or symbols.') => (value) => (
      !value || /^[\p{L}][\p{L}\s'’.-]*$/u.test(String(value).trim()) ? '' : message
    ),
    // At least 8 characters, with a letter and a number. Optionally a capital letter.
    password: ({ min = 8, capital = false } = {}) => (value) => {
      if (!value) return '';
      if (value.length < min) return `Use at least ${min} characters.`;
      if (!/[A-Za-z\p{L}]/u.test(value) || !/\d/.test(value)) return 'Mix letters and numbers.';
      if (capital && !/\p{Lu}/u.test(value)) return 'Add at least one capital letter.';
      return '';
    },
    // Must equal another field in the same form: rules.matches('password', 'Passwords do not match.')
    matches: (otherName, message = 'These values do not match.') => (value, context) => (
      !value || value === context.values[otherName] ? '' : message
    ),
    integer: (message = 'Enter a whole number.') => (value) => (
      !value || /^-?\d+$/.test(String(value).trim()) ? '' : message
    ),
    range: (min, max, message) => (value) => {
      if (value === '' || value === null || value === undefined) return '';
      const number = Number(value);
      if (Number.isNaN(number)) return 'Enter a number.';
      return number >= min && number <= max ? '' : (message || `Enter a number from ${min} to ${max}.`);
    },
    // Date input value 'YYYY-MM-DD' that is today or later (and optionally within `maxDays`).
    futureDate: ({ maxDays = 365, message } = {}) => (value) => {
      if (!value) return '';
      if (Number.isNaN(Date.parse(value))) return 'Enter a valid date.';
      const days = OFFLINE.daysUntil(value);
      if (days < 0) return message || 'Pick today or a later date.';
      if (days > maxDays) return `Pick a date within the next ${maxDays} days.`;
      return '';
    },
    // Wrap any function that returns true/false: rules.custom((v) => v !== 'x', 'Not allowed.')
    custom: (test, message) => (value, context) => (!value || test(value, context) ? '' : message),
  };
  OFFLINE.rules = rules;

  /* ---------- Reading and marking fields ---------- */
  const fieldsByName = (form, name) => Array.from(form.elements).filter((el) => el.name === name);

  const readValue = (form, name) => {
    const fields = fieldsByName(form, name);
    if (!fields.length) return '';
    const first = fields[0];
    if (first.type === 'checkbox') return first.checked;
    if (first.type === 'radio') return (fields.find((el) => el.checked) || {}).value || '';
    return first.value;
  };

  const readValues = (form, schema) => {
    const values = {};
    Object.keys(schema).forEach((name) => { values[name] = readValue(form, name); });
    return values;
  };

  // The element that holds the control, its label and its error message.
  const wrapperOf = (field) => field.closest('.form-field, fieldset, .form-check') || field.parentElement;

  const errorBoxOf = (form, name) => {
    const field = fieldsByName(form, name)[0];
    const wrapper = field.type === 'radio' ? (field.closest('fieldset') || wrapperOf(field)) : wrapperOf(field);
    let box = wrapper.querySelector(':scope > .field-error');
    if (!box) {
      box = OFFLINE.el('p', { class: 'field-error', id: `${form.id || 'form'}-${name}-error`, hidden: true });
      wrapper.append(box);
    }
    return { field, wrapper, box };
  };

  const showError = (form, name, message) => {
    const { wrapper, box } = errorBoxOf(form, name);
    fieldsByName(form, name).forEach((el) => {
      el.classList.add('is-invalid');
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', [...new Set([...(el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean), box.id])].join(' '));
    });
    wrapper.classList.add('has-error');
    box.textContent = message;
    box.hidden = false;
  };

  const clearError = (form, name) => {
    const { wrapper, box } = errorBoxOf(form, name);
    fieldsByName(form, name).forEach((el) => {
      el.classList.remove('is-invalid');
      el.removeAttribute('aria-invalid');
    });
    wrapper.classList.remove('has-error');
    box.hidden = true;
    box.textContent = '';
  };

  // First failing rule wins, so each field shows one clear message.
  const checkField = (form, schema, name) => {
    const values = readValues(form, schema);
    const context = { values, form };
    for (const rule of schema[name]) {
      const message = rule(values[name], context);
      if (message) return message;
    }
    return '';
  };

  const clearSuccess = (form) => {
    $(form).find('.form-success').stop(true, true).slideUp(OFFLINE.speed, function () { $(this).prop('hidden', true); });
  };

  const showSuccess = (form, message) => {
    let box = form.querySelector('.form-success');
    if (!box) {
      box = OFFLINE.el('p', { class: 'form-success', role: 'status', hidden: true });
      form.append(box);
    }
    // jQuery: the confirmation slides in under the form. stop(true, true) keeps double submits from stacking.
    $(box).stop(true, true).text(message).prop('hidden', false).hide().slideDown(OFFLINE.speed);
  };

  /* ---------- Public API ---------- */
  OFFLINE.clearFormErrors = (form, schema) => {
    Object.keys(schema).forEach((name) => clearError(form, name));
  };

  // Validate the whole form, show every error, focus the first one. Returns the values or null.
  OFFLINE.validateForm = (form, schema) => {
    const values = readValues(form, schema);
    let firstInvalid = null;
    Object.keys(schema).forEach((name) => {
      const message = checkField(form, schema, name);
      if (message) {
        showError(form, name, message);
        firstInvalid = firstInvalid || fieldsByName(form, name)[0];
      } else {
        clearError(form, name);
      }
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return null;
    }
    return values;
  };

  // Wire a form: no browser bubbles, errors under fields, live correction, success message and reset.
  // `onValid(values, form)` may return a success message string; return false to stop (and show your own errors).
  OFFLINE.initForm = (target, schema, onValid) => {
    const form = typeof target === 'string' ? document.querySelector(target) : target;
    if (!form) return null;
    form.noValidate = true;
    const names = Object.keys(schema);

    const revalidate = (name) => {
      const message = checkField(form, schema, name);
      if (message) showError(form, name, message);
      else clearError(form, name);
    };

    names.forEach((name) => {
      fieldsByName(form, name).forEach((el) => {
        // An error disappears as soon as the value is corrected.
        el.addEventListener('input', () => {
          clearSuccess(form);
          if (el.classList.contains('is-invalid')) revalidate(name);
        });
        el.addEventListener('change', () => {
          clearSuccess(form);
          if (el.classList.contains('is-invalid')) revalidate(name);
        });
        // Leaving a field that has text checks it. Empty fields stay quiet until submit.
        el.addEventListener('blur', () => {
          if (readValue(form, name) !== '' && readValue(form, name) !== false) revalidate(name);
        });
        // Fields that other fields depend on (password confirm) are re-checked together.
        if (name === 'password' && schema.confirm) {
          el.addEventListener('input', () => { if (readValue(form, 'confirm')) revalidate('confirm'); });
        }
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = OFFLINE.validateForm(form, schema);
      if (!values) return;
      const result = onValid(values, form);
      if (result === false) return;
      form.reset();
      OFFLINE.clearFormErrors(form, schema);
      if (typeof result === 'string') showSuccess(form, result);
    });

    form.addEventListener('reset', () => OFFLINE.clearFormErrors(form, schema));
    return form;
  };

  OFFLINE.showFormError = showError;
  OFFLINE.clearFormError = clearError;
  OFFLINE.showFormSuccess = showSuccess;
}(window.jQuery, window.OFFLINE));

