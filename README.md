# PlanSync

PlanSync is a full-stack student planner built with React, FastAPI, and PostgreSQL. It supports manual planning flows in Version 1 and adds AI-assisted parsing plus optional Google Calendar export in Version 2.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form
- Backend: FastAPI, SQLAlchemy 2, Pydantic 2, Alembic
- Database: PostgreSQL
- Auth: JWT access/refresh cookies with server-side refresh sessions
- AI: Mistral API for natural-language parsing drafts
- Deploy: Docker Compose

## Quick start

1. Copy `.env.example` to `.env`
2. Start the stack:

```bash
docker compose up --build
```

3. Open:

- Frontend: `http://localhost:8080`
- Backend API docs: `http://localhost:8000/docs`

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e .[dev]
alembic upgrade head
uvicorn app.main:app --reload
```

## Notes

- The planner remains fully usable without AI and without Google Calendar.
- AI parsing never auto-saves planner items. It always creates an editable draft first.
- Google integration is export-only for events in this MVP.

