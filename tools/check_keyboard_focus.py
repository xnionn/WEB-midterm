"""Targeted keyboard checks for Bootstrap controls whose focus was customized."""
import functools
import json
import threading
from http.server import ThreadingHTTPServer

from playwright.sync_api import sync_playwright

from test_site import ROOT, QuietHandler


def inspect_focus(page, selector):
    page.keyboard.press("Tab")
    page.locator(selector).focus()
    return page.locator(selector).evaluate("""el => {
      const style = getComputedStyle(el);
      return {selector: el.id || el.className, focusVisible: el.matches(':focus-visible'),
        outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth),
        outlineColor: style.outlineColor, shadow: style.boxShadow};
    }""")


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    checks = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            for width in (375, 768):
                page = browser.new_page(viewport={"width": width, "height": 900})
                for slug, selector in (("index", ".navbar-toggler"), ("about", '.accordion-button[data-bs-target="#faq-phone"]')):
                    page.goto(f"http://127.0.0.1:{server.server_port}/{slug}.html", wait_until="networkidle")
                    focus = inspect_focus(page, selector)
                    passed = focus["focusVisible"] and (focus["outline"] != "none" and focus["outlineWidth"] >= 2 or focus["shadow"] != "none")
                    page.keyboard.press("Enter")
                    target = "#site-navigation.show" if slug == "index" else "#faq-phone.show"
                    page.locator(target).wait_for(state="visible")
                    checks.append({"page": slug, "width": width, "passed": passed, "focus": focus, "keyboardActivation": True})
                page.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    result = {"passed": all(check["passed"] for check in checks), "checks": checks}
    (ROOT / "artifacts" / "keyboard-focus-audit.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["passed"] else 1)


if __name__ == "__main__":
    main()
