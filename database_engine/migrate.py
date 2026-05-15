#!/usr/bin/env python3
import os
import sys
import psycopg2


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
    base_dir = os.path.dirname(os.path.abspath(__file__))
    schema_path = os.path.join(base_dir, "schema.sql")
    if not os.path.isfile(schema_path):
        print(f"Missing schema: {schema_path}")
        return 1

    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(schema_sql)
        print("Schema applied successfully.")
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
