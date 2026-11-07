# OFFLINE Club — Screen-Free Creative Gatherings

A complete, responsive multi-page web platform created for **WEB Technologies 1 (Front End)**. OFFLINE is a student community project designed for screen-free creative evenings in Astana. The site encourages students to unwind, socialize, and explore hands-on creative activities without prior experience.

- **Published Website (GitHub Pages):** [https://xnionn.github.io/WEB-midterm/](https://xnionn.github.io/WEB-midterm/)
- **GitHub Repository:** [https://github.com/xnionn/WEB-midterm](https://github.com/xnionn/WEB-midterm)
- **Shared Project Report:** [deliverables/Midterm_Alimzhan_Almukhambetov_Azamat_Bukharbaev_Dias_Shamel_Tamerlan_Aitpayev.pdf](deliverables/Midterm_Alimzhan_Almukhambetov_Azamat_Bukharbaev_Dias_Shamel_Tamerlan_Aitpayev.pdf)

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
| **Home** | `index.html` | Noticeboard hero illustration, dynamic upcoming gathering card preview with countdown, and an interactive quiz matching visitors to an evening. |
| **Gatherings** | `gatherings.html` | 10-evening structured dataset rendered via DOM, multi-category filtering, live search, sorting by date and available seats, semantic timetable, and an accessible seat reservation modal with real-time validation. |
| **The Club** | `about.html` | Club principles manifesto, 90-minute evening rhythm breakdown, interactive FAQ with real-time keyword search and Bootstrap accordion collapse, plus an accessible "Ask the club" inquiry form. |
| **Field Notes** | `fieldnotes.html` | 10 creative editorial notebook entries, filterable by tag and reading time, expandable article drawers, persistent bookmarking with bounce animation, and a "Write a note" visitor form with a live character counter. |
| **The Toolkit** | `toolkit.html` | 9 DIY creative supplies catalog, interactive session readiness checklist with dynamic progress bar, printable four-panel creative activity guide, text guide download, and print styles. |
| **Make a Plan** | `join.html` | Two-step interactive planner wizard: multi-event basket selection with automated time-conflict detection, comprehensive validated pass form with real-time password strength meter, persistent guest pass card, and multi-event `.ics` calendar export. |

---

## 3. Team Ownership and Responsibilities

The workload is evenly distributed across team members, balancing content creation, complex DOM generation, and interactive JavaScript functionality:

| Team Member | Primary Pages | Core Technical Contributions |
|---|---|---|
| **Alimzhan Almukhambetov** | `index.html`, `about.html` | Noticeboard hero, club principles, dynamic next-session card, interactive quiz, live FAQ search and accordion, "Ask the club" validation, shared navigation and layout foundations. |
| **Azamat Bukharbaev** | `gatherings.html` | 10-evening dataset (`data/gatherings.js`), DOM card generation, category filter buttons, seat/date sorting, live seat counter, responsive timetable, and booking modal form validation. |
| **Dias Shamel** | `fieldnotes.html`, `toolkit.html` | 10 editorial notes dataset (`data/notes.js`), 9 supplies dataset (`data/supplies.js`), expandable stories, bookmarking with bounce feedback, checklist with animated progress bar, printable guide and print CSS. |
| **Tamerlan Aitpayev** | `join.html` | Multi-step planner wizard, basket state management, interval time-conflict algorithm (`checkTimeConflict`), password strength calculation, guest pass generation, `.ics` calendar generator (RFC 5545), and localStorage resilience. |

---

## 4. Technical Architecture & Implementation Standards

### A. Styling & Design System
- **Pure Self-Hosted Assets:** Self-hosted variable typography (`Space Grotesk` and `DM Sans`) and vendor libraries (Bootstrap 5.3.3 and jQuery 3.7.1) for complete offline reliability and zero external CDN dependencies.
- **Modular Stylesheets:** Located in `assets/css/`:
  - `style.css`: Design tokens (CSS custom properties), typography, global grid, buttons, toasts, and navigation.
  - `secondary.css`: Manifesto posters, hour lists, editorial cards, and print styles.
  - `forms.css`: Standardized validation states (`aria-invalid`, custom error labels, password strength meters).
  - `pages/*.css`: Page-specific scoped styles.
- **Responsive Layouts:** Hand-crafted CSS Grid and Flexbox layouts audited across standard viewport widths: **375px** (Mobile), **768px** (Tablet), and **1280px** (Desktop).

### B. JavaScript & jQuery Engineering
- **Unified Global Namespace (`OFFLINE`):** Encapsulated in `assets/js/core.js` to eliminate global namespace pollution and provide shared utilities (date parsing, AST UTC+5 conversions, safe storage, toast notifications).
- **DOM-Driven Rendering:** All card grids and lists are rendered dynamically from pure JS datasets (`assets/js/data/*.js`) rather than hardcoded in HTML markup.
- **Defensive Storage (`OFFLINE.storage`):** `localStorage` calls are wrapped in defensive `try/catch` handlers, ensuring full functionality and in-memory fallback even in Private Browsing mode or when storage is restricted.
- **Robust jQuery Effects:** Accordions, modal overlays, fading step transitions, and toast alerts leverage `.stop(true, true)` to ensure that rapid user interactions never break the animation queue.
- **Accessibility & Motion Preference:** Full support for `prefers-reduced-motion: reduce`, automatically suppressing or instantaneous-snapping animations for users sensitive to motion.

### C. Validation & Accessibility (A11y)
- **Accessible Validation (`assets/js/validation.js`):** In-place validation beneath each field with `aria-invalid` and `role="alert"`. No disruptive browser `alert()` popups.
- **Semantic Heading Hierarchy:** Clean semantic structure from `<h1>` to `<h3>` without skipping levels across all six pages.
- **Keyboard & Screen Reader Support:** Skip links (`#main-content`), ARIA step tracking (`aria-current="step"`), descriptive button labels, and visible `:focus-visible` styling.

---

## 5. Deployment on GitHub Pages

1. Ensure all changes are committed and pushed to the `main` branch:
   ```bash
   git push origin main
   ```
2. In the GitHub repository settings:
   - Navigate to **Settings → Pages**.
   - Under **Build and deployment → Source**, choose **Deploy from a branch**.
   - Select branch `main` and folder `/ (root)`.
3. GitHub Pages will build and deploy the root static files automatically.
