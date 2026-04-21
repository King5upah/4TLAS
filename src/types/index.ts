export type Vec2 = { x: number; y: number };

export type Feature = {
  id: string;
  name: string;
  type?: string | null;
  position: Vec2;
  lagrangePoint?: string;
};

export type CelestialBody = {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  position: Vec2;
  orbitRadius?: number | null;
  radius: number;
  color?: string;
  children?: CelestialBody[];
  features?: Feature[];
};

export type StarData = {
  name: string;
  position: Vec2;
  radius: number;
};

export type SystemData = {
  id: string;
  name: string;
  star: StarData;
  bodies: CelestialBody[];
};

export type MapTransform = { x: number; y: number; scale: number };

export type Filters = {
  orbits: boolean;
  labels: boolean;
  lagrange: boolean;
  stations: boolean;
  grid: boolean;
};

export type Waypoint = {
  id: string;
  name: string;
  pos: Vec2;
};

export type StarMapProps = {
  system: SystemData;
  width?: string | number;
  height?: string | number;
  showSidebar?: boolean;
  showRoutePanel?: boolean;
  showCoords?: boolean;
  showTopBar?: boolean;
  brandTitle?: string;
  showLagrangeFilter?: boolean;
  showStationsFilter?: boolean;
  onBodySelect?: (waypoint: Waypoint | null) => void;
  onRouteChange?: (route: Waypoint[]) => void;
  initialTransform?: Partial<MapTransform>;
  persistKey?: string;
};
