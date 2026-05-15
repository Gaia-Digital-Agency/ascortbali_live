#!/usr/bin/env python3
import json
import os
import psycopg2
import re

MAX_SEQUENCE_NUMBER = 7

# Seed only the top 3 currently displayed creators from the live site state.
SEEDED_CREATOR_UUIDS = {
    "12914f5a-54c0-4582-a6aa-8892cda97919",  # alisa
    "579e2fc0-ad75-4766-9dd2-ff88a446b0e7",  # kristy
    "0be39a1c-96f5-4f27-988a-94d74c34a1b3",  # ruby
}


def to_int(value):
    try:
        if value is None or value == "":
            return None
        return int(str(value).strip())
    except Exception:
        return None


def normalize_notes(value):
    if value is None:
        return None
    if isinstance(value, list):
        return "\n".join(str(v) for v in value if v)
    return str(value)

def digits_only(value):
    if value is None:
        return ""
    return "".join(ch for ch in str(value) if ch.isdigit())


def normalize_page(p):
    model_name = p.get("Model name") or p.get("name")
    username = str(p.get("name") or model_name or p.get("ID") or "").strip().lower()
    raw_temp_password = str(p.get("temp_password") or "").strip()
    normalized_temp_password = digits_only(raw_temp_password)
    normalized_phone_number = digits_only(p.get("Phone Number"))
    normalized_cell_phone = digits_only(p.get("Cell phone"))
    provider_id_digits = digits_only(p.get("ID"))
    final_password = normalized_temp_password or normalized_phone_number or normalized_cell_phone or provider_id_digits

    return {
        "uuid": p.get("uuid"),
        "provider_id": p.get("ID"),
        "username": username or f"creator_{p.get('ID')}",
        "password": final_password,
        "url": p.get("url"),
        "title": p.get("Title"),
        "temp_password": final_password or None,
        "last_seen": p.get("Last seen online"),
        "gender": p.get("Gender"),
        "age": to_int(p.get("Age")),
        "orientation": p.get("Orientation"),
        "ethnicity": p.get("Ethnicity"),
        "nationality": p.get("Nationality"),
        "languages": p.get("Languages"),
        "height": p.get("Height"),
        "weight": p.get("Weight"),
        "eyes": p.get("Eyes"),
        "hair_color": p.get("Hair color"),
        "hair_length": p.get("Hair length") or p.get("Hair lenght"),
        "pubic_hair": p.get("Pubic hair"),
        "bust_size": p.get("Bust size"),
        "bust_type": p.get("Bust type"),
        "dick_size": p.get("Dick size"),
        "smoker": p.get("Smoker"),
        "tattoo": p.get("Tattoo"),
        "piercing": p.get("Piercing"),
        "country": p.get("Country"),
        "city": p.get("City"),
        "city_part": p.get("City part"),
        "location": p.get("Location"),
        "phone_number": p.get("Phone Number"),
        "cell_phone": p.get("Cell phone"),
        "cell_phone_2": p.get("Cell phone 2"),
        "telegram_id": p.get("Telegram ID"),
        "telegram_id_2": p.get("Telegram ID 2"),
        "wechat_id": p.get("WeChat ID"),
        "services": p.get("Services"),
        "available_for": p.get("Available for"),
        "meeting_with": p.get("Meeting with"),
        "travel": p.get("Travel"),
        "tour": p.get("Tour"),
        "escort_type": p.get("Escort type"),
        "provides": p.get("Provides"),
        "model_name": model_name,
        "notes": normalize_notes(p.get("notes")),
    }


def is_placeholder_page(raw):
    title = str(raw.get("Title") or "").strip().lower()
    name = str(raw.get("name") or raw.get("Model name") or "").strip().lower()
    return title == "page not found" or name == "page not found"


def get_conn():
    dsn = os.getenv("DATABASE_URL")
    if dsn:
        return psycopg2.connect(dsn)
    return psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=os.getenv("PGPORT", "5432"),
        dbname=os.getenv("PGDATABASE", "ascortbali"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", ""),
    )


