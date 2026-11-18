FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

ENV PORT=4000
ENV DB_PATH=/app/data/subscriptions.db
ENV VAULT_DIR=/app/data/vault-data

RUN mkdir -p /app/data && chmod +x entrypoint.sh
VOLUME ["/app/data"]

EXPOSE 4000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["bun", "src/server.js"]
