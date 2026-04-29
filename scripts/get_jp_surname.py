# SPDX-License-Identifier: GPL-3.0-or-later
#
# Original work Copyright (c) 2024 沉默の金
# Modified work Copyright (c) 2026 Chizer

import json
import logging
import time
import random
import httpx
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO, 
    format="[%(levelname)s]%(asctime)s(%(lineno)d):%(message)s"
)

surname_list = []
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"

def get_surnames(page: int, max_retries: int = 5) -> list:
    url = "https://myoji-yurai.net/prefectureRanking.htm"
    params = {
        "prefecture": "全国",
        "page": page,
    }
    
    retry_count = 0
    while retry_count < max_retries:
        try:
            with httpx.Client(http2=True, verify=False, trust_env=False) as client:
                response = client.get(url, params=params, timeout=20, headers={"User-Agent": UA})
                response.raise_for_status()
                
                html = response.text
                soup = BeautifulSoup(html, "html.parser")
                content = soup.find("div", {"id": "content"})
                
                if not content:
                    raise ValueError("Could not find content container in page")

                local_surnames = []
                for table in content.find_all("table", {'class': 'simple'}):
                    thead = table.find("thead")
                    if thead is None or thead.text != "\n\n順位\n名字\n人数":
                        continue

                    for tr in table.find_all("tr", {'class': 'odd'}):
                        for a in tr.find_all("a"):
                            local_surnames.append(a.text)
                
                return local_surnames

        except Exception as e:
            retry_count += 1
            wait_time = min(retry_count * 2, 30) 
            logging.warning(f"Page {page} request failed (Attempt {retry_count}): {e}")
            if retry_count < max_retries:
                logging.info(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                logging.error(f"Max retries reached for Page {page}. Skipping.")
                return []

for page in range(80):
    logging.info(f"--- Fetching Page {page} ---")
    data = get_surnames(page)
    surname_list.extend(data)
    logging.info(f"Successfully extracted {len(data)} surnames from Page {page}")
    
    time.sleep(1 + random.random() * 2)

output_path = "jp_surnames.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(surname_list, f, ensure_ascii=False, indent=4)

logging.info(f"Total {len(surname_list)} surnames saved to {output_path}")