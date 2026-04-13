"""OAuth 2.0 authentication for the Google SDM API."""

import json
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

from securehome.config import settings

SDM_SCOPES = ["https://www.googleapis.com/auth/sdm.service"]


def _client_config() -> dict:
    """Build the OAuth client config from env vars."""
    return {
        "installed": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost:8080"],
        }
    }


def get_credentials() -> Credentials:
    """Return valid Google OAuth credentials, refreshing or re-authorizing as needed."""
    creds: Credentials | None = None
    token_path: Path = settings.token_file

    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SDM_SCOPES)

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    elif not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_config(_client_config(), SDM_SCOPES)
        creds = flow.run_local_server(port=8080)

    # Persist for next run
    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(creds.to_json())

    return creds
