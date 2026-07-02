from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    SUPPRESS_SEND=1 if settings.MAIL_SUPPRESS_SEND else 0,
)

fast_mail = FastMail(conf)


async def send_email(subject: str, recipient: str, html_body: str) -> None:
    """Send an HTML email. When MAIL_SUPPRESS_SEND is true the message is not
    actually delivered (useful for local development and tests)."""
    message = MessageSchema(
        subject=subject,
        recipients=[recipient],
        body=html_body,
        subtype=MessageType.html,
    )
    await fast_mail.send_message(message)
