"""Loopback-only server for the temporary website.

It serves the files in ``site/`` and records the small, predefined choices
accepted by ``POST /api/selection`` in ``data/responses.txt``.
"""

from __future__ import annotations

import cgi
import json
import mimetypes
from uuid import uuid4
from datetime import date, datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Final


HOST: Final = "127.0.0.1"
PORT: Final = 8000
ROOT: Final = Path(__file__).resolve().parent
SITE_DIRECTORY: Final = ROOT / "site"
DATA_FILE: Final = ROOT / "data" / "responses.txt"
MAX_REQUEST_BYTES: Final = 1_024
MAX_CUSTOM_ANSWER_CHARS: Final = 240
MAX_UPLOAD_BYTES: Final = 5 * 1024 * 1024
UPLOAD_DIRECTORY: Final = ROOT / "data" / "uploads"
HSE_QUIZ_ANSWERS: Final = {
    "q1": "C",
    "q2": "C",
    "q3": "C",
    "q4": "B",
}

# Keep this deliberately narrow. Add choices only when the page design calls
# for them, and keep the browser markup in site/index.html in sync.
ALLOWED_CHOICES: Final = {
    "yes": "Yes",
    "yes_of_course": "Yes, Of course",
    "sure": "Sure!",
    "not_really": "Not really.",
    "dinner_chill": "Dinner & Chill",
    "coffee_walking": "Coffee & Walking",
    "custom": "Custom answer",
    "date": "Selected date",
    "selfie_uploaded": "Selfie uploaded",
    "kiss_back": "I might kiss him back!",
    "kiss_cheek": "Sure but only on cheek \U0001F62D",
    "kiss_later": "He'll get his kiss but later.",
}


def is_available_date(selected_date: date) -> bool:
    """Allow only the specifically supplied Q4 dates."""
    return selected_date in {
        date(2026, 7, 30),
        date(2026, 8, 1),
        date(2026, 8, 2),
        date(2026, 8, 3),
        date(2026, 8, 4),
        date(2026, 8, 5),
        date(2026, 8, 6),
        date(2026, 8, 7),
    }


def append_selection(choice: str, detail: str | None = None) -> None:
    """Append one validated selection as a simple, line-oriented text record."""
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    record = ALLOWED_CHOICES[choice]
    if detail is not None:
        record = f"{record}: {detail}"
    with DATA_FILE.open("a", encoding="utf-8", newline="\n") as response_file:
        response_file.write(f"{timestamp}\t{record}\n")


def append_hse_quiz(answers: dict[str, str], score: int) -> None:
    """Record one fully validated HSE quiz submission and its server-calculated score."""
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    answer_summary = "; ".join(f"{key.upper()}={answers[key]}" for key in HSE_QUIZ_ANSWERS)
    with DATA_FILE.open("a", encoding="utf-8", newline="\n") as response_file:
        response_file.write(f"{timestamp}\tHSE quiz: {answer_summary}; Score: {score}/4\n")


