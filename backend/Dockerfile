FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy 

WORKDIR /app

RUN apt-get update && apt-get install -y \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN playwright install chromium \
    && playwright install-deps

COPY . .

CMD ["xvfb-run", "--auto-servernum", "uvicorn", "main:app"]