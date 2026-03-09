FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/db packages/db
COPY packages/core packages/core
COPY apps/api apps/api

# Build
RUN pnpm --filter @letpay/db build && \
    pnpm --filter @letpay/core build && \
    pnpm --filter @letpay/api build

EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/api/dist/index.js"]
