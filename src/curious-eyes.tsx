"use client";

import { useId, useImperativeHandle, useLayoutEffect, useRef, type Ref, type CSSProperties } from 'react';

import {
  animationDuration,
  isCuriousEyesAnimation,
  neutralEyeExpression,
  sampleEyesAnimation,
  type CuriousEyesAnimation,
} from './animations.js';

import {
  defaultCuriousEyesAppearance,
  eyeBlurRadius,
  eyeShapePath,
  eyeTransform,
  eyeViewBox,
  fitEyeExpression,
  type CuriousEyesAppearance,
  type EyeExpression,
} from './geometry.js';

export interface CuriousEyesProps {
  className?: string;
  /** Rendered SVG size. CSS classes or style may override the width/height attributes. */
  size?: number | string;
  style?: CSSProperties;
  /** A still version for previews or places where motion isn't appropriate. */
  animated?: boolean;
  appearance?: Partial<CuriousEyesAppearance>;
  ref?: Ref<CuriousEyesHandle>;
  /** Called after completion, stop, replacement, or visibility cancellation. */
  onAnimationEnd?: (animation: CuriousEyesAnimation) => void;
}

export interface CuriousEyesHandle {
  /** Returns false when motion is disabled or the eyes are not visible. */
  play: (animation: CuriousEyesAnimation) => boolean;
  stop: () => void;
}

const inactivePlayback: CuriousEyesHandle = { play: () => false, stop: () => {} };

function expressionTransform(expression: EyeExpression) {
  return `translate(${expression.x} ${expression.y}) rotate(${expression.rotation}) scale(${expression.scaleX} ${expression.scaleY})`;
}

