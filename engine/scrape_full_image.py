import json
import re
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import time
from pathlib import Path
from selenium_stealth import stealth
import argparse
import os
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent


def _atomic_write_json(path: Path, obj: Any) -> None:
    """
    Write JSON atomically so a crash/interrupt never leaves a 0-byte/corrupt file.
    """
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp_path, path)


def _write_outputs(out_dir: Path, all_results: List[Dict[str, Any]]) -> None:
    output_json_file = out_dir / "page_output.json"
    info_output_json_file = out_dir / "info_output.json"
    image_output_json_file = out_dir / "image_output.json"

    # page_output.json (all data)
    _atomic_write_json(output_json_file, all_results)

    # info_output.json (non-image data only)
    info_results: List[Dict[str, Any]] = []
    for data in all_results:
        info = dict(data)
        info.pop("images", None)
        info_results.append(info)
    _atomic_write_json(info_output_json_file, info_results)

    # image_output.json (flattened image list with stable IDs)
    image_output: List[Dict[str, str]] = []
    for data in all_results:
        profile_id = data.get("ID", "unknown")
        for idx, img_url in enumerate(data.get("images", []), start=1):
            image_output.append({"id": f"IMW_{profile_id}_{idx:02d}", "url": img_url})
    _atomic_write_json(image_output_json_file, image_output)


def is_cloudflare(driver):
    """Check if Cloudflare challenge page is showing."""
    title = driver.title.lower()
    return 'just a moment' in title or 'attention required' in title


def try_click_turnstile(driver):
    """Try to find and click the Cloudflare Turnstile checkbox inside its iframe."""
    try:
        iframes = driver.find_elements(By.TAG_NAME, 'iframe')
        for iframe in iframes:
            src = iframe.get_attribute('src') or ''
            if 'challenges.cloudflare.com' in src or 'turnstile' in src:
                driver.switch_to.frame(iframe)
                time.sleep(1)
                try:
                    # Try clicking the checkbox
                    checkbox = driver.find_element(By.CSS_SELECTOR, 'input[type="checkbox"], .cb-i, #challenge-stage')
                    driver.execute_script("arguments[0].click();", checkbox)
                    print("    Clicked Turnstile checkbox")
                except Exception:
                    # Try clicking the body of the iframe as fallback
                    body = driver.find_element(By.TAG_NAME, 'body')
                    driver.execute_script("arguments[0].click();", body)
                    print("    Clicked Turnstile iframe body")
                finally:
                    driver.switch_to.default_content()
                return True
    except Exception:
        driver.switch_to.default_content()
    return False


def wait_for_cloudflare(driver, timeout=30):
    """
    Waits for Cloudflare challenge to resolve. Tries clicking turnstile
    and refreshing if needed. Returns True if resolved.
    """
    if not is_cloudflare(driver):
        return True

    start = time.time()
    clicked = False
    refreshed = False

    while time.time() - start < timeout:
        if not is_cloudflare(driver):
            return True

        elapsed = int(time.time() - start)

        # Try clicking the turnstile checkbox
        if not clicked:
            time.sleep(2)
            if try_click_turnstile(driver):
                clicked = True
                time.sleep(5)
                continue

        # If turnstile click didn't work after 15s, try refreshing
        if elapsed > 15 and not refreshed:
            print("    Refreshing page...")
            driver.refresh()
            refreshed = True
            time.sleep(5)
            clicked = False  # retry clicking after refresh
            continue

        print(f"    Waiting for Cloudflare... ({elapsed}s)")
        time.sleep(3)

    return not is_cloudflare(driver)


