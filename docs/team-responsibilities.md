# OFFLINE team responsibilities

Repository: <https://github.com/xnionn/WEB-midterm>

This document assigns the four students their implementation, review and defense responsibilities. Each student personally reviews, adapts, tests and commits their assigned work using their own account. The final contribution record reflects the work completed in the shared repository.

## Balanced page ownership

The rubric requires six pages for four students, with at least one complete page per person. The allocation below gives every page one primary owner. Workload is balanced by layout and interaction complexity: Gatherings and Make a plan each contain more application logic than a single editorial page.

| Student | Complete pages assigned | Implementation and review responsibilities |
| --- | --- | --- |
| Alimzhan Almukhambetov | `index.html`, `about.html` | Noticeboard hero, club manifesto, process section and Bootstrap FAQ; shared navigation/footer and design integration. |
| Azamat Bukharbaev | `gatherings.html` | Three illustrated gathering entries, category filters, accessible timetable, gathering-to-planner links and responsive checks. |
| Dias Shamel | `fieldnotes.html`, `toolkit.html` | Editorial feature and illustration, native expandable notes, activity checklist, downloadable text guide and print layout. |
| Tamerlan Aitpayev | `join.html` | Labelled form, validation, saved-plan summary, local storage, editing/deletion, query preselection and calendar reminders. |

All four students review the common navigation, colours, fonts and spacing on their own pages, and style and explain their own Bootstrap elements. Alimzhan coordinates shared changes.

## Source ownership and concrete features

| Student | Editable sources and generated pages | CSS to understand and maintain | Bootstrap and interaction ownership |
| --- | --- | --- | --- |
| Alimzhan | `content/index.html`, `content/about.html`; generated `index.html`, `about.html`; shared wrapper in `tools/build_site.py` | `assets/css/style.css`: design tokens, `.site-header`, `.nav-links`, `.home-hero`, `.hero-board`, `.next-gathering`, `.intro-grid`, `.site-footer`; `content/secondary.css`: `.about-intro`, `.manifesto-list`, `.hour-list`, `.about-faq` | About uses `row`, `col-lg-5`, `col-lg-7` and a customised `.accordion`. Explain `data-bs-toggle`, matching target IDs, `data-bs-parent` and expanded state. Shared navbar uses Bootstrap collapse; no custom FAQ JavaScript is needed. |
| Azamat | `content/gatherings.html`; generated `gatherings.html`; filter section at the start of `assets/js/script.js` | `assets/css/style.css`: `.gathering-tools`, `.session-filters`, `.filter-button`, `.session-grid`, `.session-card`, `.rhythm-grid`, `.rhythm-table` and their breakpoint rules | Timetable uses Bootstrap `.table`, restyled with `--bs-table-bg`, `--bs-table-color` and scoped cell rules. Filter logic owns `filterButtons`, `sessionCards`, `sessionCount`, `dataset.filter`, `hidden` and `aria-pressed`. |
| Dias | `content/fieldnotes.html`, `content/toolkit.html`; generated `fieldnotes.html`, `toolkit.html`; `assets/print-guide.txt`; print-button binding in `assets/js/script.js` | `content/secondary.css`: `.journal-heading`, `.journal-feature`, `.journal-art`, `.journal-note`, `.toolkit-intro`, `.material-list`, `.printable-kit`, `.kit-steps`, `@media print` | Own the Toolkit Bootstrap `.form-check`, `.form-check-input` and `.form-check-label` checklist and its scoped styling, including checked state and keyboard focus. Notes use native `details`/`summary`; the print handler calls `window.print()`, and the text download uses an actual local file. |
| Tamerlan | `content/join.html`; generated `join.html`; planner section of `assets/js/script.js` | `assets/css/style.css`: `.planner-layout`, `.planner-form`, `.form-control`, `.form-select`, `.form-check-input`, `.saved-plan`, `.plan-data`, `.plan-actions` and their breakpoint rules | Form uses Bootstrap `row`, `col-md-8`, `col-md-4`, `.form-control`, `.form-select` and `.form-check`. JavaScript owns `sessions`, `readPlan`, `fillForm`, `showPlan`, submit/edit/clear handlers, `URLSearchParams`, `Blob` and calendar download. |