def main() -> int:
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    page_path = os.path.join(root_dir, "app", "data", "page_data.json")
    image_path = os.path.join(root_dir, "app", "data", "image_data.json")

    if not os.path.isfile(page_path):
        print(f"Missing page data: {page_path}")
        return 1
    if not os.path.isfile(image_path):
        print(f"Missing image data: {image_path}")
        return 1

    with open(page_path, "r", encoding="utf-8") as f:
        all_pages = json.load(f)
    with open(image_path, "r", encoding="utf-8") as f:
        images = json.load(f)

    if not isinstance(all_pages, list) or not isinstance(images, list):
        print("Invalid data format in page_data.json or image_data.json")
        return 1

    pages = [
        p
        for p in all_pages
        if isinstance(p, dict)
        and not is_placeholder_page(p)
        and str(p.get("uuid") or "") in SEEDED_CREATOR_UUIDS
    ]
    valid_provider_uuids = {str(p.get("uuid")) for p in pages if p.get("uuid")}

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO app_accounts (role, username, password)
                    VALUES
                      ('admin', 'admin@email.com', 'Admin@123'),
                      ('user', 'user@email.com', 'User@123')
                    ON CONFLICT (username) DO UPDATE SET
                      role = EXCLUDED.role,
                      password = EXCLUDED.password,
                      updated_at = NOW()
                    """
                )
                cur.execute(
                    """
                    INSERT INTO user_profiles (account_id, full_name, gender, age_group, nationality, city, preferred_contact, relationship_status)
                    SELECT id, 'Default User', 'female', '25-34', 'Indonesia', 'Bali', 'telegram', 'single'
                    FROM app_accounts
                    WHERE username = 'user@email.com'
                    ON CONFLICT (account_id) DO UPDATE SET
                      full_name = EXCLUDED.full_name,
                      gender = EXCLUDED.gender,
                      age_group = EXCLUDED.age_group,
                      nationality = EXCLUDED.nationality,
                      city = EXCLUDED.city,
                      preferred_contact = EXCLUDED.preferred_contact,
                      relationship_status = EXCLUDED.relationship_status,
                      updated_at = NOW()
                    """
                )

                # Upsert providers
                for raw in pages:
                    p = normalize_page(raw)
                    cur.execute(
                        """
                        INSERT INTO providers (uuid, provider_id, username, password, url, title, temp_password, last_seen,
                                               gender, age, orientation, ethnicity, nationality, languages,
                                               height, weight, eyes, hair_color, hair_length, pubic_hair,
                                               bust_size, bust_type, dick_size, smoker, tattoo, piercing,
                                               country, city, city_part, location,
                                               phone_number, cell_phone, cell_phone_2, telegram_id, telegram_id_2, wechat_id,
                                               services, available_for, meeting_with, travel, tour, escort_type, provides, model_name, notes)
                        VALUES (%(uuid)s, %(provider_id)s, %(username)s, %(password)s, %(url)s, %(title)s, %(temp_password)s, %(last_seen)s,
                                %(gender)s, %(age)s, %(orientation)s, %(ethnicity)s, %(nationality)s, %(languages)s,
                                %(height)s, %(weight)s, %(eyes)s, %(hair_color)s, %(hair_length)s, %(pubic_hair)s,
                                %(bust_size)s, %(bust_type)s, %(dick_size)s, %(smoker)s, %(tattoo)s, %(piercing)s,
                                %(country)s, %(city)s, %(city_part)s, %(location)s,
                                %(phone_number)s, %(cell_phone)s, %(cell_phone_2)s, %(telegram_id)s, %(telegram_id_2)s, %(wechat_id)s,
                                %(services)s, %(available_for)s, %(meeting_with)s, %(travel)s, %(tour)s, %(escort_type)s, %(provides)s, %(model_name)s, %(notes)s)
                        ON CONFLICT (uuid) DO UPDATE SET
                            provider_id = EXCLUDED.provider_id,
                            username = EXCLUDED.username,
                            password = EXCLUDED.password,
                            url = EXCLUDED.url,
                            title = EXCLUDED.title,
                            temp_password = EXCLUDED.temp_password,
                            last_seen = EXCLUDED.last_seen,
                            gender = EXCLUDED.gender,
                            age = EXCLUDED.age,
                            orientation = EXCLUDED.orientation,
                            ethnicity = EXCLUDED.ethnicity,
                            nationality = EXCLUDED.nationality,
                            languages = EXCLUDED.languages,
                            height = EXCLUDED.height,
                            weight = EXCLUDED.weight,
                            eyes = EXCLUDED.eyes,
                            hair_color = EXCLUDED.hair_color,
                            hair_length = EXCLUDED.hair_length,
                            pubic_hair = EXCLUDED.pubic_hair,
                            bust_size = EXCLUDED.bust_size,
                            bust_type = EXCLUDED.bust_type,
                            dick_size = EXCLUDED.dick_size,
                            smoker = EXCLUDED.smoker,
                            tattoo = EXCLUDED.tattoo,
                            piercing = EXCLUDED.piercing,
                            country = EXCLUDED.country,
                            city = EXCLUDED.city,
                            city_part = EXCLUDED.city_part,
                            location = EXCLUDED.location,
                            phone_number = EXCLUDED.phone_number,
                            cell_phone = EXCLUDED.cell_phone,
                            cell_phone_2 = EXCLUDED.cell_phone_2,
                            telegram_id = EXCLUDED.telegram_id,
                            telegram_id_2 = EXCLUDED.telegram_id_2,
                            wechat_id = EXCLUDED.wechat_id,
                            services = EXCLUDED.services,
                            available_for = EXCLUDED.available_for,
                            meeting_with = EXCLUDED.meeting_with,
                            travel = EXCLUDED.travel,
                            tour = EXCLUDED.tour,
                            escort_type = EXCLUDED.escort_type,
                            provides = EXCLUDED.provides,
                            model_name = EXCLUDED.model_name,
                            notes = EXCLUDED.notes
                        """,
                        p,
                    )

                # Upsert images
                for img in images:
                    image_id = str(img.get("id") or "").strip()
                    provider_uuid = img.get("page_uuid")
                    if not image_id or not provider_uuid:
                        continue
                    if provider_uuid not in valid_provider_uuids:
                        continue

                    match = re.search(r"(\d+)$", image_id)
                    sequence_number = int(match.group(1)) if match else None
                    if not sequence_number:
                        continue
                    if sequence_number > MAX_SEQUENCE_NUMBER:
                        continue

                    # Keep (provider_uuid, sequence_number) unique by removing stale row first.
                    cur.execute(
                        """
                        DELETE FROM provider_images
                         WHERE provider_uuid = %s
                           AND sequence_number = %s
                           AND image_id <> %s
                        """,
                        (provider_uuid, sequence_number, image_id),
                    )

                    cur.execute(
                        """
                        INSERT INTO provider_images (image_id, provider_uuid, provider_id, image_file, sequence_number, resolution)
                        VALUES (%s, %s, %s, %s, %s, 'clean')
                        ON CONFLICT (image_id) DO UPDATE SET
                            image_file = EXCLUDED.image_file,
                            provider_uuid = EXCLUDED.provider_uuid,
                            provider_id = EXCLUDED.provider_id,
                            sequence_number = EXCLUDED.sequence_number
                        """,
                        (
                            image_id,
                            provider_uuid,
                            img.get("profile_id"),
                            img.get("file"),
                            sequence_number,
                        ),
                    )

                cur.execute(
                    """
                    INSERT INTO advertising_spaces (slot, image, text, link_url)
                    VALUES
                      ('home-1', '/api/uploads/baligirls/ads/unique.png', NULL, 'https://lightcyan-horse-210187.hostingersite.com/'),
                      ('home-2', '/api/uploads/baligirls/ads/humapedia.png', NULL, 'https://www.humanspedia.com/'),
                      ('home-3', NULL, NULL, 'https://www.baligirls.com/'),
                      ('bottom', NULL, 'Your Ads Here', NULL)
                    ON CONFLICT (slot) DO UPDATE SET
                      image = EXCLUDED.image,
                      text = EXCLUDED.text,
                      link_url = EXCLUDED.link_url,
                      updated_at = NOW()
                    """
                )

        print(
            f"Seeded {len(pages)} providers and up to {MAX_SEQUENCE_NUMBER} image slots per provider "
            f"(selected creators only, from {len(images)} source image rows)."
        )
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
