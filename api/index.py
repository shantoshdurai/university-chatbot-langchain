import os
import sys

# Ensure the root directory is accessible so imports like `from api import app` work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from main import app as original_app

# Vercel Serverless entrypoint
# This mounts the original FastAPI application under /api to seamlessly handle 
# relative frontend requests from Production React builds over the internet.
app = FastAPI()
app.mount("/api", original_app)