Shared files contain features assigned to more than one member. Coordinate edits to `assets/js/script.js`, `assets/css/style.css` and `content/secondary.css`; stage only the changes you actually made. Do not edit third-party minified files to customise Bootstrap.

## Required personal checks

Each owner checks their complete pages at **375 px, 768 px and 1280 px**, including the mobile menu, all links, visible keyboard focus and absence of horizontal scrolling. Automated artifacts record the website checks; individual practice prepares each owner for the defense.

| Owner | Additional checks |
| --- | --- |
| Alimzhan | Hero text and artwork remain readable; every navigation destination works; FAQ opens the intended panel; accordion IDs are unique; process content matches the gathering concept. |
| Azamat | Each category shows the intended entries; exactly one filter reports `aria-pressed="true"`; live count matches visible entries; table caption and header scopes remain meaningful; each gathering selects the corresponding planner option. |
| Dias | Notes work with keyboard and without JavaScript; checklist labels toggle their controls; checked styles remain legible; downloaded text matches the on-page activity; print preview contains the guide without decorative navigation. |
| Tamerlan | Reject empty/whitespace names and people counts outside 1–4; require a gathering and acknowledgement; save/reload/edit/delete; handle invalid stored data and denied storage; verify all calendar dates and times. |

Run `python tools/build_site.py` after changing a content fragment or wrapper. Run `python tools/test_site.py` after a meaningful final change; it checks the required widths and visitor interactions. If final content changes, regenerate screenshots and the report. See `docs/defense-guide.md` for each student's explanation and change exercises.

## Own-account commits in the shared repository

Each student uses a separate clone and their own GitHub login. The repository owner gives collaborators access if they will push branches directly.

1. Clone `https://github.com/xnionn/WEB-midterm.git` and open that clone as your working folder.
2. Configure the clone's Git author name as your actual full name and its email as your verified GitHub email or GitHub-provided noreply address. Use local repository configuration, not another student's credentials.
3. Create a branch for your responsibility, for example `alimzhan/home-club`, `azamat/gatherings`, `dias/notes-toolkit` or `tamerlan/planner`.
4. Read your sources and complete the page changes you can explain at the defense.
5. Build if needed, inspect your own pages at all three widths and check the relevant interactions. Review `git diff` before staging.
6. Stage your page fragments, corresponding generated HTML and actual CSS/JavaScript changes. For shared files, use `git add -p` to select your own changes rather than claiming another member's edits.
7. Commit with an accurate message, push using your own account and open a pull request to the same repository. Another member reviews navigation, style and responsiveness before merging. Resolve shared-file conflicts together.
8. Check that GitHub attributes the commit to you. Preserve that history. In the report, record the resulting work and, where useful, link to the actual commit or pull request.

After merging, all members review the published site. Every student submits the same final PDF or DOCX before the real deadline and attends the individual defense. Confirm that the report contains the actual repository and deployed website URLs.

## Короткая инструкция для команды

- **Alimzhan:** главная страница и About, общий стиль, навигация, FAQ на Bootstrap.
- **Azamat:** Gatherings, фильтры, таблица расписания, адаптивность страницы.
- **Dias:** Field notes и Toolkit, раскрывающиеся заметки, чек-лист Bootstrap, скачивание и печать инструкции.
- **Tamerlan:** Make a plan, форма, валидация, localStorage, редактирование/удаление и календарь.

Каждый изучает и дорабатывает свои страницы, проверяет их на 375/768/1280 px и делает собственные коммиты. На защите нужно самостоятельно объяснить код и внести небольшое изменение. Итоговый отчёт отражает фактический вклад каждого.
