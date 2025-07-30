# UYES

UYES is a round-based web game that takes inspiration from the famous card game UNO!

## Prerequisites

- [Node.js](https://nodejs.org/) which includes `npm`

## Setup

Install the project dependencies:

```bash
npm install
```

Run the command again whenever new dependencies are introduced (for example,
after pulling recent updates).

Copy `.env.example` to `.env` to adjust configuration. The server uses `PORT` and `JWT_SECRET` from this file. Defaults are provided if no `.env` is present.

Start the application in development mode with automatic reload:

```bash
npm run dev
```

Or start it once using Node.js:

```bash
npm start
```

Once the server is running, open `http://localhost:<PORT>` in your browser (replace `<PORT>` with the value from your `.env` or the default `5000`).

## Code Quality

Run ESLint to check for coding issues:

```bash
npm run lint
```

Automatically format files using Prettier:

```bash
npm run format
```

## Build CSS

Generate the final stylesheets used in production:

```bash
npm run build:css
```

This command runs PostCSS with the Autoprefixer plugin and writes the processed CSS to `dist/styles`.

## Browser Compatibility

The frontend is tested with modern versions of Chrome, Firefox and Edge. CSS is processed with PostCSS and Autoprefixer to automatically add vendor prefixes. When container query units (`cqw`, `cqh`) are unsupported, fallback viewport units are used.

## Media Credits

Music and sound effects are provided by [Pixabay](https://pixabay.com).
Avatar images, the start page graphics and the Eichberg image also originate from Pixabay.

## Documentation

- [docs/nachrichtenaustausch.md](docs/nachrichtenaustausch.md) – message exchange reference (German).
- [docs/architecture.md](docs/architecture.md) – backend and frontend overview with socket flow.

