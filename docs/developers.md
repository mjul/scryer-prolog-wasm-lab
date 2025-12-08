# Developer Guide

## Starting the Project

To start the development server, run:

```
pnpm run dev
```

## Run Tests

```
pnpm test
```

## Run Type Checker

```
pnpm typecheck
```

## Code Formatting and Linting

Use Biome for formatting and linting.

To format code:

```
pnpm biome format --write
```

To lint code:

```
pnpm biome lint --write
```

To check and fix issues:

```
pnpm biome check --write
```

A pre-commit hook is set up to run `pnpm biome check --staged --write`.