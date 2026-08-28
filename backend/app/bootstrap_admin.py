"""Create the first Super Admin in an empty Atlas database.

Run: python -m app.bootstrap_admin
"""

import getpass
from datetime import datetime, timezone
from uuid import uuid4

from pwdlib import PasswordHash

from .config import get_settings
from .repository import MongoRepository


def main() -> None:
    settings = get_settings()
    repository = MongoRepository(settings)
    if not repository.ready:
        raise SystemExit(repository.error or "Atlas is unavailable.")
    if repository.count_users() > 0:
        raise SystemExit("Bootstrap stopped: the users collection is not empty.")
    name = input("Super Admin name: ").strip()
    email = input("Super Admin email: ").strip().lower()
    password = getpass.getpass("Temporary password (minimum 10 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(name) < 2 or "@" not in email or len(password) < 10 or password != confirmation:
        raise SystemExit("Invalid name/email, short password, or passwords do not match.")
    timestamp = datetime.now(timezone.utc)
    repository.create_user({
        "id": str(uuid4()), "name": name, "email": email, "role": "admin", "department": "Administration",
        "initials": "".join(part[0] for part in name.split()[:2]).upper(),
        "passwordHash": PasswordHash.recommended().hash(password), "active": True, "mustChangePassword": True,
        "failedLoginCount": 0, "createdBy": "bootstrap", "createdAt": timestamp, "updatedAt": timestamp,
    })
    print("Super Admin created. Sign in and change the temporary password immediately.")


if __name__ == "__main__":
    main()
