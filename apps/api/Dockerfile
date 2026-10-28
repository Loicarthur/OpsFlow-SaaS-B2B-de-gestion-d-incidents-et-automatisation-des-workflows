FROM node:24-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --workspace=apps/api --workspace=packages/shared --include-workspace-root

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace=packages/shared
RUN npm run prisma:generate --workspace=apps/api
RUN npm run build --workspace=apps/api

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/generated ./apps/api/generated
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json

WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
