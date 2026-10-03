# OFFLINE Club

A six-page website for **WEB Technologies 1 (Front End), Midterm Project**. OFFLINE is a fictional student club for screen-free creative evenings in Astana. The audience is students who want to meet people without needing previous creative experience.

[Published website](https://xnionn.github.io/WEB-midterm/) · [GitHub repository](https://github.com/xnionn/WEB-midterm)

## Run the website

Open `index.html` in a browser, or run `python -m http.server 8000` from the repository and visit `http://localhost:8000`. A local server gives the planner a consistent browser-storage origin.

The delivered root HTML files are complete static pages. There is no application build, backend, registration service or payment system.

## Pages

| Page | Purpose | Distinct layout or interaction |
| --- | --- | --- |
| `index.html` | Introduce the club | Original noticeboard hero and print illustration |
| `gatherings.html` | Compare sample evenings | Category filter and semantic timetable |
| `about.html` | Explain the club | Manifesto, process and Bootstrap FAQ accordion |
| `fieldnotes.html` | Give creative ideas | Editorial notebook layout and expandable stories |
| `toolkit.html` | Try an activity at home | Printable four-panel guide and real text download |
| `join.html` | Make a personal event plan | Validated form, local save/edit/delete and calendar download |

## Team and page ownership

| Student | Complete pages | Main responsibilities |
| --- | --- | --- |
| Alimzhan Almukhambetov | Home, The club | Noticeboard hero, club story, Bootstrap FAQ, shared navigation and design integration |
| Azamat Bukharbaev | Gatherings | Event cards, category filters, Bootstrap timetable and responsive checks |
| Dias Shamel | Field notes, The toolkit | Editorial notes, Bootstrap checklist, activity download and print layout |
| Tamerlan Aitpayev | Make a plan | Form validation, local storage, saved-plan editing and calendar download |

The two interactive pages carry more JavaScript work, balancing the two-page content assignments. Each owner is responsible for the complete HTML, CSS, Bootstrap styling, responsiveness and relevant interactions of their pages. See [the detailed team plan](docs/team-responsibilities.md) and [individual defense exercises](docs/defense-guide.md).

The shared submission is the [team report PDF](deliverables/Midterm_Alimzhan_Almukhambetov_Azamat_Bukharbaev_Dias_Shamel_Tamerlan_Aitpayev.pdf).

## Editing

`content/*.html` contains each page’s `<main>`. The navigation and footer are shared in `tools/build_site.py`. After editing a fragment or the shared wrapper, run `python tools/build_site.py`. The script writes the six root HTML files; commit both the edited source and generated pages. Changes to CSS or JavaScript need no build.

`assets/css/style.css` defines the shared design tokens, layouts and media queries. `content/secondary.css` defines the club story, field notes and toolkit layouts. `assets/js/script.js` handles the filters and local planner. Bootstrap handles the mobile navigation and FAQ collapse controls. Fonts and Bootstrap are self-hosted.

The custom breakpoints complement Bootstrap's grid. The required widths are 375, 768 and 1280 pixels. Keyboard focus, a skip link, labels, table headers, reduced motion and descriptive illustration labels are included.

## Planner behavior

The form stores one nickname, gathering ID, party size and first-time preference under `offline-plan-v1` in the current browser's `localStorage`. It sends no requests. Invalid saved JSON is ignored. When storage is blocked, the plan still works for the current visit and states that it was not saved. “Delete this saved plan” removes it. A gathering link such as `join.html?session=print` selects that event.

The `.ics` calendar file uses UTC times corresponding to 18:30–20:00 in Astana (UTC+5). It is a tentative reminder for a fictional sample event, not a booking. Dates are intentionally fixed sample content.

## Verify

Install Python Playwright and Chromium if needed: `python -m pip install playwright`, then `python -m playwright install chromium`. Run `python tools/test_site.py`. The script starts its own temporary server, audits every page at each required width and creates the report screenshots. Verification outputs stay in `artifacts/` and are excluded from Git.

## Publish on GitHub Pages

1. Create one public repository and push this source to its `main` branch.
2. In the repository, open **Settings → Pages → Build and deployment**. Select **Deploy from a branch**, `main`, and `/ (root)`.
3. Wait for the deployment to finish. Open the deployed site and verify all six pages and local assets. Relative links work under a repository subpath.
4. Put the actual repository URL and deployed URL in the report. Every team member must commit their own contribution, submit the same report and defend their code.

Report identities, page ownership and project links are maintained in `docs/report-metadata.json`. Each student must complete and commit their own assigned work, submit the same report and attend the individual defense. See `docs/SUBMISSION.md` for the submission steps.
