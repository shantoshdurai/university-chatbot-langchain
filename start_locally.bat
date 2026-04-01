@echo off
echo Starting Academix Backend (FastAPI)...
start cmd /k "python api.py"

echo Starting Academix Frontend (React)...
start cmd /k "cd chatbot-frontend && npm start"

echo Both services have been started in separate windows!
echo Make sure your Groq API key is placed in the .env file.
