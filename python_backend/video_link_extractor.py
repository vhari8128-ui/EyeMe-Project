import bs4
from playwright.sync_api import sync_playwright
from pathlib import Path
import re
from urllib.parse import urljoin

# TODO: connect with widget from website and feed in some text from website
def download_video_links(search_query : str):
    watch_links = []
    video_links_file = Path("video_links.txt")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Open a new isolated browser context and page
        context = browser.new_context()
        page = context.new_page()
        # Navigate to youtube
        root_link = "https://www.youtube.com"
        page.goto(root_link)
        # grab the search bar
        search_bar = page.locator(".ytSearchboxComponentInput")
        # type in the search
        search_bar.fill(search_query)
        # press enter
        page.keyboard.press("Enter")
        # wait for things in the webpage to load properly
        page.wait_for_load_state("networkidle")
        # pass the raw webpage into bs4
        soup = bs4.BeautifulSoup(page.content(), "html.parser")
        # get the a tags that have href attribute and a 'start_radio=' in the link
        a_tags = soup.find_all("a")
        for a_tag in a_tags:
            link = a_tag.get("href")
            if link:
                regex_search = re.search(r"/watch\?v\=", link, flags=re.I | re.X)
                if regex_search:
                    if re.search(r"start_radio\=", link):
                        watch_links.append(urljoin(root_link, link))
        # write all the links to a file
        video_links_file.write_text("\n".join(list(dict.fromkeys(watch_links))))

        # Clean up connections
        context.close()
        browser.close()

"""
search_query = "Let it happen by Tame Impala"
download_video_links(search_query)
# video_links.txt has been updated
"""