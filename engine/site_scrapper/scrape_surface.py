import json
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import os
import time
from collections import deque
from urllib.parse import urlparse, urljoin
from selenium_stealth import stealth

# from webdriver_manager.chrome import ChromeDriverManager # No longer needed
# from selenium.webdriver.chrome.service import Service as ChromeService # No longer needed

SITES_FILE = 'sites.json'
OUTPUT_FILE = 'output.md'


def get_domain(url):
    """Extracts the domain from a URL."""
    return urlparse(url).netloc

def crawl_site(driver, start_url, output_file, initial_domain, max_pages_to_crawl=50):
    """
    Recursively crawls a website, extracts links, and saves them to a markdown file.
    """
    visited_urls = set()
    urls_to_visit = deque([(start_url, 0)])  # (url, depth)
    
    with open(output_file, 'a') as f:
        f.write(f"## Links from {start_url}\n\n")

    page_count = 0
    while urls_to_visit and page_count < max_pages_to_crawl:
        current_url, depth = urls_to_visit.popleft()

        if current_url in visited_urls:
            continue

        print(f"  Crawling ({depth}): {current_url}")
        visited_urls.add(current_url)
        page_count += 1

        try:
            driver.get(current_url)
            time.sleep(40)  # Increased wait time further

            links = driver.find_elements(By.TAG_NAME, 'a')
            
            with open(output_file, 'a') as f:
                f.write(f"### Links on: {current_url}\n")
                found_internal_links = False
                for link in links:
                    href = link.get_attribute('href')
                    if href:
                        # Construct absolute URL
                        absolute_url = urljoin(current_url, href)
                        parsed_link = urlparse(absolute_url)

                        # Only consider http/https links and within the same initial domain
                        if parsed_link.scheme in ['http', 'https'] and get_domain(absolute_url) == initial_domain:
                            if absolute_url not in visited_urls:
                                urls_to_visit.append((absolute_url, depth + 1))
                            f.write(f"- {absolute_url}\n")
                            found_internal_links = True
                if not found_internal_links:
                    f.write("  (No internal links found or all filtered)\n")
                f.write('\n')

        except Exception as e:
            print(f"  Could not crawl {current_url}. Error: {e}")

def scrape_sites():
    """
    Scrapes websites from a json file for links and saves them to a markdown file.
    Uses selenium to handle javascript-rendered pages.
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

    # Check if sites_data is a dictionary and has a 'sites' key
    if not isinstance(sites_data, dict) or 'sites' not in sites_data:
        print(f"Error: '{SITES_FILE}' should contain a JSON object with a 'sites' key.")
        return
        
    sites = sites_data.get('sites', [])

    if not sites:
        print("No sites found in sites.json")
        return

    # Setup selenium webdriver
    try:
        # Use the manually downloaded chromedriver
        driver_path = "/Users/rogerwoolie/.gemini/tmp/942ba8aa2026708f4d8a55a6331dad0681fd0a07b97bade147f2009aefea09dc/chromedriver-mac-x64/chromedriver"
        options = uc.ChromeOptions()
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        driver = uc.Chrome(driver_executable_path=driver_path, headless=True, use_subprocess=False, options=options)
        
        # Apply selenium-stealth
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
        print("Please ensure you have Google Chrome installed.")
        print(f"Selenium error: {e}")
        return

    for site in sites:
        print(f"Starting deep scrape for {site}...")
        initial_domain = get_domain(site)
        crawl_site(driver, site, OUTPUT_FILE, initial_domain)

    driver.quit()
    print(f"Scraping finished. Links saved in {OUTPUT_FILE}")

if __name__ == '__main__':
    scrape_sites()