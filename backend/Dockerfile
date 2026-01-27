FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy 

WORKDIR /app

# Install VNC, noVNC, and window manager
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    fluxbox \
    && rm -rf /var/lib/apt/lists/*

# Re-install playwright browser to ensure it's matched with the image
RUN playwright install chromium \
    && playwright install-deps

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose FastAPI port and noVNC port
EXPOSE 8000 6080

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

# Use entrypoint script to launch multiple processes
CMD ["./entrypoint.sh"]