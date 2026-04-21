# 4TLAS

**Interactive 2D planetary visualization library.** Built for students and astronomy enthusiasts.

[![npm](https://img.shields.io/npm/v/4tlas)](https://www.npmjs.com/package/4tlas)
[![license](https://img.shields.io/npm/l/4tlas)](LICENSE)
[![demo](https://img.shields.io/badge/demo-live-00ffe0)](https://King5upah.github.io/4TLAS/)

**[→ Live Demo — 4TLAS](https://King5upah.github.io/4TLAS/)**

---

## Features

- SVG rendering — no canvas, fully scalable
- Pan (drag) and zoom (scroll wheel + pinch-to-zoom on mobile)
- Hierarchical bodies: star → planets → moons → features (stations, Lagrange points)
- Logarithmic size scale — makes a 696,000 km star and a 300 km moon both visible at once
- Orbit ellipses, dashed route lines, body labels
- Route builder: click bodies, build a path, get total distance in km / Gm / AU
- Sidebar body tree with search
- Real-time cursor coordinates
- Fit-to-view
- `localStorage` transform persistence (via `persistKey` prop)
- Touch support (pinch-to-zoom, one-finger pan)
- Toggle filters: orbits, labels, Lagrange points, stations, grid
- Zero runtime dependencies beyond React

---

## Install

```bash
npm install sc-atlas
```

React 17+ is a peer dependency — it won't be bundled.

---

## Quick Start

```tsx
import { StarMap } from 'sc-atlas';

const stanton = {
  id: 'stanton',
  name: 'Stanton',
  star: { name: 'Stanton', position: { x: 0, y: 0 }, radius: 696000 },
  bodies: [
    {
      id: 'hurston',
      name: 'Hurston',
      type: 'planet',
      position: { x: 18358640, y: 10600000 },
      orbitRadius: 21200000,
      radius: 1000,
      color: '#c4a86a',
      children: [],
      features: [],
    },
  ],
};

export default function App() {
  return (
    <StarMap
      system={stanton}
      width="100%"
      height="600px"
    />
  );
}
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `system` | `SystemData` | **required** | Star system JSON data |
| `width` | `string \| number` | `'100%'` | CSS width of the map container |
| `height` | `string \| number` | `'600px'` | CSS height of the map container |
| `showSidebar` | `boolean` | `true` | Show the body tree sidebar |
| `showRoutePanel` | `boolean` | `true` | Show the route builder panel |
| `showCoords` | `boolean` | `true` | Show cursor world coordinates at bottom |
| `showTopBar` | `boolean` | `true` | Show the top bar (filters + hide sidebar toggle) |
| `onBodySelect` | `(wp: Waypoint \| null) => void` | — | Callback when a body is selected or deselected |
| `onRouteChange` | `(route: Waypoint[]) => void` | — | Callback when the route changes |
| `initialTransform` | `Partial<MapTransform>` | — | Override the initial pan/zoom transform |
| `persistKey` | `string` | — | If set, saves the current transform to `localStorage` under this key |

---

## Data Model

All distances are in **kilometers**. Positions are Cartesian (x, y). Planets use absolute coordinates relative to the star at (0, 0). Moons and features use **relative** coordinates — offset from their parent body.

```ts
type SystemData = {
  id: string;
  name: string;
  star: { name: string; position: Vec2; radius: number };
  bodies: CelestialBody[];
};

type CelestialBody = {
  id: string;
  name: string;
  type: string;           // 'planet' | 'moon' | 'asteroid' | ...
  subtype?: string;
  position: Vec2;         // absolute for planets, relative for moons
  orbitRadius?: number;   // semi-major axis in km (for orbit circle display)
  radius: number;         // body radius in km (used for log-scale rendering)
  color?: string;         // CSS color string
  children?: CelestialBody[];
  features?: Feature[];
};

type Feature = {
  id: string;
  name: string;
  type?: string;          // 'station' | 'lagrange' | ...
  position: Vec2;         // relative to parent body
  lagrangePoint?: string; // 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
};
```

### Solar System Example

```json
{
  "id": "sol",
  "name": "Sol",
  "star": { "name": "Sol", "position": { "x": 0, "y": 0 }, "radius": 696000 },
  "bodies": [
    {
      "id": "earth",
      "name": "Earth",
      "type": "planet",
      "position": { "x": 149598023, "y": 0 },
      "orbitRadius": 149598023,
      "radius": 6371,
      "color": "#4488ff",
      "children": [
        {
          "id": "moon",
          "name": "Moon",
          "type": "moon",
          "position": { "x": 384400, "y": 0 },
          "orbitRadius": 384400,
          "radius": 1737
        }
      ],
      "features": [
        {
          "id": "iss",
          "name": "ISS",
          "type": "station",
          "position": { "x": 6871, "y": 0 }
        }
      ]
    }
  ]
}
```

---

## Utilities

SC Atlas also exports the coordinate math separately, useful if you want to build your own rendering layer:

```ts
import {
  worldToScreen,
  screenToWorld,
  zoomAtPoint,
  fitToView,
  formatDist,   // 149598023 → "149.60 Gm"
  formatAU,     // 149598023 → "1.0000 AU"
  euclidDist,
  bodyPx,       // log-scale pixel radius for rendering
  absPos,       // resolve relative position to absolute
  flatten,      // flatten CelestialBody tree → FlatBody[]
  collectFeatures,
} from 'sc-atlas';
```

---

## Use Cases

| Domain | How to use |
|--------|-----------|
| **Astronomy education** | Use real NASA JPL distances (see `demo/solar-system.json`) |
| **Fictional worldbuilding** | Invent coordinates for sci-fi settings, show orbital relationships |
| **Exoplanet explorer** | Feed NASA Exoplanet Archive data after converting AU → km |
| **Physics simulations** | Visualize orbital mechanics at any scale |
| **Star Citizen** | Load Stanton or Pyro system JSON with real in-game coordinates |

---

## Development

```bash
# Clone the repo
git clone https://github.com/King5upah/4TLAS
cd 4TLAS

# Install deps
npm install
cd demo && npm install && cd ..

# Run demo locally (hot reload)
npm run dev

# Build the library
npm run build

# Build the GitHub Pages demo
npm run build:demo
```

### Project structure

```
sc-atlas/
  src/
    components/
      StarMap.tsx        ← main React component
    utils/
      coords.ts          ← worldToScreen, zoomAtPoint, formatDist…
      bodies.ts          ← flatten, collectFeatures
    types/
      index.ts           ← Vec2, CelestialBody, SystemData…
    index.ts             ← public API exports
  demo/
    src/main.tsx         ← demo app entry point
    solar-system.json    ← real Solar System data (NASA JPL values in km)
    vite.config.ts
  .github/workflows/
    deploy-demo.yml      ← GitHub Pages auto-deploy on push to main
  package.json
  vite.config.ts         ← library build config
  tsconfig.json
```

---

## Coordinate System Notes

- The **star is always at (0, 0)**
- Planet positions are **absolute** (relative to the star)
- Moon and feature positions are **relative** to their parent body
- `orbitRadius` is the semi-major axis — used to draw the orbit ring. Planets at non-zero y just means they're shown at a snapshot position in their orbit, not that the orbit is centered there. The orbit circle always renders centered on the parent.
- All distances in **km**. 1 AU = 149,597,870.7 km

---

## License

MIT © cargo-runners

Made with the Star Citizen community in mind, but useful for any 2D coordinate map.
