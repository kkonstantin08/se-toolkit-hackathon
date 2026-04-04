# Deployment

The project is designed for Docker Compose deployment on a university VM:

1. Copy `.env.example` to `.env`
2. Set a strong `SECRET_KEY`
3. Configure `DATABASE_URL`, `MISTRAL_API_KEY`, and Google OAuth variables when needed
4. Run `docker compose up --build -d`
5. Expose port `8080` from the VM for the frontend and optionally `8000` for direct API debugging

