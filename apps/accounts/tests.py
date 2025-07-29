# apps/accounts/tests.py
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User, Country
from apps.accounts.models import EmailVerification
from apps.accounts.tasks import send_verification_email
from unittest.mock import patch


class AccountsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.create(name="Uzbekistan")

    def test_request_verification_code(self):
        with patch("apps.accounts.tasks.send_verification_email.delay") as mock_email:
            response = self.client.post(
                reverse("request-code"), {"email": "test@example.com"}
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertTrue(
                EmailVerification.objects.filter(email="test@example.com").exists()
            )
            self.assertTrue(mock_email.called)

    def test_register_success(self):
        # Create verification code
        code = "123456"
        EmailVerification.objects.create(
            email="test@example.com",
            code=code,
            expires_at=timezone.now() + timezone.timedelta(seconds=300),
            is_used=False,
            verified=False,
        )

        with patch("apps.accounts.tasks.send_welcome_email.delay") as mock_welcome:
            data = {
                "email": "test@example.com",
                "password": "Test123!@",
                "first_name": "John",
                "last_name": "Doe",
                "role": "Client",
                "country": "Uzbekistan",
                "code": code,
            }
            response = self.client.post(reverse("register"), data)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertTrue(User.objects.filter(email="test@example.com").exists())
            self.assertTrue(mock_welcome.called)

    def test_register_invalid_code(self):
        data = {
            "email": "test@example.com",
            "password": "Test123!@",
            "first_name": "John",
            "last_name": "Doe",
            "role": "Client",
            "country": "Uzbekistan",
            "code": "999999",
        }
        response = self.client.post(reverse("register"), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", response.data)

    def test_login_success(self):
        user = User.objects.create_user(
            email="test@example.com",
            password="Test123!@",
            first_name="John",
            last_name="Doe",
            role="Client",
            country=self.country,
            is_verified=True,
            is_active=True,
        )
        response = self.client.post(
            reverse("login"), {"email": "test@example.com", "password": "Test123!@"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)

    def test_login_invalid_credentials(self):
        response = self.client.post(
            reverse("login"), {"email": "test@example.com", "password": "WrongPass"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
