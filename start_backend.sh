cd backend
source venv/bin/activate
# playwright install chromium 
uvicorn main:app --reload --host 0.0.0.0 --port 8000
