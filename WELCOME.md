# Welcome to SC Atlas

Hey! This is your standalone library package, ready to publish on npm and deploy a live demo to GitHub Pages.

---

## What's here

```
s_atlas/
  src/                    ← library source (TypeScript + React)
    components/
      StarMap.tsx          ← the main component — no Next.js deps
    utils/
      coords.ts            ← coordinate math (worldToScreen, zoom, format…)
      bodies.ts            ← tree flattening utilities
    types/index.ts         ← all TypeScript types
    index.ts               ← public exports
  demo/                   ← GitHub Pages demo app
    src/main.tsx           ← demo entry (shows Solar System by default)
    solar-system.json      ← real NASA JPL data in km
    vite.config.ts         ← builds to ../docs/ for GitHub Pages
  .github/workflows/
    deploy-demo.yml        ← auto-deploys demo on every push to main
  README.md               ← the npm README with full docs
  package.json            ← library package config
  vite.config.ts          ← library build (outputs ESM + UMD + .d.ts)
  tsconfig.json
```

---

## First-time setup

### 1. Initialize git repo

```bash
cd ~/s_atlas
git init
git add .
git commit -m "feat: initial sc-atlas library extraction"
```

### 2. Create GitHub repo

Go to GitHub → New repository → name it `sc-atlas` (public, MIT license already included).

```bash
git remote add origin https://github.com/YOUR_USERNAME/sc-atlas.git
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to repo Settings → Pages
2. Source: **GitHub Actions**
3. The workflow at `.github/workflows/deploy-demo.yml` will trigger automatically on the next push.

Your demo will be live at: `https://YOUR_USERNAME.github.io/sc-atlas/`

> Update the `base` in `demo/vite.config.ts` if your repo name is different.

### 4. Install demo dependencies locally

```bash
cd ~/s_atlas/demo
npm install
npm run dev     # hot-reload demo at http://localhost:5173
```

### 5. Build and publish to npm

```bash
cd ~/s_atlas
npm install
npm run build       # outputs to dist/
npm login           # needs npm account
npm publish --access public
```

---

## Adding more star systems

Edit `demo/src/main.tsx` — add entries to the `SYSTEMS` object:

```ts
import stantonData from '../stanton.json';

const SYSTEMS = {
  'solar-system': solarSystem as SystemData,
  'stanton': stantonData as SystemData,   // ← add this
};
```

The tab bar in the demo will pick it up automatically.

---

## Updating the live demo (no npm publish needed)

Just push to `main` — GitHub Actions rebuilds the demo automatically.

---

## Notes

- `orbitRadius` values in `solar-system.json` are semi-major axes from NASA JPL Horizons (in km)
- Planets are placed at different angles so they're not all on the x-axis in the demo
- The logarithmic size scale (`bodyPx` in `utils/coords.ts`) keeps both a 696,000 km star and a 1,700 km moon visible at the same time
- The `persistKey` prop saves the current pan/zoom to `localStorage` — great for remembering where the user was

---

Good luck — the community is going to love this.
