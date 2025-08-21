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

## 🐳 Docker Setup

### Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

### Quick Start with Docker

1. **Clone and navigate to the project:**

   ```bash
   cd langchain-rag-api-node
   ```

2. **Create environment file:**

   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and add your Anthropic API key
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

3. **Launch the application:**

   ```bash
   # Production mode
   docker-compose up --build

   # Or development mode with hot reloading
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Access your API:**
   - **Production**: http://localhost:4000/api/
   - **Development**: http://localhost:4000/api/

### Docker Commands

#### **Start Services:**

```bash
# Build and start production
docker-compose up --build

# Build and start development (with hot reloading)
docker-compose -f docker-compose.dev.yml up --build

# Run in detached mode
docker-compose up --build -d
```

#### **Stop Services:**

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

#### **View Logs:**

```bash
# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f langchain-rag-api
```

#### **Cleanup:**

```bash
# Remove all containers, images, and volumes
docker-compose down --rmi all --volumes --remove-orphans

# Clean up Docker system
docker system prune -a
```

### File Storage & Cleanup

The application automatically manages file storage with a 2GB limit:

- **Uploads Directory**: `./uploads/` (persistent across container restarts)
- **Automatic Cleanup**: Oldest files are deleted when storage exceeds 2GB
- **Manual Cleanup**: Run cleanup manually when needed

#### **Run Cleanup:**

```bash
# Using npm script
npm run cleanup

# Using Docker Compose
docker-compose --profile cleanup run --rm uploads-cleanup

# Using shell script
./run-cleanup.sh
```

### Docker Compose Files

- **`docker-compose.yml`**: Production configuration
- **`docker-compose.dev.yml`**: Development configuration with hot reloading
- **`Dockerfile`**: Production multi-stage build
- **`Dockerfile.dev`**: Development build with source mounting

### Volume Mounts

- **`./uploads:/app/uploads`**: Persistent file storage
- **`./src:/app/src`**: Source code mounting (development only)
- **`./.env:/app/.env`**: Environment variables

## 🚨 Troubleshooting

- ⚠️ Ensure your `.env` file contains a valid `ANTHROPIC_API_KEY`
- 📝 Check that uploaded files are valid `.txt` files
- 📁 Verify the `uploads/` directory exists and is writable
- 🐳 If Docker issues occur, try `docker system prune -a` to clean up
- 🔄 For port conflicts, check if ports 4000 are available
