"""Check Assignment 3 in Chromium and capture the actual page for the report.

Run: python assignment3/scripts/verify.py
Requires: pip install playwright; python -m playwright install chromium
An ephemeral localhost server is used unless --base-url is supplied.
"""
from __future__ import annotations

import argparse
import functools
import json
import re
import threading
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
REPORT_WIDTHS = (375, 768, 1280)
CHECK_WIDTHS = (375, 767, 768, 991, 992, 1023, 1024, 1280)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


LAYOUT_AUDIT = r"""() => {
  const rect = el => {
    const r = el.getBoundingClientRect();
    return {left:r.left, top:r.top + scrollY, right:r.right, width:r.width, height:r.height};
  };
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const rowCount = selector => {
    const items = [...document.querySelectorAll(selector)].map(rect);
    return {items, firstRowCount: items.filter(item => Math.abs(item.top - items[0].top) < 2).length};
  };
  const manual = document.querySelector('#rituals');
  const heading = manual.querySelector('h2');
  const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
  const links = [...document.querySelectorAll('nav a[href^="#"]')].map(el => ({
    href:el.getAttribute('href'), targetExists:!!document.querySelector(el.getAttribute('href'))
  }));
  const styles = [...document.querySelectorAll('link[rel="stylesheet"]')].map(el => el.getAttribute('href'));
  const scripts = [...document.querySelectorAll('script[src]')].map(el => el.getAttribute('src'));
  const cssRules = [];
  const walk = (rules, conditions=[]) => {
    for(const rule of rules) {
      if(rule.selectorText) cssRules.push({selector:rule.selectorText, conditions,
        width:rule.style.width, position:rule.style.position, float:rule.style.float,
        text:rule.style.cssText});
      if(rule.cssRules) walk(rule.cssRules, [...conditions, rule.conditionText || rule.name || '']);
    }
  };
  for (const sheet of document.styleSheets) {
    if (sheet.href && new URL(sheet.href).origin !== location.origin) continue;
    walk(sheet.cssRules);
  }
  return {
    width:innerWidth, documentWidth:document.documentElement.scrollWidth,
    bodyWidth:document.body.scrollWidth, documentHeight:document.documentElement.scrollHeight,
    mainCount:document.querySelectorAll('main').length, h1Count:document.querySelectorAll('h1').length,
    sectionCount:document.querySelectorAll('main section').length,
    viewport:document.querySelector('meta[name="viewport"]')?.content,
    duplicateIds:ids.filter((id,index)=>ids.indexOf(id)!==index),
    imageErrors:[...document.querySelectorAll('img')].filter(el=>!el.hasAttribute('alt') || !el.complete || !el.naturalWidth).map(el=>el.src),
    manual:rowCount('.ritual-grid > .ritual'), cards:rowCount('.session-grid > [class*="col-"]'),
    manualClasses:[...new Set([manual,...manual.querySelectorAll('*')].flatMap(el=>[...el.classList]))],
    manualLayout:{headingSize:getComputedStyle(heading).fontSize, padding:getComputedStyle(manual).padding,
      gridGap:getComputedStyle(document.querySelector('.ritual-grid')).gap},
    heroCopy:rect(document.querySelector('.hero-copy')), heroArt:rect(document.querySelector('.hero-art')),
    heroCopyOrder:getComputedStyle(document.querySelector('.hero-copy')).order,
    heroArtOrder:getComputedStyle(document.querySelector('.hero-art')).order,
    desktopNoteVisible:visible(document.querySelector('#desktop-note')),
    navbarToggleVisible:visible(document.querySelector('.navbar-toggler')),
    navbarLinksVisible:visible(document.querySelector('#mainNavigation')),
    bootstrapLoaded:typeof bootstrap !== 'undefined' && !!bootstrap.Collapse,
    links, styles, scripts, cssRules,
    bootstrapClasses:[...new Set([...document.querySelectorAll('body *')].flatMap(el=>[...el.classList]))]
  };
}"""


