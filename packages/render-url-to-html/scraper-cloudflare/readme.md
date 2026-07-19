# Advanced Puppeteer API with Authentication & Cookie Management

A production-ready Cloudflare Worker API that renders web pages using Puppeteer with advanced features including password authentication, session management, cookie persistence, resource blocking, and comprehensive OpenAPI documentation.

## 🌟 Key Features

### 🔐 **Authentication System**
- **Multiple Auth Methods**: Bearer token, query parameter, or POST body
- **Optional Security**: Can run with or without password protection
- **Flexible Integration**: Works with any authentication flow

### 🍪 **Session & Cookie Management**
- **Persistent Sessions**: Cookies automatically saved per session ID
- **Login Workflows**: Perfect for scraping authenticated content  
- **Manual Cookie Control**: Set specific cookies via API parameters

### ⚡ **Performance Optimization**
- **Resource Blocking**: Block images, CSS, fonts to save bandwidth
- **Browser Reuse**: Durable Objects maintain persistent connections
- **Smart Wait Strategies**: Multiple options for different site types

### 📚 **Comprehensive API Documentation**
- **Swagger UI**: Interactive API documentation at `/swagger`
- **OpenAPI 3.0**: Full specification at `/api/openapi.json`
- **Multiple Formats**: JSON and HTML response options

## 🚀 Setup Instructions

### 1. Create Worker Project
```bash
npm create cloudflare@latest -- "html-renderer-api"
```

Select:
- **Template**: `Hello World example`
- **Language**: `JavaScript`  
- **Git**: `Yes`
- **Deploy**: `No` (configure first)

### 2. Install Dependencies
```bash
cd html-renderer-api
npm install @cloudflare/puppeteer
```

### 3. Replace Configuration Files
- Replace `wrangler.toml` with the provided configuration
- Replace `src/index.js` with the enhanced Worker code

### 4. Set Environment Variables (Optional)
```bash
# Set API key for authentication
wrangler secret put API_KEY

# Set global proxy configuration (optional)
wrangler secret put PROXY_URL
wrangler secret put PROXY_USER
wrangler secret put PROXY_PASS
```

### 5. Deploy
```bash
npx wrangler deploy
```

## 📖 API Documentation

### Access Interactive Documentation
```
https://your-worker.your-subdomain.workers.dev/swagger
```

### OpenAPI Specification
```
https://your-worker.your-subdomain.workers.dev/api/openapi.json
```

## 🎯 API Endpoints

### `GET /api/render`
Render a webpage with query parameters

### `POST /api/render`  
Render a webpage with JSON body (supports advanced options)

### `GET /swagger`
Interactive API documentation

### `GET /api/openapi.json`
OpenAPI 3.0 specification

## 🔧 Core Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | **required** | URL to render |
| `api_key` | string | - | API key (if enabled) |
| `wait` | integer | 0 | Additional wait time (ms) |
| `blockImages` | boolean | false | Block image loading |
| `sessionId` | string | "default" | Session ID for cookie persistence |
| `timeout` | integer | 30000 | Page load timeout (ms) |
| `waitUntil` | string | "networkidle2" | Navigation wait strategy |
| `cookies` | string | - | JSON string of cookies to set |
| `headers` | object | {} | Custom request headers |
| `format` | string | "html" | Response format (html/json) |
| `proxyUrl` | string | - | Proxy server URL |
| `proxyUser` | string | - | Proxy username |
| `proxyPass` | string | - | Proxy password |

## 💡 Usage Examples

### Basic Usage
```bash
# Simple rendering
curl "https://your-api.workers.dev/api/render?url=https://example.com"

# With authentication
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-api.workers.dev/api/render?url=https://example.com"

# With proxy
curl -X POST "https://your-api.workers.dev/api/render" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "proxyUrl": "http://proxy.example.com:8080",
    "proxyUser": "username",
    "proxyPass": "password"
  }'
```

### Resource Blocking (Performance)
```bash
# Block images for faster loading
curl "https://your-api.workers.dev/api/render?url=https://news-site.com&blockImages=true"
```

### Session Management
```bash
# Login and save session
curl -X POST "https://your-api.workers.dev/api/render" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://login-site.com/login",
    "sessionId": "user123"
  }'

# Access protected content with saved session
curl "https://your-api.workers.dev/api/render?url=https://protected-page.com&sessionId=user123"
```

