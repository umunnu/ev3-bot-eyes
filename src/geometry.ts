export type CuriousEyeShape =
  | 'rectangle'
  | 'triangle'
  | 'diamond'
  | 'circle'
  | 'hexagon'
  | 'drop';

export interface CuriousEyesAppearance {
  shape: CuriousEyeShape;
  width: number;
  height: number;
  /** Clear space between the unrotated eyes, in SVG units. */
  gap: number;
  /** Shape-specific softness, from 0 to 100. */
  rounding: number;
  /** Edge diffusion around a defined core, from 0 (crisp) to 1 (strong halo). */
  edgeBlur: number;
  /** Clockwise on the left eye, counterclockwise on the right. */
  rotation: number;
  color: string;
  /** Halo color; null follows the eye color. */
  blurColor: string | null;
}

export const defaultCuriousEyesAppearance: CuriousEyesAppearance = {
  shape: 'rectangle',
  width: 13,
  height: 18,
  gap: 7,
  rounding: 85,
  edgeBlur: 0,
  rotation: 0,
  color: 'currentColor',
  blurColor: null,
};

/** Drop undefined/non-finite values and constrain geometry to a safe SVG range. */
export function normalizeCuriousEyesAppearance(appearance: Partial<CuriousEyesAppearance> = {}): CuriousEyesAppearance {
  const defaults = defaultCuriousEyesAppearance;
  const number = (key: 'width' | 'height' | 'gap' | 'rounding' | 'edgeBlur' | 'rotation', min: number, max: number) => {
    const value = appearance[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(min, Math.min(max, value)) : defaults[key];
  };
  const color = (value: unknown) => typeof value === 'string' && value.trim() ? value : null;
  return {
    shape: ['rectangle', 'triangle', 'diamond', 'circle', 'hexagon', 'drop'].includes(appearance.shape ?? '')
      ? appearance.shape! : defaults.shape,
    width: number('width', 0.1, 64), height: number('height', 0.1, 64),
    gap: number('gap', 0, 64), rounding: number('rounding', 0, 100),
    edgeBlur: number('edgeBlur', 0, 1), rotation: number('rotation', -180, 180),
    color: color(appearance.color) ?? defaults.color,
    blurColor: color(appearance.blurColor) ?? defaults.blurColor,
  };
}

export const curiousEyesPalette = [
  { label: 'Black', color: '#000000' },
  { label: 'Coral', color: '#ff7a59' },
  { label: 'Teal', color: '#00a499' },
  { label: 'Blue', color: '#00a4bd' },
  { label: 'Gold', color: '#f5c26b' },
  { label: 'Slate', color: '#516f90' },
  { label: 'Red', color: '#f2545b' },
];

export interface EyeExpression {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  openness: number;
}

type Point = [number, number];

/** Scale diffusion with the eye, so every preview size keeps the same look. */
export function eyeBlurRadius(appearance: Partial<CuriousEyesAppearance>) {
  const { edgeBlur, width, height } = normalizeCuriousEyesAppearance(appearance);
  return Math.max(0, Math.min(1, edgeBlur)) * Math.min(width, height) * 0.14;
}

function roundedPolygon(points: Point[], rounding: number) {
  const corners = points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const before = Math.hypot(previous[0] - point[0], previous[1] - point[1]);
    const after = Math.hypot(next[0] - point[0], next[1] - point[1]);
    const cut = Math.min(before, after) * rounding * 0.45;
    return {
      point,
      start: [point[0] + (previous[0] - point[0]) * cut / before, point[1] + (previous[1] - point[1]) * cut / before],
      end: [point[0] + (next[0] - point[0]) * cut / after, point[1] + (next[1] - point[1]) * cut / after],
    };
  });
  return corners.map(({point, start, end}, index) =>
    `${index === 0 ? 'M' : 'L'} ${start.join(' ')} Q ${point.join(' ')} ${end.join(' ')}`
  ).join(' ') + ' Z';
}

export function eyeShapePath(appearance: Partial<CuriousEyesAppearance>) {
  const { shape, width, height, rounding } = normalizeCuriousEyesAppearance(appearance);
  const x = width / 2;
  const y = height / 2;
  const softness = rounding / 100;

  switch (shape) {
    case 'circle':
      return `M 0 ${-y} A ${x} ${y} 0 1 1 0 ${y} A ${x} ${y} 0 1 1 0 ${-y} Z`;
    case 'triangle':
      return roundedPolygon([[0, -y], [x, y], [-x, y]], softness);
    case 'hexagon':
      return roundedPolygon([[-x / 2, -y], [x / 2, -y], [x, 0], [x / 2, y], [-x / 2, y], [-x, 0]], softness);
    case 'diamond': {
      // Preserve the four tips while the sides bow inward toward the center.
      const inset = 1 - softness;
      return `M 0 ${-y}
        Q ${x / 2 * inset} ${-y / 2 * inset} ${x} 0
        Q ${x / 2 * inset} ${y / 2 * inset} 0 ${y}
        Q ${-x / 2 * inset} ${y / 2 * inset} ${-x} 0
        Q ${-x / 2 * inset} ${-y / 2 * inset} 0 ${-y} Z`;
    }
    case 'drop': {
      const shoulder = x * softness * 0.8;
      return `M 0 ${-y}
        C ${shoulder} ${-y} ${x} ${-y * 0.1} ${x} ${y * 0.25}
        C ${x} ${y * 0.75} ${x * 0.55} ${y} 0 ${y}
        C ${-x * 0.55} ${y} ${-x} ${y * 0.75} ${-x} ${y * 0.25}
        C ${-x} ${-y * 0.1} ${-shoulder} ${-y} 0 ${-y} Z`;
    }
    case 'rectangle': {
      const radius = Math.min(x, y) * softness;
      return `M ${-x + radius} ${-y} H ${x - radius}
        Q ${x} ${-y} ${x} ${-y + radius} V ${y - radius}
        Q ${x} ${y} ${x - radius} ${y} H ${-x + radius}
        Q ${-x} ${y} ${-x} ${y - radius} V ${-y + radius}
        Q ${-x} ${-y} ${-x + radius} ${-y} Z`;
    }
  }
}