CONTRAST_AUDIT = r"""() => {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  const rgba = color => {
    ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1);
    const pixel = [...ctx.getImageData(0,0,1,1).data]; pixel[3] /= 255; return pixel;
  };
  const blend = (fg,bg) => fg.slice(0,3).map((value,index)=>value*fg[3]+bg[index]*(1-fg[3]));
  const lum = rgb => rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
    .reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  let checked=0; const failures=[], skipped=[];
  for (const el of document.querySelectorAll('body *')) {
    if (!(el instanceof HTMLElement) || !el.getClientRects().length || el.closest('[aria-hidden="true"]')) continue;
    const text=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim();
    if(!text || getComputedStyle(el).visibility==='hidden') continue;
    const ancestors=[]; let node=el;
    while(node instanceof HTMLElement) {ancestors.unshift(node); node=node.parentElement;}
    if(ancestors.some(parent=>getComputedStyle(parent).backgroundImage!=='none')) {
      skipped.push(text.slice(0,60)); continue;
    }
    let bg=[255,255,255], opacity=1;
    for(const parent of ancestors) {const s=getComputedStyle(parent); bg=blend(rgba(s.backgroundColor),bg); opacity*=Number(s.opacity);}
    const style=getComputedStyle(el), fg=rgba(style.color); fg[3]*=opacity;
    const a=lum(blend(fg,bg)), b=lum(bg), ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    const minimum=parseFloat(style.fontSize)>=24 || (parseFloat(style.fontSize)>=18.66 && Number(style.fontWeight)>=700)?3:4.5;
    checked++;
    if(ratio+.001<minimum) failures.push({text:text.slice(0,100), ratio:Number(ratio.toFixed(2)), minimum});
  }
  return {checked, failures, skipped, scope:'Visible HTML text on computed solid backgrounds; images are visually reviewed.'};
}"""


