import type { EyeExpression } from './geometry.js';

export const curiousEyesAnimations = [
  { id: 'hello', name: 'Hey, you!', description: 'A little hop and a wink.', scenario: 'Greeting', duration: 1500 },
  { id: 'celebrate', name: 'Ta-da!', description: 'Two bounces. Very pleased.', scenario: 'Success', duration: 1800 },
  { id: 'scared', name: 'Nope nope nope', description: 'Backs away. Tiny panic.', scenario: 'Deleting', duration: 1600 },
  { id: 'alert', name: 'Psst!', description: 'Perks up for a double take.', scenario: 'Notification', duration: 1400 },
  { id: 'thinking', name: 'Big brain', description: 'Looks up. Thinks very hard.', scenario: 'Working', duration: 2400 },
  { id: 'sleepy', name: 'Five more minutes', description: 'A heavy blink and a nod.', scenario: 'Idle', duration: 2800 },
  { id: 'skeptical', name: 'Side-eye', description: 'One deeply suspicious eye.', scenario: 'Something unusual', duration: 1800 },
  { id: 'oops', name: 'Oopsie', description: 'Ducks, then sneaks a peek.', scenario: 'Error', duration: 1800 },
  { id: 'dizzy', name: 'You spin me round', description: 'The eyes go their own way.', scenario: 'Loading', duration: 2200 },
  { id: 'dance', name: 'Happy dance', description: 'A tiny, shameless victory jig.', scenario: 'Milestone', duration: 2400 },
] as const;

export type CuriousEyesAnimation = (typeof curiousEyesAnimations)[number]['id'];

export interface CuriousEyesAnimationFrame {
  attention: number;
  yaw: number;
  pitch: number;
  roll: number;
  left: EyeExpression;
  right: EyeExpression;
}

export const neutralEyeExpression: EyeExpression = {
  x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, openness: 1,
};

export function isCuriousEyesAnimation(value: unknown): value is CuriousEyesAnimation {
  return curiousEyesAnimations.some(animation => animation.id === value);
}

export function animationDuration(id: CuriousEyesAnimation) {
  const animation = curiousEyesAnimations.find(animation => animation.id === id);
  if (!animation) throw new RangeError(`Unknown eyes animation: ${String(id)}`);
  return animation.duration;
}

const smoothstep = (value: number) => value * value * (3 - 2 * value);

/** Pure, bounded one-shot poses. The first and last pose are always neutral. */
export function sampleEyesAnimation(id: CuriousEyesAnimation, elapsed: number): CuriousEyesAnimationFrame {
  const duration = animationDuration(id);
  const p = typeof elapsed !== 'number' || Number.isNaN(elapsed) ? 0 : Math.max(0, Math.min(1, elapsed / duration));
  const wave = (cycles: number) => Math.sin(p * Math.PI * 2 * cycles);
  const pulse = (center: number, width: number) => Math.exp(-(((p - center) / width) ** 2));
  const envelope = smoothstep(Math.min(1, p / 0.12)) * smoothstep(Math.min(1, (1 - p) / 0.16));
  const left = { ...neutralEyeExpression };
  const right = { ...neutralEyeExpression };
  let yaw = 0;
  let pitch = 0;
  let roll = 0;

  switch (id) {
    case 'hello':
      roll = 0.13 * wave(1);
      left.y = right.y = -3.5 * Math.sin(p * Math.PI) ** 2;
      left.openness = 1 - 0.94 * pulse(0.56, 0.08);
      right.scaleY = 1.08;
      break;
    case 'celebrate': {
      const bounce = Math.abs(Math.sin(p * Math.PI * 3));
      left.y = right.y = -5 * bounce;
      left.scaleY = right.scaleY = 1 + 0.18 * bounce - 0.2 * pulse(0.33, 0.06);
      left.scaleX = right.scaleX = 1 + 0.18 * pulse(0.33, 0.06);
      roll = 0.08 * wave(3);
      break;
    }
    case 'scared':
      left.x = -1.5;
      right.x = 1.5;
      left.y = right.y = 2.5;
      left.scaleX = right.scaleX = 0.72;
      left.scaleY = right.scaleY = 1.25;
      left.openness = right.openness = 1 - 0.8 * pulse(0.78, 0.1);
      roll = 0.035 * wave(11);
      break;
    case 'alert':
      left.y = right.y = -2 * pulse(0.25, 0.18);
      left.scaleY = right.scaleY = 1 + 0.28 * pulse(0.25, 0.18);
      left.scaleX = right.scaleX = 1.1;
      yaw = 0.4 * (pulse(0.45, 0.12) - pulse(0.7, 0.12));
      left.openness = right.openness = 1 - 0.8 * pulse(0.57, 0.04);
      break;
    case 'thinking':
      pitch = 0.26;
      yaw = 0.22 * wave(0.75);
      left.y = -1;
      right.y = 1;
      left.rotation = -8;
      right.rotation = 8;
      right.openness = 0.55;
      break;
    case 'sleepy':
      pitch = -0.22 * Math.sin(p * Math.PI);
      roll = 0.13 * Math.sin(p * Math.PI);
      left.openness = right.openness = 1 - 0.94 * Math.sqrt(Math.sin(p * Math.PI));
      left.y = right.y = 2 * Math.sin(p * Math.PI);
      break;
    case 'skeptical':
      yaw = -0.4;
      roll = -0.07;
      left.openness = 0.26;
      right.openness = 0.9;
      left.rotation = -14;
      right.y = -1;
      break;
    case 'oops':
      left.y = right.y = 4.5 * pulse(0.45, 0.25);
      left.scaleY = right.scaleY = 0.65;
      left.scaleX = right.scaleX = 1.18;
      left.openness = 1 - 0.9 * pulse(0.45, 0.22);
      right.openness = 1 - 0.9 * pulse(0.3, 0.14);
      roll = -0.18 * Math.sin(p * Math.PI);
      break;
    case 'dizzy':
      yaw = 0.3 * wave(2);
      pitch = 0.22 * Math.cos(p * Math.PI * 4);
      roll = 0.18 * wave(2);
      left.x = 2.5 * wave(3);
      right.x = -left.x;
      left.y = 2.5 * Math.cos(p * Math.PI * 6);
      right.y = -left.y;
      left.rotation = 25 * wave(2);
      right.rotation = -left.rotation;
      break;
    case 'dance':
      roll = 0.14 * wave(4);
      yaw = 0.2 * wave(2);
      left.y = -3.5 * wave(4);
      right.y = -left.y;
      left.scaleX = right.scaleY = 1 + 0.16 * wave(4);
      left.scaleY = right.scaleX = 1 - 0.16 * wave(4);
      left.openness = 1 - 0.9 * pulse(0.3, 0.055);
      right.openness = 1 - 0.9 * pulse(0.7, 0.055);
      break;
  }

  function blend(eye: EyeExpression): EyeExpression {
    return {
      x: eye.x * envelope,
      y: eye.y * envelope,
      rotation: eye.rotation * envelope,
      scaleX: 1 + (eye.scaleX - 1) * envelope,
      scaleY: 1 + (eye.scaleY - 1) * envelope,
      openness: 1 + (eye.openness - 1) * envelope,
    };
  }
  return { attention: envelope, yaw: yaw * envelope, pitch: pitch * envelope, roll: roll * envelope, left: blend(left), right: blend(right) };
}
