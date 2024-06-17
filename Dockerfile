FROM node:20.11.1-alpine as base

# ---------------
# Install Dependencies
# ---------------
FROM base as deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV DISABLE_OPENCOLLECTIVE=true

COPY package*.json ./
COPY lwk_wasm-0.6.2.tgz ./

# Install app dependencies
RUN npm ci

# ---------------
# Build App
# ---------------
FROM deps as build

WORKDIR /app

COPY . .

# Generate Prisma clients
RUN npm run prisma:generate

# Build NestJS application
RUN npm run build

# Remove non production necessary modules
RUN npm prune --production

# ---------------
# Final App
# ---------------
FROM base

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist/ ./dist/

EXPOSE 3000

COPY ./scripts/startup.sh /startup.sh
ENTRYPOINT ["sh", "/startup.sh" ]