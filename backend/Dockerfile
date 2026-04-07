FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DEFAULT_TIMEOUT=120

WORKDIR /app

COPY . /app
RUN python -m pip install --no-cache-dir --upgrade pip setuptools wheel \
    && python -m pip install --no-cache-dir --no-build-isolation .

EXPOSE 8000

CMD ["sh", "-c", "python -m app.utils.wait_for_db && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
