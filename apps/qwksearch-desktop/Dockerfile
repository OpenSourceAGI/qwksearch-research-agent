FROM ubuntu:22.04
LABEL description="Tauri Desktop build environment — Linux targets (AppImage, deb)"

ENV DEBIAN_FRONTEND=noninteractive

# ── System dependencies ──────────────────────────────────────────────────────
RUN ln -fs /usr/share/zoneinfo/Etc/UTC /etc/localtime && \
    apt-get update && apt-get install -y --no-install-recommends \
    # Core build tools
    curl wget gnupg ca-certificates \
    build-essential pkg-config git unzip cmake file \
    # SSL
    libssl-dev \
    # Tauri: GTK + WebKitGTK (required for Linux GUI)
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    # Tauri: system tray
    libayatana-appindicator3-dev \
    # Tauri: SVG icons
    librsvg2-dev \
    # enigo crate: X11 input simulation
    libx11-dev libxdo-dev \
    libxcb-shape0-dev libxcb-xfixes0-dev \
    libxkbcommon-dev \
    # Audio
    libasound2-dev \
    # AppImage: ELF patching and FUSE mounting
    patchelf libfuse2 \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js 20 LTS ───────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_25.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# ── Rust stable ──────────────────────────────────────────────────────────────
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
    sh -s -- -y --no-modify-path --default-toolchain stable
ENV PATH="/usr/local/cargo/bin:${PATH}"

# ── Bun ──────────────────────────────────────────────────────────────────────
ENV BUN_INSTALL=/usr/local/bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/usr/local/bun/bin:${PATH}"

# ── Project ───────────────────────────────────────────────────────────────────
WORKDIR /app

# Install JS deps first (layer cached until package.json changes)
COPY package.json ./
RUN bun install

# Copy source (invalidates on code changes; tools layers stay cached)
COPY svelte.config.js vite.config.js jsconfig.json ./
COPY src ./src
COPY static ./static
COPY src-tauri ./src-tauri

# Tauri env flags (prevents strip errors common on Linux CI)
ENV LINUXDEPLOY_SKIP_STRIP=1
ENV NO_STRIP=true

# Artifacts are written here — mount a host directory to retrieve them:
#   docker run --rm -v "$(pwd)/dist:/output" qwksearch-linux
VOLUME ["/output"]

ENTRYPOINT ["/bin/sh", "-c", "\
  set -e && \
  echo '==> Building Linux targets (AppImage + deb)...' && \
  bun x tauri build --bundles appimage,deb && \
  mkdir -p /output && \
  find src-tauri/target/release/bundle -type f \\( -name '*.AppImage' -o -name '*.deb' \\) \
    -exec cp -v {} /output/ \\; && \
  echo '' && echo '==> Done. Artifacts in /output:' && ls -lh /output/ \
"]
