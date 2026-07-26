"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export interface LaserOptions {
  /**
   * Viewport fraction (0..1) of the beam line, measured up from the bottom of
   * the output canvas. Content above the beam is shown; content below is cut.
   * 0.18 ≈ a third of the way up from the viewport bottom on the
   * /recommendations card rows.
   */
  point?: number;
  /** Half-height in CSS px of the soft reveal band straddling the beam. */
  band?: number;
  /** Beam line thickness in CSS px (the bright horizontal stroke). */
  thickness?: number;
  /** Beam glow radius in CSS px. */
  glow?: number;
  /** Idle shimmer amplitude (0..1). 0 keeps the beam perfectly still. */
  shimmer?: number;
  /** Horizontal shimmer wavelength in CSS px. */
  wavelength?: number;
  /** Seconds for the damped scroll position to catch up. Higher = more fluid. */
  smoothing?: number;
}

export interface LaserElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The scrollable element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface LaserInstance {
  setOptions: (options: LaserOptions) => void;
  resize: () => void;
  destroy: () => void;
}

const DEFAULTS: Required<LaserOptions> = {
  point: 0.18,
  band: 60,
  thickness: 1.5,
  glow: 18,
  shimmer: 0.5,
  wavelength: 220,
  smoothing: 0.5,
};

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const HASH = `
float hash (vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}`;

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform vec2 uRes;          // output canvas size in CSS px
uniform float uScroll;      // damped scroll offset (CSS px)
uniform float uBeamY;       // beam line y in CSS px from the bottom of the canvas
uniform float uBand;        // half-height of the soft reveal band (CSS px)
uniform float uThickness;   // beam stroke thickness (CSS px)
uniform float uGlow;        // beam glow radius (CSS px)
uniform float uShimmer;     // 0..1 idle shimmer amplitude
uniform float uWavelength;  // shimmer wavelength (CSS px)
uniform float uTime;        // seconds
uniform vec3 uBeamColor;
${HASH}

vec4 page (vec2 uv) {
  uv = clamp(uv, vec2(0.0005), vec2(0.9995));
  return texture(uContent, vec2(uv.x, 1.0 - uv.y));
}

