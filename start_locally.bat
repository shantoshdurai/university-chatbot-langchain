@echo off
echo Starting FastAPI Backend...
start cmd /k "python main.py"

echo Starting Academix Frontend (React)...
start cmd /k "cd chatbot-frontend && npm start"

echo Both services have been started in separate windows!
echo Make sure your Groq API key is placed in the .env file.
