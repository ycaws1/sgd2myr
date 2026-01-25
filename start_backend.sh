cd backend
source venv/bin/activate
playwright install chromium 
uvicorn main:app --reload
