#!/bin/bash

# Start Xvfb (Virtual Frame Buffer)
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# Start Fluxbox (Window Manager)
fluxbox &

# Start x11vnc
x11vnc -display :99 -nopw -forever -shared -bg -rfbport 5900

# Start noVNC (WebVNC)
# noVNC expects a websocket proxy. /usr/share/novnc/utils/novnc_proxy matches this.
/usr/share/novnc/utils/novnc_proxy --vnc localhost:5900 --listen 6080 &

# Start the application
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
