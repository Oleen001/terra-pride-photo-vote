# Terra Pride Photo Vote

## Getting Started

Create a local env file, then run the development server:

```bash
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

This project uses Next.js App Router and Tailwind CSS. The participant-facing UI supports light mode by default and a persisted dark-mode toggle in the header.

## Running And Deploying

See [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) for local, production, and temporary external preview options.

Short version:

- Local: `npm run dev`
- Production: Render service from `render.yaml`, branch `main`

## Scripts

- `npm run dev` - start local Next dev server on `0.0.0.0`
- `npm run build` - build production assets
- `npm start` - run the built Next app
- `npm run lint` - run ESLint
- `npm run gen:admin-hash` - generate the admin password hash

## Required Env

Copy [.env.example](.env.example) and fill the values for the environment you are running.