void main () {
  // px = pixel coords, origin bottom-left, in CSS px.
  vec2 px = vec2(vUv.x, vUv.y) * uRes;

  // Document y of this output pixel: where in the captured content we sample.
  // content-scrolls-down ⇒ scrollTop grows ⇒ the same output pixel maps to a
  // larger document y. Adding uScroll aligns the texture with the live scroll.
  float docY = px.y + uScroll;

  // Sample the captured DOM at this pixel's document position.
  vec2 sampleUv = vec2(px.x / uRes.x, docY / uRes.y);
  vec4 tex = page(sampleUv);

  // ── Reveal mask ──
  // Distance from the beam line (px.y grows upward; beam sits at uBeamY).
  // Above the beam (d > 0) the page is fully shown; below it is cut.
  float beamPos = uBeamY
    + uShimmer * (uBand * 0.35)
      * sin(px.x / uWavelength * 6.2831 + uTime * 1.8);
  float d = px.y - beamPos;

  // Soft reveal band centered on the beam.
  float reveal = smoothstep(-uBand, uBand * 0.5, d);

  // Page alpha = reveal × texture alpha. Below the beam the page disappears
  // entirely, so the canvas shows nothing there (DOM fallback stays visible).
  float pageAlpha = reveal * tex.a;
  vec3 col = tex.rgb;

  // ── Laser line + glow ──
  // Falloff: tight bright stroke, broad soft halo.
  float stroke = exp(-pow(d / max(uThickness, 0.25), 2.0));
  float halo = exp(-abs(d) / max(uGlow, 1.0));
  float beam = max(stroke, halo * 0.6);

  col = mix(col, uBeamColor, clamp(beam, 0.0, 1.0) * 0.85);

  // Composite page (premultiplied-out over transparent). Output is drawn with
  // premultiplied alpha, so we emit rgb*a and a.
  outColor = vec4(col * pageAlpha, pageAlpha);
}`;

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("canvas") as PaintableCanvas;
  const ctx = probe.getContext("2d") as ElementImageContext | null;
  return Boolean(
    ctx &&
      typeof ctx.drawElementImage === "function" &&
      typeof probe.requestPaint === "function",
  );
}

export function createLaser(
  elements: LaserElements,
  options: LaserOptions = {},
  callbacks?: { onCaptureFailed?: () => void },
): LaserInstance | null {
  const config = { ...DEFAULTS, ...options };
  const { source, content, output } = elements;

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
  });
  if (!gl || gl.isContextLost()) return null;

  const sourceCtx = source.getContext("2d") as ElementImageContext | null;
  const paintable = source as PaintableCanvas;
  const htmlInCanvas = Boolean(
    sourceCtx &&
      typeof sourceCtx.drawElementImage === "function" &&
      typeof paintable.requestPaint === "function",
  );

  let contentDirty = false;
  let captureFailed = false;
  let paintCount = 0;
  let wake = () => {};

  if (htmlInCanvas) {
    paintable.onpaint = () => {
      try {
        sourceCtx!.reset();
        sourceCtx!.drawElementImage!(content, 0, 0);
        contentDirty = true;
        paintCount++;
        wake();
      } catch {
        markCaptureFailed();
      }
    };
  }

  function markCaptureFailed() {
    if (captureFailed) return;
    captureFailed = true;
    callbacks?.onCaptureFailed?.();
  }

  // Safety net: if onpaint never fires (or fires then stops without a usable
  // capture), flip to fallback so the DOM content remains visible instead of
  // being hidden behind an opaque, empty WebGL surface.
  setTimeout(() => {
    if (!captureFailed && paintCount === 0) markCaptureFailed();
  }, 2500);

  function compile(type: number, text: string): WebGLShader {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, text);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error("Laser shader error:", gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  const vert = compile(gl.VERTEX_SHADER, VERT);
  const frag = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  const uniforms: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl!.getActiveUniform(program, i)!;
    uniforms[info.name] = gl!.getUniformLocation(program, info.name)!;
  }

  const quadVao = gl.createVertexArray()!;
  gl.bindVertexArray(quadVao);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const contentTexture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, contentTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );

  // Beam color: theme primary (a vivid rose here), read from the page.
  let beam: [number, number, number] = [0.93, 0.33, 0.45];
  const beamProbe = document.createElement("canvas");
  beamProbe.width = beamProbe.height = 1;
  const beamCtx = beamProbe.getContext("2d", { willReadFrequently: true });

  function syncBeamColor() {
    if (!beamCtx) return;
    const root =
      typeof getComputedStyle === "function"
        ? getComputedStyle(document.documentElement)
        : null;
    const css =
      root?.getPropertyValue("--primary")?.trim() ||
      "350 76% 56%";
    // --primary is "H S% L%". Render hsl() and read it back to RGB.
    beamCtx.clearRect(0, 0, 1, 1);
    beamCtx.fillStyle = `hsl(${css})`;
    beamCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = beamCtx.getImageData(0, 0, 1, 1).data;
    if (a > 0) beam = [r / 255, g / 255, b / 255];
  }

  function syncCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    if (htmlInCanvas) {
      // Source captures at device pixels so the texture matches the output
      // 1:1 — no scaling, no shimmering aliasing on the beam edge.
      const cssWidth = Math.max(1, Math.round(source.clientWidth));
      const cssHeight = Math.max(1, Math.round(source.clientHeight));
      if (source.width !== cssWidth || source.height !== cssHeight) {
        source.width = cssWidth;
        source.height = cssHeight;
      }
      paintable.requestPaint!();
    }
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  // Repaint when images load — drawElementImage captures the current DOM
  // state, so a poster that finishes loading after the initial paint would
  // otherwise never appear in the texture.
  function onImageLoad() {
    if (htmlInCanvas) paintable.requestPaint!();
  }
  const images = content.querySelectorAll("img");
  images.forEach((img) => {
    img.addEventListener("load", onImageLoad);
    img.addEventListener("error", onImageLoad);
    if (img.complete) onImageLoad();
  });
  const mutationObserver = new MutationObserver(() => {
    if (htmlInCanvas) paintable.requestPaint!();
  });
  mutationObserver.observe(content, { childList: true, subtree: true });

  let time = 0;
  let scrollSmooth = content.scrollTop;
  syncCanvasSize();
  syncBeamColor();

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    syncBeamColor();
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    try {
      gl!.texImage2D(
        gl!.TEXTURE_2D,
        0,
        gl!.RGBA,
        gl!.RGBA,
        gl!.UNSIGNED_BYTE,
        source,
      );
    } catch {
      // Most likely: source canvas is tainted by cross-origin images
      // without CORS → texImage2D throws SecurityError. Drop to fallback.
      markCaptureFailed();
    }
  }

  function render() {
    uploadContent();
    const w = Math.max(output.clientWidth, 1);
    const h = Math.max(output.clientHeight, 1);
    const beamY = Math.min(Math.max(config.point, 0), 1) * h;

    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.disable(gl!.BLEND);
    gl!.useProgram(program);
    gl!.bindVertexArray(quadVao);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(uniforms.uContent, 0);
    gl!.uniform2f(uniforms.uRes, w, h);
    gl!.uniform1f(uniforms.uScroll, scrollSmooth);
    gl!.uniform1f(uniforms.uBeamY, beamY);
    gl!.uniform1f(uniforms.uBand, Math.max(config.band, 0));
    gl!.uniform1f(uniforms.uThickness, Math.max(config.thickness, 0.1));
    gl!.uniform1f(uniforms.uGlow, Math.max(config.glow, 0));
    gl!.uniform1f(
      uniforms.uShimmer,
      reducedMotion ? 0 : Math.min(Math.max(config.shimmer, 0), 1),
    );
    gl!.uniform1f(uniforms.uWavelength, Math.max(config.wavelength, 1));
    gl!.uniform1f(uniforms.uTime, time);
    gl!.uniform3f(uniforms.uBeamColor, beam[0], beam[1], beam[2]);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    gl!.bindVertexArray(quadVao);
  }

  let raf = 0;
  let lastTime = performance.now();
  let destroyed = false;
  let running = false;
  let visible = true;

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    if (!reducedMotion) time += delta;

    const scrollTop = content.scrollTop;
    const tau = config.smoothing;
    const k =
      reducedMotion || tau <= 0
        ? 1
        : 1 - Math.exp(-delta / Math.max(tau, 1e-4));
    scrollSmooth += (scrollTop - scrollSmooth) * k;
    if (Math.abs(scrollTop - scrollSmooth) < 0.5) scrollSmooth = scrollTop;

    render();

    // Run the rAF loop while there is scroll catch-up, idle shimmer, or
    // uncaptured content pending. Stop once everything settles so we don't
    // paint an idle GPU every frame.
    const settling = Math.abs(scrollTop - scrollSmooth) > 0.5;
    const shimmering = !reducedMotion && config.shimmer > 0.001;
    if (!contentDirty && !settling && !shimmering) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (destroyed || running || !visible) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  wake = start;
  start();

  function onScroll() {
    if (htmlInCanvas) paintable.requestPaint!();
    start();
  }
  content.addEventListener("scroll", onScroll, { passive: true });

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    start();
  }
  motionQuery.addEventListener("change", onMotionChange);

  const observer = new ResizeObserver(() => {
    syncCanvasSize();
    start();
  });
  observer.observe(output);
  observer.observe(content);

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) start();
  });
  intersection.observe(output);

  return {
    setOptions(next) {
      Object.assign(config, next);
      start();
    },
    resize() {
      syncCanvasSize();
      start();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      content.removeEventListener("scroll", onScroll);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      content
        .querySelectorAll("img")
        .forEach((img) => img.removeEventListener("load", onImageLoad));
      mutationObserver.disconnect();
      gl!.deleteTexture(contentTexture);
      gl!.deleteProgram(program);
      gl!.deleteShader(vert);
      gl!.deleteShader(frag);
      gl!.deleteBuffer(quad);
      gl!.deleteVertexArray(quadVao);
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

export interface LaserProps extends LaserOptions {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const emptySubscribe = () => () => {};

function prefersReducMotionServerSnapshot() {
  return false;
}

function prefersReducMotionClientSnapshot(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Reactive `prefers-reduced-motion: reduce`. SSR snapshot is `false` so the
 * server renders the effect path; the client re-hydrates to the real value
 * on mount and the component re-renders if it differs.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function")
        return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = () => onChange();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    },
    prefersReducMotionClientSnapshot,
    prefersReducMotionServerSnapshot,
  );
}

export function Laser({ children, className, style, ...options }: LaserProps) {
  const sourceRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<LaserInstance | null>(null);
  const [initialOptions] = useState(options);
  const [failed, setFailed] = useState(false);

  const supported = useSyncExternalStore(
    emptySubscribe,
    supportsHtmlInCanvas,
    () => false,
  );
  // Reduced-motion at the React layer: the beam's reveal mask hides cards
  // below the beam, so unlike ParticleScroll we can't just zero the shimmer
  // in-shader — that would leave cards permanently cut off. Under reduced
  // motion the component renders plain DOM (no canvases, no scroll lock),
  // exactly as if it weren't mounted.
  const reducedMotion = usePrefersReducedMotion();
  const native = supported && !failed && !reducedMotion;

  // Lock body scroll in native mode: Laser owns an inner overflow:auto
  // scroller, and the root layout also has a <footer> below <main>. Without
  // this, both the inner div and body would scroll (two scrollbars). Mirrors
  // ParticleScroll's body-lock.
  useEffect(() => {
    if (!native) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [native]);

  useEffect(() => {
    const source = sourceRef.current;
    const content = contentRef.current;
    const output = outputRef.current;
    if (!source || !content || !output) return;
    // Fallback mode: skip the WebGL instance entirely. The output canvas
    // stays at its initial transparent clear, letting the DOM fallback
    // (rendered when `native` is false) show through.
    if (!native) return;
    instanceRef.current = createLaser(
      { source, content, output },
      initialOptions,
      // If HTML-in-canvas capture never produces a usable frame (e.g.
      // cross-origin images taint it, or onpaint never fires), drop to the
      // plain DOM scroll path so content stays visible.
      { onCaptureFailed: () => setFailed(true) },
    );
    if (!instanceRef.current) setFailed(true);
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [initialOptions, native]);

  useEffect(() => {
    instanceRef.current?.setOptions(options);
  });

  // Unsupported browser (or SSR snapshot): render children bare — no wrapper,
  // no canvases, no bounded-height scroll container. The page behaves exactly
  // as if <Laser> weren't mounted. SSR also lands here (server snapshot is
  // false), so hydration matches without a flash.
  if (!native) return <>{children}</>;

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <canvas
        ref={sourceRef}
        // @ts-expect-error experimental html-in-canvas attribute
        layoutsubtree="true"
        suppressHydrationWarning
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <div
          ref={contentRef}
          className="hide-scrollbar"
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "auto",
          }}
        >
          {children}
        </div>
      </canvas>
      <canvas
        ref={outputRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default Laser;
