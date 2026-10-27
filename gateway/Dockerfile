FROM node:24-bookworm-slim
ENV NODE_ENV=production PUPPETEER_SKIP_DOWNLOAD=true CHROME_BIN=/usr/bin/chromium DATA_DIR=/data PORT=3002
RUN apt-get -o APT::Update::Error-Mode=any update && apt-get install -y --no-install-recommends chromium ca-certificates tini gosu && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && mkdir -p /data && chown -R node:node /data /app
COPY --chown=node:node . .
RUN chmod +x /app/entrypoint.sh
EXPOSE 3002
ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]
CMD ["node", "server.mjs"]