def image_suffix(data: bytes) -> str | None:
    """Recognize only the small image formats accepted by the upload endpoint."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return ".webp"
    return None


class WebsiteHandler(BaseHTTPRequestHandler):
    """Serve only the declared static files and the narrowly scoped API."""

    server_version = "TemporaryWebsite/1.0"

    def do_GET(self) -> None:  # noqa: N802 - required stdlib method name
        requested_path = self.path.split("?", 1)[0]
        if requested_path == "/":
            requested_path = "/index.html"

        if requested_path not in {
            "/index.html",
            "/styles.css",
            "/app.js",
            "/images/1.png",
            "/images/2.png",
            "/images/2-no.png",
            "/images/3.png",
            "/images/4.png",
            "/images/5.png",
            "/images/6.png",
            "/images/pray.jpg",
            "/images/yes.png",
            "/images/no.png",
            "/images/final.png",
            "/music/rick.mp3",
            "/music/fah.mp3",
            "/music/donk.mp3",
        }:
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        file_path = SITE_DIRECTORY / requested_path.lstrip("/")
        try:
            content = file_path.read_bytes()
        except FileNotFoundError:
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:  # noqa: N802 - required stdlib method name
        requested_path = self.path.split("?", 1)[0]
        if requested_path == "/api/selection":
            self._handle_selection()
            return
        if requested_path == "/api/upload":
            self._handle_upload()
            return
        if requested_path == "/api/hse-quiz":
            self._handle_hse_quiz()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def _handle_selection(self) -> None:
        if self.path.split("?", 1)[0] != "/api/selection":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        content_length = self.headers.get("Content-Length")
        if content_length is None:
            self.send_error(HTTPStatus.LENGTH_REQUIRED, "Content-Length is required")
            return

        try:
            length = int(content_length)
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid Content-Length")
            return

        if length < 1 or length > MAX_REQUEST_BYTES:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Request body is too large")
            return

        if self.headers.get_content_type() != "application/json":
            self.send_error(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "Use application/json")
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON")
            return

        choice = payload.get("choice") if isinstance(payload, dict) else None
        if not isinstance(choice, str) or choice not in ALLOWED_CHOICES:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Unsupported choice"})
            return

        detail: str | None = None
        if choice == "custom":
            submitted_text = payload.get("text")
            if not isinstance(submitted_text, str):
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Text is required"})
                return
            detail = " ".join(submitted_text.split())
            if not detail or len(detail) > MAX_CUSTOM_ANSWER_CHARS:
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Text is invalid"})
                return

        if choice == "date":
            submitted_date = payload.get("date")
            if not isinstance(submitted_date, str):
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Date is required"})
                return
            try:
                selected_date = date.fromisoformat(submitted_date)
            except ValueError:
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Date is invalid"})
                return
            if selected_date.isoformat() != submitted_date or not is_available_date(selected_date):
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Date is unavailable"})
                return
            detail = submitted_date

        if choice == "selfie_uploaded":
            submitted_filename = payload.get("file")
            if not isinstance(submitted_filename, str):
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Upload is required"})
                return
            filename = Path(submitted_filename).name
            if filename != submitted_filename or not (UPLOAD_DIRECTORY / filename).is_file():
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Upload is invalid"})
                return
            detail = filename

        append_selection(choice, detail)
        self._send_json(HTTPStatus.CREATED, {"ok": True, "choice": ALLOWED_CHOICES[choice]})

    def _handle_hse_quiz(self) -> None:
        content_length = self.headers.get("Content-Length")
        if content_length is None:
            self.send_error(HTTPStatus.LENGTH_REQUIRED, "Content-Length is required")
            return
        try:
            length = int(content_length)
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid Content-Length")
            return
        if length < 1 or length > MAX_REQUEST_BYTES:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Request body is too large")
            return
        if self.headers.get_content_type() != "application/json":
            self.send_error(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "Use application/json")
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Invalid JSON"})
            return

        submitted_answers = payload.get("answers") if isinstance(payload, dict) else None
        if not isinstance(submitted_answers, dict) or set(submitted_answers) != set(HSE_QUIZ_ANSWERS):
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "All four answers are required"})
            return
        if any(not isinstance(answer, str) or answer not in {"A", "B", "C", "D"} for answer in submitted_answers.values()):
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Answers are invalid"})
            return

        answers = {key: submitted_answers[key] for key in HSE_QUIZ_ANSWERS}
        score = sum(answers[key] == correct_answer for key, correct_answer in HSE_QUIZ_ANSWERS.items())
        append_hse_quiz(answers, score)
        self._send_json(HTTPStatus.CREATED, {"ok": True, "score": score, "total": 4})

    def _handle_upload(self) -> None:
        content_length = self.headers.get("Content-Length")
        if content_length is None:
            self.send_error(HTTPStatus.LENGTH_REQUIRED, "Content-Length is required")
            return
        try:
            length = int(content_length)
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid Content-Length")
            return
        if length < 1 or length > MAX_UPLOAD_BYTES + 16_384:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Upload is too large")
            return
        if self.headers.get_content_type() != "multipart/form-data":
            self.send_error(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "Use multipart/form-data")
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": self.headers["Content-Type"],
                "CONTENT_LENGTH": str(length),
            },
        )
        if "photo" not in form:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Photo is required"})
            return
        photo = form["photo"]
        if isinstance(photo, list) or not photo.filename or photo.file is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Photo is invalid"})
            return

        data = photo.file.read(MAX_UPLOAD_BYTES + 1)
        if not data or len(data) > MAX_UPLOAD_BYTES:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Photo is too large or empty"})
            return
        suffix = image_suffix(data)
        if suffix is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Use a PNG, JPEG, or WebP image"})
            return

        UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}{suffix}"
        destination = UPLOAD_DIRECTORY / filename
        with destination.open("xb") as upload_file:
            upload_file.write(data)
        self._send_json(HTTPStatus.CREATED, {"ok": True, "filename": filename})

    def _send_json(self, status: HTTPStatus, payload: dict[str, object]) -> None:
        content = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)


def main() -> None:
    httpd = ThreadingHTTPServer((HOST, PORT), WebsiteHandler)
    print(f"Serving temporary website at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
