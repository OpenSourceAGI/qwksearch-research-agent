# Build context is the parent directory (see image_build_context in wrangler.jsonc)
FROM docker.io/searxng/searxng:latest

COPY searxng-settings.yml /etc/searxng/settings.yml

# Small footprint: 1 worker / 2 threads fits the "lite" instance type
ENV SEARXNG_BASE_URL=http://localhost:8080 \
    UWSGI_WORKERS=1 \
    UWSGI_THREADS=2 \
    GRANIAN_PORT=8080 \
    BIND_ADDRESS=0.0.0.0:8080

EXPOSE 8080
