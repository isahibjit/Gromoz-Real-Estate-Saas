## React App

This workspace now uses Vite + React + TypeScript instead of Next.js.

### Development

```bash
yarn dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

### Build

```bash
yarn build
```

### Preview

```bash
yarn start
```

### Notes

- The SPA entry point is `src/main.tsx`.
- The root application component is `src/App.tsx`.
- API requests to `/api` are proxied to the Nest backend during local development.