def scrape_one_page(driver, url_to_scrape):
    """
    Scrapes a single profile page and returns a structured data dict.
    """
    print(f"  Scraping: {url_to_scrape}")

    driver.get(url_to_scrape)
    time.sleep(5)

    # Wait for Cloudflare challenge to clear
    if not wait_for_cloudflare(driver):
        print(f"  WARNING: Cloudflare did not clear for {url_to_scrape}, retrying...")
        # Last resort: full reload
        driver.get(url_to_scrape)
        time.sleep(8)
        if is_cloudflare(driver):
            print(f"  SKIPPING: Cloudflare blocked {url_to_scrape}")
            return {'url': url_to_scrape, 'error': 'Cloudflare blocked', 'images': []}

    # Handle the age verification popup
    try:
        enter_button = driver.find_element(By.LINK_TEXT, "ENTER")
        enter_button.click()
        time.sleep(5)
    except Exception:
        pass

    # Wait again after ENTER click in case Cloudflare re-triggers
    if is_cloudflare(driver):
        wait_for_cloudflare(driver)

    # Click on the "SHOW PHONE" button to reveal the number
    try:
        show_phone_button = driver.find_element(By.PARTIAL_LINK_TEXT, "SHOW PHONE")
        driver.execute_script("arguments[0].click();", show_phone_button)
        time.sleep(2)
    except Exception:
        pass

    # Build structured data dict
    data = {}
    data['url'] = url_to_scrape

    # Extract name from URL (segment before the numeric ID)
    name_match = re.search(r'/([^/]+)/\d+/', url_to_scrape)
    if name_match:
        data['name'] = name_match.group(1)

    # Extract ID from URL
    id_match = re.search(r'/(\d+)/', url_to_scrape)
    if id_match:
        data['ID'] = id_match.group(1)

    data['Title'] = driver.title

    # Extract all visible text
    main_content = ""
    try:
        main_content = driver.find_element(By.TAG_NAME, 'body').text
    except Exception as e:
        print(f"Could not extract visible text: {e}")

    # Extract phone number from visible text
    phone_regex = r'(?:\+\d{1,3}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4,}'
    phone_numbers = re.findall(phone_regex, main_content)
    if phone_numbers:
        raw_phone = phone_numbers[0]
        cleaned_phone = re.sub(r'[^\d+\s].*$', '', raw_phone).strip()
        cleaned_phone = re.sub(r'\D+$', '', cleaned_phone)
        data['Phone Number'] = cleaned_phone
        data['temp_password'] = re.sub(r'\D', '', cleaned_phone)
    else:
        data['Phone Number'] = 'Not found'
        data['temp_password'] = ''

    # Extract content between "Last seen" and "CONTACT THIS ESCORT"
    if main_content:
        try:
            start_index = main_content.find("Last seen")
            end_index = main_content.find("CONTACT THIS ESCORT")
            if start_index != -1 and end_index != -1:
                visible_text = main_content[start_index:end_index]
                formatted_text = re.sub(r':\n', r': ', visible_text)
                filtered_lines = []
                for line in formatted_text.split('\n'):
                    stripped = line.strip()
                    if not stripped:
                        continue
                    if re.match(r'^[A-Z\s]+$', stripped):
                        continue
                    if stripped.lower().startswith('cell phone:'):
                        stripped = re.sub(r'(\d)\s*\D*$', r'\1', stripped)
                    filtered_lines.append(stripped)
                for line in filtered_lines:
                    kv = line.split(':', 1)
                    if len(kv) == 2:
                        key = kv[0].strip()
                        val = kv[1].strip()
                        data[key] = val
                    else:
                        data.setdefault('notes', []).append(line)
        except Exception as e:
            print(f"Error processing visible text: {e}")

    # Extract profile images - click thumbnails to get full-size URLs
    images = driver.find_elements(By.TAG_NAME, 'img')
    profile_image_pattern = re.compile(r'/preview/(?:400x592|100x100|800x|1200x)/')
    skip_pattern = re.compile(r'logo\.svg|/dist/|track\.|dmca\.com|badge|\.gif$', re.IGNORECASE)

    # Collect clickable thumbnail elements
    thumbnail_elements = []
    for img in images:
        src = img.get_attribute('src')
        if not src:
            continue
        if skip_pattern.search(src):
            continue
        if profile_image_pattern.search(src):
            thumbnail_elements.append(img)

    profile_images = []
    seen_urls = set()
    for img in thumbnail_elements:
        try:
            # Click the thumbnail to open the lightbox
            parent = img.find_element(By.XPATH, './..')
            driver.execute_script("arguments[0].click();", parent)
            time.sleep(2)

            # Look for the large image in the lightbox/overlay
            large_img_pattern = re.compile(r'/preview/(?:1000x700|800x|1200x)/')
            lightbox_images = driver.find_elements(By.TAG_NAME, 'img')
            for li in lightbox_images:
                li_src = li.get_attribute('src')
                if li_src and large_img_pattern.search(li_src) and li_src not in seen_urls:
                    seen_urls.add(li_src)
                    profile_images.append(li_src)
                    print(f"    Found full-size: {li_src}")

            # Close the lightbox by pressing Escape or clicking close
            try:
                from selenium.webdriver.common.keys import Keys
                driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
            except Exception:
                pass
            time.sleep(1)
        except Exception as e:
            # Fallback: use the thumbnail src if clicking fails
            src = img.get_attribute('src')
            if src and src not in seen_urls:
                seen_urls.add(src)
                profile_images.append(src)
                print(f"    Fallback thumbnail: {src}")

    data['images'] = profile_images

    return data


