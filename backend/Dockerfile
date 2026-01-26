FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy 

WORKDIR /app

RUN apt-get update && apt-get install -y \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

RUN playwright install chromium

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["xvfb-run", "--auto-servernum", "uvicorn", "main:app"]