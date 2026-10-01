# Granite Docling processor for extract-pdf, as a Hugging Face Docker Space.
FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PORT=7860

# Transformers.js reads its cache folder from TRANSFORMERS_CACHE (see
# server/model.js). /data survives restarts only when persistent storage is
# attached to the Space; without it the model downloads again after a restart.
ENV TRANSFORMERS_CACHE=/data/.cache/huggingface

# onnxruntime-node fetches CUDA binaries on linux/x64 by default. A CPU Space
# never uses them; delete this line when moving the Space to GPU hardware.
ENV ONNXRUNTIME_NODE_INSTALL=skip

# Spaces run the container as UID 1000, which is the image's `node` user.
RUN mkdir -p /data/.cache/huggingface && chown -R node:node /data
USER node
WORKDIR /home/node/app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --chown=node:node server ./server

EXPOSE 7860
CMD ["node", "server/server.js"]
