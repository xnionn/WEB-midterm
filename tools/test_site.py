"""Browser verification and screenshot capture for the OFFLINE midterm website.

Install the development-only test dependency with:
    python -m pip install playwright
    python -m playwright install chromium
Run from any directory with: python tools/test_site.py

This launches a temporary localhost server and a headless Chromium browser. It
writes readable JSON findings and screenshots; it does not publish the site.
"""
from __future__ import annotations

import argparse
import functools
import json
import threading
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PAGES = ("index", "gatherings", "about", "fieldnotes", "toolkit", "join")
WIDTHS = (375, 768, 1280)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


PAGE_AUDIT = """() => {
  const visible = el => {
    const style = getComputedStyle(el);
    return el.getClientRects().length > 0 && style.visibility !== 'hidden';
  };
  const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
  const controls = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));
  const unlabeledControls = controls.filter(el => !el.labels?.length &&
    !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(el => el.id || el.name || el.tagName);
  const unlabelledImages = Array.from(document.querySelectorAll('img:not([alt])')).map(el => el.src);
  const blankLinks = Array.from(document.querySelectorAll('a')).filter(el =>
    !el.textContent.trim() && !el.getAttribute('aria-label') && !el.querySelector('img[alt]')).map(el => el.outerHTML);
  const clippedContent = Array.from(document.querySelectorAll('h1,h2,h3,p,a,button,input,select,textarea,table,img'))
    .filter(visible).filter(el => !el.closest('[aria-hidden="true"]'))
    .map(el => ({el, rect: el.getBoundingClientRect()}))
    .filter(({rect}) => rect.width && (rect.left < -1 || rect.right > innerWidth + 1))
    .map(({el,rect}) => ({tag: el.tagName, text: (el.textContent || el.getAttribute('alt') || el.id).trim().slice(0,90),
      left: Math.round(rect.left), right: Math.round(rect.right)}));
  const mainNav = document.querySelector('header nav, nav[aria-label]');
  return {
    title: document.title,
    viewportWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: innerHeight,
    bodyWidth: document.body.scrollWidth,
    h1Count: document.querySelectorAll('h1').length,
    mainCount: document.querySelectorAll('main').length,
    language: document.documentElement.lang,
    viewportMeta: document.querySelector('meta[name="viewport"]')?.content || '',
    duplicateIds: [...new Set(ids.filter((id,index) => ids.indexOf(id) !== index))],
    unlabeledControls, unlabelledImages, blankLinks, clippedContent,
    navigation: mainNav ? Array.from(mainNav.querySelectorAll('a')).map(el => ({text: el.textContent.trim(), href: el.getAttribute('href')})) : [],
    currentNavCount: mainNav ? mainNav.querySelectorAll('[aria-current="page"]').length : 0,
    tables: Array.from(document.querySelectorAll('table')).map(el => ({caption: el.caption?.textContent.trim() || '',
      headerCount: el.querySelectorAll('th').length, rowCount: el.rows.length})),
    fonts: Array.from(document.fonts).map(font => ({family: font.family, status: font.status, weight: font.weight})),
    rootRelativeResources: Array.from(document.querySelectorAll('[href],[src]')).flatMap(el =>
      ['href','src'].map(attr => el.getAttribute(attr)).filter(value => value?.startsWith('/') && !value.startsWith('//'))),
    links: Array.from(document.querySelectorAll('a[href]')).map(el => ({text: el.textContent.trim(), href: el.getAttribute('href')}))
  };
}"""


TEXT_CONTRAST_AUDIT = """() => {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  const rgba = color => {
    ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1);
    const pixel = [...ctx.getImageData(0,0,1,1).data]; pixel[3] /= 255; return pixel;
  };
  const blend = (foreground, background) => foreground.slice(0,3).map((value,index) =>
    value * foreground[3] + background[index] * (1 - foreground[3]));
  const luminance = channels => channels.map(value => value / 255).map(value =>
    value <= 0.04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum,value,index) => sum + value * [.2126,.7152,.0722][index], 0);
  const failures = [], skipped = []; let checked = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (!(el instanceof HTMLElement) || el.closest('[aria-hidden="true"], [disabled]') || !el.getClientRects().length) continue;
    const text = [...el.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
    if (!text) continue;
    const style = getComputedStyle(el); if (style.visibility === 'hidden') continue;
    let ancestors = [], node = el;
    while (node instanceof HTMLElement) {ancestors.unshift(node); node = node.parentElement;}
    if (ancestors.some(parent => getComputedStyle(parent).backgroundImage !== 'none')) {
      skipped.push({text: text.slice(0,80), reason: 'background image requires visual inspection'}); continue;
    }
    let background = [255,255,255]; let opacity = 1;
    for (const parent of ancestors) {
      const parentStyle = getComputedStyle(parent);
      background = blend(rgba(parentStyle.backgroundColor), background);
      opacity *= Number(parentStyle.opacity);
    }
    const foreground = rgba(style.color); foreground[3] *= opacity;
    const l1 = luminance(blend(foreground, background)), l2 = luminance(background);
    const ratio = (Math.max(l1,l2) + .05) / (Math.min(l1,l2) + .05);
    const fontSize = parseFloat(style.fontSize), fontWeight = Number(style.fontWeight);
    const minimum = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
    checked++;
    if (ratio + .001 < minimum) failures.push({tag: el.tagName, text: text.slice(0,100),
      foreground: style.color, background: background.map(Math.round), ratio: Number(ratio.toFixed(2)), minimum});
  }
  return {checked, failures, skipped, scope: 'Visible HTML text on computed solid CSS backgrounds; SVG/image text and image backgrounds require visual review.'};
}"""


