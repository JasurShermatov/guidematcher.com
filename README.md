# GuideMatcher

GuideMatcher is a production-ready platform for matching travelers with guides, 
featuring a Django REST backend, React frontend, and Telegram bot integration.
All components are containerized with Docker for easy deployment.

---

## Features

- **Backend**: Django + Django REST Framework (DRF)
  - JWT authentication
  - Admin panel
  - Real-time chat (Channels, Redis)
  - Celery for background tasks
  - Multi-language support (en, ru, uz)
  - PostgreSQL database
  - Email notifications (SMTP)
- **Frontend**: React
  - Modern UI for users and guides
  - API integration
- **Bot**: Telegram bot (aiogram)
  - Automated user interactions
  - Notifications and booking support
- **DevOps**: Docker, Docker Compose, Nginx, Redis

---

## Project Structure & App Purposes

- `apps/accounts`: User authentication, registration, profile management
- `apps/bookings`: Booking system for travelers and guides
- `apps/chat`: Real-time messaging between users and guides
- `apps/common`: Shared utilities, permissions, and mixins
- `apps/disputes`: Dispute resolution between users and guides
- `apps/notifications`: Email and in-app notifications
- `apps/profiles`: Extended user profiles and filtering
- `apps/reviews`: Review and rating system
- `apps/users`: User management, signals, permissions
- `bot/`: Telegram bot logic (aiogram)
- `config/`: Django settings, ASGI/WGI, Celery, routing
- `frontend/travel-front/`: React frontend app

---

## Environment Variables (`.env`)

Set these in your `.env` file for production:


---

## Step-by-Step Installation

### 1\. Clone the repository

```bash
git clone git@github.com:JasurShermatov/guidematcher.com.git
cd guidematcher.com


python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
docker-compose up --build
docker-compose exec web python manage.py createsuperuser