# 🚀 LangChain RAG API with Anthropic & Redis Caching

A Node.js API that implements Retrieval-Augmented Generation (RAG) using LangChain, Anthropic's Claude model, and Redis for intelligent caching.

![](./image.png)

## ✨ Features

- 📁 File upload and storage
- ✂️ Text chunking and processing
- 🔍 BM25 retrieval for document search
- 🤖 Anthropic Claude integration for question answering
- 🚀 **Redis caching for improved performance**
- 📊 **Cache statistics and monitoring**
- 🔄 **Automatic cache invalidation**
- 🌐 RESTful API endpoints

## 🛠️ Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Configure environment:**

   ```bash
   pnpm run setup
   ```

   This will create a `.env` file. Update it with your actual API keys.

3. **Set your Anthropic API key:**
   Edit the `.env` file and replace `your_anthropic_api_key_here` with your actual Anthropic API key.

4. **Configure Redis (optional):**
   ```bash
   # Redis configuration (defaults to localhost:6379)
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_redis_password_here
   ```

## 🚀 Usage

### Development

```bash
pnpm run dev
```

### Production

```bash
pnpm run build
pnpm start
```

### Test RAG Chain

```bash
pnpm test
```

## 📡 API Endpoints

### Upload File

- **POST** `/upload-file`
- Upload a `.txt` file for processing
- Automatically clears any existing cache for the file

### Ask Question

- **POST** `/ask-question`
- Body: `{ "filename": "filename.txt", "question": "Your question here" }`
- **Smart caching**: Returns cached answers instantly if available
- **Cache miss**: Processes the question and caches the result

### Cache Management

- **GET** `/cache-stats`
- Returns Redis cache statistics including total keys and memory usage

- **DELETE** `/delete-cache`
- Body: `{ "filename": "filename.txt" }`
- Clears all cached Q&A pairs for a specific file

## 🔧 Redis Implementation

### Features

- **Intelligent Caching**: Questions and answers are cached with 24-hour TTL
- **Smart Key Generation**: Uses question hash + filename for unique cache keys
- **Automatic Invalidation**: Cache is cleared when files are re-uploaded
- **Memory Management**: Configurable memory limits and LRU eviction
- **Performance Monitoring**: Real-time cache statistics and memory usage

### Cache Strategy

```typescript
// Cache key format: qa:{filename}:{questionHash}
// TTL: 24 hours (configurable)
// Memory policy: LRU eviction with 256MB limit
```

### Redis Operations

- **Set**: Cache Q&A pairs with expiration
- **Get**: Retrieve cached answers
- **Exists**: Check if answer is cached
- **Delete**: Remove specific cache entries
- **Clear File Cache**: Remove all cached items for a file
- **Statistics**: Monitor cache performance and memory usage

## 📁 File Structure

- `src/anthropic/index.ts` - Anthropic RAG chain implementation
- `src/routes/app.ts` - API route handlers with Redis integration
- `src/lib/redis.ts` - Redis caching implementation
- `src/lib/storage.ts` - File storage utilities
- `src/constants.ts` - Configuration including Redis settings
- `uploads/` - Directory for uploaded files

## 🔄 How It Works

1. **📤 File Upload**: Text files are uploaded and stored
2. **🧹 Cache Invalidation**: Existing cache for the file is cleared
3. **✂️ Text Processing**: Files are split into chunks using RecursiveCharacterTextSplitter
4. **🔍 Retrieval**: BM25Retriever finds relevant document chunks
5. **🤖 Generation**: Anthropic Claude generates answers based on retrieved context
6. **💾 Caching**: Q&A pair is cached in Redis with 24-hour TTL
7. **📤 Response**: The answer is returned to the user

### Cache Flow

```
Question → Check Redis Cache → Cache Hit? → Return Cached Answer
                ↓
            Cache Miss
                ↓
        Process with RAG Chain
                ↓
            Cache Result
                ↓
            Return Answer
```

## 🐳 Docker Setup

### Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

### Quick Start with Docker

1. **Clone and navigate to the project:**

   ```bash
   git clone https://github.com/bruxx-6243/langchain-rag-node-api.git

   cd langchain-rag-node-api
   ```

2. **Create environment file:**

   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and add your Anthropic API key
   ANTHROPIC_API_KEY=your_actual_api_key_here

   # Optional: Configure Redis
   REDIS_HOST=redis
   REDIS_PORT=6379
   REDIS_PASSWORD=your_redis_password
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
   - **Redis**: localhost:6379

### Redis Container Features

- **Image**: `redis:7-alpine` (lightweight and secure)
- **Memory Limit**: 256MB with LRU eviction policy
- **Persistence**: AOF (Append-Only File) enabled
- **Health Checks**: Automatic health monitoring
- **Port**: 6379 (standard Redis port)

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
docker-compose logs -f redis
```

#### **Redis Management:**

```bash
# Connect to Redis CLI
docker exec -it langchain-redis redis-cli

# Monitor Redis operations
docker exec -it langchain-redis redis-cli monitor

# Check Redis info
docker exec -it langchain-redis redis-cli info
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
- **Redis Data**: Persistent Redis data with AOF logging
- **Automatic Cleanup**: Oldest files are deleted when storage exceeds 2GB
- **Cache Invalidation**: Automatic cache clearing when files are re-uploaded
- **Manual Cleanup**: Run cleanup manually when needed

#### **Run Cleanup:**

```bash
# Using npm script
pnpm run cleanup

# Using Docker Compose
docker-compose --profile cleanup run --rm uploads-cleanup

# Using shell script
./run-cleanup.sh
```

### Docker Compose Files

- **`docker-compose.yml`**: Production configuration with Redis
- **`docker-compose.dev.yml`**: Development configuration with Redis and hot reloading
- **`Dockerfile`**: Production multi-stage build
- **`Dockerfile.dev`**: Development build with source mounting

### Volume Mounts

- **`./uploads:/app/uploads`**: Persistent file storage
- **`./src:/app/src`**: Source code mounting (development only)
- **`./.env:/app/.env`**: Environment variables
- **`redis_data:/data`**: Redis persistent data storage

## 🚨 Troubleshooting

### Redis Issues

- ⚠️ **Connection Errors**: Ensure Redis container is running and accessible
- 🔌 **Port Conflicts**: Check if port 6379 is available
- 🔑 **Authentication**: Verify Redis password configuration if using authentication
- 💾 **Memory Issues**: Monitor Redis memory usage with `/cache-stats` endpoint

### General Issues

- ⚠️ Ensure your `.env` file contains a valid `ANTHROPIC_API_KEY`
- 📝 Check that uploaded files are valid `.txt` files
- 📁 Verify the `uploads/` directory exists and is writable
- 🐳 If Docker issues occur, try `docker system prune -a` to clean up
- 🔄 For port conflicts, check if ports 4000 and 6379 are available

### Performance Optimization

- **Cache Hit Rate**: Monitor with `/cache-stats` endpoint
- **Memory Usage**: Redis is configured with 256MB limit and LRU eviction
- **TTL Management**: Cache entries expire after 24 hours automatically
- **File Uploads**: Large files trigger automatic cache invalidation

## 📊 Monitoring & Analytics

### Cache Statistics

- **Total Keys**: Number of cached Q&A pairs
- **Memory Usage**: Redis memory consumption
- **Cache Hit Rate**: Monitor via application logs
- **Performance Metrics**: Response times with and without cache

### Health Checks

- **Redis Health**: Automatic health monitoring every 30 seconds
- **API Health**: Endpoint availability monitoring
- **Container Health**: Docker health check integration