def scrape_pages(page_file: Path, out_dir: Path, max_urls: Optional[int] = None) -> None:
    """
    Scrapes all pages listed in page.json and outputs results to markdown and JSON.
    """
    try:
        page_data = json.loads(page_file.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"Error: '{page_file}' not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{page_file}'.")
        return

    # Support both old format {"url": "..."} and new format {"urls": [...]}
    if 'urls' in page_data:
        urls = page_data['urls']
    elif 'url' in page_data:
        urls = [page_data['url']]
    else:
        print(f"Error: No 'urls' or 'url' found in '{page_file}'.")
        return

    if not urls:
        print("No URLs to scrape.")
        return

    if max_urls is not None:
        urls = urls[: max_urls]

    print(f"Found {len(urls)} URL(s) to scrape.")

    driver = None
    try:
        driver_path = "/Users/rogerwoolie/.gemini/tmp/942ba8aa2026708f4d8a55a6331dad0681fd0a07b97bade147f2009aefea09dc/chromedriver-mac-x64/chromedriver"
        options = uc.ChromeOptions()
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')

        driver = uc.Chrome(driver_executable_path=driver_path, headless=False, use_subprocess=False, options=options)

        stealth(driver,
                languages=["en-US", "en"],
                vendor="Google Inc.",
                platform="Win32",
                webgl_vendor="Intel Inc.",
                renderer="Intel Iris OpenGL Engine",
                fix_hairline=True,
                )

        all_results = []
        for i, url in enumerate(urls):
            print(f"\n[{i + 1}/{len(urls)}]")
            try:
                data = scrape_one_page(driver, url)
                all_results.append(data)
                # Snapshot outputs so a later crash/interrupt doesn't lose progress.
                _write_outputs(out_dir, all_results)
            except Exception as e:
                print(f"  Failed to scrape {url}: {e}")
            # Delay between pages to avoid rate limiting
            if i < len(urls) - 1:
                time.sleep(3)

        # Final write (also covers the case where there were 0 results)
        _write_outputs(out_dir, all_results)

        print(f"\nDone! Scraped {len(all_results)}/{len(urls)} pages.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if driver:
            driver.quit()
        print("Content saved in page_output.json, info_output.json, and image_output.json")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--page-file",
        default=str(BASE_DIR / "page_source.json"),
        help="Path to page_source.json (defaults to engine/page_source.json).",
    )
    parser.add_argument(
        "--out-dir",
        default=str(BASE_DIR),
        help="Output directory for page_output.json/info_output.json/image_output.json (defaults to engine/).",
    )
    parser.add_argument(
        "--max-urls",
        type=int,
        default=None,
        help="Optional limit for number of URLs to scrape (useful for smoke tests).",
    )
    args = parser.parse_args()

    scrape_pages(Path(args.page_file), Path(args.out_dir), args.max_urls)
