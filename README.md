# Turborepo (NestJS + Prisma + React + Tailwind + TypeScript + Jest) Starter

This monorepo contains a NestJS backend and a React frontend built for a conventional SPA workflow.

## What's inside

- `api`: a [NestJS](https://nestjs.com/) application
- `web`: a [React](https://react.dev/) application powered by [Vite](https://vite.dev/)
- `ui`: a shared React component package
- `config`: shared ESLint, Nginx, and Tailwind configuration
- `tsconfig`: shared TypeScript presets for browser apps, libraries, and NestJS

## Tooling

- Turborepo for workspace orchestration
- TypeScript for static analysis
- Tailwind CSS for styling
- Redux Toolkit Query in the frontend
- Jest for automated testing
- Prisma and PostgreSQL in the backend
- Docker and Nginx for local infrastructure

## Setup

Install dependencies from the repository root:

```bash
npm install
```

Start local infrastructure as needed:

```bash
docker compose up -d
```

## Common commands

Run the frontend in development mode:

```bash
npm run dev --workspace apps/web
```

Run the backend in development mode:

```bash
npm run dev --workspace apps/api
```

Build all workspaces:

```bash
npm run build
```