def verify_interactions(browser, base_url: str) -> list[dict]:
    results = []

    def record(name, passed, **details):
        results.append({"name": name, "passed": bool(passed), **details})

    context = browser.new_context(viewport={"width": 375, "height": 900}, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        for width in (375, 768):
            page.set_viewport_size({"width": width, "height": 900})
            page.goto(urljoin(base_url, "index.html"), wait_until="networkidle")
            page.keyboard.press("Tab")
            focus = page.evaluate("""() => {
              const el=document.activeElement, style=getComputedStyle(el), rect=el.getBoundingClientRect();
              return {text:el.textContent.trim(), top:rect.top, outline:style.outlineStyle, width:parseFloat(style.outlineWidth)};
            }""")
            record(f"keyboard skip link at {width} px", "Skip to content" in focus["text"] and focus["top"] >= 0 and focus["outline"] != "none" and focus["width"] > 0, focus=focus)
            toggle = page.get_by_role("button", name="Toggle navigation")
            toggle.focus()
            menu_focus = toggle.evaluate("""el => {
              const style = getComputedStyle(el);
              return {outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), shadow: style.boxShadow};
            }""")
            focus_visible = menu_focus["outline"] != "none" and menu_focus["outlineWidth"] > 0 or menu_focus["shadow"] != "none"
            page.keyboard.press("Enter")
            page.locator("#site-navigation.show").wait_for(state="visible")
            expanded = toggle.get_attribute("aria-expanded") == "true"
            page.locator("#site-navigation").get_by_role("link", name="Gatherings", exact=True).click()
            record(f"mobile navigation at {width} px", expanded and focus_visible and urlparse(page.url).path.endswith("gatherings.html"), menuFocus=menu_focus)

        page.goto(urljoin(base_url, "gatherings.html"), wait_until="networkidle")
        outcomes = []
        for category in ("make", "play", "slow", "all"):
            page.locator(f'[data-filter="{category}"]').click()
            visible_categories = page.locator("[data-category]:visible").evaluate_all("els => els.map(el => el.dataset.category)")
            count = 3 if category == "all" else 1
            outcomes.append({"category": category, "visible": visible_categories, "count": page.locator("#session-count").inner_text()})
            assert len(visible_categories) == count
            assert category == "all" or visible_categories == [category]
            assert page.locator('[data-filter][aria-pressed="true"]').count() == 1
            assert page.locator(f'[data-filter="{category}"]').get_attribute("aria-pressed") == "true"
            assert page.locator("#session-count").inner_text().startswith(f"{count} evening")
        record("gathering filters and live count", True, states=outcomes)

        page.goto(urljoin(base_url, "about.html"), wait_until="networkidle")
        faq = page.locator('[data-bs-target="#faq-phone"]')
        faq.click()
        page.locator("#faq-phone.show").wait_for(state="visible")
        record("Bootstrap FAQ accordion", faq.get_attribute("aria-expanded") == "true" and page.locator("#club-faq .accordion-collapse.show").count() == 1 and "accessibility" in page.locator("#faq-phone").inner_text())

        page.goto(urljoin(base_url, "toolkit.html"), wait_until="networkidle")
        with page.expect_download() as kit_event:
            page.get_by_role("link", name="Download the kit").click()
        kit = kit_event.value
        kit_bytes = Path(kit.path()).read_bytes()
        record("toolkit download", kit.suggested_filename == "OFFLINE-field-kit.txt" and b"OFFLINE" in kit_bytes and len(kit_bytes) > 200, filename=kit.suggested_filename, bytes=len(kit_bytes))
        page.evaluate("() => {window.__printCalls = 0; window.print = () => window.__printCalls++;}")
        page.locator("[data-print-guide]").click()
        record("toolkit print control", page.evaluate("window.__printCalls") == 1)

        page.goto(urljoin(base_url, "join.html?session=games"), wait_until="networkidle")
        record("gathering link preselects planner", page.locator("#planner-session").input_value() == "games")
        submit = page.locator('#planner-form button[type="submit"]')
        page.locator("#planner-consent").check()
        page.locator("#planner-name").fill("   ")
        submit.click()
        record("planner rejects whitespace-only name", page.locator("#planner-form").is_visible() and page.locator("#saved-plan").is_hidden() and bool(page.locator("#planner-name").evaluate("el => el.validationMessage")) and page.evaluate("localStorage.getItem('offline-plan-v1')") is None)
        page.locator("#planner-name").fill("Aigerim")
        invalid_guests = []
        for value in ("0", "5", "2.5"):
            page.locator("#planner-guests").fill(value)
            submit.click()
            invalid_guests.append({"value": value, "rejected": page.locator("#planner-form").is_visible() and page.locator("#saved-plan").is_hidden() and bool(page.locator("#planner-guests").evaluate("el => el.validationMessage"))})
        record("planner rejects guests outside 1–4 and fractions", all(item["rejected"] for item in invalid_guests), cases=invalid_guests)
        page.locator("#planner-guests").fill("2")
        page.locator("#planner-consent").uncheck()
        submit.click()
        record("planner requires sample-event consent", page.locator("#saved-plan").is_hidden() and bool(page.locator("#planner-consent").evaluate("el => el.validationMessage")))
        page.locator("#planner-consent").check()
        submit.click()
        page.locator("#saved-plan").wait_for(state="visible")
        record("planner saves visitor choices locally", page.locator("#plan-name").inner_text() == "Aigerim" and "2 people" in page.locator("#plan-guests").inner_text() and page.locator("#planner-form").is_hidden() and json.loads(page.evaluate("localStorage.getItem('offline-plan-v1')"))["guests"] == 2)
        page.goto(urljoin(base_url, "join.html"), wait_until="networkidle")
        record("planner survives reload", page.locator("#saved-plan").is_visible() and page.locator("#plan-name").inner_text() == "Aigerim" and "Your move" in page.locator("#plan-session").inner_text())

        calendar_results = []
        for session, day in (("games", 23), ("print", 16), ("sketch", 30)):
            if session != "games":
                page.locator("#edit-plan").click()
                assert page.locator("#planner-name").input_value() == "Aigerim"
                page.locator("#planner-session").select_option(session)
                page.locator("#planner-guests").fill("4")
                page.locator("#first-no").check()
                page.locator("#planner-consent").check()
                page.locator('#planner-form button[type="submit"]').click()
                page.locator("#saved-plan").wait_for(state="visible")
            with page.expect_download() as event:
                page.locator("#calendar-download").click()
            download = event.value
            contents = Path(download.path()).read_bytes()
            text = contents.decode("utf-8")
            fields = dict(line.split(":", 1) for line in text.splitlines() if ":" in line)
            start = datetime.strptime(fields["DTSTART"], "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc).astimezone(timezone(timedelta(hours=5)))
            end = datetime.strptime(fields["DTEND"], "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc).astimezone(timezone(timedelta(hours=5)))
            calendar_results.append({"session": session, "filename": download.suggested_filename, "local_start": start.isoformat(), "local_end": end.isoformat(),
                "passed": download.suggested_filename == f"offline-{session}.ics" and start.day == day and start.year == 2026 and start.month == 10 and start.hour == 18 and start.minute == 30 and end.hour == 20 and end.minute == 0 and text.startswith("BEGIN:VCALENDAR\r\n") and text.endswith("END:VCALENDAR\r\n") and fields.get("STATUS") == "TENTATIVE"})
            destination = ROOT / "artifacts" / "downloads" / download.suggested_filename
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(contents)
        record("calendar downloads use correct October dates and UTC+5 times", all(item["passed"] for item in calendar_results), calendars=calendar_results)
        record("planner edit preserves and updates choices", "Tea, pencils" in page.locator("#plan-session").inner_text() and "4 people" in page.locator("#plan-guests").inner_text() and json.loads(page.evaluate("localStorage.getItem('offline-plan-v1')"))["firstTime"] is False)
        page.locator("#clear-plan").click()
        record("planner delete removes stored plan", page.locator("#planner-form").is_visible() and page.locator("#saved-plan").is_hidden() and page.evaluate("localStorage.getItem('offline-plan-v1')") is None and "deleted" in page.locator("#empty-plan-note").inner_text())
        corrupt_cases = []
        for raw in ("{invalid", json.dumps({"version": 1, "session": "__proto__", "name": "Aigerim", "guests": 1, "firstTime": True})):
            page.evaluate("raw => localStorage.setItem('offline-plan-v1', raw)", raw)
            page.reload(wait_until="networkidle")
            corrupt_cases.append(page.locator("#planner-form").is_visible() and page.locator("#saved-plan").is_hidden())
        record("planner ignores corrupt or invalid stored data", all(corrupt_cases), cases=len(corrupt_cases))
        record("visitor controls produce no JavaScript errors", not errors, errors=errors)
    except Exception as error:
        record("visitor interaction sequence", False, error=str(error))
    finally:
        context.close()

    context = browser.new_context(viewport={"width": 375, "height": 900})
    context.add_init_script("Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Storage blocked', 'SecurityError');}})")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(urljoin(base_url, "join.html?session=print"), wait_until="networkidle")
        page.locator("#planner-name").fill("Dias")
        page.locator("#planner-consent").check()
        page.locator('#planner-form button[type="submit"]').click()
        page.locator("#saved-plan").wait_for(state="visible")
        saved = "unavailable" in page.locator("#plan-status").inner_text()
        page.locator("#clear-plan").click()
        record("planner handles denied browser storage", saved and page.locator("#planner-form").is_visible() and "unavailable" in page.locator("#empty-plan-note").inner_text() and not errors, errors=errors)
    except Exception as error:
        record("planner handles denied browser storage", False, error=str(error))
    finally:
        context.close()

    context = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
    page = context.new_page()
    motion = []
    for slug in PAGES:
        page.goto(urljoin(base_url, slug + ".html"), wait_until="networkidle")
        running = page.evaluate("""() => [...document.querySelectorAll('*')].filter(el => {
          const style = getComputedStyle(el);
          return style.animationName !== 'none' && style.animationDuration.split(',').some(value => parseFloat(value) > .01);
        }).map(el => ({tag:el.tagName, class:el.className}))""")
        motion.append({"page": slug, "nontrivialAnimations": running})
    record("reduced-motion preference", not any(item["nontrivialAnimations"] for item in motion), pages=motion)
    context.close()
    return results


def run(base_url: str, output_dir: Path) -> dict:
    screenshots = output_dir / "screenshots"
    screenshots.mkdir(parents=True, exist_ok=True)
    report = {"base_url": base_url, "browser": "Chromium", "pages": [], "interactions": [], "failures": []}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        report["browser_version"] = browser.version
        for slug in PAGES:
            for width in WIDTHS:
                context = browser.new_context(viewport={"width": width, "height": 900}, device_scale_factor=1)
                page = context.new_page()
                errors = []
                bad_responses = []
                requests_failed = []
                external_requests = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.on("response", lambda response: bad_responses.append({"url": response.url, "status": response.status}) if response.status >= 400 else None)
                page.on("requestfailed", lambda request: requests_failed.append({"url": request.url, "failure": request.failure}))
                page.on("request", lambda request: external_requests.append(request.url) if urlparse(request.url).netloc != urlparse(base_url).netloc else None)
                response = page.goto(urljoin(base_url, slug + ".html"), wait_until="networkidle")
                page.evaluate("document.fonts.ready")
                audit = page.evaluate(PAGE_AUDIT)
                audit["textContrast"] = page.evaluate(TEXT_CONTRAST_AUDIT)
                audit.update({"page": slug, "width": width, "httpStatus": response.status if response else None,
                              "pageErrors": errors, "badResponses": bad_responses,
                              "requestsFailed": requests_failed, "externalRequests": external_requests})
                full_capture = page.screenshot(path=str(screenshots / f"{slug}-{width}.png"), full_page=True, animations="disabled")
                viewport_capture = page.screenshot(path=str(screenshots / f"{slug}-{width}-viewport.png"), full_page=False, animations="disabled")
                audit["fullScreenshotDimensions"] = {"width": int.from_bytes(full_capture[16:20], "big"), "height": int.from_bytes(full_capture[20:24], "big")}
                audit["viewportScreenshotDimensions"] = {"width": int.from_bytes(viewport_capture[16:20], "big"), "height": int.from_bytes(viewport_capture[20:24], "big")}
                report["pages"].append(audit)
                for key, success in {
                    "document fits viewport": audit["documentWidth"] <= width,
                    "body fits viewport": audit["bodyWidth"] <= width,
                    "one h1": audit["h1Count"] == 1,
                    "one main landmark": audit["mainCount"] == 1,
                    "document language": bool(audit["language"]),
                    "responsive viewport meta": "width=device-width" in audit["viewportMeta"],
                    "unique IDs": not audit["duplicateIds"],
                    "labeled form controls": not audit["unlabeledControls"],
                    "image alt attributes": not audit["unlabelledImages"],
                    "named links": not audit["blankLinks"],
                    "shared navigation exists": bool(audit["navigation"]),
                    "current navigation marked": audit["currentNavCount"] == 1,
                    "no browser exceptions": not errors,
                    "assets load": not bad_responses and not requests_failed,
                    "self-hosted resources": not external_requests,
                    "GitHub project path compatible links": not audit["rootRelativeResources"],
                    "custom fonts loaded": all(any(font["family"].strip('\"\'') == family and font["status"] == "loaded" for font in audit["fonts"]) for family in ("Space Grotesk", "DM Sans")),
                    "table semantics": all(table["caption"] and table["headerCount"] for table in audit["tables"]),
                    "visible solid-background text meets AA contrast": not audit["textContrast"]["failures"],
                }.items():
                    if not success:
                        report["failures"].append({"page": slug, "width": width, "check": key})
                context.close()
        signatures = {json.dumps(audit["navigation"], sort_keys=True) for audit in report["pages"]}
        if len(signatures) != 1:
            report["failures"].append({"check": "navigation is identical across pages and viewports"})
        report["interactions"] = verify_interactions(browser, base_url)
        for interaction in report["interactions"]:
            if not interaction.get("passed"):
                report["failures"].append({"check": interaction["name"], "details": interaction})
        browser.close()
    report["passed"] = not report["failures"]
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "verification.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    layout_checks_passed = all(audit["documentWidth"] <= audit["width"] and audit["bodyWidth"] <= audit["width"] for audit in report["pages"])
    successful_interactions = [interaction["name"] for interaction in report["interactions"] if interaction.get("passed")]
    summary = []
    if layout_checks_passed:
        summary.append("All six pages fit 375 px, 768 px, and 1280 px viewports without horizontal document scrolling.")
    if all(not audit["pageErrors"] and not audit["badResponses"] and not audit["requestsFailed"] for audit in report["pages"]):
        summary.append("The browser reported no uncaught JavaScript errors or failed site resources in those 18 page/width combinations.")
    if successful_interactions:
        if len(successful_interactions) == len(report["interactions"]):
            summary.append("Mobile navigation, keyboard access, filters, FAQ, toolkit download/print, planner validation/save/edit/delete/persistence, calendar dates, corrupt or denied storage, and reduced-motion checks passed.")
        else:
            summary.append("Visitor behavior checks passed: " + ", ".join(successful_interactions) + ".")
    responsive_audit = {
        "browser": "Chromium " + report["browser_version"],
        "automation": "Python Playwright 1.63.0",
        "passed": report["passed"],
        "report_summary": " ".join(summary),
        "pages": [{"slug": audit["page"], "width": audit["width"], "viewport_height": audit["viewportHeight"],
                   "document_height": audit["documentHeight"], "document_width": audit["documentWidth"],
                   "body_width": audit["bodyWidth"], "horizontal_overflow": audit["documentWidth"] > audit["width"] or audit["bodyWidth"] > audit["width"],
                   "full_screenshot": {"path": f"artifacts/screenshots/{audit['page']}-{audit['width']}.png", **audit["fullScreenshotDimensions"]},
                   "viewport_screenshot": {"path": f"artifacts/screenshots/{audit['page']}-{audit['width']}-viewport.png", **audit["viewportScreenshotDimensions"]}}
                  for audit in report["pages"]],
    }
    (output_dir / "responsive-audit.json").write_text(json.dumps(responsive_audit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"passed": report["passed"], "combinations": len(report["pages"]),
                      "screenshots": len(report["pages"]) * 2, "failures": report["failures"]}, indent=2))
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", help="Existing server URL; otherwise an ephemeral localhost server is launched")
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts")
    args = parser.parse_args()
    server = None
    if args.base_url:
        base_url = args.base_url.rstrip("/") + "/"
    else:
        server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base_url = f"http://127.0.0.1:{server.server_port}/"
    try:
        report = run(base_url, args.output)
    finally:
        if server:
            server.shutdown()
            server.server_close()
    raise SystemExit(0 if report["passed"] else 1)


if __name__ == "__main__":
    main()