/** Project an eye plane attached to the front of an invisible head. */
function eyeMatrix(x: number, yaw = 0, pitch = 0, roll = 0) {
  function project(localX: number, localY: number): Point {
    const turnedX = localX * Math.cos(yaw) + 18 * Math.sin(yaw);
    const turnedZ = -localX * Math.sin(yaw) + 18 * Math.cos(yaw);
    const tiltedY = localY * Math.cos(pitch) - turnedZ * Math.sin(pitch);
    const tiltedZ = localY * Math.sin(pitch) + turnedZ * Math.cos(pitch);
    const perspective = 95 / (95 - tiltedZ);
    return [
      32 + (turnedX * Math.cos(roll) - tiltedY * Math.sin(roll)) * perspective,
      32 + (turnedX * Math.sin(roll) + tiltedY * Math.cos(roll)) * perspective,
    ];
  }
  const center = project(x, 0);
  const across = project(x + 1, 0);
  const down = project(x, 1);
  return [across[0] - center[0], across[1] - center[1], down[0] - center[0], down[1] - center[1], ...center];
}

export function eyeTransform(x: number, yaw = 0, pitch = 0, roll = 0) {
  return `matrix(${eyeMatrix(x, yaw, pitch, roll).map(value => value.toFixed(4)).join(' ')})`;
}

/** Fit the eye geometry; the halo paints outside this canvas without resizing it. */
export function eyeViewBox(appearance: Partial<CuriousEyesAppearance>) {
  const { width, height, gap, rotation } = normalizeCuriousEyesAppearance(appearance);
  let extent = 30;
  const offset = (width + gap) / 2;
  for (const side of [-1, 1]) {
    const angle = -side * rotation * Math.PI / 180;
    for (const yaw of [-0.52, 0, 0.52]) {
      for (const pitch of [-0.34, 0, 0.34]) {
        const [a, b, c, d, e, f] = eyeMatrix(side * offset, yaw, pitch, yaw / 0.52 * 0.045);
        for (const x of [-width / 2, width / 2]) {
          for (const y of [-height / 2, height / 2]) {
            const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
            const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);
            extent = Math.max(extent,
              Math.abs(a * rotatedX + c * rotatedY + e - 32),
              Math.abs(b * rotatedX + d * rotatedY + f - 32)
            );
          }
        }
      }
    }
  }
  const size = Math.ceil((extent + 2) * 2);
  return `${32 - size / 2} ${32 - size / 2} ${size} ${size}`;
}

/** Keep even an exuberant expression inside the existing logo canvas. */
export function fitEyeExpression(
  appearance: CuriousEyesAppearance,
  halfCanvas: number,
  yaw: number,
  pitch: number,
  roll: number,
  left: EyeExpression,
  right: EyeExpression
) {
  appearance = normalizeCuriousEyesAppearance(appearance);
  let extent = 0;
  for (const side of [-1, 1]) {
    const expression = side === -1 ? left : right;
    const angle = -side * appearance.rotation * Math.PI / 180;
    const tilt = expression.rotation * Math.PI / 180;
    const [a, b, c, d, e, f] = eyeMatrix(side * (appearance.width + appearance.gap) / 2, yaw, pitch, roll);
    for (const x of [-appearance.width / 2, appearance.width / 2]) {
      for (const y of [-appearance.height / 2, appearance.height / 2]) {
        const rotatedX = (x * Math.cos(angle) - y * Math.sin(angle)) * expression.scaleX;
        const rotatedY = (x * Math.sin(angle) + y * Math.cos(angle)) * expression.scaleY;
        const localX = rotatedX * Math.cos(tilt) - rotatedY * Math.sin(tilt) + expression.x;
        const localY = (rotatedX * Math.sin(tilt) + rotatedY * Math.cos(tilt) + expression.y) * expression.openness;
        extent = Math.max(extent, Math.abs(a * localX + c * localY + e - 32), Math.abs(b * localX + d * localY + f - 32));
      }
    }
  }
  return extent > 0 ? Math.min(1, (halfCanvas - 1) / extent) : 1;
}
