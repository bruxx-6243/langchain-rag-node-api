# 🚀 LangChain RAG API with Anthropic

A Node.js API that implements Retrieval-Augmented Generation (RAG) using LangChain and Anthropic's Claude model.

## ✨ Features

- 📁 File upload and storage
- ✂️ Text chunking and processing
- 🔍 BM25 retrieval for document search
- 🤖 Anthropic Claude integration for question answering
- 🌐 RESTful API endpoints

## 🛠️ Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   npm run setup
   ```

   This will create a `.env` file. Update it with your actual API keys.

3. **Set your Anthropic API key:**
   Edit the `.env` file and replace `your_anthropic_api_key_here` with your actual Anthropic API key.

## 🚀 Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Test RAG Chain

```bash
npm test
```

## 📡 API Endpoints

### Upload File

- **POST** `/upload-file`
- Upload a `.txt` file for processing

### Ask Question

- **POST** `/ask-question`
- Body: `{ "filename": "filename.txt", "question": "Your question here" }`

## 📁 File Structure

- `src/anthropic/index.ts` - Anthropic RAG chain implementation
- `src/routes/app.ts` - API route handlers
- `src/lib/storage.ts` - File storage utilities
- `uploads/` - Directory for uploaded files

## 🔄 How It Works

1. **📤 File Upload**: Text files are uploaded and stored
2. **✂️ Text Processing**: Files are split into chunks using RecursiveCharacterTextSplitter
3. **🔍 Retrieval**: BM25Retriever finds relevant document chunks
4. **🤖 Generation**: Anthropic Claude generates answers based on retrieved context
5. **📤 Response**: The answer is returned to the user

## 🚨 Troubleshooting

- ⚠️ Ensure your `.env` file contains a valid `ANTHROPIC_API_KEY`
- 📝 Check that uploaded files are valid `.txt` files
- 📁 Verify the `uploads/` directory exists and is writable
# langchain-ran-node-api