### Custom Configuration
```bash
# Custom headers and timeout
curl -X POST "https://your-api.workers.dev/api/render" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api-site.com",
    "headers": {"X-API-Key": "your-key"},
    "timeout": 45000,
    "format": "json"
  }'
```"viewportHeight": 812,
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
    "format": "json"
  }'
```

## 🔄 Response Formats

### HTML Response (default)
Returns fully rendered HTML with base tag for relative URLs:
```html
<!DOCTYPE html>
<html>
<head>
    <base href='https://example.com/'>
    <title>Page Title</title>
</head>
<body>...</body>
</html>
```

### JSON Response
Returns structured data with metadata:
```json
{
  "html": "<!DOCTYPE html>...",
  "url": "https://final-url.com",
  "title": "Page Title", 
  "cookies": [...],
  "performance": {
    "loadTime": 2341,
    "timestamp": "2024-08-23T10:30:45.123Z"
  },
  "metadata": {
    "sessionId": "user123",
    "blockedResources": {...}
  }
}
```

## 🛡️ Security Features

### Authentication Options
1. **Bearer Token**: `Authorization: Bearer YOUR_API_KEY`
2. **Query Parameter**: `?api_key=YOUR_API_KEY`  
3. **POST Body**: `{"api_key": "YOUR_API_KEY"}`

### Proxy Support
- **Global Proxy**: Set via environment variables for all requests
- **Per-Request Proxy**: Specify proxy settings per API call
- **Proxy Authentication**: Support for username/password proxy auth
- **Flexible Configuration**: Mix of global and per-request settings

### Input Validation
- URL format validation
- Parameter type checking  
- Timeout and dimension limits
- XSS prevention in responses

### Session Isolation
- Separate cookie storage per session ID
- No cross-session data leakage
- Automatic session cleanup

## ⚡ Performance Features

### Browser Connection Reuse
- **5-minute persistence**: Browsers stay alive between requests
- **Automatic health checks**: Unhealthy browsers are replaced
- **Resource efficiency**: Single browser handles multiple pages

### Smart Resource Loading
```bash
# Performance comparison example
# Full load: ~5-8 seconds
curl "https://your-api.workers.dev/api/render?url=https://cnn.com&format=json" | jq '.performance.loadTime'

# Optimized: ~2-3 seconds  
curl "https://your-api.workers.dev/api/render?url=https://cnn.com&blockImages=true&format=json" | jq '.performance.loadTime'
```

### Wait Strategy Options
- **`domcontentloaded`**: Fastest, for static content
- **`load`**: Standard, waits for all resources  
- **`networkidle2`**: Balanced, waits for minimal network activity
- **`networkidle0`**: Slowest, waits for complete network silence

## 📊 Monitoring & Debugging

### Response Headers
```
X-Load-Time: 2341          # Page load time in milliseconds
X-Session-Id: user123      # Session identifier used
X-Final-URL: https://...   # Final URL after redirects
X-Browser-Reused: true     # Whether browser was reused
```

### Error Handling
- **400**: Bad Request - Invalid URL or parameters
- **401**: Unauthorized - Missing/invalid password
- **500**: Internal Server Error - Browser or rendering failure

### Logging
Worker logs include:
- Browser launch/reuse events
- Session management activities  
- Performance metrics
- Error details

## 🎯 Use Cases

### 1. **Web Scraping**
```bash
# Scrape dynamic JavaScript content
curl "https://your-api.workers.dev/api/render?url=https://spa-app.com&waitUntil=networkidle2&format=json" | jq '.html' -r > scraped.html
```

### 2. **Testing & Monitoring**
```bash
# Monitor page performance
curl "https://your-api.workers.dev/api/render?url=https://your-site.com&format=json" | jq '.performance.loadTime'
```

### 3. **Automated Screenshots** (Future Enhancement)
```bash
# Could be extended to support screenshot generation
# POST /api/screenshot with similar parameters
```

### 4. **API Testing**
```bash
# Test mobile responsiveness
curl -X POST "https://your-api.workers.dev/api/render" \
  -d '{"url":"https://site.com","viewportWidth":375,"viewportHeight":667}'
```

## 🔧 Configuration Options

### Environment Variables
```bash
# Optional API password
wrangler secret put API_PASSWORD

# Custom timeout settings could be added
wrangler secret put DEFAULT_TIMEOUT
```

### Customization Points
- Browser timeout settings
- Resource blocking rules
- Session storage duration  
- Response format options
- Rate limiting (can be added)

This advanced API provides enterprise-level web rendering capabilities with the performance and scalability of Cloudflare's edge network.