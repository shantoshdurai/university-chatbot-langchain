# University Chatbot with LangChain and Ollama

## Overview
A powerful AI-powered chatbot designed specifically for university environments. This intelligent assistant can answer questions about your university using your own documents, leveraging the capabilities of LangChain and Ollama's llama3.1:8b LLM to provide accurate and contextual responses.

## Features
- 📚 **Multi-Format Document Support**: Upload and process PDF, TXT, DOCX, and MD files
- 🧠 **Conversation Memory**: Maintains context from previous messages in the conversation
- 📝 **Source Citation**: Shows which documents were used to generate answers for transparency
- 💬 **Natural Language Processing**: Understands and responds to questions in natural language
- 🔄 **Easy to Extend**: Add more documents anytime by placing them in the `data` directory
- ⚡ **Fast Responses**: Powered by locally-running Ollama for quick inference
- 🏫 **University-Focused**: Optimized for academic and administrative queries

## Tech Stack
- **Language**: Python 3.8+
- **LLM Framework**: LangChain
- **Language Model**: Ollama (llama3.1:8b)
- **Vector Store**: ChromaDB for document embeddings
- **Document Processing**: PyPDF2, python-docx, and more

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Python 3.8 or higher**
2. **Ollama** - [Download and install Ollama](https://ollama.ai/)
3. **LLama3.1:8b Model** - Run the following command after installing Ollama:
   ```bash
   ollama pull llama3.1:8b
   ```

## Installation

1. **Clone this repository**:
```bash
git clone https://github.com/shantoshdurai/langchainofdsu.git
cd langchainofdsu
```

2. **Create and activate a virtual environment**:

   On Windows:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

   On macOS/Linux:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install the required packages**:
```bash
pip install -r requirements.txt
```

4. **Ensure Ollama is running**:
```bash
ollama serve
```

## Usage

1. **Place your documents** in the `data` directory:
   - Supported formats: PDF, TXT, DOCX, MD
   - Can include any university-related documents

2. **Start the chatbot**:
```bash
python chatbot.py
```

3. **Start chatting**:
   - Type your questions and press Enter
   - The bot will process your documents and provide answers
   - Sources will be cited for transparency

4. **Commands**:
   - Type `exit` to quit the application
   - Type `clear` to clear the screen

## Example Use Cases

This chatbot can help answer questions about:
- 📚 Course catalogs and curriculum information
- 📅 Academic calendars and important dates
- 📖 University handbooks and policies
- 🏛️ Department guides and faculty information
- 🎉 Event schedules and activities
- 📜 Policy documents and regulations
- 🏫 Admission requirements and procedures
- 📊 Grading systems and academic standards

## Example Documents

You can add various university-related documents such as:
- Course catalogs
- Academic calendars  
- University handbooks
- Department guides
- Event schedules
- Policy documents
- Student resources
- Faculty directories

## Project Structure
```
langchainofdsu/
├── data/              # Place your documents here
├── chatbot.py         # Main chatbot script
├── requirements.txt   # Python dependencies
├── venv/              # Virtual environment
└── README.md          # Project documentation
```

## Troubleshooting

### Ollama not running
- **Solution**: Make sure to run `ollama serve` in a terminal before starting the chatbot

### Model not found
- **Solution**: Run `ollama pull llama3.1:8b` to download the model

### Document not loading
- **Solution**: Ensure your files are in a supported format (PDF, TXT, DOCX, MD) and placed in the `data` directory

### Installation issues
- **Solution**: Ensure you have Python 3.8+ and all required packages installed via `pip install -r requirements.txt`

### Memory errors
- **Solution**: If you have many large documents, consider processing them in batches

## Customization

You can customize the chatbot's behavior by modifying the `system_message` in `chatbot.py`. This controls:
- How the assistant responds to questions
- The tone and style of responses
- Special instructions for handling specific types of queries

## Performance Tips

1. **Document Quality**: Use well-formatted documents for better results
2. **File Size**: Keep individual files under 50MB for optimal processing
3. **Chunking**: The system automatically chunks large documents for better retrieval
4. **Local LLM**: Using Ollama locally ensures data privacy and faster responses

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Developer: Shantosh Durai  
GitHub: [@shantoshdurai](https://github.com/shantoshdurai)

## Acknowledgments

- [LangChain](https://langchain.com/) for the powerful LLM framework
- [Ollama](https://ollama.ai/) for local LLM deployment
- The open-source community for continuous support

## Support

If you find this project helpful, please consider giving it a star ⭐ on GitHub!
