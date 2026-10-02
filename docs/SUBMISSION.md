# OFFLINE midterm submission

The website has six pages, enough for a team of up to four students. Every member still needs to build and understand at least one complete page and commit their own work to the shared repository. Do not list someone as the author of work they did not do.

The PDF in `deliverables/` is a draft until the real team, contributions, public links and reflection are supplied. The course requires both the repository URL and published website URL; a report without them receives zero.

1. Each student reviews, adapts and commits their own page. Keep a comparable contribution for every team member.
2. Upload all website source to one GitHub repository. Generated root HTML, `assets/`, `content/`, the build script, licenses and credits belong in the source.
3. Publish through GitHub Pages. In repository **Settings → Pages**, choose deployment from the `main` branch and `/ (root)` folder, or use the repository's Pages workflow if one is present.
4. Open the public URL and follow every navigation link. Confirm that CSS, local fonts, Bootstrap, images and JavaScript load beneath the repository path. Check 375, 768 and 1280 px again on the deployed version.
5. Copy `docs/report-metadata.example.json` to `docs/report-metadata.json` and fill it with real information. The group field is optional. Example schema:

```json
{
  "members": [
    {
      "full_name": "Actual Full Name",
      "contribution": "Pages actually built, styling and interactions actually completed"
    }
  ],
  "repository_url": "https://github.com/actual-owner/actual-repository",
  "deployed_url": "https://actual-owner.github.io/actual-repository/",
  "reflection": "Your own short conclusion about what you built and learned."
}
```

6. Install the report dependencies with `python -m pip install -r tools/requirements-report.txt`. Regenerate the report after the final screenshots and metadata: `python tools/build_report.py`. It produces `Midterm_Full_Name_....pdf` only when all metadata is present; otherwise it retains `DRAFT` in the filename.
7. Read the complete PDF. It contains all six pages at all three required widths. Submit the same PDF for every team member before the actual course deadline.
8. Every student attends the individual defense. Use `docs/defense-guide.md` to practice explaining the code and making changes independently.

Do not submit this Markdown checklist instead of the PDF. The required submission format is `.docx` or `.pdf`.

## Source and content credits

Space Grotesk, DM Sans and Bootstrap are bundled locally with license files. Source URLs and integrity hashes are in `assets/dependency-manifest.json`. The layout and vector artwork are original, with AI assistance in development and website copy. Review and understand the implementation before presenting it as your project. The footer exposes the same credits to website visitors.
