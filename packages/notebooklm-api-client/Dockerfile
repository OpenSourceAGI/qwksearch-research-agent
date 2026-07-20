FROM python:3.12-slim

RUN pip install --no-cache-dir notebooklm-py fastapi uvicorn

WORKDIR /app
COPY container/server.py /app/server.py

EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