def run(base_url: str, output: Path) -> dict:
    screenshots = output / "screenshots"
    screenshots.mkdir(parents=True, exist_ok=True)
    report = {
        "captured_at": datetime.now(timezone(timedelta(hours=5))).isoformat(timespec="seconds"),
        "base_url": base_url, "browser": "Chromium", "widths": [], "checks": [],
        "screenshots": [], "failures": [],
    }

    def check(name: str, passed: bool, **details):
        record = {"name": name, "passed": bool(passed), **details}
        report["checks"].append(record)
        if not passed:
            report["failures"].append(record)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        report["browser_version"] = browser.version
        for width in CHECK_WIDTHS:
            context = browser.new_context(viewport={"width": width, "height": 900}, device_scale_factor=1)
            page = context.new_page()
            errors, failed_requests, bad_responses, bootstrap_css = [], [], [], []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("requestfailed", lambda request: failed_requests.append({"url": request.url, "failure": request.failure}))

            def response_received(response):
                if response.status >= 400:
                    bad_responses.append({"url": response.url, "status": response.status})
                if "bootstrap" in response.url and response.url.endswith(".css") and response.ok:
                    bootstrap_css.append(response.text())

            page.on("response", response_received)
            response = page.goto(urljoin(base_url, "index.html"), wait_until="networkidle")
            page.evaluate("document.fonts.ready")
            audit = page.evaluate(LAYOUT_AUDIT)
            audit["contrast"] = page.evaluate(CONTRAST_AUDIT)
            audit.update({"errors": errors, "failedRequests": failed_requests, "badResponses": bad_responses})
            report["widths"].append(audit)
            expected_manual = 1 if width < 768 else 2 if width < 1024 else 3
            expected_bootstrap = 1 if width < 768 else 2 if width < 992 else 3
            prefix = f"{width}px: "
            check(prefix + "page and resources load without browser errors", response.status == 200 and not errors and not failed_requests and not bad_responses)
            check(prefix + "no horizontal document overflow", audit["documentWidth"] <= width and audit["bodyWidth"] <= width)
            check(prefix + "manual grid columns", audit["manual"]["firstRowCount"] == expected_manual, expected=expected_manual, actual=audit["manual"]["firstRowCount"])
            check(prefix + "Bootstrap card columns", audit["cards"]["firstRowCount"] == expected_bootstrap, expected=expected_bootstrap, actual=audit["cards"]["firstRowCount"])
            check(prefix + "hero priority and responsive ordering", (audit["heroCopy"]["top"] < audit["heroArt"]["top"] and audit["heroCopyOrder"] == "1") if width < 992 else (audit["heroArt"]["left"] < audit["heroCopy"]["left"] and audit["heroCopyOrder"] == "2"))
            check(prefix + "desktop note uses responsive visibility", audit["desktopNoteVisible"] == (width >= 768))
            check(prefix + "navbar collapses below lg", audit["navbarToggleVisible"] == (width < 992) and audit["navbarLinksVisible"] == (width >= 992))
            check(prefix + "Bootstrap JavaScript loaded", audit["bootstrapLoaded"])
            check(prefix + "visible text contrast meets AA", not audit["contrast"]["failures"], checked=audit["contrast"]["checked"], failures=audit["contrast"]["failures"])

            if width == REPORT_WIDTHS[0]:
                check("semantic page: at least four sections, one main and h1", audit["sectionCount"] >= 4 and audit["mainCount"] == 1 and audit["h1Count"] == 1)
                check("responsive viewport and unique IDs", "width=device-width" in audit["viewport"] and not audit["duplicateIds"])
                check("images have alt attributes and load", not audit["imageErrors"])
                check("navbar anchors resolve to page sections", bool(audit["links"]) and all(link["targetExists"] for link in audit["links"]))
                css_links = audit["styles"]
                bs_index = next((i for i, href in enumerate(css_links) if "cdn.jsdelivr.net/npm/bootstrap@5.3" in href), -1)
                own_index = next((i for i, href in enumerate(css_links) if href.endswith("style.css")), -1)
                check("Bootstrap 5.3 CDN CSS precedes custom stylesheet", bs_index >= 0 and own_index > bs_index)
                check("Bootstrap 5.3 CDN bundle is before body end", any("cdn.jsdelivr.net/npm/bootstrap@5.3" in src and "bootstrap.bundle.min.js" in src for src in audit["scripts"]) and page.locator('body script[src*="bootstrap.bundle"]').count() == 1)
                bootstrap_names = set(re.findall(r"\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)", "\n".join(bootstrap_css)))
                collisions = sorted(set(audit["manualClasses"]) & bootstrap_names)
                check("manual section has no Bootstrap classes", bool(bootstrap_names) and not collisions, classes=audit["manualClasses"], collisions=collisions)
                manual_rules = [rule for rule in audit["cssRules"] if ".ritual" in rule["selector"] or "#rituals" in rule["selector"]]
                violations = [rule for rule in manual_rules if rule["position"] == "absolute" or re.fullmatch(r"[\d.]+(px|rem|em)", rule["width"]) or any("max-width" in condition for condition in rule["conditions"])]
                breakpoints = sorted({condition for rule in manual_rules for condition in rule["conditions"] if "min-width" in condition})
                check("manual layout has min-width breakpoints and no fixed widths or absolute positioning", len(breakpoints) >= 2 and not violations, breakpoints=breakpoints, violations=violations)
                check("custom CSS uses no floats or absolute positioning for layout", all(rule["float"] in ("", "none") and rule["position"] != "absolute" for rule in audit["cssRules"]))
                classes = audit["bootstrapClasses"]
                check("Bootstrap grid, responsive ordering, display and spacing utilities present", "container" in classes and "row" in classes and all(any(name.startswith(prefix) for name in classes) for prefix in ("col-md-", "col-lg-", "order-", "d-", "p", "m", "text-")))

            if width in REPORT_WIDTHS:
                def capture(filename, locator=None):
                    path = screenshots / filename
                    if locator is None:
                        raw = page.screenshot(path=str(path), full_page=True, animations="disabled")
                    else:
                        raw = page.locator(locator).screenshot(path=str(path), animations="disabled")
                    report["screenshots"].append({"path": f"screenshots/{filename}", "width": int.from_bytes(raw[16:20], "big"), "height": int.from_bytes(raw[20:24], "big"), "viewport_width": width})
                capture(f"page-{width}.png")
                for name, selector in (("hero", "#hero"), ("task1-rituals", "#rituals"), ("task2-cards", "#gatherings"), ("task2-faq", "#guide")):
                    capture(f"{name}-{width}.png", selector)
                page.evaluate("scrollTo(0,0)")
                if width < 992:
                    toggle = page.locator(".navbar-toggler")
                    toggle.click()
                    page.locator("#mainNavigation.show").wait_for(state="visible")
                    check(prefix + "navbar menu opens", toggle.get_attribute("aria-expanded") == "true")
                    if width == 375:
                        capture("navbar-375-open.png", "header")
                    page.locator('#mainNavigation a[href="#rituals"]').click()
                    page.wait_for_url("**#rituals")
                    check(prefix + "navbar anchor navigation works", page.url.endswith("#rituals"))
                    page.reload(wait_until="networkidle")

                accordion_buttons = page.locator("#guideAccordion .accordion-button")
                target = accordion_buttons.nth(1)
                target_selector = target.get_attribute("data-bs-target")
                target.click()
                page.locator(target_selector + ".show").wait_for(state="visible")
                check(prefix + "accordion opens requested panel and closes previous", target.get_attribute("aria-expanded") == "true" and page.locator("#guideAccordion .accordion-collapse.show").count() == 1)
                target.click()
                page.locator(target_selector).wait_for(state="hidden")
                check(prefix + "accordion closes requested panel", target.get_attribute("aria-expanded") == "false")

                page.reload(wait_until="networkidle")
                focus_results = []
                for _ in range(18):
                    page.keyboard.press("Tab")
                    focus = page.evaluate(r"""() => {
                      const el=document.activeElement, s=getComputedStyle(el);
                      return {tag:el.tagName, text:el.textContent.trim().slice(0,55), classes:el.className,
                        focusVisible:el.matches(':focus-visible'), outline:s.outlineStyle,
                        outlineWidth:s.outlineWidth, boxShadow:s.boxShadow,
                        visible:el.getClientRects().length>0};
                    }""")
                    if focus["tag"] not in ("BODY", "HTML"):
                        focus_results.append(focus)
                check(prefix + "keyboard controls have visible focus", bool(focus_results) and all(item["visible"] and item["focusVisible"] and ((item["outline"] != "none" and float(item["outlineWidth"].removesuffix("px")) > 0) or item["boxShadow"] != "none") for item in focus_results), controls=focus_results)
            context.close()

        phone = next(item for item in report["widths"] if item["width"] == 375)
        tablet = next(item for item in report["widths"] if item["width"] == 768)
        check("manual breakpoint changes typography or spacing as well as column count", phone["manualLayout"] != tablet["manualLayout"], phone=phone["manualLayout"], tablet=tablet["manualLayout"])
        context = browser.new_context(viewport={"width": 1280, "height": 900}, reduced_motion="reduce")
        page = context.new_page()
        page.goto(urljoin(base_url, "index.html"), wait_until="networkidle")
        motions = page.evaluate("""() => [...document.querySelectorAll('*')].filter(el=>{
          const s=getComputedStyle(el); return s.animationName!=='none' && s.animationDuration.split(',').some(v=>parseFloat(v)>.01);
        }).map(el=>el.className)""")
        check("reduced motion has no continuous animation", not motions, elements=motions)
        context.close()
        browser.close()

    report["passed"] = not report["failures"]
    (output / "verification.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"passed": report["passed"], "checks": len(report["checks"]), "widths": len(report["widths"]), "screenshots": len(report["screenshots"]), "failures": report["failures"]}, ensure_ascii=False, indent=2))
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", help="Existing local or deployed URL; otherwise serve assignment3 locally")
    parser.add_argument("--output", type=Path, default=ROOT / "evidence")
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
