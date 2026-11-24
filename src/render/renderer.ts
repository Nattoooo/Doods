import { VIEW_H, VIEW_W } from '../config';

export interface Texture {
  readonly handle: WebGLTexture;
  readonly width: number;
  readonly height: number;
}

const FLOATS_PER_VERTEX = 8;
const MAX_QUADS = 4096;

const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
layout(location=1) in vec2 a_uv;
layout(location=2) in vec4 a_color;
uniform vec2 u_view;
out vec2 v_uv;
out vec4 v_color;
void main() {
  vec2 p = a_pos / u_view * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  v_uv = a_uv;
  v_color = a_color;
}`;

const FRAG = `#version 300 es
precision mediump float;
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_tex;
out vec4 o_color;
void main() {
  vec4 t = texture(u_tex, v_uv);
  o_color = vec4(t.rgb * v_color.rgb, t.a * v_color.a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Shader allocation failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile failed');
  }
  return shader;
}

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  readonly white: Texture;
  scale = 1;

  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private data = new Float32Array(MAX_QUADS * 4 * FLOATS_PER_VERTEX);
  private quads = 0;
  private current: Texture | null = null;
  private viewport = { x: 0, y: 0, w: VIEW_W, h: VIEW_H };

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;

    const program = gl.createProgram();
    if (!program) throw new Error('Program allocation failed');
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed');
    }
    this.program = program;
    gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program, 'u_view'), VIEW_W, VIEW_H);
    gl.uniform1i(gl.getUniformLocation(program, 'u_tex'), 0);

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    const ibo = gl.createBuffer();
    if (!vao || !vbo || !ibo) throw new Error('Buffer allocation failed');
    this.vao = vao;
    this.vbo = vbo;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    const stride = FLOATS_PER_VERTEX * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);

    const indices = new Uint16Array(MAX_QUADS * 6);
    for (let i = 0; i < MAX_QUADS; i++) {
      const v = i * 4;
      const o = i * 6;
      indices[o] = v;
      indices[o + 1] = v + 1;
      indices[o + 2] = v + 2;
      indices[o + 3] = v + 2;
      indices[o + 4] = v + 1;
      indices[o + 5] = v + 3;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    const px = document.createElement('canvas');
    px.width = 1;
    px.height = 1;
    const pctx = px.getContext('2d');
    if (!pctx) throw new Error('2D context unavailable');
    pctx.fillStyle = '#fff';
    pctx.fillRect(0, 0, 1, 1);
    this.white = this.createTexture(px);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  createTexture(source: TexImageSource & { width: number; height: number }): Texture {
    const gl = this.gl;
    const handle = gl.createTexture();
    if (!handle) throw new Error('Texture allocation failed');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.current = null;
    return { handle, width: source.width, height: source.height };
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(1, Math.floor(window.innerWidth * dpr));
    const ch = Math.max(1, Math.floor(window.innerHeight * dpr));
    this.canvas.width = cw;
    this.canvas.height = ch;
    this.scale = Math.max(1, Math.floor(Math.min(cw / VIEW_W, ch / VIEW_H)));
    const w = VIEW_W * this.scale;
    const h = VIEW_H * this.scale;
    this.viewport = { x: Math.floor((cw - w) / 2), y: Math.floor((ch - h) / 2), w, h };
  }

  screenToView(clientX: number, clientY: number): [number, number] {
    const kx = this.canvas.width / Math.max(1, window.innerWidth);
    const ky = this.canvas.height / Math.max(1, window.innerHeight);
    const v = this.viewport;
    return [(clientX * kx - v.x) / this.scale, (clientY * ky - v.y) / this.scale];
  }

  begin(): void {
    const gl = this.gl;
    const v = this.viewport;
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(v.x, v.y, v.w, v.h);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    this.quads = 0;
    this.current = null;
  }

  end(): void {
    this.flush();
  }

  flush(): void {
    if (this.quads === 0 || !this.current) return;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.current.handle);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.quads * 4 * FLOATS_PER_VERTEX);
    gl.drawElements(gl.TRIANGLES, this.quads * 6, gl.UNSIGNED_SHORT, 0);
    this.quads = 0;
  }

  blit(
    tex: Texture,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    color = 0xffffff,
    alpha = 1,
    flipX = false,
  ): void {
    if (this.current !== tex) {
      this.flush();
      this.current = tex;
    }
    if (this.quads >= MAX_QUADS) this.flush();

    let u0 = sx / tex.width;
    let u1 = (sx + sw) / tex.width;
    const v0 = sy / tex.height;
    const v1 = (sy + sh) / tex.height;
    if (flipX) {
      const t = u0;
      u0 = u1;
      u1 = t;
    }
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;
    const d = this.data;
    let o = this.quads * 4 * FLOATS_PER_VERTEX;
    const x1 = dx + dw;
    const y1 = dy + dh;

    d[o++] = dx; d[o++] = dy; d[o++] = u0; d[o++] = v0; d[o++] = r; d[o++] = g; d[o++] = b; d[o++] = alpha;
    d[o++] = x1; d[o++] = dy; d[o++] = u1; d[o++] = v0; d[o++] = r; d[o++] = g; d[o++] = b; d[o++] = alpha;
    d[o++] = dx; d[o++] = y1; d[o++] = u0; d[o++] = v1; d[o++] = r; d[o++] = g; d[o++] = b; d[o++] = alpha;
    d[o++] = x1; d[o++] = y1; d[o++] = u1; d[o++] = v1; d[o++] = r; d[o++] = g; d[o++] = b; d[o++] = alpha;
    this.quads++;
  }

  blitRotated(
    tex: Texture,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    cx: number,
    cy: number,
    anchorX: number,
    anchorY: number,
    angle: number,
    color = 0xffffff,
    alpha = 1,
    flipX = false,
  ): void {
    if (this.current !== tex) {
      this.flush();
      this.current = tex;
    }
    if (this.quads >= MAX_QUADS) this.flush();

    let u0 = sx / tex.width;
    let u1 = (sx + sw) / tex.width;
    const v0 = sy / tex.height;
    const v1 = (sy + sh) / tex.height;
    const l0 = flipX ? -(sw - anchorX) : -anchorX;
    const l1 = flipX ? anchorX : sw - anchorX;
    if (flipX) {
      const t = u0;
      u0 = u1;
      u1 = t;
    }
    const t0 = -anchorY;
    const t1 = sh - anchorY;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const ox = Math.round(cx);
    const oy = Math.round(cy);
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;
    const d = this.data;
    let o = this.quads * 4 * FLOATS_PER_VERTEX;
    const put = (lx: number, ly: number, u: number, v: number) => {
      d[o++] = ox + lx * cos - ly * sin;
      d[o++] = oy + lx * sin + ly * cos;
      d[o++] = u;
      d[o++] = v;
      d[o++] = r;
      d[o++] = g;
      d[o++] = b;
      d[o++] = alpha;
    };
    put(l0, t0, u0, v0);
    put(l1, t0, u1, v0);
    put(l0, t1, u0, v1);
    put(l1, t1, u1, v1);
    this.quads++;
  }

  rect(x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
    this.blit(this.white, 0, 0, 1, 1, x, y, w, h, color, alpha);
  }

  outline(x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
    this.rect(x, y, w, 1, color, alpha);
    this.rect(x, y + h - 1, w, 1, color, alpha);
    this.rect(x, y + 1, 1, h - 2, color, alpha);
    this.rect(x + w - 1, y + 1, 1, h - 2, color, alpha);
  }
}
