"""Invoke the authenticated cleanup endpoint from the API container's daily timer."""

from urllib.request import Request, urlopen

from .config import get_settings


def main() -> None:
    settings = get_settings()
    if not settings.cron_ready:
        raise SystemExit("CRON_SECRET is missing or invalid.")

    request = Request(
        "http://127.0.0.1:8000/api/cron/cleanup",
        headers={"Authorization": f"Bearer {settings.cron_secret}"},
    )
    with urlopen(request, timeout=120) as response:
        if response.status != 200:
            raise SystemExit(f"Cleanup failed with HTTP {response.status}.")
        print("Cleanup completed successfully.")


if __name__ == "__main__":
    main()
