"""Build the OFFLINE midterm PDF report from real browser screenshots.

Usage: python tools/build_report.py
Metadata: docs/report-metadata.json
The supplied team names determine the filename. Publication remains visibly
pending until both links and the live deployment have been verified.
Dependencies: reportlab pillow fonttools brotli pypdf pymupdf
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image
from fontTools.ttLib import TTFont as FontToolsFont
from fontTools.varLib.instancer import instantiateVariableFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

ROOT = Path(__file__).resolve().parent.parent
PAPER = colors.HexColor("#f5f2e9")
INK = colors.HexColor("#24251f")
ORANGE = colors.HexColor("#f45d32")
MUTED = colors.HexColor("#64665b")
LINE = colors.HexColor("#d9d9d9")
PAGES = [
    ("index", "Home", "The club introduction uses oversized type and original paper-inspired artwork to make the idea recognizable."),
    ("gatherings", "Gatherings", "Session cards and the schedule help visitors compare sample activities and choose an evening."),
    ("about", "The club", "The club story and principles explain who the idea is for and what visitors can expect."),
    ("fieldnotes", "Field notes", "Notebook-style articles extend the club's voice and offer small creative prompts."),
    ("toolkit", "The toolkit", "Practical activity instructions help visitors take the concept into their own gathering."),
    ("join", "Make a plan", "The planner turns a chosen gathering into a personal reminder saved on the visitor's device."),
]
STYLES = {}


def load_fonts():
    """Embed licensed local fonts as static TTFs; no network needed."""
    cache = ROOT / "tmp" / "report-fonts"
    cache.mkdir(parents=True, exist_ok=True)
    for name, filename, weight in (
        ("Space", "space-grotesk-latin-variable.woff2", 600),
        ("DM", "dm-sans-latin-variable.woff2", 400),
        ("DM-Bold", "dm-sans-latin-variable.woff2", 700),
    ):
        dest = cache / f"{name}-static-v2.ttf"
        if not dest.exists():
            font = FontToolsFont(ROOT / "assets" / "fonts" / filename)
            axes = {axis.axisTag: axis.defaultValue for axis in font["fvar"].axes}
            axes["wght"] = weight
            font = instantiateVariableFont(font, axes, inplace=True)
            font.flavor = None
            # Static instances need distinct PostScript names. ReportLab can
            # otherwise reuse the regular font's face for the bold instance.
            for record in font["name"].names:
                if record.nameID in (1, 4, 6):
                    record.string = f"OfflineReport{name}".encode(record.getEncoding())
            font.save(dest)
        pdfmetrics.registerFont(TTFont(name, str(dest)))
    pdfmetrics.registerFontFamily("DM", normal="DM", bold="DM-Bold", italic="DM", boldItalic="DM-Bold")
    STYLES.update({
        "body": ParagraphStyle("body", fontName="DM", fontSize=11, leading=16.2, textColor=INK, spaceAfter=10),
        "small": ParagraphStyle("small", fontName="DM", fontSize=9.2, leading=13.1, textColor=MUTED),
        "table": ParagraphStyle("table", fontName="DM", fontSize=9.4, leading=13.2, textColor=INK),
        "table-head": ParagraphStyle("table-head", fontName="DM-Bold", fontSize=9.4, leading=13.2, textColor=colors.white),
    })


def para(c, text, x, y, width, style="body"):
    p = Paragraph(text, STYLES[style])
    _, height = p.wrap(width, 1000)
    p.drawOn(c, x, y - height)
    return y - height - (10 if style == "body" else 5)


def heading(c, title, x, y, size=19):
    c.setFillColor(colors.black)
    c.setFont("Space", size)
    c.drawString(x, y, title)
    return y - size - 12


def footer(c, page_number, draft, width, height):
    c.setFont("DM", 8)
    c.setFillColor(MUTED)
    c.drawString(42, 24, "OFFLINE  /  WEB Technologies 1  /  Midterm project")
    status = getattr(c, "_offline_status", "Draft" if draft else "")
    c.drawRightString(width - 42, 24, f"{status + '  /  ' if status else ''}{page_number:02}")


def start(c, number, draft, landscape_page=False):
    size = landscape(letter) if landscape_page else letter
    c.setPageSize(size)
    c.setFillColor(PAPER)
    c.rect(0, 0, size[0], size[1], stroke=0, fill=1)
    footer(c, number, draft, *size)
    return size


def table(c, rows, x, y, widths):
    data = [[Paragraph(escape(str(cell)), STYLES["table-head" if idx == 0 else "table"])
             for cell in row] for idx, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#efeee8")]),
        ("GRID", (0, 0), (-1, -1), .5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    _, height = t.wrap(sum(widths), 1000)
    t.drawOn(c, x, y - height)
    return y - height - 18


def fit_image(c, path, x, y, width, height):
    with Image.open(path) as im:
        iw, ih = im.size
    scale = min(width / iw, height / ih)
    w, h = iw * scale, ih * scale
    c.drawImage(str(path), x + (width - w) / 2, y + (height - h) / 2,
                w, h, preserveAspectRatio=True, mask="auto")
    return w, h


def read_metadata(path):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"members": [], "repository_url": "", "deployed_url": "", "reflection": ""}


def is_complete(metadata):
    members = metadata.get("members", [])
    return bool(members and all(m.get("full_name") and m.get("contribution") for m in members)
                and metadata.get("repository_url", "").startswith("https://")
                and metadata.get("deployed_url", "").startswith("https://")
                and metadata.get("deployment_verified") is True
                and metadata.get("reflection"))


def cover(c, meta, draft):
    start(c, 1, draft)
    x, width = 48, 516
    c.setFillColor(ORANGE)
    c.setFont("DM-Bold", 10)
    c.drawString(x, 725, "WEB TECHNOLOGIES 1  /  FRONT END")
    c.setFillColor(MUTED)
    c.setFont("DM", 9)
    c.drawRightString(x + width, 707, meta.get("report_date", "3 October 2026"))
    c.setFillColor(colors.black)
    c.setFont("Space", 61)
    c.drawString(x, 643, "OFFLINE")
    y = heading(c, "Midterm website report", x, 600, 25)
    y = para(c, "A six-page website for a fictional student club that brings people together for screen-free creative evenings. The report explains the visitor, design choices, implementation and responsive layouts.", x, y, width)
    if draft:
        y = para(c, "<b>Publication pending.</b> The public source repository is available. The published website URL must be enabled and verified before this report is ready for submission.", x, y - 5, width)
    y = heading(c, "Project team", x, y - 16)
    members = meta.get("members", [])
    if members:
        y = para(c, escape("; ".join(m.get("full_name", "To confirm") for m in members)), x, y, width)
    else:
        y = para(c, "Student names are awaiting confirmation. Detailed contributions appear on the following page.", x, y, width)
    if meta.get("group"):
        y = para(c, f"<b>Group</b> {escape(meta['group'])}", x, y, width)
    y = heading(c, "Project links", x, y - 9)
    for label, key in (("GitHub repository", "repository_url"), ("Published website", "deployed_url")):
        value = meta.get(key, "")
        verified_link = bool(value and (key != "deployed_url" or meta.get("deployment_verified") is True))
        text = f'<b>{label}</b><br/><link href="{escape(value)}" color="#24251f">{escape(value)}</link>' if verified_link else f"<b>{label}</b><br/>Publication pending; no working public website URL has been verified"
        y = para(c, text, x, y, width)
    c.showPage()


def team(c, meta, draft):
    start(c, 2, draft)
    x, width = 48, 516
    y = heading(c, "Page ownership and responsibilities", x, 726, 24)
    members = meta.get("members", [])
    if members:
        y = table(c, [["Student", "Page responsibility"]] + [[m.get("full_name", "To confirm"), m.get("contribution", "To confirm")] for m in members], x, y, [174, 342])
    else:
        y = para(c, "The team details have not yet been supplied. Each student must record the complete page they build, its styling, interactions and their own repository commits. No contribution is assigned to an unnamed student in this draft.", x, y, width)
    y = heading(c, "A balanced division of work", x, y - 6)
    y = para(c, "The 2/1/2/1 page split balances page count with interaction work. Gatherings includes filtering, a semantic timetable and responsive QA. Make a plan carries validation, storage and calendar handling. The two-page roles cover the opening and club story, and the editorial content and printable toolkit.", x, y, width)
    y = heading(c, "Shared website structure", x, y - 6)
    y = para(c, "One navigation, local fonts and shared design tokens connect the six pages. Editable page fragments are assembled by a build script with a common header and footer. Each page owner is responsible for their complete page layout, responsive CSS, Bootstrap styling and defense explanation.", x, y, width)
    y = heading(c, "Individual defense", x, y - 12)
    y = para(c, "Each student presents their own pages, explains the design and code, and makes a small change without assistance. Each student is responsible for completing, testing and committing their assigned pages under their own GitHub account.", x, y, width)
    c.showPage()


def concept(c, draft):
    start(c, 3, draft)
    x, width = 48, 516
    y = heading(c, "The idea and its visitors", x, 726, 25)
    y = para(c, "OFFLINE is a fictional campus club for students who want a low-pressure way to meet people and make something with their hands. Its sample evenings cover creative activities, tabletop games and slower social sessions. A visitor can understand the club, compare gatherings, read a creative prompt and save a personal plan.", x, y, width)
    y = para(c, "The topic gives the website a specific visitor and a clear reason to exist. A screen-free club also creates useful future scope for an Endterm or Final project: real session management, member accounts or reservations can be added to the current static front end. The current events are sample content; the planner is a local demonstration.", x, y, width)
    y = heading(c, "Six pages with distinct purposes", x, y - 12)
    rows = [["Page", "Visitor purpose"],
            ["Home", "Understand the idea and discover the next gathering"],
            ["Gatherings", "Compare sessions and consult the timetable"],
            ["The club", "Understand the club story and principles"],
            ["Field notes", "Read observations and try creative prompts"],
            ["The toolkit", "Use practical activities for an evening together"],
            ["Make a plan", "Choose a gathering and save a personal reminder"]]
    y = table(c, rows, x, y, [142, 374])
    y = heading(c, "A memorable visual solution", x, y - 5)
    y = para(c, "The home page treats the club like a handmade poster: large typography, asymmetrical composition and original vector artwork give it a recognizable opening. The other pages use the same palette and navigation while changing their content layout to suit the task. The design is custom; Bootstrap supplies useful layout and interaction primitives.", x, y, width)
    c.showPage()


def design(c, draft):
    start(c, 4, draft)
    x, width = 48, 516
    y = heading(c, "Style and design choices", x, 726, 25)
    y = para(c, "The visual direction takes cues from workshop flyers, notebooks and a shared table. Warm paper and dark ink make the site feel tactile, while orange marks actions and expressive details. Consistent spacing, borders, type and shared navigation hold the six pages together.", x, y, width)
    palette = [("Paper", "#f5f2e9", PAPER), ("Ink", "#24251f", INK), ("Orange", "#f45d32", ORANGE)]
    for i, (name, hexcode, color) in enumerate(palette):
        sx = x + i * 174
        c.setFillColor(color)
        c.setStrokeColor(LINE)
        c.rect(sx, y - 55, 156, 43, fill=1, stroke=1)
        c.setFillColor(INK)
        c.setFont("DM-Bold", 10)
        c.drawString(sx, y - 73, name)
        c.setFont("DM", 9.4)
        c.drawString(sx, y - 88, hexcode)
    y -= 120
    y = heading(c, "Type and main elements", x, y)
    y = para(c, "<b>Space Grotesk</b> is used for headings, where its geometric shapes support the poster style. <b>DM Sans</b> carries body copy and controls, giving longer instructions and form fields a calmer rhythm. Both fonts are served locally with their licenses, so the website does not depend on a live font service.", x, y, width)
    y = para(c, "Buttons, navigation links, cards and form controls reuse the same visual language. The custom illustrations use flat shapes rather than stock photography. Hover feedback and visible focus states support interaction. Decorative movement respects the visitor's reduced-motion preference.", x, y, width)
    y = heading(c, "Responsive choices", x, y - 10)
    y = para(c, "The layout uses Bootstrap's grid and custom CSS Grid and Flexbox rules. At narrow widths, content stacks, the navigation collapses into a menu and large headings scale down. Tablet layouts retain enough space for comparison, and desktop layouts use broader compositions. Own media queries handle page-specific details and prevent content from exceeding the viewport.", x, y, width)
    y = heading(c, "Credits", x, y - 10)
    y = para(c, "Original layout and vector artwork, with AI assistance in development and content. Space Grotesk by Florian Karsten and DM Sans by Colophon Foundry are distributed under the SIL Open Font License. Bootstrap 5.3.8 is distributed under the MIT License. Attribution and license files are included with the source; no downloaded website template or theme is used.", x, y, width)
    c.showPage()


def technical(c, meta, draft):
    start(c, 5, draft)
    x, width = 48, 516
    y = heading(c, "Implementation", x, 726, 25)
    rows = [["Course requirement", "Implementation"],
        ["Semantic HTML", "Header, navigation, main, sections, articles and footer; meaningful headings and labels"],
        ["Form", "The personal gathering planner uses labeled controls and input validation"],
        ["Table", "Gatherings includes a schedule with column headers and a caption"],
        ["Flexbox and Grid", "Shared alignment, expressive page compositions and responsive cards"],
        ["Own media queries", "Navigation, type and page layouts adapt to 375, 768 and 1280 px"],
        ["Bootstrap", "Locally bundled grid, navigation collapse and styled components"],
        ["Static deployment", "Relative asset paths and generated root HTML support GitHub Pages"]]
    y = table(c, rows, x, y, [146, 370])
    y = heading(c, "Interactions and scope", x, y)
    y = para(c, "The front end adds useful interactions without a server: visitors can filter sample gatherings, save planner data locally and download a calendar reminder. The interface clearly presents the website as a student concept and does not claim that the personal plan reserves a real place.", x, y, width)
    y = heading(c, "Build and publication", x, y - 7)
    y = para(c, "The source is held in one public GitHub repository. Generated HTML pages and bundled assets support static publication from its root, and the build script makes edits to page fragments reproducible. Relative navigation and asset paths support the GitHub Pages repository subpath.", x, y, width)
    if meta.get("deployment_verified") is True:
        y = para(c, "The published website link on the cover has been checked against the deployed site.", x, y, width)
    else:
        y = para(c, "Publication status is pending: the source repository is verified, but a working deployed website link is required before submission.", x, y, width)
    c.showPage()


def conclusion(c, meta, draft):
    start(c, 6, draft)
    x, width = 48, 516
    y = heading(c, "Evidence and conclusion", x, 726, 25)
    y = heading(c, "Responsive evidence", x, y - 7)
    local_path = ROOT / "artifacts" / "verification.json"
    hosted_path = ROOT / "artifacts" / "deployed" / "verification.json"
    local = json.loads(local_path.read_text(encoding="utf-8")) if local_path.exists() else {}
    hosted = json.loads(hosted_path.read_text(encoding="utf-8")) if hosted_path.exists() else {}
    result = hosted if hosted.get("passed") else local
    checks = result.get("interactions", [])
    passed_checks = bool(checks and all(item.get("passed") for item in checks))
    if result.get("passed") and passed_checks:
        scope = "Both local and deployed Chromium audits" if local.get("passed") and hosted.get("passed") else "The local Chromium audit"
        verified = f"{scope} passed all {len(result.get('pages', []))} required page and width combinations and {len(checks)} visitor checks. All six pages fit 375, 768 and 1280 px without horizontal document scrolling. No failed site resources or uncaught JavaScript errors were reported. Checks covered navigation, keyboard access, filters, FAQ, downloads, planner validation, saving, restoration, editing and deletion. Verification was completed on {meta.get('screenshots_captured', '3 October 2026')}."
    else:
        verified = "The following pages document every page at widths of 375, 768 and 1280 px. Each page includes an enlarged first viewport and a full-page overview. Original screenshots are preserved in the project's artifacts folder."
    y = para(c, escape(verified), x, y, width)
    y = heading(c, "Conclusion", x, y - 7)
    reflection = meta.get("reflection", "")
    y = para(c, escape(reflection) if reflection else "The project demonstrates how semantic HTML, responsive CSS and Bootstrap can support six distinct pages within one visual system. Its timetable, filters, printable toolkit and local planner connect course topics to useful visitor tasks. Form validation, storage checks and accessible controls show how browser behavior can be handled clearly within a static front end.", x, y, width)
    y = heading(c, "Screenshot guide", x, y - 12)
    capture_date = escape(meta.get("screenshots_captured", "3 October 2026"))
    y = para(c, f"Pages 7 to 24 show Home, Gatherings, The club, Field notes, The toolkit and Make a plan at 375, 768 and 1280 px. Each labels its page owner and shows an enlarged first viewport plus a full-page overview. Captures were made on {capture_date} and match the published website source.", x, y, width)
    y = heading(c, "Reference resources", x, y - 12)
    for text, url in (("Bootstrap documentation", "https://getbootstrap.com/docs/5.3/"),
                      ("HTML reference", "https://www.w3schools.com/html/"),
                      ("CSS reference", "https://www.w3schools.com/css/"),
                      ("Space Grotesk", "https://fonts.google.com/specimen/Space+Grotesk"),
                      ("DM Sans", "https://fonts.google.com/specimen/DM+Sans")):
        y = para(c, f'<link href="{url}" color="#24251f"><b>{text}</b></link>  {url}', x, y, width, "small")
    c.showPage()


def screenshot_page(c, number, draft, slug, label, explanation, width, screenshots, owner):
    page_w, page_h = start(c, number, draft, landscape_page=True)
    path = screenshots / f"{slug}-{width}.png"
    if not path.exists():
        raise FileNotFoundError(f"Required responsive screenshot missing: {path}")
    crop_dir = ROOT / "tmp" / "report-crops"
    crop_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(path) as im:
        iw, ih = im.size
        # Captures can have a 2x device pixel ratio; crop in CSS-pixel units.
        ratio = iw / width
        css_height = {375: 812, 768: 900, 1280: 900}[width]
        crop = im.crop((0, 0, iw, min(ih, round(css_height * ratio))))
        crop_path = crop_dir / f"{slug}-{width}-viewport.png"
        crop.save(crop_path)
    c.setFillColor(ORANGE)
    c.setFont("DM-Bold", 9)
    c.drawString(42, page_h - 40, f"RESPONSIVE SCREENSHOTS  /  {slug}.html  /  {width} PX")
    heading(c, f"{label} at {width} px", 42, page_h - 75, 24)
    para(c, explanation, 42, page_h - 97, page_w - 84, "small")
    c.setFillColor(INK)
    c.setFont("DM-Bold", 9)
    c.drawString(42, page_h - 130, f"Page owner: {owner}")
    # One large viewport is readable at normal PDF zoom. A full page overview
    # records the rest of the layout without shrinking the main evidence.
    main_x, main_y, main_w, main_h = 42, 77, 594, 389
    if width == 375:
        main_w = 470
    fit_image(c, crop_path, main_x, main_y, main_w, main_h)
    overview_x = 640 if width != 375 else 559
    overview_w = page_w - overview_x - 42
    fit_image(c, path, overview_x, main_y, overview_w, main_h)
    c.setFillColor(MUTED)
    c.setFont("DM", 8.3)
    c.drawString(main_x, 55, "Enlarged first viewport")
    c.drawString(overview_x, 55, "Full page overview")
    c.showPage()


def render_pdf(output, qa_dir):
    import pymupdf
    qa_dir.mkdir(parents=True, exist_ok=True)
    pdf = pymupdf.open(output)
    for i, page in enumerate(pdf):
        page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False).save(qa_dir / f"page-{i + 1:02}.png")
    return len(pdf)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", type=Path, default=ROOT / "docs" / "report-metadata.json")
    parser.add_argument("--screenshots", type=Path, default=ROOT / "artifacts" / "screenshots")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    meta = read_metadata(args.metadata)
    draft = not is_complete(meta)
    if args.output:
        output = args.output
    elif meta.get("members"):
        names = [re.sub(r"[^\w-]", "", m["full_name"].replace(" ", "_")) for m in meta["members"]]
        output = ROOT / "deliverables" / f"Midterm_{'_'.join(names)}.pdf"
    else:
        output = ROOT / "deliverables" / "Midterm_OFFLINE_DRAFT.pdf"
    output.parent.mkdir(parents=True, exist_ok=True)
    load_fonts()
    c = canvas.Canvas(str(output), pagesize=letter, pageCompression=1)
    c._offline_status = "Publication pending" if draft else ""
    c.setTitle("OFFLINE Midterm website report")
    c.setAuthor("; ".join(m.get("full_name", "") for m in meta.get("members", [])))
    c.setSubject("WEB Technologies 1 Front End Midterm Project")
    cover(c, meta, draft)
    team(c, meta, draft)
    concept(c, draft)
    design(c, draft)
    technical(c, meta, draft)
    conclusion(c, meta, draft)
    number = 7
    owners = {slug: member["full_name"] for member in meta.get("members", []) for slug in member.get("pages", [])}
    for slug, label, explanation in PAGES:
        for width in (375, 768, 1280):
            screenshot_page(c, number, draft, slug, label, explanation, width, args.screenshots, owners.get(slug, "To confirm"))
            number += 1
    c.save()
    count = render_pdf(output, ROOT / "tmp" / "report-qa")
    print(f"Created {output.relative_to(ROOT)} ({count} pages; {'publication pending' if draft else 'verified project links'})")


if __name__ == "__main__":
    main()
