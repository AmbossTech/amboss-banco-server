# Mi Banco Server

**Banking for the Unbanked**

## Running locally for development

### NestJS instance

1. `git clone` the repo
2. `cd` into the directory
3. Install packages with `npm install` (using node `v20.11.1`)
4. Start using `npm run start:dev`
5. Applications run on port 3000 by default: `localhost:3000`. Can be specified using the `PORT` env var.

### Postgres and Redis

`docker compose up -d` to start the postgres and redis container

### Run Prisma migrations

`npx prisma migrate dev --schema prisma/schema.prisma`

Please note that the Postgres url from the environment will be used, i.e. `.env` file

## Build for production

You can build this app using `npm run build`. Or use the [`Dockerfile`](./Dockerfile) to deploy this application.

## Deployed backend

[https://bancolibre.com/api/graphql](https://bancolibre.com/api/graphql)
