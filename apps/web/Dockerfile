FROM node:24-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --workspace=apps/web --workspace=packages/shared --include-workspace-root

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/web

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
