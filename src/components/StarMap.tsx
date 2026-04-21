import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Vec2, CelestialBody, Feature, SystemData, MapTransform, Filters, Waypoint, StarMapProps } from '../types';
import { worldToScreen, screenToWorld, zoomAtPoint, fitToView, formatDist, euclidDist, bodyPx } from '../utils/coords';
import { absPos } from '../utils/coords';

const FONT = "'Share Tech Mono', 'Courier New', monospace";
const PANEL = 'rgba(0,14,22,0.88)';
const BORDER = 'rgba(0,255,200,0.2)';
const CYAN = '#00ffe0';

function flattenWaypoints(system: SystemData): Waypoint[] {
  const items: Waypoint[] = [];
  items.push({ id: '__star__', name: system.star.name, pos: { x: 0, y: 0 } });
  const addBody = (body: CelestialBody, parentPos?: Vec2) => {
    const ap = absPos(body.position, parentPos);
    items.push({ id: body.id, name: body.name, pos: ap });
    for (const child of body.children ?? []) addBody(child, ap);
    for (const f of body.features ?? []) items.push({ id: f.id, name: f.name, pos: absPos(f.position, ap) });
  };
  for (const body of system.bodies) addBody(body);
  return items;
}

export function StarMap({
  system,
  width = '100%',
  height = '600px',
  showSidebar = true,
  showRoutePanel = true,
  showCoords = true,
  showTopBar = true,
  onBodySelect,
  onRouteChange,
  initialTransform,
  persistKey,
  brandTitle = 'SC ATLAS',
  showLagrangeFilter = true,
  showStationsFilter = true,
}: StarMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const loadTransform = (): MapTransform => {
    if (persistKey) {
      try {
        const saved = localStorage.getItem(`sc-atlas-tr-${persistKey}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { x: 0, y: 0, scale: 1e-5, ...initialTransform };
  };

  const [tr, setTrState] = useState<MapTransform>(loadTransform);
  const setTr = useCallback((updater: MapTransform | ((prev: MapTransform) => MapTransform)) => {
    setTrState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (persistKey) {
        try { localStorage.setItem(`sc-atlas-tr-${persistKey}`, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [persistKey]);

  const [selected, setSelected] = useState<Waypoint | null>(null);
  const [route, setRoute] = useState<Waypoint[]>([]);
  const [filters, setFilters] = useState<Filters>({ orbits: true, labels: true, lagrange: false, stations: true, grid: false });
  const [drag, setDrag] = useState<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const [leftOpen, setLeftOpen] = useState(showSidebar);
  const [routeOpen, setRouteOpen] = useState(showRoutePanel);
  const [cursorWorld, setCursorWorld] = useState<Vec2>({ x: 0, y: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit to view when system + dims ready (only on first render / system change)
  const fittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!system || dims.w === 0) return;
    if (fittedRef.current === system.id) return;
    fittedRef.current = system.id;
    if (initialTransform) return;
    setTr(fitToView(system.bodies, dims.w, dims.h));
  }, [system?.id, dims.w]);

  const toScreen = useCallback((wx: number, wy: number) =>
    worldToScreen(wx, wy, tr, dims.w, dims.h), [tr, dims]);

  const toWorld = useCallback((sx: number, sy: number) =>
    screenToWorld(sx, sy, tr, dims.w, dims.h), [tr, dims]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDrag({ sx: e.clientX, sy: e.clientY, px: tr.x, py: tr.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (drag) setTr(t => ({ ...t, x: drag.px + e.clientX - drag.sx, y: drag.py + e.clientY - drag.sy }));
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) setCursorWorld(toWorld(e.clientX - rect.left, e.clientY - rect.top));
  };

  const onMouseUp = () => setDrag(null);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setTr(t => zoomAtPoint(t, sx, sy, dims.w, dims.h, factor));
  }, [dims, setTr]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  // Touch support
  const lastTouchDist = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastTouchDist.current = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
    } else if (e.touches.length === 1) {
      setDrag({ sx: e.touches[0].clientX, sy: e.touches[0].clientY, px: tr.x, py: tr.y });
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const d = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
      const factor = d / lastTouchDist.current;
      lastTouchDist.current = d;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      setTr(t => zoomAtPoint(t, cx, cy, dims.w, dims.h, factor));
    } else if (e.touches.length === 1 && drag) {
      setTr(t => ({ ...t, x: drag.px + e.touches[0].clientX - drag.sx, y: drag.py + e.touches[0].clientY - drag.sy }));
    }
  };

  const onTouchEnd = () => {
    lastTouchDist.current = null;
    setDrag(null);
  };

  const selectWaypoint = (wp: Waypoint) => {
    setSelected(wp);
    onBodySelect?.(wp);
  };

  const clearSelected = () => {
    setSelected(null);
    onBodySelect?.(null);
  };

  const addToRoute = (wp: Waypoint) => {
    setRoute(r => {
      if (r.find(x => x.id === wp.id)) return r;
      const next = [...r, wp];
      onRouteChange?.(next);
      return next;
    });
    setRouteOpen(true);
  };

  const removeFromRoute = (idx: number) => {
    setRoute(r => {
      const next = r.filter((_, j) => j !== idx);
      onRouteChange?.(next);
      return next;
    });
  };

  const clearRoute = () => {
    setRoute([]);
    onRouteChange?.([]);
  };

  const centerOn = (wp: Waypoint) => {
    setTr(t => ({ ...t, x: -wp.pos.x * t.scale, y: -wp.pos.y * t.scale }));
    selectWaypoint(wp);
  };

  const fitView = () => {
    if (!system || dims.w === 0) return;
    setTr(fitToView(system.bodies, dims.w, dims.h));
  };

  const renderFeature = (feat: Feature, parentAbs: Vec2) => {
    const featType = feat.type ?? 'station';
    if (featType === 'lagrange' && (!showLagrangeFilter || !filters.lagrange)) return null;
    if (featType !== 'lagrange' && (!showStationsFilter || !filters.stations)) return null;
    const fap = absPos(feat.position, parentAbs);
    const fsc = toScreen(fap.x, fap.y);
    const fwp: Waypoint = { id: feat.id, name: feat.name, pos: fap };
    const isL = featType === 'lagrange';
    return (
      <g key={feat.id} onClick={e => { e.stopPropagation(); selectWaypoint(fwp); }} style={{ cursor: 'pointer' }}>
        <rect x={fsc.x - 3} y={fsc.y - 3} width={6} height={6}
          fill={isL ? 'rgba(0,255,200,0.25)' : 'rgba(255,200,50,0.55)'}
          stroke={isL ? CYAN : '#ffcc33'} strokeWidth={1}
          transform={`rotate(45,${fsc.x},${fsc.y})`} />
        {filters.labels && (
          <text x={fsc.x + 7} y={fsc.y + 4} fontSize={8} fill="rgba(255,255,255,0.4)"
            fontFamily={FONT} style={{ pointerEvents: 'none' }}>
            {feat.name}
          </text>
        )}
      </g>
    );
  };

  const renderBody = (body: CelestialBody, parentAbsP?: Vec2): React.ReactNode => {
    const ap = absPos(body.position, parentAbsP);
    const sc = toScreen(ap.x, ap.y);
    const r = bodyPx(body.radius);
    const col = body.color || (body.type === 'moon' ? '#7090a0' : CYAN);
    const wp: Waypoint = { id: body.id, name: body.name, pos: ap };
    const orbitCenter = parentAbsP ? toScreen(parentAbsP.x, parentAbsP.y) : toScreen(0, 0);
    const orbitR = (body.orbitRadius ?? 0) * tr.scale;

    return (
      <g key={body.id}>
        {filters.orbits && body.orbitRadius && orbitR > 0 && (
          <circle cx={orbitCenter.x} cy={orbitCenter.y} r={Math.max(0, orbitR)}
            fill="none" stroke="rgba(0,255,200,0.1)" strokeWidth={1} strokeDasharray="3 5" />
        )}
        <circle cx={sc.x} cy={sc.y} r={r} fill={col} opacity={0.88}
          style={{ cursor: 'pointer', filter: `drop-shadow(0 0 ${r}px ${col})` }}
          onClick={e => { e.stopPropagation(); selectWaypoint(wp); }} />
        {filters.labels && (
          <text x={sc.x + r + 4} y={sc.y + 4} fontSize={10} fill="rgba(255,255,255,0.65)"
            fontFamily={FONT} style={{ pointerEvents: 'none' }}>
            {body.name}
          </text>
        )}
        {body.features?.map(feat => renderFeature(feat, ap))}
        {body.children?.map(child => renderBody(child, ap))}
      </g>
    );
  };

  const totalRouteDist = route.length > 1
    ? route.slice(1).reduce((sum, wp, i) => sum + euclidDist(route[i].pos, wp.pos), 0)
    : 0;

  const allItems = system ? flattenWaypoints(system) : [];
  const filtered = search ? allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : [];

  return (
    <div style={{ position: 'relative', width, height, background: '#040d14', display: 'flex', flexDirection: 'column', fontFamily: FONT, overflow: 'hidden' }}>

      {/* TOP BAR */}
      {showTopBar && (
        <div style={{ height: 40, background: PANEL, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '1rem', padding: '0 1rem', flexShrink: 0, zIndex: 20 }}>
          <span style={{ color: CYAN, fontWeight: 700, fontSize: 12, letterSpacing: '0.15em' }}>{brandTitle.toUpperCase()}</span>
          <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto', alignItems: 'center' }}>
            {(['orbits', 'labels', 'stations', 'lagrange', 'grid'] as (keyof Filters)[]).map(k => {
              if (k === 'lagrange' && !showLagrangeFilter) return null;
              if (k === 'stations' && !showStationsFilter) return null;
              return (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: filters[k] ? CYAN : 'rgba(255,255,255,0.35)', cursor: 'pointer', letterSpacing: '0.08em' }}>
                  <input type="checkbox" checked={filters[k]} onChange={e => setFilters(f => ({ ...f, [k]: e.target.checked }))}
                    style={{ accentColor: CYAN, cursor: 'pointer' }} />
                  {k.toUpperCase()}
                </label>
              );
            })}
            {showSidebar && (
              <button onClick={() => setLeftOpen(o => !o)}
                style={{ background: 'none', border: `1px solid ${BORDER}`, color: CYAN, fontFamily: FONT, fontSize: 10, padding: '2px 8px', cursor: 'pointer' }}>
                {leftOpen ? '◀ HIDE' : '▶ BODIES'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAP CONTAINER */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg ref={svgRef} width="100%" height="100%"
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          onClick={clearSelected}
          style={{ cursor: drag ? 'grabbing' : 'grab', display: 'block', touchAction: 'none' }}>

          {/* Grid */}
          {filters.grid && (() => {
            const gridKm = 1e6;
            const lines: React.ReactNode[] = [];
            const minW = toWorld(0, 0);
            const maxW = toWorld(dims.w, dims.h);
            const x0 = Math.floor(minW.x / gridKm) * gridKm;
            const y0 = Math.floor(minW.y / gridKm) * gridKm;
            for (let wx = x0; wx <= maxW.x + gridKm; wx += gridKm) {
              const sx = toScreen(wx, 0).x;
              lines.push(<line key={`v${wx}`} x1={sx} y1={0} x2={sx} y2={dims.h} stroke="rgba(0,255,200,0.06)" strokeWidth={1} />);
            }
            for (let wy = y0; wy <= maxW.y + gridKm; wy += gridKm) {
              const sy = toScreen(0, wy).y;
              lines.push(<line key={`h${wy}`} x1={0} y1={sy} x2={dims.w} y2={sy} stroke="rgba(0,255,200,0.06)" strokeWidth={1} />);
            }
            return <g>{lines}</g>;
          })()}

          {/* Route lines */}
          {route.length > 1 && route.slice(1).map((wp, i) => {
            const a = toScreen(route[i].pos.x, route[i].pos.y);
            const b = toScreen(wp.pos.x, wp.pos.y);
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#39ff7a" strokeWidth={1.5} strokeDasharray="8 4" opacity={0.75} />;
          })}

          {/* Route waypoint rings */}
          {route.map(wp => {
            const sc = toScreen(wp.pos.x, wp.pos.y);
            return <circle key={wp.id} cx={sc.x} cy={sc.y} r={7} fill="none" stroke="#39ff7a" strokeWidth={1.5} opacity={0.8} />;
          })}

          {/* Star */}
          {system && (() => {
            const sc = toScreen(0, 0);
            const r = Math.min(14, bodyPx(system.star.radius));
            return (
              <g onClick={e => { e.stopPropagation(); selectWaypoint({ id: '__star__', name: system.star.name, pos: { x: 0, y: 0 } }); }} style={{ cursor: 'pointer' }}>
                <circle cx={sc.x} cy={sc.y} r={r * 2.2} fill="rgba(255,249,196,0.05)" />
                <circle cx={sc.x} cy={sc.y} r={r * 1.4} fill="rgba(255,249,196,0.08)" />
                <circle cx={sc.x} cy={sc.y} r={r} fill="#fff9c4" style={{ filter: `drop-shadow(0 0 ${r * 1.5}px #fff8a0)` }} />
                {filters.labels && (
                  <text x={sc.x + r + 5} y={sc.y + 4} fontSize={11} fill="rgba(255,249,196,0.8)" fontFamily={FONT} style={{ pointerEvents: 'none' }}>
                    {system.star.name.toUpperCase()}
                  </text>
                )}
              </g>
            );
          })()}

          {/* Bodies */}
          {system?.bodies.map(body => renderBody(body))}

          {/* Selected highlight */}
          {selected && (() => {
            const sc = toScreen(selected.pos.x, selected.pos.y);
            return <circle cx={sc.x} cy={sc.y} r={14} fill="none" stroke={CYAN} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.9} style={{ pointerEvents: 'none' }} />;
          })()}
        </svg>

        {/* LEFT SIDEBAR */}
        {showSidebar && leftOpen && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: 200, height: '100%', background: PANEL, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.6rem', borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 9, color: 'rgba(0,255,200,0.5)', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>BODIES</p>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="search..."
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}`, color: CYAN, fontFamily: FONT, fontSize: 10, padding: '4px 6px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem 0' }}>
              {search ? filtered.map(wp => (
                <div key={wp.id} onClick={() => centerOn(wp)}
                  style={{ padding: '4px 10px', fontSize: 10, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', borderLeft: selected?.id === wp.id ? `2px solid ${CYAN}` : '2px solid transparent' }}>
                  {wp.name}
                </div>
              )) : system ? (
                <>
                  <div onClick={() => centerOn({ id: '__star__', name: system.star.name, pos: { x: 0, y: 0 } })}
                    style={{ padding: '4px 10px', fontSize: 10, color: '#fff9c4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>★</span> {system.star.name}
                  </div>
                  {system.bodies.map(body => (
                    <div key={body.id}>
                      <div onClick={() => centerOn({ id: body.id, name: body.name, pos: body.position })}
                        style={{ padding: '4px 10px', fontSize: 10, color: body.color || CYAN, cursor: 'pointer', borderLeft: selected?.id === body.id ? `2px solid ${CYAN}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ opacity: 0.5 }}>●</span> {body.name}
                      </div>
                      {body.children?.map(child => {
                        const cp = absPos(child.position, body.position);
                        return (
                          <div key={child.id} onClick={() => centerOn({ id: child.id, name: child.name, pos: cp })}
                            style={{ padding: '3px 10px 3px 22px', fontSize: 9, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderLeft: selected?.id === child.id ? `2px solid ${CYAN}` : '2px solid transparent' }}>
                            ○ {child.name}
                          </div>
                        );
                      })}
                      {body.features?.map(f => {
                        const featType = f.type ?? 'station';
                        if (featType === 'lagrange' && (!showLagrangeFilter || !filters.lagrange)) return null;
                        if (featType !== 'lagrange' && (!showStationsFilter || !filters.stations)) return null;
                        const fp = absPos(f.position, body.position);
                        return (
                          <div key={f.id} onClick={() => centerOn({ id: f.id, name: f.name, pos: fp })}
                            style={{ padding: '3px 10px 3px 22px', fontSize: 9, color: 'rgba(255,200,50,0.6)', cursor: 'pointer' }}>
                            □ {f.name}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* SELECTED BODY INFO */}
        {selected && (
          <div style={{ position: 'absolute', bottom: 40, left: showSidebar && leftOpen ? 216 : 16, background: PANEL, border: `1px solid ${BORDER}`, padding: '0.75rem 1rem', minWidth: 200, maxWidth: 260 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: CYAN, letterSpacing: '0.1em', margin: 0 }}>{selected.name.toUpperCase()}</p>
              <button onClick={clearSelected} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
              {formatDist(selected.pos.x)}, {formatDist(selected.pos.y)}
            </p>
            {showRoutePanel && (
              <button onClick={() => addToRoute(selected)}
                style={{ background: 'rgba(57,255,122,0.1)', border: '1px solid rgba(57,255,122,0.4)', color: '#39ff7a', fontFamily: FONT, fontSize: 9, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.1em', width: '100%' }}>
                + ADD TO ROUTE
              </button>
            )}
          </div>
        )}

        {/* ROUTE PANEL */}
        {showRoutePanel && routeOpen && (
          <div style={{ position: 'absolute', bottom: 40, right: 16, background: PANEL, border: `1px solid ${BORDER}`, padding: '0.75rem', minWidth: 220, maxWidth: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: `1px solid ${BORDER}`, paddingBottom: '0.4rem' }}>
              <p style={{ fontSize: 9, color: CYAN, letterSpacing: '0.15em', fontWeight: 700, margin: 0 }}>ACTIVE ROUTE</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {route.length > 0 && (
                  <button onClick={clearRoute} style={{ background: 'none', border: 'none', color: 'rgba(244,63,94,0.7)', fontFamily: FONT, fontSize: 9, cursor: 'pointer' }}>CLEAR</button>
                )}
                <button onClick={() => setRouteOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            </div>
            {route.length === 0 ? (
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '0.5rem 0', margin: 0 }}>No waypoints. Click a body and add to route.</p>
            ) : (
              <>
                {route.map((wp, i) => (
                  <div key={wp.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: `1px solid rgba(0,255,200,0.06)` }}>
                    <span style={{ fontSize: 9, color: 'rgba(0,255,200,0.4)', width: 14, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wp.name}</span>
                    {i > 0 && <span style={{ fontSize: 8, color: '#39ff7a', opacity: 0.7, flexShrink: 0 }}>{formatDist(euclidDist(route[i - 1].pos, wp.pos))}</span>}
                    <button onClick={() => removeFromRoute(i)}
                      style={{ background: 'none', border: 'none', color: 'rgba(244,63,94,0.5)', cursor: 'pointer', fontSize: 12, lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                ))}
                {route.length > 1 && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: `1px solid ${BORDER}` }}>
                    <p style={{ fontSize: 11, color: '#39ff7a', fontWeight: 700, margin: 0 }}>TOTAL: {formatDist(totalRouteDist)}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2, margin: 0 }}>≈ {(totalRouteDist / 149_597_870.7).toFixed(4)} AU</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {showRoutePanel && !routeOpen && (
          <button onClick={() => setRouteOpen(true)}
            style={{ position: 'absolute', bottom: 40, right: 16, background: PANEL, border: `1px solid ${BORDER}`, color: CYAN, fontFamily: FONT, fontSize: 9, padding: '6px 12px', cursor: 'pointer', letterSpacing: '0.1em' }}>
            ROUTE ▲
          </button>
        )}

        {/* CURSOR COORDS */}
        {showCoords && (
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: 'rgba(0,255,200,0.35)', fontFamily: FONT, letterSpacing: '0.1em', pointerEvents: 'none' }}>
            {formatDist(cursorWorld.x)} · {formatDist(cursorWorld.y)}
          </div>
        )}

        {/* FIT VIEW */}
        <button onClick={fitView}
          style={{ position: 'absolute', top: 8, right: 16, background: PANEL, border: `1px solid ${BORDER}`, color: CYAN, fontFamily: FONT, fontSize: 9, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.1em' }}>
          ⊙ FIT VIEW
        </button>
      </div>
    </div>
  );
}
