FROM dhi.io/bun:1-dev@sha256:67209598b7e7db266ae5630f9b27662d3a80b0915615bbcb9f703f562c5b5a52 AS deps

WORKDIR /app
RUN apt-get update \
  && apt-get install --no-install-recommends -y unzip \
  && rm -rf /var/lib/apt/lists/*
RUN bun upgrade --canary
COPY package.json bunfig.toml ./
RUN bun install

FROM deps AS build
WORKDIR /app
COPY . .
RUN bun run verify:ci

FROM dhi.io/bun:1@sha256:3f3bcd8aeebefe5a4477ad5cd3a1a0154213c028f63a4d6ea84eeafe5dc69a38 AS runtime

ENV NODE_ENV=production \
  PORT=8080 \
  PUBLIC_DIR=/app/dist/public

WORKDIR /app
COPY --from=build /usr/local/bin/bun /usr/local/bin/bun
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["bun", "dist/server.js"]
