# API Contract

The backend exposes REST endpoints under `/api/v1` for auth, planner CRUD, weekly planning, reminders, AI parsing drafts, and Google Calendar integration. Authentication uses HttpOnly cookies, so the frontend always sends requests with `credentials: "include"`.

