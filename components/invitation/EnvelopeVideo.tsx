'use client';

import { useEffect, useRef, useState } from 'react';
import { frameSrc, type EnvelopeFrames } from '@/lib/envelopes';

type EnvelopeVideoProps = {
  /** The stacked-alpha MP4 from `pnpm envelope:video`. */
  src: string;
  /** The same opening as stills: frame 1 is the poster, and the size. */
  frames: EnvelopeFrames;
  playing: boolean;
  onReady: () => void;
  onProgress: (loaded: number) => void;
  onFinished?: () => void;
  /** This device cannot play it; the gate falls back to the frames. */
  onFailed: () => void;
};

/* Colour is the top half of each video frame, alpha the bottom half as grey.
   The colour was premultiplied over black at encode time, which is what a
   premultiplied canvas composites; min() clips the codec's noise so a pixel
   is never brighter than its own coverage, which would show as a light
   fringe along the envelope's edge. */
const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2((position.x + 1.0) * 0.5, (1.0 - position.y) * 0.5);
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D video;
uniform float seam;
varying vec2 uv;
void main() {
  vec3 colour = texture2D(video, vec2(uv.x, min(uv.y * 0.5, seam))).rgb;
  float alpha = texture2D(video, vec2(uv.x, max(0.5 + uv.y * 0.5, 1.0 - seam))).r;
  gl_FragColor = vec4(min(colour, vec3(alpha)), alpha);
}`;

type Renderer = { draw: (video: HTMLVideoElement) => void };

function createRenderer(canvas: HTMLCanvasElement, height: number): Renderer | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };

  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  /* Half a texel short of the middle, so linear filtering on the colour half
     never reaches across into the alpha half, or back. */
  gl.uniform1f(gl.getUniformLocation(program, 'seam'), 0.5 - 0.5 / (height * 2));

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return {
    draw(video) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}

/** Resolves once the element holds a decodable first frame. */
function firstFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return resolve();
    video.addEventListener('loadeddata', () => resolve(), { once: true });
    video.addEventListener('error', () => reject(video.error), { once: true });
  });
}

/**
 * Plays a rendered envelope opening from one stacked-alpha video.
 *
 * Same contract as FrameSequence, which it replaces where it can: frame 1
 * paints at once, the seal waits for `onReady`, and the opening must never
 * stall partway. That last rule is why the file is DOWNLOADED WHOLE before
 * the seal goes live rather than streamed: once it is a blob in memory there
 * is nothing left to buffer. Fetching it ourselves is also what gives the
 * ring a true percentage.
 *
 * The poster <img> stays up until the canvas has painted a real frame. iOS
 * hands WebGL an empty texture for a video it has not started decoding, so
 * drawing before playback would put a black rectangle over the envelope.
 */
export function EnvelopeVideo({
  src,
  frames,
  playing,
  onReady,
  onProgress,
  onFinished,
  onFailed,
}: EnvelopeVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    /* Before any download: a device without WebGL goes straight to frames. */
    const renderer = createRenderer(canvas, frames.height);
    if (!renderer) {
      onFailed();
      return;
    }
    rendererRef.current = renderer;

    const controller = new AbortController();
    let objectUrl: string | null = null;

    (async () => {
      const response = await fetch(src, { signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(`envelope video ${response.status}`);

      const total = Number(response.headers.get('content-length')) || 0;
      const reader = response.body.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let received = 0;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        /* Held under 1 until the element has decoded a frame: the ring
           closing is the promise that the seal now works. */
        if (total) onProgress(Math.min(received / total, 0.98));
      }

      objectUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
      video.src = objectUrl;
      await firstFrame(video);

      if (controller.signal.aborted) return;
      onProgress(1);
      onReady();
    })().catch(() => {
      if (!controller.signal.aborted) onFailed();
    });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, frames.height, onFailed, onProgress, onReady]);

  useEffect(() => {
    const video = videoRef.current;
    const renderer = rendererRef.current;
    if (!playing || !video || !renderer) return;

    let stopped = false;
    let handle = 0;
    const hasFrameCallback = 'requestVideoFrameCallback' in video;

    const paint = () => {
      if (stopped) return;
      renderer.draw(video);
      setPainted(true);
      handle = hasFrameCallback
        ? video.requestVideoFrameCallback(paint)
        : requestAnimationFrame(paint);
    };

    const finish = () => {
      /* The last frame stays on the canvas: the paper has left by then, and
         the gate's own timer hands over once the card has settled. */
      renderer.draw(video);
      onFinished?.();
    };

    video.addEventListener('ended', finish, { once: true });
    video
      .play()
      .then(() => {
        handle = hasFrameCallback
          ? video.requestVideoFrameCallback(paint)
          : requestAnimationFrame(paint);
      })
      /* A refused play() leaves the sealed poster up while the gate's timer
         still reveals the card: a still opening, never a stuck one. */
      .catch(() => undefined);

    return () => {
      stopped = true;
      video.removeEventListener('ended', finish);
      if (hasFrameCallback) video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
    };
  }, [playing, onFinished]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- the sealed
          frame as a plain poster; next/image would lazy-load the one image
          that must paint first. */}
      <img
        alt=""
        aria-hidden
        className="envelope-frame"
        draggable={false}
        src={frameSrc(frames, 1)}
        style={{ visibility: painted ? 'hidden' : 'visible' }}
      />
      <canvas
        aria-hidden
        className="envelope-frame"
        height={frames.height}
        ref={canvasRef}
        style={{ opacity: painted ? 1 : 0 }}
        width={frames.width}
      />
      {/* Kept in the layout, not display:none: Safari stops decoding a video
          that is not rendered, and the canvas would freeze on frame 1. */}
      <video
        aria-hidden
        className="envelope-video-source"
        muted
        playsInline
        preload="auto"
        ref={videoRef}
      />
    </>
  );
}
