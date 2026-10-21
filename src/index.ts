export { CuriousEyes, type CuriousEyesHandle, type CuriousEyesProps, type CuriousEyesAnimationEndReason } from './curious-eyes.js';
export {
  curiousEyesPalette, defaultCuriousEyesAppearance, normalizeCuriousEyesAppearance, eyeBlurRadius, eyeShapePath,
  eyeTransform, eyeViewBox, fitEyeExpression,
  type CuriousEyeShape, type CuriousEyesAppearance, type EyeExpression,
} from './geometry.js';
export {
  curiousEyesAnimations, animationDuration, isCuriousEyesAnimation,
  neutralEyeExpression, sampleEyesAnimation,
  type CuriousEyesAnimation, type CuriousEyesAnimationFrame,
} from './animations.js';
