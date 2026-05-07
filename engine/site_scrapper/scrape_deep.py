import json
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import time
from urllib.parse import urlparse, urljoin
from selenium_stealth import stealth

SITES_FILE = 'sites.json'
OUTPUT_FILE = 'output.md'


def get_domain(url):
    """Extracts the domain from a URL."""
    return urlparse(url).netloc

def scrape_links(driver, start_url, output_file):
    """
    Scrapes a single page for links (1 level deep only, no recursion).
    """
    initial_domain = get_domain(start_url)
    print(f"  Scraping: {start_url}")

    try:
        driver.get(start_url)
        time.sleep(10)

        # Handle age verification popup
        try:
            enter_button = driver.find_element(By.LINK_TEXT, "ENTER")
            enter_button.click()
            time.sleep(5)
        except Exception:
            pass

        links = driver.find_elements(By.TAG_NAME, 'a')
        seen = set()
        collected = []

        for link in links:
            href = link.get_attribute('href')
            if not href:
                continue
            absolute_url = urljoin(start_url, href)
            parsed = urlparse(absolute_url)
            # Only same-domain http/https links, deduplicated
            if parsed.scheme in ['http', 'https'] and get_domain(absolute_url) == initial_domain:
                if absolute_url not in seen:
                    seen.add(absolute_url)
                    collected.append(absolute_url)

        with open(output_file, 'a') as f:
            f.write(f"## Links from {start_url}\n\n")
            if collected:
                for url in collected:
                    f.write(f"- {url}\n")
            else:
                f.write("  (No internal links found)\n")
            f.write('\n')

        print(f"  Found {len(collected)} links")

    except Exception as e:
        print(f"  Could not scrape {start_url}. Error: {e}")

def scrape_sites():
    """
    Scrapes each site in sites.json for links (1 level deep only).
    """
    # Clear the output file
    with open(OUTPUT_FILE, 'w') as f:
        pass

    try:
        with open(SITES_FILE, 'r') as f:
            sites_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: '{SITES_FILE}' not found.")
        return

    if not isinstance(sites_data, dict) or 'sites' not in sites_data:
        print(f"Error: '{SITES_FILE}' should contain a JSON object with a 'sites' key.")
        return

    sites = sites_data.get('sites', [])

    if not sites:
        print("No sites found in sites.json")
        return

    # Setup selenium webdriver
    try:
        driver_path = "/Users/rogerwoolie/.gemini/tmp/942ba8aa2026708f4d8a55a6331dad0681fd0a07b97bade147f2009aefea09dc/chromedriver-mac-x64/chromedriver"
        options = uc.ChromeOptions()
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        driver = uc.Chrome(driver_executable_path=driver_path, headless=True, use_subprocess=False, options=options)

        stealth(driver,
                languages=["en-US", "en"],
                vendor="Google Inc.",
                platform="Win32",
                webgl_vendor="Intel Inc.",
                renderer="Intel Iris OpenGL Engine",
                fix_hairline=True,
                )
    except Exception as e:
        print("Error setting up Chrome webdriver.")
        print(f"Selenium error: {e}")
        return

    for site in sites:
        print(f"Scraping links from {site}...")
        scrape_links(driver, site, OUTPUT_FILE)

    driver.quit()
    print(f"Scraping finished. Links saved in {OUTPUT_FILE}")

if __name__ == '__main__':
    scrape_sites()
