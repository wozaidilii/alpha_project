# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## Database

This app uses PostgreSQL for player profiles, login sessions, battle history, and the question bank.

Set `DATABASE_URL` in `.env.local` or your shell, then initialize the database:

```bash
npm run db:migrate
npm run db:seed
```

`db:migrate` creates the tables in `db/schema.sql`.
`db:seed` imports the historical-event question bank from `db/seed-events.sql`.

For local development, the included Docker Compose config matches this URL:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/histoguessr"
```

Start the local database with:

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

For production on Vercel, use a managed Postgres provider such as Neon or Supabase through the Vercel Marketplace, then set that provider's connection string as `DATABASE_URL`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
