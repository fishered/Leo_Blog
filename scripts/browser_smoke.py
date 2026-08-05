from pathlib import Path

from playwright.sync_api import Page, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)
BASE_URL = "http://127.0.0.1:4321"


def assert_no_horizontal_overflow(page: Page) -> None:
    assert page.locator("body").evaluate("el => el.scrollWidth <= innerWidth")


def is_app_console_error(message: str) -> bool:
    return "ERR_NETWORK_ACCESS_DENIED" not in message


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True)
    console_errors: list[str] = []

    desktop = browser.new_page(viewport={"width": 1440, "height": 1000})
    desktop.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error" and is_app_console_error(message.text)
        else None,
    )
    desktop.goto(f"{BASE_URL}/", wait_until="networkidle")
    assert desktop.locator(".hero-identity h1", has_text="Leo").is_visible()
    assert desktop.get_by_role("heading", name="最近文章").is_visible()
    assert desktop.get_by_role("complementary", name="关于 Leo 与主题索引").is_visible()
    assert desktop.locator(".featured-post").is_visible()
    assert desktop.locator(".post-row").count() >= 1
    assert desktop.locator(".floating-tools").is_visible()
    assert desktop.locator(".mobile-dock").is_hidden()
    desktop.wait_for_selector("#live2dcanvas", state="visible", timeout=10_000)
    desktop.wait_for_selector("#player .aplayer-play", state="visible", timeout=10_000)
    desktop.wait_for_selector("#player .aplayer-list li", state="attached", timeout=10_000)
    assert desktop.locator("#live2dcanvas").is_visible()
    assert desktop.locator("#player .aplayer-body").is_visible()
    assert desktop.locator("#player .aplayer-list li").count() >= 2
    assert_no_horizontal_overflow(desktop)
    desktop.screenshot(path=ARTIFACTS / "home-desktop.png", full_page=True)

    desktop.locator("#live2dcanvas").click(position={"x": 80, "y": 120})
    desktop.locator("#player .aplayer-play").click()
    desktop.wait_for_timeout(500)
    desktop.screenshot(path=ARTIFACTS / "home-desktop-player.png", full_page=False)

    desktop.get_by_role("button", name="切换夜间模式").first.click()
    assert desktop.locator("html").get_attribute("data-theme") == "dark"

    desktop.goto(
        f"{BASE_URL}/posts/system-stress-testing-design/",
        wait_until="networkidle",
    )
    assert desktop.get_by_role(
        "heading", name="从一次调度器压测说起：压测该怎么设计才有用", exact=True
    ).is_visible()
    assert desktop.get_by_text("发布轨迹", exact=True).is_visible()
    assert desktop.locator("aside.toc").is_visible()
    desktop_images = desktop.locator(".prose img")
    assert desktop_images.count() == 4
    for index in range(desktop_images.count()):
        desktop_images.nth(index).scroll_into_view_if_needed()
        desktop.wait_for_timeout(100)
    assert desktop.locator(".prose img").evaluate_all(
        "images => images.every(image => image.complete && image.naturalWidth > 100 && image.naturalHeight > 100)"
    )
    assert_no_horizontal_overflow(desktop)
    desktop.screenshot(path=ARTIFACTS / "firefly-stress-article-desktop.png", full_page=True)

    desktop.goto(
        f"{BASE_URL}/en/posts/system-stress-testing-design/",
        wait_until="networkidle",
    )
    assert desktop.get_by_role(
        "heading", name="What a Scheduler Benchmark Taught Me About Useful Stress Testing", exact=True
    ).is_visible()
    english_desktop_images = desktop.locator(".prose img")
    assert english_desktop_images.count() == 4
    for index in range(english_desktop_images.count()):
        english_desktop_images.nth(index).scroll_into_view_if_needed()
        desktop.wait_for_timeout(100)
    assert desktop.locator(".prose img").evaluate_all(
        "images => images.every(image => image.complete && image.naturalWidth > 100 && image.naturalHeight > 100)"
    )
    assert_no_horizontal_overflow(desktop)
    desktop.screenshot(path=ARTIFACTS / "stress-testing-article-en-desktop.png", full_page=True)

    desktop.goto(f"{BASE_URL}/search/", wait_until="networkidle")
    search = desktop.locator(".pagefind-ui__search-input")
    assert search.is_visible()
    search.fill("Firefly")
    desktop.wait_for_selector(".pagefind-ui__result")
    assert desktop.locator(".pagefind-ui__result").count() >= 1

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    mobile.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error" and is_app_console_error(message.text)
        else None,
    )
    mobile.goto(f"{BASE_URL}/", wait_until="networkidle")
    assert mobile.locator(".hero-identity h1", has_text="Leo").is_visible()
    assert mobile.get_by_role("heading", name="最近文章").is_visible()
    assert mobile.locator(".featured-post").is_visible()
    assert mobile.locator(".mobile-dock").is_visible()
    assert mobile.locator(".floating-tools").is_hidden()
    assert mobile.locator("#live2d-widget").count() == 0
    assert mobile.locator("#player .aplayer-body").count() == 0
    loaded_resources = mobile.evaluate("performance.getEntriesByType('resource').map(entry => entry.name)")
    assert not any("L2Dwidget" in resource or "APlayer.min.js" in resource for resource in loaded_resources)
    assert_no_horizontal_overflow(mobile)
    mobile.screenshot(path=ARTIFACTS / "home-mobile.png", full_page=True)

    mobile.goto(
        f"{BASE_URL}/posts/system-stress-testing-design/",
        wait_until="networkidle",
    )
    assert mobile.get_by_role(
        "heading", name="从一次调度器压测说起：压测该怎么设计才有用", exact=True
    ).is_visible()
    mobile_images = mobile.locator(".prose img")
    assert mobile_images.count() == 4
    for index in range(mobile_images.count()):
        mobile_images.nth(index).scroll_into_view_if_needed()
        mobile.wait_for_timeout(100)
    assert mobile.locator(".prose img").evaluate_all(
        "images => images.every(image => image.complete && image.naturalWidth > 100 && image.naturalHeight > 100)"
    )
    assert mobile.locator(".mobile-dock").is_visible()
    assert_no_horizontal_overflow(mobile)
    mobile.screenshot(path=ARTIFACTS / "firefly-stress-article-mobile.png", full_page=True)

    mobile.goto(
        f"{BASE_URL}/en/posts/system-stress-testing-design/",
        wait_until="networkidle",
    )
    assert mobile.get_by_role(
        "heading", name="What a Scheduler Benchmark Taught Me About Useful Stress Testing", exact=True
    ).is_visible()
    english_mobile_images = mobile.locator(".prose img")
    assert english_mobile_images.count() == 4
    for index in range(english_mobile_images.count()):
        english_mobile_images.nth(index).scroll_into_view_if_needed()
        mobile.wait_for_timeout(100)
    assert mobile.locator(".prose img").evaluate_all(
        "images => images.every(image => image.complete && image.naturalWidth > 100 && image.naturalHeight > 100)"
    )
    assert mobile.locator(".mobile-dock").is_visible()
    assert_no_horizontal_overflow(mobile)
    mobile.screenshot(path=ARTIFACTS / "stress-testing-article-en-mobile.png", full_page=True)

    assert not console_errors, f"Browser console errors: {console_errors}"
    browser.close()

print("Browser smoke checks passed.")
