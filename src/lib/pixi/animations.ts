// Remotion-equivalent Physics & Interpolation for PixiJS Templates

export type ExtrapolateType = "extend" | "identity" | "clamp";

export interface InterpolateOptions {
  extrapolateLeft?: ExtrapolateType;
  extrapolateRight?: ExtrapolateType;
}

export function interpolate(
  input: number,
  inputRange: number[],
  outputRange: number[],
  options?: InterpolateOptions
): number {
  const { extrapolateLeft = "extend", extrapolateRight = "extend" } = options || {};

  if (inputRange.length !== outputRange.length) {
    throw new Error("inputRange and outputRange must be the same length");
  }
  if (inputRange.length < 2) {
    throw new Error("inputRange must contain at least 2 elements");
  }

  // Find the right segment
  let i = 1;
  while (i < inputRange.length - 1 && input > inputRange[i]) {
    i++;
  }

  const inputMin = inputRange[i - 1];
  const inputMax = inputRange[i];
  const outputMin = outputRange[i - 1];
  const outputMax = outputRange[i];

  let result = input;

  // Extrapolation
  if (input < inputMin) {
    if (extrapolateLeft === "identity") return input;
    if (extrapolateLeft === "clamp") return outputMin;
    // 'extend' naturally calculates via the linear formula below
  } else if (input > inputMax) {
    if (extrapolateRight === "identity") return input;
    if (extrapolateRight === "clamp") return outputMax;
    // 'extend' naturally calculates via the linear formula below
  }

  if (inputMax === inputMin) return outputMin;

  const progress = (input - inputMin) / (inputMax - inputMin);
  result = outputMin + progress * (outputMax - outputMin);

  return result;
}

export interface SpringConfig {
  damping?: number;
  stiffness?: number;
  mass?: number;
  overshootClamping?: boolean;
}

export interface SpringOptions {
  frame: number;
  fps: number;
  config?: SpringConfig;
  durationInFrames?: number;
}

/**
 * Calculates a spring animation simulating a damped harmonic oscillator.
 * Equivalent to Remotion's `spring()` function.
 */
export function spring({ frame, fps, config, durationInFrames }: SpringOptions): number {
  if (frame < 0) return 0;
  if (durationInFrames && frame >= durationInFrames) return 1;

  const { damping = 10, stiffness = 100, mass = 1, overshootClamping = false } = config || {};

  const t = frame / fps;

  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    // Under-damped
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega0 * t);
    const response = 1 - decay * (Math.cos(omegaD * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * t));
    
    if (overshootClamping && response > 1) {
      return 1;
    }
    return response;
  } else if (zeta === 1) {
    // Critically damped
    const decay = Math.exp(-omega0 * t);
    return 1 - decay * (1 + omega0 * t);
  } else {
    // Over-damped
    const omega1 = omega0 * Math.sqrt(zeta * zeta - 1);
    const r1 = -omega0 * zeta + omega1;
    const r2 = -omega0 * zeta - omega1;
    
    const c1 = -r2 / (r1 - r2);
    const c2 = r1 / (r1 - r2);
    
    return 1 - (c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t));
  }
}
