import os
from dotenv import load_dotenv
from chatbot import Chatbot

def test_chatbot():
    load_dotenv()
    
    # Initialize the Chatbot
    bot = Chatbot(
        model="llama-3.3-70b-versatile",
        vision_model="llama-3.2-11b-vision-preview"
    )
    
    # Test queries
    test_queries = [
        "What is the name of this university?",
        "Tell me about the engineering school."
    ]
    
    print("\n--- Running Chatbot Tests ---\n")
    
    # This will fail if GROQ_API_KEY is not set in .env
    for query in test_queries:
        print(f"User: {query}")
        response = bot.get_response(query)
        print(f"AI: {response['answer']}")
        print(f"Sources Used: {response['sources']}")
        print("-" * 30)

if __name__ == "__main__":
    if not os.getenv("GROQ_API_KEY"):
        print("Error: GROQ_API_KEY not found. Please set it in your .env file.")
    else:
        test_chatbot()
