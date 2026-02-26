FROM oven/bun:latest
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --production

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Create non-root user (Debian-based image)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs bunjs && \
    chown -R bunjs:nodejs /app

USER bunjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["bun", "run", "src/index.ts"]
