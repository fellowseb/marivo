# Marivo Monorepo

This repository contains all packages of the Marivo project: `https://marivo.app`.

Those packages are split between applications:

- `apps/storefront`, the marketing website,
- `apps/webapp`, the actual webapp (`https://my.marivo.app`),
- `apps/api`, the actual backend API,

... and libraries to support the apps:

- `packages/config-eslint`, the shared ESLint configs,
- `packages/config-typescript`, the shared TypeScript configs,
- `packages/jest-presets`, the shared Jest configs,
- `packages/`, the shared UI code,
- `packages/`, the shared framework/utils code.

## Setup

Make sure you've installed `pnpm`, then

```
pnpm install
```

## Development

Use the orchestrator (Turborepo) to run all useful commands on all packages:

### Start

To build all apps in dev mode and serve the result, run

```
pnpm dev
```

and then open the served pages:

- `http://localhost:8080` for the marketing website
- `http://localhost:5173` for the webapp.

### Lint

To lint all packages, run

```
pnpm lint
```

### Format

To format all packages, run

```
pnpm format
```
