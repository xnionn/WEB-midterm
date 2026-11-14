# OFFLINE Club — Screen-Free Creative Gatherings (Final Project)

A complete, responsive 6-page web platform created for **WEB Technologies 1 (Front End)**. OFFLINE is a student community project designed for screen-free creative evenings in Astana. The site encourages students to unwind, socialize, and explore hands-on creative activities without prior experience.

- **Published Website (GitHub Pages):** [https://xnionn.github.io/WEB-midterm/](https://xnionn.github.io/WEB-midterm/)
- **GitHub Repository:** [https://github.com/xnionn/WEB-midterm](https://github.com/xnionn/WEB-midterm)
- **Final Project Report (.docx):** `deliverables/Final_Alimzhan_Almukhambetov_Azamat_Bukharbaev_Dias_Shamel_Tamerlan_Aitpayev.docx`

---

## 1. Quick Start / Running Locally

The website runs directly on native web standards and does not require complex build steps or server dependencies:

1. **Option A (Static):** Open `index.html` directly in any modern browser.
2. **Option B (Recommended Local Server):** Run a local HTTP server to ensure consistent cross-origin `localStorage` and module handling:
   ```bash
   python -m http.server 8000
   ```
   Then navigate to `http://localhost:8000` in your web browser.

---

## 2. Page Directory & Interactive Features

| Page | File | Core Capabilities & Interactions |
|---|---|---|
| **Home** | `index.html` | Noticeboard hero illustration (`assets/images/hero-stamp.svg`), dynamic upcoming gathering card preview with countdown & "+ Save to my plan", and an interactive evening finder quiz that persists results in `localStorage`. |
| **Gatherings** | `gatherings.html` | 10-evening structured dataset rendered via DOM, multi-category filtering, live search, sorting by date and available seats, cross-page "+ Save to my plan" buttons, saved plan & seat reservations manager bar, semantic timetable, and an accessible seat reservation modal with real-time validation. |
| **The Club** | `about.html` | Club principles manifesto, 90-minute evening rhythm breakdown (`assets/images/club-table.svg`), interactive FAQ with real-time keyword search and Bootstrap accordion collapse, plus an accessible "Ask the club" inquiry form with persistent saved questions list. |
| **Field Notes** | `fieldnotes.html` | 9 creative editorial notebook entries (`assets/images/notebook-sketch.svg`), filterable by tag (including `★ Saved`) and reading time, expandable article drawers, persistent bookmarking with saved summary bar, and a "Write a note" visitor form with a live character counter. |
| **The Toolkit** | `toolkit.html` | 8 DIY creative supplies catalog (`assets/images/four-panel-fold.svg`), persistent interactive session readiness checklist with dynamic progress bar, printable four-panel creative activity guide, cross-page saved field notes display, and custom `.txt` guide download. |
| **Make a Plan** | `join.html` | Three-step interactive planner & member portal (`assets/images/pass-emblem.svg`): multi-event basket synced across pages with automated time-conflict detection, Sign Up & Log In forms with `localStorage` account verification, Member Profile & Guest Pass card, and multi-event `.ics` calendar export. |

---

## 3. Team Ownership and Responsibilities

The workload is evenly distributed across team members, balancing content creation, complex DOM generation, and interactive JavaScript functionality:

| Team Member | Primary Pages | Core Technical Contributions |
|---|---|---|
| **Alimzhan Almukhambetov** | `index.html`, `about.html` | Noticeboard hero, club principles, dynamic next-session card, persistent interactive quiz, live FAQ search & accordion, "Ask the club" validation & saved questions manager, shared navigation, and Light/Dark mode theme engine (`core.js`). |
| **Azamat Bukharbaev** | `gatherings.html` | 10-evening dataset (`data/gatherings.js`), DOM card generation, category filter buttons, seat/date sorting, cross-page plan toggle & saved bookings bar, responsive timetable, and booking modal form validation. |
| **Dias Shamel** | `fieldnotes.html`, `toolkit.html` | 9 editorial notes dataset (`data/notes.js`), 8 supplies dataset (`data/supplies.js`), expandable stories, cross-page bookmarking between Field Notes and Toolkit, persistent supplies checklist with animated progress bar, printable guide, and print CSS. |
| **Tamerlan Aitpayev** | `join.html` | Multi-step planner wizard, basket state management, interval time-conflict algorithm (`checkTimeConflict`), Sign Up & Log In authentication flows, Member Profile & Guest Pass card, `.ics` calendar generator (RFC 5545), and `localStorage` account persistence. |

---

## 4. Technical Architecture & Implementation Standards

### A. Folder Structure & Styling (`assets/css`, `assets/js`, `assets/images`)
- **Clear Asset Organization:**
  - `assets/css/`: Design tokens (`style.css`), secondary components (`secondary.css`), form controls (`forms.css`), and page-scoped stylesheets (`pages/*.css`).
  - `assets/js/`: Core utilities (`core.js`), form validator (`validation.js`), structured datasets (`data/*.js`), and page controllers (`pages/*.js`).
  - `assets/images/`: Original SVG illustrations (`hero-stamp.svg`, `club-table.svg`, `rhythm-clock.svg`, `notebook-sketch.svg`, `four-panel-fold.svg`, `pass-emblem.svg`).
- **Light & Dark Modes (`data-theme`):** Keyboard-accessible theme toggle (`#theme-toggle`) in the navbar of every page, persisted in `localStorage` (`offline-theme-v1`) and driven by CSS variables for full contrast in both modes.
- **Responsive Layouts:** Hand-crafted CSS Grid, Flexbox, custom media queries, and Bootstrap 5 grid audited across **375px** (Mobile), **768px** (Tablet), and **1280px** (Desktop) in both light and dark themes.

### B. JavaScript, `localStorage` & jQuery Engineering
- **Unified Global Namespace (`OFFLINE`):** Encapsulated in `assets/js/core.js` to provide shared utilities (`OFFLINE.theme`, `OFFLINE.plan`, `OFFLINE.bookmarks`, `OFFLINE.account`, `OFFLINE.storage`, `OFFLINE.toast`).
- **Saved User Data (`localStorage`):**
  - **Accounts:** Sign Up saves user profile JSON (`offline-accounts-v1`), Log In verifies credentials and redirects to Member Profile & Pass (`#pass-section`), navbar updates dynamically for logged-in members, and Log Out clears the active session (`offline-session-v1`).
  - **Saved Items:** Gatherings saved on Home/Gatherings appear in the navbar counter and on `join.html` with total hours; Field Notes bookmarked on `fieldnotes.html` appear on `toolkit.html` with total reading time. All saved lists support individual item removal and "Clear all".
- **Robust jQuery Effects:** Accordions (`slideDown`/`slideUp`), modal and drawer transitions (`fadeIn`/`fadeOut`), and progress bars (`.animate()`) use `.stop(true, true)` and respect `prefers-reduced-motion: reduce`.

