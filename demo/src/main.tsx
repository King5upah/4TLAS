import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StarMap } from '../../src/index';
import type { SystemData } from '../../src/types';
import solarSystem from '../solar-system.json';

const SYSTEMS: Record<string, SystemData> = {
  'solar-system': solarSystem as SystemData,
};

function App() {
  const [active, setActive] = useState('solar-system');

  return (
    <div id="root" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{
        height: 52, padding: '0 1.5rem', borderBottom: '1px solid rgba(0,255,200,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,14,22,0.95)', flexShrink: 0,
      }}>
        <h1 style={{ fontSize: '0.9rem', color: '#00ffe0', letterSpacing: '0.2em', fontFamily: 'Share Tech Mono, monospace' }}>
          4TLAS — PLANETARY VISUALIZATION
        </h1>
        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="https://github.com/cargo-runners/sc-atlas" target="_blank" rel="noreferrer"
            style={{ fontSize: '0.65rem', color: 'rgba(0,255,200,0.6)', textDecoration: 'none', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace' }}>
            GitHub
          </a>
          <a href="https://www.npmjs.com/package/sc-atlas" target="_blank" rel="noreferrer"
            style={{ fontSize: '0.65rem', color: 'rgba(0,255,200,0.6)', textDecoration: 'none', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace' }}>
            npm
          </a>
        </nav>
      </header>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem', zIndex: 30 }}>
          {Object.keys(SYSTEMS).map(key => (
            <button key={key} onClick={() => setActive(key)}
              style={{
                background: 'rgba(0,14,22,0.88)',
                border: `1px solid ${active === key ? 'rgba(0,255,200,0.5)' : 'rgba(0,255,200,0.2)'}`,
                color: active === key ? '#00ffe0' : 'rgba(0,255,200,0.5)',
                fontFamily: 'Share Tech Mono, monospace', fontSize: '0.65rem',
                padding: '4px 14px', cursor: 'pointer', letterSpacing: '0.12em',
              }}>
              {key.replace(/-/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>
        <StarMap
          system={SYSTEMS[active]}
          width="100%"
          height="100%"
          showTopBar={true}
          brandTitle="4TLAS"
          showRoutePanel={false}
          showLagrangeFilter={false}
          showStationsFilter={false}
          persistKey={active}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
