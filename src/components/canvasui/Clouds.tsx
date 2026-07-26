"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

// Clouds is a procedural WebGL2 mist — it does NOT capture DOM, so unlike
// ParticleScroll/Glitch it does not depend on the experimental HTML-in-Canvas
// API or the origin-trial token. The only fallback signal is WebGL2 being
// unavailable (or context loss), in which case we render nothing and the
// body's existing background shows through.

export interface CloudsOptions {
  /** Overall opacity of the mist (0 to 1). */
  opacity?: number;
  /** Time-scale of drift. 1 = nominal; lower = slower. */
  speed?: number;
  /** Mist density (0 to 1). Higher = thicker, more coverage. */
  density?: number;
  /** Constant horizontal drift added per frame (small values, e.g. 0.01). */
  drift?: number;
}

export interface CloudsElements {
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface CloudsInstance {
  /** Update effect options live. */
  setOptions: (options: CloudsOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Update theme colors sampled from CSS variables. */
  setColors: (colors: { mist: [number, number, number, number] }) => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<CloudsOptions> = {
  opacity: 0.35,
  speed: 1,
  density: 0.55,
  drift: 0.01,
};

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// FBM mist field. Slow-evolving value noise summed over a few octaves,
// drifted horizontally. Output is premultiplied alpha so it composites
// cleanly over the body's radial gradients.
const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDensity;
uniform float uOpacity;
uniform vec4 uMist;

// hash + value noise (Ashima-style)
float hash (vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise (vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm (vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.02;
    a *= 0.5;
  }
  return v;
}

void main () {
  vec2 uv = vUv;
  // Aspect-correct so clouds aren't stretched on portrait screens.
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y) * 2.2;

  float t = uTime * 0.04;

  // Two layers of fbm at different scales + phases for parallax depth.
  float n1 = fbm(p + vec2(t, t * 0.3));
  float n2 = fbm(p * 1.7 - vec2(t * 0.6, t * 0.2) + n1);

  float cloud = smoothstep(0.5 - uDensity * 0.4, 0.75, n2);

  // Soft vignette toward edges so the form area reads cleanest.
  vec2 c = uv - 0.5;
  float vig = 1.0 - smoothstep(0.2, 0.75, length(c));

  float a = cloud * uOpacity * (0.55 + 0.45 * vig);

  outColor = vec4(uMist.rgb * uMist.a, uMist.a) * a;
}`;

// SSR-safe feature detection: WebGL2 availability. Server snapshot is
// `false` so the first client render matches SSR (no canvas), then the
// post-hydration effect confirms WebGL2 is real before starting the loop.
function supportsWebGL2(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("canvas");
  return Boolean(
    probe.getContext("webgl2") || probe.getContext("experimental-webgl2"),
  );
}

// Resolve the mist tint from the existing theme tokens. We lift the
// near-black background by a few lightness steps and tint very faintly
// with the foreground, so the mist stays inside the established palette
// without introducing new CSS variables.
function resolveMistColor(): [number, number, number, number] {
  if (typeof window === "undefined") {
    return [0.1, 0.11, 0.15, 0.9];
  }
  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue("--background").trim();
  const fg = styles.getPropertyValue("--foreground").trim();
  const bgHsl = parseHsl(bg) ?? [240, 6, 5];
  const fgHsl = parseHsl(fg) ?? [210, 40, 98];
  // Lift background lightness toward foreground — ambient, not white.
  const liftedL = Math.min(bgHsl[2] + 12, fgHsl[2] * 0.35);
  const [r, g, b] = hslToRgb(bgHsl[0], bgHsl[1], liftedL);
  // Faint foreground tint mixed in for cool coherence.
  const [fr, fg2, fb] = hslToRgb(fgHsl[0], fgHsl[1], fgHsl[2]);
  const mix = 0.12;
  return [
    r * (1 - mix) + fr * mix,
    g * (1 - mix) + fg2 * mix,
    b * (1 - mix) + fb * mix,
    0.9,
  ];
}

function parseHsl(value: string): [number, number, number] | null {
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);
  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return null;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = ln - c / 2;
  return [r + m, g + m, b + m];
}

export function createClouds(
  elements: CloudsElements,
  options: CloudsOptions = {},
  initialColors?: { mist: [number, number, number, number] },
): CloudsInstance | null {
  const config = { ...DEFAULTS, ...options };
  const { output } = elements;
  let mist: [number, number, number, number] =
    initialColors?.mist ?? [0.1, 0.11, 0.15, 0.9];

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl || gl.isContextLost()) return null;

  function compile(type: number, text: string): WebGLShader {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, text);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error("Clouds shader error:", gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, VERT);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const uniforms: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)!;
    uniforms[info.name] = gl.getUniformLocation(program, info.name)!;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function syncCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
  }

  syncCanvasSize();

  let time = 0;

  function render() {
    gl!.useProgram(program);
    gl!.uniform2f(uniforms.uResolution, output.width, output.height);
    gl!.uniform1f(uniforms.uTime, time);
    gl!.uniform1f(uniforms.uDensity, Math.min(Math.max(config.density, 0), 1));
    gl!.uniform1f(uniforms.uOpacity, Math.min(Math.max(config.opacity, 0), 1));
    gl!.uniform4f(uniforms.uMist, mist[0], mist[1], mist[2], mist[3]);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  let raf = 0;
  let lastTime = performance.now();
  let destroyed = false;
  let running = false;
  let visible = true;
  let needsStaticRender = true;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min(Math.max((now - lastTime) / 1000, 0), 1 / 30);
    lastTime = now;
    if (!reducedMotion) {
      time += delta * Math.max(config.speed, 0);
      time += config.drift;
      render();
      raf = requestAnimationFrame(frame);
    } else {
      // Reduced motion: render one static frame, then stop the loop.
      if (needsStaticRender) {
        render();
        needsStaticRender = false;
      }
      running = false;
    }
  }

  function start() {
    if (destroyed || running || !visible) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  start();

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    if (reducedMotion) needsStaticRender = true;
    start();
  }
  motionQuery.addEventListener("change", onMotionChange);

  const observer = new ResizeObserver(() => {
    syncCanvasSize();
    if (reducedMotion) needsStaticRender = true;
    start();
  });
  observer.observe(output);

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) {
      if (reducedMotion) needsStaticRender = true;
      start();
    }
  });
  intersection.observe(output);

  return {
    setOptions(next) {
      Object.assign(config, next);
      if (reducedMotion) needsStaticRender = true;
      start();
    },
    resize() {
      syncCanvasSize();
      if (reducedMotion) needsStaticRender = true;
      start();
    },
    setColors(next) {
      mist = next.mist;
      if (reducedMotion) needsStaticRender = true;
      start();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      gl!.deleteProgram(program);
      gl!.deleteShader(vertexShader);
      gl!.deleteShader(fragmentShader);
      gl!.deleteBuffer(quad);
    },
  };
}

export interface CloudsProps extends CloudsOptions {
  className?: string;
  style?: CSSProperties;
}

const emptySubscribe = () => () => {};

export function Clouds({ className, style, ...options }: CloudsProps) {
  const outputRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<CloudsInstance | null>(null);
  const [initialOptions] = useState(options);

  // SSR-safe WebGL2 detection. Server snapshot `false` keeps first paint
  // matching SSR; client confirms and the canvas mounts post-hydration.
  const supported = useSyncExternalStore(
    emptySubscribe,
    supportsWebGL2,
    () => false,
  );

  useEffect(() => {
    if (!supported) return;
    const output = outputRef.current;
    if (!output) return;
    instanceRef.current = createClouds(
      { output },
      initialOptions,
      { mist: resolveMistColor() },
    );
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [initialOptions, supported]);

  useEffect(() => {
    instanceRef.current?.setOptions(options);
  });

  return (
    <div className={className} style={style} aria-hidden>
      {supported ? (
        <canvas
          ref={outputRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
}

export default Clouds;
