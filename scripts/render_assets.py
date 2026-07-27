from pathlib import Path
from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]
source = root / "design" / "leo-study-hero-v2.svg"
output = root / "public" / "images" / "leo-study-hero-v2.png"
output.parent.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1600, "height": 620}, device_scale_factor=1)
    page.goto(source.as_uri(), wait_until="load")
    page.screenshot(path=output)
    browser.close()

print(output)
