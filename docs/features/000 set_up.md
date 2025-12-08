# Set up project

## First, set up the project skeleton
Please initialize this project.

Let's start by setting up the project using 

```
    npx create-react-router@latest scryer-prolog-wasm-lab
```

After that, we will use `pnpm`, not `npm`, so run `pnpm install` when you are done.

Add a note to docs\developers.md stating how to start the project with `pnpm run dev`.

## Then, add developer tools
We also want to install Biome for code formatting and linting.

Please use `pnpm` to install `biome` and `husky` and `lint-staged`.

Run biome init (I think it it `pnpm biome init`) to define a basic config file.

Add a note to docs\developers.md stating how to format, lint and fix code with  `pnpm biome format --write`. `pnpm biome lint --write` and `pnpm biome check --write`.

Then add a husky pre-commit hook that runs `lint-staged` to format and lint the code.

Please add lint-staged configuration to package.json.
- for .js, .tsx, .ts and .json in app/** use `pnpm biome check --write` to format and lint

## Then, add shadcn

Please add shadcn to the project and initialise it.
