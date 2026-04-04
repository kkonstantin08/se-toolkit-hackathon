# PlanSync Architecture

PlanSync is a modular monolith with a React SPA frontend and a FastAPI backend. PostgreSQL stores planner data, reminder metadata, AI drafts, and Google sync state. Version 1 focuses on manual planning workflows, while Version 2 layers AI parsing drafts and optional Google Calendar export on top of the same planner model.

