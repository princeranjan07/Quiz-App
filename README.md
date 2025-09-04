# Quiz App (Vite + React) — Tailwind, Accessibility & Deployment Ready

This project implements the quiz assignment with:
- Tailwind CSS styling.
- Accessibility improvements (keyboard navigation, ARIA attributes, focus management).
- History, difficulty, timer, results as before.
- Deployment instructions for Vercel and Netlify.

## Run locally

1. Install dependencies:
```bash
npm install
```

2. Start dev server:
```bash
npm run dev
```

If Tailwind CLI isn't available in your environment during `postinstall`, run:
```bash
npx tailwindcss -i ./src/index.css -o ./src/tailwind-output.css --minify
```

## Deploy

### Vercel
1. Push repository to GitHub.
2. Go to https://vercel.com/new and import the repo.
3. Vercel auto-detects Vite; use build command `npm run build` and output directory `dist`.
4. Deploy — Vercel will build and host the site.

### Netlify
1. Push repository to GitHub.
2. Create a new site on Netlify, connect the GitHub repo.
3. Build command: `npm run build`
4. Publish directory: `dist`

## Notes
- `localStorage` stores `latestResult`, `quizHighScore`, and `quizHistory`.
- History keeps up to 50 most recent attempts.