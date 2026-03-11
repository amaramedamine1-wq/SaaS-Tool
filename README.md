# SaaS-Tool

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Local DB Setup (Prisma + PostgreSQL via Docker)

1. Configure your `.env` file (single env file only). It must contain:
- `OPENAI_API_KEY`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (optional, `true`/`false`)
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM` (optional)
- `OPENAI_IMAGE_MODEL` (optional, default `gpt-image-1`)
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION` (optional, default `us-central1`)
- `VERTEX_VIDEO_MODEL` (optional)
- `VERTEX_VIDEO_STORAGE_URI` (required for Veo video output, e.g. `gs://your-bucket/veo-output/`)
- `GOOGLE_APPLICATION_CREDENTIALS` (recommended for Vertex auth)
- `FREE_IMAGE_LIMIT` (optional, default `10`)
- `FREE_VIDEO_LIMIT` (optional, default `1`)
- `PRO_IMAGE_LIMIT` (optional, default `200`)
- `PRO_VIDEO_LIMIT` (optional, default `20`)
- `PRO_PRICE_EUR` (optional, default `19`)

2. Install dependencies:

```bash
npm install
```

3. Start PostgreSQL:

```bash
npm run db:up
```

4. Generate Prisma client and run first migration:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

5. Optional: open Prisma Studio:

```bash
npm run prisma:studio
```

## VS Code Tasks

Open Command Palette -> `Tasks: Run Task` and use:

- `docker: up`
- `docker: down`
- `docker: logs postgres`
- `prisma: migrate dev`
- `prisma: studio`

## Better Auth Setup

1. Ensure `.env` contains at least:
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

2. Run the app:

```bash
npm run dev
```

3. Use auth pages:
- `/register`
- `/login`
- `/forgot-password`
- `/reset-password?token=...`

4. Admin role:
- Users with `user.role = "admin"` can access `/admin`.

## Password Reset in Development

Reset links are logged to the server console in development via `sendResetPassword`.
For production, replace this with a real email provider in `lib/auth.ts`.
