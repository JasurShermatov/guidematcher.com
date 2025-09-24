import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException


def send_email(to_email, subject, content):
    # 🔑 API konfiguratsiya
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = (
        "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"
    )

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    # ✉️ Email ma’lumotlari
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"name": "UzGuide", "email": "info@uzguide.com"},
        subject=subject,
        html_content=content,
    )

    try:
        response = api_instance.send_transac_email(send_smtp_email)
        print(
            "Email sent. Message ID:", response.message_id
        )  # ✅ `response['messageId']` emas
        return True
    except ApiException as e:
        print("Brevo API error:", e.body)  # ❗ foydali xatolik tafsilotlari uchun
        return False
