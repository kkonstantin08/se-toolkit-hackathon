from __future__ import annotations

import time

from sqlalchemy import create_engine, text

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    max_attempts = 30

    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            print("Database is ready.")
            return
        except Exception as exc:  # noqa: BLE001
            print(f"Waiting for database ({attempt}/{max_attempts}): {exc}")
            time.sleep(2)

    raise RuntimeError("Database did not become ready in time.")


if __name__ == "__main__":
    main()

