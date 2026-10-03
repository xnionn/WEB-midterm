# Assignment 3 — Responsive Web Design

**Student:** Alimzhan Almukhambetov

**Group:** IT-2510

**Course:** WEB Technologies 1 (Front End)

OFFLINE is a single-page guide to screen-free creative activities and student gatherings. This individual assignment adapts the OFFLINE Midterm concept and visual identity into a separate implementation of media queries and the Bootstrap grid. The runtime files are self-contained in this folder.

- [Source repository](https://github.com/xnionn/WEB-midterm)
- [Assignment source folder](https://github.com/xnionn/WEB-midterm/tree/main/assignment3)
- [Published page](https://xnionn.github.io/WEB-midterm/assignment3/)
- [Submission report](Assignment3_Alimzhan_Almukhambetov.pdf)

## Run

From this folder, run:

```powershell
python -m http.server 8003
```

Open `http://localhost:8003/`. The website has no build step or Python runtime dependency; the command only serves its static files. Opening `index.html` directly also works. An internet connection is needed for Bootstrap CSS and its JavaScript bundle, which are loaded from the required CDN.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Semantic page sections, Bootstrap layout and component markup |
| `style.css` | OFFLINE design tokens, custom styling and the manual responsive section |
| `script.js` | Small enhancements to the page interactions |
| `assets/` | Local fonts, their licenses and page assets |
| `evidence/` | Browser screenshots and verification results |
| `scripts/verify.py` | Development-only browser verification and screenshot capture |
| `scripts/build_report.py` | Reproducible PDF report generation |
| `DEFENSE.md` | Russian study guide, code explanations and practice changes |

## Tasks

1. **Manual media queries:** the repeated items in `#rituals` use custom classes and CSS Grid. The base layout has one column; `min-width: 48rem` and `min-width: 64rem` introduce two and three columns. At a 16px initial font size these are 768px and 1024px. The queries also change spacing, and the first enlarges the heading. There are no Bootstrap classes inside this section.
2. **Bootstrap:** `#hero`, `#gatherings` and `#guide` use its containers, rows, responsive columns, ordering, display and spacing utilities. The gathering cards use `col-12 col-md-6 col-lg-4`: one column by default, two from 768px, three from 992px. The hero's copy precedes its poster on a phone; `order-lg-*` reverses the visual order on larger screens. `#desktop-note` is hidden below 768px. The navbar collapses below 992px and the FAQ uses an accordion.
3. **Comparison:** the PDF compares the actual two implementations, with concrete examples of markup, breakpoints, design control and maintenance.

The report includes full-page captures at **375, 768 and 1280 CSS pixels**, readable task details, student information, a conclusion and the repository URL.

## Reproduce verification

Install the development dependency once:

```powershell
python -m pip install playwright
python -m playwright install chromium
```

Run from this folder:

```powershell
python scripts/verify.py
```

The local and published versions passed 97 checks each at 375, 767, 768, 991, 992, 1023, 1024 and 1280px on 3 October 2026. Results are in `evidence/verification.json` and `evidence/deployed/verification.json`; screenshots cover the three required report widths. The checks include the column counts, additional manual breakpoint changes, navbar/accordion interactions, keyboard focus, contrast, asset loading and page overflow.

To verify the deployed page without replacing the local report screenshots:

```powershell
python scripts/verify.py --base-url https://xnionn.github.io/WEB-midterm/assignment3/ --output evidence/deployed
```

To rebuild the report, install `scripts/requirements-report.txt`, then run `python scripts/build_report.py`. These development tools are not loaded by the public page.

## Credits and references

The OFFLINE name, paper/rust palette and local font assets are adapted from the team's Midterm project with the user's permission. The one-page assignment layout is implemented for this assignment; it is not a downloaded theme.

- [Bootstrap 5.3 documentation](https://getbootstrap.com/docs/5.3/getting-started/introduction/) and [grid documentation](https://getbootstrap.com/docs/5.3/layout/grid/). Bootstrap is MIT licensed.
- DM Sans and Space Grotesk are distributed under the SIL Open Font License; license texts accompany the font files.
- AI assistance was used for implementation, documentation and verification. The student must review the report, understand the submitted code and demonstrate changes independently at the defense.

Submit **`Assignment3_Alimzhan_Almukhambetov.pdf`**, and attend the individual defense. The source code is provided in the linked repository.