export function CuriousEyes({ className, size = 52, style, animated = true, appearance, ref, onAnimationEnd }: CuriousEyesProps) {
  const settings = { ...defaultCuriousEyesAppearance, ...appearance };
  const offset = (settings.width + settings.gap) / 2;
  const path = eyeShapePath(settings);
  const viewBox = eyeViewBox(settings);
  const [canvasX, canvasY, canvasSize] = viewBox.split(' ').map(Number);
  const blur = eyeBlurRadius(settings);
  const blurPadding = blur * 4;
  const blurFilterId = `eyes-blur-${useId().replaceAll(':', '')}`;
  const layoutRef = useRef({ appearance: settings, offset, halfCanvas: Number(viewBox.split(' ')[2]) / 2 });
  const redrawRef = useRef<(() => void) | null>(null);
  const playbackRef = useRef<CuriousEyesHandle>(inactivePlayback);
  const endCallbackRef = useRef(onAnimationEnd);
  const svgRef = useRef<SVGSVGElement>(null);
  const faceRef = useRef<SVGGElement>(null);
  const leftRef = useRef<SVGGElement>(null);
  const rightRef = useRef<SVGGElement>(null);
  const leftLidRef = useRef<SVGGElement>(null);
  const rightLidRef = useRef<SVGGElement>(null);
  const leftExpressionRef = useRef<SVGGElement>(null);
  const rightExpressionRef = useRef<SVGGElement>(null);

  useImperativeHandle(ref, () => ({
    play: animation => playbackRef.current.play(animation),
    stop: () => playbackRef.current.stop(),
  }), []);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const face = faceRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    const leftLid = leftLidRef.current;
    const rightLid = rightLidRef.current;
    const leftExpression = leftExpressionRef.current;
    const rightExpression = rightExpressionRef.current;
    if (!svg || !face || !left || !right || !leftLid || !rightLid || !leftExpression || !rightExpression) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const target = { x: 0, y: 0 };
    const gaze = { x: 0, y: 0 };
    const head = { x: 0, y: 0 };
    let frame = 0;
    let lastTime = 0;
    let blinkTimer = 0;
    let blinkStarted: number | null = null;
    let lastOpenness = 1;
    let inView = true;
    let reaction: { animation: CuriousEyesAnimation; started: number } | null = null;

    function motionAllowed() {
      return !reducedMotion.matches && !document.hidden && inView;
    }

    function canAnimate() {
      return (animated || reaction !== null) && motionAllowed();
    }

    function draw(openness = lastOpenness, now = performance.now()) {
      lastOpenness = openness;
      // The eyes notice first; the head follows more slowly. Perspective makes
      // the farther eye smaller as the pair turns, without drawing a face.
      const pose = reaction ? sampleEyesAnimation(reaction.animation, now - reaction.started) : null;
      const tracking = 1 - (pose?.attention ?? 0);
      const yaw = (head.x * 0.52 + (gaze.x - head.x) * 0.1) * tracking + (pose?.yaw ?? 0);
      const pitch = (-head.y * 0.34 - (gaze.y - head.y) * 0.07) * tracking + (pose?.pitch ?? 0);
      const roll = head.x * 0.045 * tracking + (pose?.roll ?? 0);
      const leftPose = { ...(pose?.left ?? neutralEyeExpression), openness: (pose?.left.openness ?? 1) * openness };
      const rightPose = { ...(pose?.right ?? neutralEyeExpression), openness: (pose?.right.openness ?? 1) * openness };
      const layout = layoutRef.current;
      left!.setAttribute('transform', eyeTransform(-layout.offset, yaw, pitch, roll));
      right!.setAttribute('transform', eyeTransform(layout.offset, yaw, pitch, roll));
      leftLid!.setAttribute('transform', `scale(1 ${leftPose.openness.toFixed(4)})`);
      rightLid!.setAttribute('transform', `scale(1 ${rightPose.openness.toFixed(4)})`);
      leftExpression!.setAttribute('transform', expressionTransform(leftPose));
      rightExpression!.setAttribute('transform', expressionTransform(rightPose));
      const fit = pose ? fitEyeExpression(layout.appearance, layout.halfCanvas, yaw, pitch, roll, leftPose, rightPose) : 1;
      face!.setAttribute('transform', `translate(32 32) scale(${fit}) translate(-32 -32)`);
    }

    function requestFrame() {
      if (!frame && canAnimate()) frame = window.requestAnimationFrame(tick);
    }

    function tick(now: number) {
      frame = 0;
      const elapsed = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
      lastTime = now;
      const gazeEase = 1 - Math.exp(-elapsed / 0.14);
      const headEase = 1 - Math.exp(-elapsed / 0.3);

      gaze.x += (target.x - gaze.x) * gazeEase;
      gaze.y += (target.y - gaze.y) * gazeEase;
      head.x += (gaze.x - head.x) * headEase;
      head.y += (gaze.y - head.y) * headEase;

      if (reaction && now - reaction.started >= animationDuration(reaction.animation)) {
        const ended = reaction.animation;
        reaction = null;
        svg!.setAttribute('data-animation', 'idle');
        scheduleBlink();
        endCallbackRef.current?.(ended);
      }

      let openness = 1;
      if (blinkStarted !== null) {
        const blinkElapsed = now - blinkStarted;
        if (blinkElapsed < 80) {
          openness = 1 - 0.92 * Math.sin((blinkElapsed / 80) * Math.PI / 2);
        } else if (blinkElapsed < 105) {
          openness = 0.08;
        } else if (blinkElapsed < 260) {
          const progress = (blinkElapsed - 105) / 155;
          openness = 0.08 + 0.92 * progress * progress * (3 - 2 * progress);
        } else {
          blinkStarted = null;
        }
      }
      const unsettled = Math.max(
        Math.abs(target.x - gaze.x), Math.abs(target.y - gaze.y),
        Math.abs(target.x - head.x), Math.abs(target.y - head.y)
      ) > 0.0005;
      if (!unsettled) {
        gaze.x = head.x = target.x;
        gaze.y = head.y = target.y;
      }
      draw(openness, now);

      if (unsettled || blinkStarted !== null || reaction !== null) requestFrame();
      else lastTime = 0;
    }

    function scheduleBlink() {
      window.clearTimeout(blinkTimer);
      if (!animated || reaction !== null || !motionAllowed()) return;
      blinkTimer = window.setTimeout(() => {
        blinkStarted = performance.now();
        requestFrame();
        scheduleBlink();
      }, 2800 + Math.random() * 3000);
    }

    function followPointer(event: PointerEvent) {
      if (!animated || event.pointerType === 'touch' || !motionAllowed()) return;
      const bounds = svg!.getBoundingClientRect();
      target.x = Math.tanh(
        (event.clientX - bounds.left - bounds.width / 2) / Math.max(window.innerWidth * 0.45, 180)
      );
      target.y = Math.tanh(
        (event.clientY - bounds.top - bounds.height / 2) / Math.max(window.innerHeight * 0.45, 180)
      );
      requestFrame();
    }

    function rest() {
      target.x = 0;
      target.y = 0;
      requestFrame();
    }

    function leaveWindow(event: PointerEvent) {
      if (event.relatedTarget === null) rest();
    }

    function resetMotion() {
      const ended = reaction?.animation;
      reaction = null;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(blinkTimer);
      frame = 0;
      lastTime = 0;
      blinkStarted = null;
      svg!.setAttribute('data-animation', 'idle');
      target.x = target.y = gaze.x = gaze.y = head.x = head.y = 0;
      draw(1);
      scheduleBlink();
      if (ended) endCallbackRef.current?.(ended);
    }

    function play(animation: CuriousEyesAnimation) {
      if (!motionAllowed() || !isCuriousEyesAnimation(animation)) return false;
      const previous = reaction?.animation;
      reaction = { animation, started: performance.now() };
      window.clearTimeout(blinkTimer);
      blinkStarted = null;
      svg!.setAttribute('data-animation', animation);
      if (previous) endCallbackRef.current?.(previous);
      draw(1, reaction.started);
      requestFrame();
      return true;
    }

    function stop() {
      const ended = reaction?.animation;
      reaction = null;
      svg!.setAttribute('data-animation', 'idle');
      draw(1);
      scheduleBlink();
      requestFrame();
      if (ended) endCallbackRef.current?.(ended);
    }

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      resetMotion();
    });
    observer.observe(svg);
    window.addEventListener('pointermove', followPointer, { passive: true });
    window.addEventListener('pointerout', leaveWindow);
    window.addEventListener('blur', rest);
    document.addEventListener('visibilitychange', resetMotion);
    reducedMotion.addEventListener('change', resetMotion);
    redrawRef.current = () => draw();
    playbackRef.current = { play, stop };
    resetMotion();

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(blinkTimer);
      observer.disconnect();
      redrawRef.current = null;
      playbackRef.current = inactivePlayback;
      window.removeEventListener('pointermove', followPointer);
      window.removeEventListener('pointerout', leaveWindow);
      window.removeEventListener('blur', rest);
      document.removeEventListener('visibilitychange', resetMotion);
      reducedMotion.removeEventListener('change', resetMotion);
    };
  }, [animated]);

  useLayoutEffect(() => {
    layoutRef.current = { appearance: settings, offset, halfCanvas: Number(viewBox.split(' ')[2]) / 2 };
    endCallbackRef.current = onAnimationEnd;
    redrawRef.current?.();
  });

  return (
    <svg
      aria-hidden="true"
      className={className ? `bot-eyes ${className}` : 'bot-eyes'}
      data-animation="idle"
      data-slot="curious-eyes"
      focusable="false"
      height={size}
      width={size}
      ref={svgRef}
      style={{ display: 'block', flexShrink: 0, overflow: 'visible', pointerEvents: 'none', fill: settings.color, ...style }}
      viewBox={viewBox}
    >
      {blur > 0 ? (
        <defs>
          <filter
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
            height={canvasSize + blurPadding * 2}
            id={blurFilterId}
            width={canvasSize + blurPadding * 2}
            x={canvasX - blurPadding}
            y={canvasY - blurPadding}
          >
            {/* The original shape defines the eye size. Only its halo diffuses
                outward, with its own region independent of geometry fitting. */}
            <feGaussianBlur in="SourceAlpha" result="halo-mask" stdDeviation={blur} />
            <feFlood floodColor={settings.blurColor ?? settings.color} floodOpacity={0.8} result="halo-color" />
            <feComposite in="halo-color" in2="halo-mask" operator="in" result="soft-halo" />
            <feMerge>
              <feMergeNode in="soft-halo" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      ) : null}
      <g data-slot="curious-eyes-softness" filter={blur > 0 ? `url(#${blurFilterId})` : undefined}>
        <g data-slot="curious-eyes-face" ref={faceRef}>
          <g data-slot="curious-eye-left" ref={leftRef}>
            <g data-slot="curious-eye-lid" ref={leftLidRef}>
              <g data-slot="curious-eye-expression" ref={leftExpressionRef}>
                <path d={path} transform={`rotate(${settings.rotation})`} />
              </g>
            </g>
          </g>
          <g data-slot="curious-eye-right" ref={rightRef}>
            <g data-slot="curious-eye-lid" ref={rightLidRef}>
              <g data-slot="curious-eye-expression" ref={rightExpressionRef}>
                <path d={path} transform={`rotate(${-settings.rotation})`} />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
