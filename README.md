# Scryer Prolog WASM Lab

Examples of using Scryer Prolog in web applications, running the Prolog interpreter in WASM on the client.

## Getting Started
This is a web application built on React Router and Node, automated with `pnpm`.

### Installation

Install the dependencies:

```bash
pnpm install
```

### Developing Prolog Code
For development, it can be useful to run Scryer Prolog in Docker, and use a Docker Volume (`-v`) to mount
your project files into that image, so you can easily test them.

```bash
    docker run -v .:/mnt -it mjt128/scryer-prolog
```    
Now you see the `?-` prompt from Prolog you can use `consult` to read a
Prolog source file from the mounted volume:

```
?- consult('/mnt/app/multinationals/rules.pl').
   true.
```

You can query it like so:

```
?- accounting_currency(bigco_reykjavik, C).
   C = isk
```

### Development

Start the development server with HMR:

```bash
pnpm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
pnpm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `pnpm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

