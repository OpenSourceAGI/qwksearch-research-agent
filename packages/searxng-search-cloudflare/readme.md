# SearXNG on Render.com - Deployment Guide

Deploy your own private SearXNG search engine proxy on Render.com with custom configuration in minutes.

## 🌟 What is SearXNG?

SearXNG is a privacy-respecting, hackable metasearch engine that aggregates results from multiple search engines without tracking you. Perfect for private searching with custom engine configurations.

## 📋 Prerequisites

- GitHub account
- Render.com account ([sign up free](https://render.com))
- 5 minutes of your time

## 🚀 Quick Deployment

### Step 1: Create GitHub Repository

1. Create a new GitHub repository (public or private)
2. Add these files to your repository:

#### `Dockerfile`
```dockerfile
FROM docker.io/searxng/searxng:latest

# Copy your custom settings file
COPY searxng-settings.yml /etc/searxng/settings.yml

# Set environment variables
ENV SEARXNG_BASE_URL=https://localhost:8080
ENV UWSGI_WORKERS=2
ENV UWSGI_THREADS=2

# Expose port
EXPOSE 8080

# Use non-root user for security
USER searxng
```

#### `searxng-settings.yml`
```yaml
use_default_settings: true

server:
  secret_key: "your-random-secret-key-here"  # Generate with: openssl rand -hex 16
  limiter: false  # Set to true for public instances
  image_proxy: true

ui:
  static_use_hash: true

# Redis disabled for simplicity (comment out these lines)
# redis:
#   url: redis://redis:6379/0

engines:
  - name: duckduckgo
    engine: duckduckgo
    shortcut: ddg
    disabled: false

  - name: google
    engine: google
    shortcut: go
    disabled: false

  - name: bing
    engine: bing
    shortcut: bi
    disabled: true

  - name: github
    engine: github
    shortcut: gh
    disabled: false

  - name: reddit
    engine: reddit
    shortcut: re
    disabled: false

  - name: youtube
    engine: youtube_noapi
    shortcut: yt
    disabled: false

  - name: brave
    engine: brave
    shortcut: br
    disabled: false

  - name: hackernews
    engine: hackernews
    shortcut: hn
    disabled: false
```

3. **Generate a secret key** for security:
   ```bash
   openssl rand -hex 16
   ```
   Replace `your-random-secret-key-here` in the YAML file.

### Step 2: Deploy on Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**

2. **Click "New +"** → **"Web Service"**

3. **Connect Repository**
   - Click "Connect account" to link GitHub
   - Select your SearXNG repository
   - Click "Connect"

4. **Configure Service**
   Fill in these settings:
   
   | Field | Value |
   |-------|--------|
   | **Name** | `my-searxng` (or your choice) |
   | **Region** | Choose closest to you |
   | **Branch** | `main` |
   | **Runtime** | `Docker` |
   | **Dockerfile Path** | `./Dockerfile` |
   | **Port** | `8080` ⚠️ **Critical: Must be 8080** |

5. **Set Environment Variables**
   
   Click "Advanced" → Add these environment variables:
   
   | Name | Value |
   |------|-------|
   | `SEARXNG_BASE_URL` | `https://your-service-name.onrender.com` |
   | `UWSGI_WORKERS` | `2` |
   | `UWSGI_THREADS` | `2` |

   **Important**: Replace `your-service-name` with the actual name you chose in step 4.

6. **Create Web Service**
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment

### Step 3: Access Your Search Engine

Once deployed, visit: `https://your-service-name.onrender.com`

🎉 **You now have your own private search engine!**

## 🔧 Customization

### Adding More Search Engines

Edit `searxng-settings.yml` and add engines:

```yaml
engines:
  # Academic Search
  - name: google scholar
    engine: google_scholar
    shortcut: gos
    disabled: false

  # Torrents (use responsibly)
  - name: 1337x
    engine: 1337x
    shortcut: 1337x
    disabled: false

  # Images
  - name: google images
    engine: google_images
    shortcut: goi
    disabled: false

  # News
  - name: google news
    engine: google_news
    shortcut: gon
    disabled: false
```

### Using Search Shortcuts

Once deployed, you can use shortcuts in your searches:
- `!ddg privacy tools` → Search DuckDuckGo
- `!go python tutorial` → Search Google
- `!gh awesome-lists` → Search GitHub
- `!re programming humor` → Search Reddit
- `!yt cat videos` → Search YouTube

### Security for Public Access

If you want to make your instance public, update `searxng-settings.yml`:

```yaml
server:
  limiter: true  # Enable rate limiting
  secret_key: "use-a-strong-32-character-key-here"
```

And set this environment variable in Render:
```
SEARXNG_PUBLIC=true
```

## 📊 Performance Optimization

### Free Tier (Default)
```yaml
# Environment variables in Render
UWSGI_WORKERS=1
UWSGI_THREADS=2
```

### Paid Tier (Better Performance)
```yaml
# Environment variables in Render
UWSGI_WORKERS=4
UWSGI_THREADS=4
```

## 🔄 Updates and Maintenance

### Auto-Updates
Render automatically rebuilds and deploys when you push changes to your GitHub repository.

### Manual Updates
1. Edit files in your GitHub repository
2. Commit and push changes
3. Render will automatically redeploy

### Updating SearXNG Version
Edit your `Dockerfile`:
```dockerfile
FROM docker.io/searxng/searxng:2024.1.7  # Specify version
```

## 🚨 Troubleshooting

### Common Issues

**❌ Service won't start**
- Check that port is set to `8080`
- Verify `SEARXNG_BASE_URL` matches your Render URL
- Check deployment logs in Render dashboard

**❌ Search engines not working**
- Some engines may be rate-limited
- Try different engines or increase timeouts:
```yaml
- name: google
  engine: google
  timeout: 6.0
```

**❌ Configuration not applied**
- Ensure `searxng-settings.yml` is in repository root
- Check YAML syntax with online validator
- Redeploy service

### Debug Steps

1. **Check Render Logs**:
   - Go to your service → "Logs" tab
   - Look for error messages

2. **Test Locally**:
   ```bash
   git clone your-repo
   cd your-repo
   docker build -t test-searxng .
   docker run -p 8080:8080 test-searxng
   ```
   Visit `http://localhost:8080`

## 🔒 Privacy & Security

Your SearXNG instance:
- ✅ Doesn't log searches
- ✅ Doesn't track users
- ✅ Proxies images for privacy
- ✅ Runs on your own domain
- ✅ No ads or tracking

Perfect for privacy-conscious users!

## 📁 Complete File Structure

Your repository should look like:
```
your-searxng-repo/
├── Dockerfile
├── searxng-settings.yml
├── README.md
└── .gitignore (optional)
```

## 🆘 Getting Help

- **SearXNG Issues**: [GitHub Issues](https://github.com/searxng/searxng/issues)
- **Render Support**: [Render Docs](https://render.com/docs)