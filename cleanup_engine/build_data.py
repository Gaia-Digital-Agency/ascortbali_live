#!/usr/bin/env python3
import json
import os
import re
import uuid


def main() -> int:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(base_dir)

    info_file = os.path.join(base_dir, "info_output.json")
    clean_dir = os.path.join(root_dir, "app", "Assets", "Creator", "clean_image")

    page_out = os.path.join(root_dir, "app", "data", "page_data.json")
    image_out = os.path.join(root_dir, "app", "data", "image_data.json")

    if not os.path.isfile(info_file):
        print(f"Missing info_output.json: {info_file}")
        return 1

    if not os.path.isdir(clean_dir):
        print(f"Missing clean_image folder: {clean_dir}")
        return 1

    with open(info_file, "r", encoding="utf-8") as f:
        items = json.load(f)

    if not isinstance(items, list):
        print("info_output.json must be a list")
        return 1

    # Load existing data to preserve UUIDs and entries
    existing_pages = []
    if os.path.isfile(page_out):
        with open(page_out, "r", encoding="utf-8") as f:
            existing_pages = json.load(f)

    existing_images = []
    if os.path.isfile(image_out):
        with open(image_out, "r", encoding="utf-8") as f:
            existing_images = json.load(f)

    # Build lookup of existing profile IDs -> UUIDs
    id_to_uuid = {}
    existing_page_ids = set()
    for p in existing_pages:
        pid = str(p.get("ID", ""))
        if pid:
            existing_page_ids.add(pid)
            if p.get("uuid"):
                id_to_uuid[pid] = p["uuid"]

    # Add new pages, keep existing ones
    page_items = list(existing_pages)
    added_pages = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        profile_id = item.get("ID")
        if profile_id and str(profile_id) in existing_page_ids:
            continue
        page_uuid = str(uuid.uuid4())
        row = dict(item)
        row["uuid"] = page_uuid
        page_items.append(row)
        added_pages += 1
        if profile_id:
            id_to_uuid[str(profile_id)] = page_uuid
            existing_page_ids.add(str(profile_id))

    with open(page_out, "w", encoding="utf-8") as f:
        json.dump(page_items, f, indent=2, ensure_ascii=False)

    # Build lookup of existing image IDs
    existing_image_ids = set()
    for img in existing_images:
        existing_image_ids.add(img.get("id", ""))

    pattern = re.compile(r"^IM_(.+)\.(jpg|jpeg|png|webp)$", re.IGNORECASE)
    image_items = list(existing_images)
    added_images = 0

    for name in sorted(os.listdir(clean_dir)):
        match = pattern.match(name)
        if not match:
            continue
        image_id = match.group(1)
        full_id = f"IM_{image_id}"
        if full_id in existing_image_ids:
            continue
        parts = image_id.split("_")
        profile_id = parts[0] if parts else ""
        page_uuid = id_to_uuid.get(profile_id)
        rel_path = os.path.join("app", "Assets", "Creator", "clean_image", name)
        image_items.append({
            "id": full_id,
            "file": rel_path,
            "profile_id": profile_id,
            "page_uuid": page_uuid,
        })
        added_images += 1
        existing_image_ids.add(full_id)

    with open(image_out, "w", encoding="utf-8") as f:
        json.dump(image_items, f, indent=2, ensure_ascii=False)

    print(f"Pages: {len(existing_pages)} existing + {added_pages} new = {len(page_items)} total")
    print(f"Images: {len(existing_images)} existing + {added_images} new = {len(image_items)} total")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
