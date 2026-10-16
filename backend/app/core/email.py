import logging
import smtplib
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    """Send a plain-text email via SMTP with STARTTLS.

    If SMTP is not configured (empty settings), this does NOT crash — it just
    logs that email is disabled, including the body so codes are visible in the
    server console during development.
    """
    configured = all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASS, settings.SMTP_FROM])
    if not configured or not to:
        logger.warning(
            "Email not configured (or no recipient); skipping send to %s. Subject: %s | Body: %s",
            to, subject, body,
        )
        return

    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_FROM, [to], msg.as_string())
    except Exception as exc:
        logger.warning("Failed to send email to %s: %s", to, exc)
