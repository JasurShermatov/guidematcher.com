import smtplib
from email.mime.text import MIMEText


def send_mail(to: str, code: int) -> None:
    msg = MIMEText(f"Your verification code is {code}", "plain", "utf-8")
    msg["Subject"] = "Verification Code"
    msg["From"] = "shermatovjasur800@uzguide.com"
    msg["To"] = to

    with smtplib.SMTP("email-smtp.eu-north-1.amazonaws.com", 587) as server:
        server.starttls()
        server.login(
            "AKIAV7NCB3PMF5NSVO54", "BHwPy+0besKAneKcWfUfc8fLUI1ACSWxNtWjpSdfQ/ON"
        )
        server.send_message(msg)


send_mail("jasurshermatovv2005@gmail.com", 123456)
