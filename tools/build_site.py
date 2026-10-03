"""Combine editable page content with the shared navigation and footer.

Run after editing a file in content/: python tools/build_site.py
The generated root HTML files also work without a build tool or server.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = {
    "index": ("Home", "Good company. No notifications. A student club for making, playing and slowing down together."),
    "gatherings": ("Gatherings", "Find your next screen-free evening: printmaking, board games and slow creative sessions."),
    "about": ("The club", "Meet OFFLINE, a student club making space for real conversations and imperfect creative work."),
    "fieldnotes": ("Field notes", "Small observations and creative prompts from the OFFLINE notebook."),
    "toolkit": ("The toolkit", "Simple, printable activities for your own screen-free evening."),
    "join": ("Make a plan", "Save your own OFFLINE gathering plan and download a calendar reminder."),
}
MARK = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 0v32M0 16h32M4.7 4.7l22.6 22.6M4.7 27.3L27.3 4.7" stroke="currentColor" stroke-width="6"/></svg>'

def render(slug, title, description, content):
    links = []
    for target, (label, _) in PAGES.items():
        if target == "join":
            continue
        current = ' aria-current="page"' if slug == target else ""
        links.append(f'<a class="nav-link{" active" if slug == target else ""}" href="{target}.html"{current}>{label}</a>')
    current_join = ' aria-current="page"' if slug == "join" else ""
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{description}">
  <meta name="theme-color" content="#f5f2e9">
  <title>{title} — OFFLINE Club</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/vendor/bootstrap.min.css">
  <link rel="stylesheet" href="assets/fonts/fonts.css">
  <link rel="stylesheet" href="assets/css/style.css">
  <link rel="stylesheet" href="content/secondary.css">
  <script src="assets/vendor/bootstrap.bundle.min.js" defer></script>
  <script src="assets/js/script.js" defer></script>
  <noscript><style>.navbar-collapse.collapse{{display:block}}.navbar-toggler{{display:none}}.session-filters{{display:none}}</style></noscript>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <nav class="navbar navbar-expand-lg container" aria-label="Main navigation">
      <a class="navbar-brand" href="index.html" aria-label="OFFLINE home">{MARK}<span>OFFLINE<span class="brand-period">CLUB</span></span></a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#site-navigation" aria-controls="site-navigation" aria-expanded="false" aria-label="Toggle navigation"><span class="menu-lines" aria-hidden="true"></span><span>Menu</span></button>
      <div class="collapse navbar-collapse" id="site-navigation">
        <div class="navbar-nav nav-links">{''.join(links)}</div>
        <a class="button button-small nav-join" href="join.html"{current_join}>Make a plan <span aria-hidden="true">↗</span></a>
      </div>
    </nav>
  </header>
  {content}
  <footer class="site-footer">
    <div class="container footer-top">
      <a class="footer-brand" href="index.html">{MARK} OFFLINE</a>
      <p>A little less online.<br>A little more together.</p>
      <a class="text-link" href="join.html">See you around the table <span aria-hidden="true">↗</span></a>
    </div>
    <div class="container footer-bottom">
      <p>Student concept · Sample events · Your planner stays on this device.</p>
      <details class="credits"><summary>Credits &amp; project notes</summary><p>Original layout and vector artwork. Content and artwork developed with AI assistance. <a href="https://fonts.google.com/specimen/Space+Grotesk">Space Grotesk</a> by Florian Karsten; <a href="https://fonts.google.com/specimen/DM+Sans">DM Sans</a> by Colophon Foundry. <a href="https://getbootstrap.com/">Bootstrap</a> 5.3.8, MIT license. No downloaded theme.</p></details>
    </div>
  </footer>
</body>
</html>
'''

if __name__ == "__main__":
    for slug, (title, description) in PAGES.items():
        fragment = ROOT / "content" / f"{slug}.html"
        if fragment.exists():
            (ROOT / f"{slug}.html").write_text(render(slug, title, description, fragment.read_text(encoding="utf-8")), encoding="utf-8")
            print(f"Built {slug}.html")
