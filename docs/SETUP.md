# University Chatbot - Setup Guide

This guide explains how to set up and run the University Chatbot powered by LangChain.

## Prerequisites

- Python 3.11+
- pip package manager
- API key for the LLM provider (OpenAI / Groq / Google)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/shantoshdurai/university-chatbot-langchain.git
cd university-chatbot-langchain
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set environment variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_api_key_here
# or
GROQ_API_KEY=your_groq_key_here
```

## Running the Application

### Backend API

```bash
python api.py
```

The API will start at `http://localhost:8000`

### Running Tests

```bash
pytest test.py -v
```

## Project Structure

```
university-chatbot-langchain/
├── chatbot.py          # Core chatbot logic with LangChain
├── api.py              # FastAPI backend server
├── test.py             # Unit tests
├── system_message.json # System prompt configuration
├── requirements.txt    # Python dependencies
├── chatbot-frontend/   # Frontend UI files
└── docs/               # Documentation
```

## Configuration

Edit `system_message.json` to customize the chatbot's personality and knowledge base for your university.

## CI/CD

Automated testing runs on every push via GitHub Actions (`.github/workflows/python-ci.yml`).

---

*Last updated: March 2026*
