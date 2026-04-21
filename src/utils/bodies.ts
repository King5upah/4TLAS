import type { CelestialBody, Feature, Vec2 } from '../types';
import { absPos } from './coords';

export type FlatBody = CelestialBody & { absPosition: Vec2; parentPos?: Vec2 };

export function flatten(bodies: CelestialBody[], parentPos?: Vec2): FlatBody[] {
  const result: FlatBody[] = [];
  for (const body of bodies) {
    const ap = parentPos ? absPos(body.position, parentPos) : body.position;
    result.push({ ...body, absPosition: ap, parentPos });
    if (body.children?.length) {
      result.push(...flatten(body.children, ap));
    }
  }
  return result;
}

export type FlatFeature = Feature & { absPosition: Vec2; parentBody: FlatBody };

export function collectFeatures(flatBodies: FlatBody[]): FlatFeature[] {
  const result: FlatFeature[] = [];
  for (const body of flatBodies) {
    if (!body.features?.length) continue;
    for (const feat of body.features) {
      result.push({
        ...feat,
        absPosition: absPos(feat.position, body.absPosition),
        parentBody: body,
      });
    }
  }
  return result;
}
