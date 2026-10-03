# OFFLINE midterm submission

The completed report is `deliverables/Midterm_Alimzhan_Almukhambetov_Azamat_Bukharbaev_Dias_Shamel_Tamerlan_Aitpayev.pdf`. It includes the four team members, assigned page responsibilities, topic and style rationale, implementation, conclusion, credits and all six pages at 375, 768 and 1280 px.

- Repository: [xnionn/WEB-midterm](https://github.com/xnionn/WEB-midterm)
- Published website: [OFFLINE Club](https://xnionn.github.io/WEB-midterm/)

Both links were verified on 3 October 2026. The six live pages and their local assets returned successfully and matched the website source. Browser audits of both the local and published website passed all 18 page/width combinations and 21 visitor checks.

## Page ownership and responsibilities

| Team member | Complete pages | Additional responsibility |
| --- | --- | --- |
| Alimzhan Almukhambetov | Home and The club | Shared navigation, footer, typography and design integration |
| Azamat Bukharbaev | Gatherings | Timetable, filters and responsive checks across the website |
| Dias Shamel | Field notes and The toolkit | Expandable notes, Bootstrap supplies checklist, print/download and content credits |
| Tamerlan Aitpayev | Make a plan | Validation, local storage, calendar download and interaction checks |

The 2/1/2/1 page split balances page count with the deeper filter/timetable and planner work. Each page owner is responsible for its semantic HTML, responsive styling, applicable Bootstrap components and defense explanation. Each student is responsible for completing, testing and committing their assigned pages under their own GitHub account.

## Before submission

1. Each student reviews, adapts and understands their assigned pages, and commits their own work through their own account in the shared repository. Keep actual contribution records accurate.
2. Read the complete PDF and check the four names and responsibility table. If any allocation changes, update `docs/report-metadata.json` and regenerate the report.
3. Open both public links and follow the navigation before submitting. Website changes should be published and checked again at the three required widths.
4. Every team member submits the same PDF before the actual course deadline and attends the individual defense. Use `docs/defense-guide.md` to practice explanations and small changes without assistance.

The required report format is `.docx` or `.pdf`; do not submit this Markdown checklist in its place.

## Regenerate the report

Install the PDF dependencies with `python -m pip install -r tools/requirements-report.txt`. After final website changes, run `python tools/test_site.py` to refresh the local checks and screenshots, or retain a verified hosted screenshot set in `artifacts/deployed/screenshots`. Then run:

```powershell
python tools/build_report.py --screenshots artifacts/deployed/screenshots
```

The generator reads the names, page ownership, project links and conclusion from `docs/report-metadata.json`. It uses the full team names in the filename. A live URL is treated as verified only when `deployment_verified` is true; update that field after checking the actual public website. Rendered page images are kept under `tmp/report-qa` for visual review.

## Source and content credits

Space Grotesk, DM Sans and Bootstrap are bundled locally with license files. Source URLs and integrity hashes are in `assets/dependency-manifest.json`. The layout and vector artwork are original, with AI assistance in development and website copy. Review and understand the implementation before presenting it as your project. The footer exposes the same credits to website visitors.
