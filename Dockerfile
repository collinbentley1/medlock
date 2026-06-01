FROM dhi.io/bun:1-dev@sha256:672095ec6bf67688dad9b0830c6a8c2df66ab71c6e8ba22fb9b879c8fef03492 AS deps

WORKDIR /app
RUN bun upgrade --canary
COPY package.json bunfig.toml ./
RUN bun install

FROM deps AS build
WORKDIR /app
COPY . .
RUN bun run verify:ci

FROM dhi.io/bun:1@sha256:3f3b49bc429654f9aa20b8d4421a7a45d2f62c2c69eae8e6f099fb063420d39d AS runtime

ENV NODE_ENV=production \
  PORT=8080 \
  PUBLIC_DIR=/app/dist/public

WORKDIR /app
COPY --from=build /usr/local/bin/bun /usr/local/bin/bun
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["bun", "dist/server.js"]
