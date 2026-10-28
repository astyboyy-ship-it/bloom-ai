"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/*
 * A living frame of 3D rose vines around a painting. Everything is procedural: vines are tapered
 * tubes that grow in from the corners, petals are curved sheets that morph from a curled bud to an
 * open, rolled-back shape while tilting outward, and all petals, sepals, leaves and thorns are
 * instanced so the whole frame costs a handful of draw calls.
 */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const smoother = (p: number) => {
  const t = clamp01(p);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------
// Sheet geometry: petals, sepals and leaves
// ---------------------------------------------------------------------------------------------

type Profile = {
  /** Half-width at v (0 base, 1 tip) */
  width: (v: number) => number;
  /** Lengthwise curvature at v; positive bends the tip toward the flower's axis (local -z) */
  curl: (v: number) => number;
  /** Cross-wise wrap curvature; positive cups the edges toward the axis */
  wrap: number;
  ruffle: number;
};

const COLS = 11;
const ROWS = 18;

function sheetPositions(p: Profile) {
  const pos = new Float32Array(COLS * ROWS * 3);
  const dv = 1 / (ROWS - 1);
  for (let i = 0; i < COLS; i++) {
    const xn = -1 + (2 * i) / (COLS - 1);
    let theta = 0;
    let y = 0;
    let z = 0;
    for (let j = 0; j < ROWS; j++) {
      const v = j * dv;
      const s = xn * p.width(v);
      const c = p.wrap;
      const lx = c ? Math.sin(s * c) / c : s;
      let lz = c ? -(1 - Math.cos(s * c)) / c : 0;
      lz += p.ruffle * Math.sin(xn * 7.5 + v * 3) * smooth(0.7, 1, v);
      const k = (j * COLS + i) * 3;
      pos[k] = lx;
      pos[k + 1] = y + lz * Math.sin(theta);
      pos[k + 2] = z + lz * Math.cos(theta);
      theta += p.curl(v) * dv;
      y += Math.cos(theta) * dv;
      z -= Math.sin(theta) * dv;
    }
  }
  return pos;
}

function sheetGeometry(base: Profile, morph?: Profile) {
  const index: number[] = [];
  const uv = new Float32Array(COLS * ROWS * 2);
  for (let j = 0; j < ROWS; j++)
    for (let i = 0; i < COLS; i++) {
      uv[(j * COLS + i) * 2] = i / (COLS - 1);
      uv[(j * COLS + i) * 2 + 1] = j / (ROWS - 1);
      if (i < COLS - 1 && j < ROWS - 1) {
        const a = j * COLS + i;
        index.push(a, a + 1, a + COLS, a + 1, a + COLS + 1, a + COLS);
      }
    }
  const build = (p: Profile) => {
    const g = new THREE.BufferGeometry();
    g.setIndex(index);
    g.setAttribute("position", new THREE.BufferAttribute(sheetPositions(p), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  };
  const geo = build(base);
  if (morph) {
    const open = build(morph);
    geo.morphAttributes.position = [open.getAttribute("position")];
    geo.morphAttributes.normal = [open.getAttribute("normal")];
    open.dispose();
  }
  return geo;
}

const petalWidth = (v: number) => 0.5 * Math.max(0.07, Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(v, 1.35))), 0.55));

const PETAL_BUD: Profile = { width: petalWidth, curl: (v) => 1.3 + 1.5 * v, wrap: 3.2, ruffle: 0.01 };
const PETAL_OPEN: Profile = {
  width: petalWidth,
  curl: (v) => 1.2 * (1 - v) - 3.6 * smooth(0.6, 1, v),
  wrap: 1.0,
  ruffle: 0.035,
};
const SEPAL: Profile = {
  width: (v) => 0.5 * Math.pow(1 - v, 1.2) * Math.min(1, v * 6 + 0.15),
  curl: () => 0.5,
  wrap: 2.2,
  ruffle: 0,
};
const LEAF: Profile = {
  width: (v) => 0.5 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(v, 0.85))), 0.75) * (1 - 0.09 * ((v * 13) % 1)),
  curl: () => -0.55,
  wrap: 1.6,
  ruffle: 0,
};

// ---------------------------------------------------------------------------------------------
// Procedural textures
// ---------------------------------------------------------------------------------------------

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, rnd: () => number) => void, color = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, mulberry32(7));
  const tex = new THREE.CanvasTexture(c);
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Canvas top is the petal tip (CanvasTexture flips Y). */
function drawVeins(g: CanvasRenderingContext2D, rnd: () => number, w: number, h: number, stroke: string, count: number) {
  g.strokeStyle = stroke;
  for (let i = 0; i < count; i++) {
    const end = w / 2 + (i / (count - 1) - 0.5) * w * 1.25 + (rnd() - 0.5) * 12;
    g.lineWidth = 0.8 + rnd() * 1.2;
    g.beginPath();
    g.moveTo(w / 2 + (rnd() - 0.5) * 18, h);
    g.bezierCurveTo(w / 2 + (end - w / 2) * 0.2, h * 0.6, w / 2 + (end - w / 2) * 0.75, h * 0.3, end, 0);
    g.stroke();
  }
}

/** Colourways for the garden. Space-separated RGB triplets are used inside rgb(... / alpha). */
export type GardenPalette = {
  /** Petal gradient, heart to tip (5 stops). */
  petal: [string, string, string, string, string];
  /** Darkened petal edges and fine veins. */
  shadow: string;
  /** Light veins and fleck. */
  glint: string;
  sheen: string;
  specular: string;
  vine: string;
  thorn: string;
  leaf: [string, string, string];
  leafVein: string;
  /** Rim light from behind the frame. */
  rim: string;
};

export const GARDEN_PALETTES = {
  // The homepage roses: deep crimson on dark green canes.
  crimson: {
    petal: ["#160005", "#3c020e", "#6a0619", "#880c23", "#97152c"],
    shadow: "30 0 8",
    glint: "255 150 165",
    sheen: "#b3132e",
    specular: "#ff8a9c",
    vine: "#1a1e10",
    thorn: "#33281a",
    leaf: ["#1a2a12", "#2c4420", "#3b5528"],
    leafVein: "150 180 110",
    rim: "#ff9a5c",
  },
  // Rime-silvered roses for Friedrich's fog: pewter heart, frosted white tips, blue-grey leaves.
  frost: {
    petal: ["#15181e", "#3a4250", "#7a8698", "#bcc8d6", "#e9eff6"],
    shadow: "14 18 26",
    glint: "235 244 255",
    sheen: "#cfe0ff",
    specular: "#ffffff",
    vine: "#262b31",
    thorn: "#4a525c",
    leaf: ["#1b2626", "#33474a", "#5d7678"],
    leafVein: "200 225 235",
    rim: "#a9c4ff",
  },
  // Turner's sunset: amber hearts burning out to gold tips, olive-bronze leaves.
  solar: {
    petal: ["#2a1003", "#6a3008", "#b8640f", "#e89e30", "#ffd27a"],
    shadow: "44 16 0",
    glint: "255 226 160",
    sheen: "#ffb347",
    specular: "#fff0c0",
    vine: "#2a1d0e",
    thorn: "#4a3416",
    leaf: ["#1f2a10", "#3a4a1c", "#5e6c2a"],
    leafVein: "220 210 140",
    rim: "#ffb070",
  },
  // Cole's empire: obsidian-crimson roses on emerald canes, lit with an emerald rim.
  emerald: {
    petal: ["#060103", "#24040d", "#520918", "#7a0f26", "#8f1a32"],
    shadow: "6 0 3",
    glint: "255 140 160",
    sheen: "#c21a3a",
    specular: "#ff9fb0",
    vine: "#0b1a12",
    thorn: "#1d3326",
    leaf: ["#03241a", "#0a4a33", "#178a5c"],
    leafVein: "120 230 170",
    rim: "#3fd29a",
  },
  // Sovereign · Cole's Destruction: imperial crimson roses, marble-grey leaves, an antique-gold rim.
  imperial: {
    petal: ["#120205", "#3a0710", "#6e0f1f", "#a01c30", "#c23a48"],
    shadow: "24 4 8",
    glint: "255 196 170",
    sheen: "#c9a25e",
    specular: "#f6dca8",
    vine: "#1c1a16",
    thorn: "#3a352c",
    leaf: ["#1d1f1c", "#363a33", "#5a5e54"],
    leafVein: "200 196 180",
    rim: "#c9a25e",
  },
  // Apex · Altdorfer's Issus: golden-hour bronze roses on olive canes, an imperial-purple rim.
  bronze: {
    petal: ["#1e0f04", "#53300e", "#94581f", "#d99a52", "#f0c870"],
    shadow: "36 18 6",
    glint: "255 228 170",
    sheen: "#e0aa5c",
    specular: "#fff0c8",
    vine: "#241a10",
    thorn: "#45331c",
    leaf: ["#1e2410", "#36401c", "#55602c"],
    leafVein: "220 210 150",
    rim: "#a070d8",
  },
  // CoreOps · Velázquez's Forge: obsidian roses burning to molten-ember tips, soot-dark leaves.
  ember: {
    petal: ["#0c0604", "#2c1006", "#6e260a", "#d0561a", "#ff8a3a"],
    shadow: "20 8 2",
    glint: "255 190 120",
    sheen: "#ff6a2a",
    specular: "#ffd29a",
    vine: "#17120e",
    thorn: "#3a2a1c",
    leaf: ["#141410", "#2a2a20", "#46443a"],
    leafVein: "220 170 110",
    rim: "#f0a03a",
  },
  // IntentPulse · Vernet's storm: deep-teal roses with seafoam tips, storm-blue rim light.
  tide: {
    petal: ["#02100f", "#063a3a", "#0e6b68", "#2ec4b6", "#8ff5c8"],
    shadow: "2 14 18",
    glint: "190 255 235",
    sheen: "#4f8dff",
    specular: "#e0fff4",
    vine: "#0c1a1c",
    thorn: "#1e3436",
    leaf: ["#0a1f22", "#163a3e", "#2a5e60"],
    leafVein: "150 230 220",
    rim: "#4f8dff",
  },
} satisfies Record<string, GardenPalette>;

export type GardenPaletteName = keyof typeof GARDEN_PALETTES;

function petalTextures(p: GardenPalette) {
  const W = 256;
  const H = 512;
  const map = canvasTexture(W, H, (g, rnd) => {
    const grad = g.createLinearGradient(0, H, 0, 0);
    [0, 0.16, 0.45, 0.8, 1].forEach((at, i) => grad.addColorStop(at, p.petal[i]));
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    const edge = g.createLinearGradient(0, 0, W, 0);
    edge.addColorStop(0, `rgb(${p.shadow} / 0.6)`);
    edge.addColorStop(0.16, `rgb(${p.shadow} / 0)`);
    edge.addColorStop(0.84, `rgb(${p.shadow} / 0)`);
    edge.addColorStop(1, `rgb(${p.shadow} / 0.6)`);
    g.fillStyle = edge;
    g.fillRect(0, 0, W, H);
    drawVeins(g, rnd, W, H, `rgb(${p.shadow} / 0.16)`, 30);
    drawVeins(g, rnd, W, H, `rgb(${p.glint} / 0.05)`, 18);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = rnd() > 0.5 ? `rgb(${p.glint} / 0.05)` : "rgb(0 0 0 / 0.07)";
      g.fillRect(rnd() * W, rnd() * H, 1.2, 1.2);
    }
  });
  const bump = canvasTexture(
    W,
    H,
    (g, rnd) => {
      g.fillStyle = "#808080";
      g.fillRect(0, 0, W, H);
      drawVeins(g, rnd, W, H, "rgb(40 40 40 / 0.5)", 30);
      for (let i = 0; i < 14000; i++) {
        const v = 100 + rnd() * 60;
        g.fillStyle = `rgb(${v} ${v} ${v} / 0.35)`;
        g.fillRect(rnd() * W, rnd() * H, 1, 1);
      }
    },
    false,
  );
  return { map, bump };
}

function leafTexture(p: GardenPalette) {
  const W = 128;
  const H = 256;
  return canvasTexture(W, H, (g, rnd) => {
    const grad = g.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0, p.leaf[0]);
    grad.addColorStop(0.5, p.leaf[1]);
    grad.addColorStop(1, p.leaf[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = `rgb(${p.leafVein} / 0.45)`;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(W / 2, H);
    g.lineTo(W / 2, 0);
    g.stroke();
    g.lineWidth = 1;
    g.strokeStyle = `rgb(${p.leafVein} / 0.25)`;
    for (let y = H - 20; y > 10; y -= 18) {
      g.beginPath();
      g.moveTo(W / 2, y);
      g.quadraticCurveTo(W * 0.3, y - 10, 2, y - 30);
      g.moveTo(W / 2, y);
      g.quadraticCurveTo(W * 0.7, y - 10, W - 2, y - 30);
      g.stroke();
    }
    const edge = g.createLinearGradient(0, 0, W, 0);
    edge.addColorStop(0, "rgb(10 18 6 / 0.55)");
    edge.addColorStop(0.2, "rgb(10 18 6 / 0)");
    edge.addColorStop(0.8, "rgb(10 18 6 / 0)");
    edge.addColorStop(1, "rgb(10 18 6 / 0.55)");
    g.fillStyle = edge;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = rnd() > 0.5 ? "rgb(200 220 160 / 0.05)" : "rgb(0 0 0 / 0.08)";
      g.fillRect(rnd() * W, rnd() * H, 1, 1);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Vines
// ---------------------------------------------------------------------------------------------

const RADIAL = 7;

function taperedTube(curve: THREE.Curve<THREE.Vector3>, segs: number, r0: number, r1: number) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, p);
    const r = r0 + (r1 - r0) * t;
    for (let k = 0; k <= RADIAL; k++) {
      const a = (k / RADIAL) * Math.PI * 2;
      n.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      nrm.push(n.x, n.y, n.z);
      uv.push(t * 8, k / RADIAL);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let k = 0; k < RADIAL; k++) {
      const a = i * (RADIAL + 1) + k;
      const b = a + RADIAL + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setIndex(index);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

function organicCurve(pts: [number, number, number][], rng: () => number, amp: number) {
  const base = new THREE.CatmullRomCurve3(
    pts.map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal",
  );
  const dense: THREE.Vector3[] = [];
  const f = 13 + rng() * 6;
  const ph = rng() * Math.PI * 2;
  for (let k = 0; k <= 56; k++) {
    const u = k / 56;
    const p = base.getPointAt(u);
    const tg = base.getTangentAt(u);
    const perp = new THREE.Vector3(-tg.y, tg.x, 0).normalize();
    p.addScaledVector(perp, Math.sin(u * f + ph) * amp * (0.4 + 0.6 * Math.sin(u * 3.1 + ph * 0.5) ** 2));
    p.z += Math.sin(u * 9 + ph) * 0.2;
    dense.push(p);
  }
  return new THREE.CatmullRomCurve3(dense, false, "centripetal");
}

// ---------------------------------------------------------------------------------------------
// Garden layout
// ---------------------------------------------------------------------------------------------

// Outer guard petals to the furled heart. Angles in radians.
const RINGS = [
  { n: 5, len: 1.0, wid: 1.0, r0: 0.11, h: 0.0, budA: 0.12, openA: 1.35, curl: 1, bud: 0.62, shade: 1 },
  { n: 5, len: 0.9, wid: 0.92, r0: 0.09, h: 0.04, budA: 0.08, openA: 1.05, curl: 1, bud: 0.68, shade: 0.9 },
  { n: 4, len: 0.76, wid: 0.82, r0: 0.07, h: 0.08, budA: 0.05, openA: 0.75, curl: 0.8, bud: 0.78, shade: 0.8 },
  { n: 4, len: 0.62, wid: 0.72, r0: 0.05, h: 0.11, budA: 0.03, openA: 0.45, curl: 0.5, bud: 0.88, shade: 0.68 },
  { n: 3, len: 0.48, wid: 0.66, r0: 0.03, h: 0.14, budA: 0, openA: 0.2, curl: 0.2, bud: 0.95, shade: 0.56 },
];
const PETALS_PER_ROSE = RINGS.reduce((s, r) => s + r.n, 0);
const SEPALS_PER_ROSE = 5;
const GOLDEN = 2.39996;
const BLOOM_DUR = 3.8;

type Timed = { appear: number };
type Rose = Timed & {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  size: number;
  bloom: number;
  maxOpen: number;
  phase: number;
};
type Leaf = Timed & { pos: THREE.Vector3; quat: THREE.Quaternion; scale: number; phase: number };
type Tube = { mesh: THREE.Mesh; start: number; dur: number; segs: number };

function basis(dir: THREE.Vector3, face: THREE.Vector3) {
  const y = dir.clone().normalize();
  const x = new THREE.Vector3().crossVectors(y, face).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

export type GardenLayout = "climb" | "cascade";

type VineSpec = { pts: [number, number, number][]; start: number; dur: number; blooms: [number, "rose" | "bud"][] };

/**
 * "climb": vines rise from the bottom corners and turn along the top (the homepage hero).
 * "cascade": heavy canes anchored above the top edge sweep down and outward over the canvas,
 * carrying exactly eight full roses: two top swags, a pair at each top corner, the sides, and the
 * bottom corners where the canes curl back in.
 */
function cascadeVines(W: number, H: number, k: number, z: () => number): VineSpec[] {
  return [
    {
      // Left cane: from above the top edge, over the corner, down the side, curling in at the bottom
      pts: [
        [-W * 0.34, H + 0.35, z()],
        [-W * 0.62, H - 0.12, z()],
        [-W + 0.34 * k, H * 0.62, z()],
        [-W + 0.1 * k, H * 0.1, z()],
        [-W + 0.3 * k, -H * 0.42, z()],
        [-W + 0.14 * k, -H * 0.78, z()],
        [-W * 0.62, -H + 0.18, z()],
      ],
      start: 0.1,
      dur: 2.6,
      blooms: [[0.16, "rose"], [0.3, "bud"], [0.5, "rose"], [0.68, "bud"], [0.93, "rose"]],
    },
    {
      pts: [
        [W * 0.36, H + 0.35, z()],
        [W * 0.64, H - 0.14, z()],
        [W - 0.32 * k, H * 0.58, z()],
        [W - 0.08 * k, H * 0.06, z()],
        [W - 0.3 * k, -H * 0.46, z()],
        [W - 0.12 * k, -H * 0.8, z()],
        [W * 0.6, -H + 0.2, z()],
      ],
      start: 0.2,
      dur: 2.6,
      blooms: [[0.18, "rose"], [0.34, "bud"], [0.53, "rose"], [0.71, "bud"], [0.94, "rose"]],
    },
    {
      // Top swags: short heavy canes dropping from the top edge toward the corners
      pts: [
        [-W * 0.06, H + 0.3, z()],
        [-W * 0.16, H - 0.2, z()],
        [-W * 0.3, H - 0.42, z()],
        [-W * 0.42, H - 0.36, z()],
      ],
      start: 0.35,
      dur: 1.7,
      blooms: [[0.88, "rose"], [0.5, "bud"]],
    },
    {
      pts: [
        [W * 0.08, H + 0.3, z()],
        [W * 0.18, H - 0.22, z()],
        [W * 0.32, H - 0.44, z()],
        [W * 0.44, H - 0.34, z()],
      ],
      start: 0.45,
      dur: 1.7,
      blooms: [[0.9, "rose"], [0.52, "bud"]],
    },
  ];
}

function buildGarden(W: number, H: number, layout: GardenLayout = "climb", palette: GardenPalette = GARDEN_PALETTES.crimson) {
  const rng = mulberry32(20261023);
  // On narrow screens the content fills the width, so the frame hugs the edges and the roses shrink.
  const narrow = W < 2.2;
  const sizeScale = narrow ? Math.max(0.42, W / 3.4) : Math.min(1.1, Math.max(0.62, Math.min(W, H) / 3));
  const k = narrow ? 0.35 : 1;

  const petalTex = petalTextures(palette);
  const leafTex = leafTexture(palette);
  const vineMat = new THREE.MeshStandardMaterial({ color: palette.vine, roughness: 0.85, metalness: 0 });
  const petalMat = new THREE.MeshPhysicalMaterial({
    map: petalTex.map,
    bumpMap: petalTex.bump,
    bumpScale: 1.4,
    roughness: 0.6,
    sheen: 0.75,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color(palette.sheen),
    specularColor: new THREE.Color(palette.specular),
    specularIntensity: 0.5,
    clearcoat: 0.08,
    clearcoatRoughness: 0.45,
    side: THREE.DoubleSide,
  });
  const sepalMat = new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.6, side: THREE.DoubleSide });
  const leafMat = new THREE.MeshPhysicalMaterial({
    map: leafTex,
    roughness: 0.48,
    sheen: 0.3,
    sheenColor: new THREE.Color("#a8c48a"),
    side: THREE.DoubleSide,
  });

  const tubes: Tube[] = [];
  const roses: Rose[] = [];
  const leaves: Leaf[] = [];
  const thorns: (Timed & { m: THREE.Matrix4 })[] = [];

  const addTube = (curve: THREE.Curve<THREE.Vector3>, segs: number, r0: number, r1: number, start: number, dur: number) => {
    const mesh = new THREE.Mesh(taperedTube(curve, segs, r0, r1), vineMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.geometry.setDrawRange(0, 0);
    tubes.push({ mesh, start, dur, segs });
  };

  const z = () => -0.3 + rng() * 0.7;
  const vines: VineSpec[] = layout === "cascade" ? cascadeVines(W, H, k, z) : [
    {
      // Left edge, climbing from the bottom corner and turning along the top
      pts: [
        [-W - 0.3, -H - 0.3, z()],
        [-W + 0.22 * k, -H * 0.55, z()],
        [-W + 0.06 * k, -H * 0.05, z()],
        [-W + 0.26 * k, H * 0.4, z()],
        [-W + 0.1 * k, H * 0.78, z()],
        [-W + 0.6 * k, H - 0.16, z()],
        [-W * 0.6, H - 0.28, z()],
        [-W * 0.42, H - 0.08, z()],
      ],
      start: 0.2,
      dur: 3.2,
      blooms: [[0.13, "rose"], [0.33, "bud"], [0.52, "rose"], [0.7, "rose"], [0.88, "bud"]],
    },
    {
      pts: [
        [W + 0.3, -H - 0.3, z()],
        [W - 0.2 * k, -H * 0.5, z()],
        [W - 0.05 * k, -H * 0.02, z()],
        [W - 0.28 * k, H * 0.36, z()],
        [W - 0.08 * k, H * 0.74, z()],
        [W - 0.62 * k, H - 0.14, z()],
        [W * 0.6, H - 0.3, z()],
        [W * 0.42, H - 0.1, z()],
      ],
      start: 0.35,
      dur: 3.2,
      blooms: [[0.17, "rose"], [0.38, "rose"], [0.56, "bud"], [0.74, "rose"], [0.92, "bud"]],
    },
    {
      pts: [
        [-W - 0.2, -H + 0.12, z()],
        [-W * 0.72, -H + 0.25, z()],
        [-W * 0.46, -H + 0.06, z()],
        [-W * 0.2, -H + 0.2, z()],
      ],
      start: 0.7,
      dur: 2.4,
      blooms: [[0.5, "rose"], [0.88, "bud"]],
    },
    {
      pts: [
        [W + 0.2, -H + 0.1, z()],
        [W * 0.7, -H + 0.22, z()],
        [W * 0.44, -H + 0.04, z()],
        [W * 0.18, -H + 0.18, z()],
      ],
      start: 0.8,
      dur: 2.4,
      blooms: [[0.45, "rose"], [0.82, "bud"]],
    },
  ];

  const p = new THREE.Vector3();
  const tg = new THREE.Vector3();
  const FORWARD = new THREE.Vector3(0, 0, 1);

  for (const vine of vines) {
    const curve = organicCurve(vine.pts, rng, 0.08);
    const reach = (t: number) => vine.start + t * vine.dur;
    addTube(curve, 220, 0.05 * sizeScale, 0.014 * sizeScale, vine.start, vine.dur);

    const frameAt = (t: number) => {
      curve.getPointAt(t, p);
      curve.getTangentAt(t, tg);
      const perp = new THREE.Vector3(-tg.y, tg.x, 0).normalize();
      // Point "inward" toward the painting's centre
      if (perp.x * p.x + perp.y * p.y > 0) perp.negate();
      return { p: p.clone(), tg: tg.clone(), perp };
    };

    // Compound leaves: a terminal leaflet and a lateral pair, alternating sides
    let side = 1;
    for (let t = 0.05 + rng() * 0.03; t < 0.97; t += 0.07 + rng() * 0.03) {
      side = -side;
      const f = frameAt(t);
      const dir = f.perp.clone().multiplyScalar(side * 0.85).addScaledVector(f.tg, 0.55).add(new THREE.Vector3(0, 0, 0.35)).normalize();
      const face = FORWARD.clone().add(new THREE.Vector3(rng() - 0.5, rng() - 0.5, 0).multiplyScalar(0.9)).normalize();
      const s = (0.16 + rng() * 0.07) * sizeScale;
      const appear = reach(t) + 0.15;
      leaves.push({ pos: f.p.clone().addScaledVector(dir, s * 0.55), quat: basis(dir, face), scale: s, appear, phase: rng() * 10 });
      for (const lr of [-1, 1]) {
        const ld = dir.clone().applyAxisAngle(face, lr * 0.85);
        leaves.push({
          pos: f.p.clone().addScaledVector(dir, s * 0.25),
          quat: basis(ld, face),
          scale: s * 0.72,
          appear: appear + 0.1,
          phase: rng() * 10,
        });
      }
    }

    for (let t = 0.03; t < 0.95; t += 0.03 + rng() * 0.02) {
      const f = frameAt(t);
      const dir = f.perp.clone().multiplyScalar(rng() > 0.5 ? 1 : -1).addScaledVector(f.tg, -0.6).normalize();
      const m = new THREE.Matrix4().compose(
        f.p.clone().addScaledVector(dir, 0.02 * sizeScale),
        basis(dir, FORWARD),
        new THREE.Vector3().setScalar(sizeScale * (0.7 + rng() * 0.5)),
      );
      thorns.push({ m, appear: reach(t) });
    }

    // Curling tendrils
    for (let k = 0; k < 4; k++) {
      const t = 0.15 + k * 0.22 + rng() * 0.05;
      const f = frameAt(t);
      const d = f.perp.clone().multiplyScalar(rng() > 0.5 ? 1 : -1).addScaledVector(f.tg, 0.3).normalize();
      const u = new THREE.Vector3().crossVectors(d, FORWARD).normalize();
      const w = new THREE.Vector3().crossVectors(u, d);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const s = i / 24;
        const a = s * Math.PI * 4.5;
        const r = 0.05 * (1 - s * 0.6) * s * sizeScale;
        pts.push(
          f.p
            .clone()
            .addScaledVector(d, s * 0.28 * sizeScale)
            .addScaledVector(u, Math.cos(a) * r)
            .addScaledVector(w, Math.sin(a) * r),
        );
      }
      addTube(new THREE.CatmullRomCurve3(pts), 60, 0.007 * sizeScale, 0.002, reach(t) + 0.2, 1.4);
    }

    // Roses on short stems reaching toward the viewer
    for (const [t, kind] of vine.blooms) {
      const f = frameAt(t);
      const size = (kind === "rose" ? 0.3 + rng() * 0.12 : 0.24 + rng() * 0.05) * sizeScale;
      // Narrow: lean the blooms out past the screen edge rather than into the text
      const reachIn = narrow && Math.abs(f.p.x) > W * 0.7 ? -0.1 : 0.16;
      const head = f.p
        .clone()
        .addScaledVector(f.perp, reachIn * sizeScale)
        .add(new THREE.Vector3(0, 0, 0.3));
      const stem = new THREE.QuadraticBezierCurve3(
        f.p.clone(),
        f.p.clone().addScaledVector(f.perp, reachIn * 0.75 * sizeScale).add(new THREE.Vector3(0, 0, 0.05)),
        head.clone().add(new THREE.Vector3(0, 0, -0.06 * sizeScale)),
      );
      const appear = reach(t) + 0.1;
      addTube(stem, 24, 0.02 * sizeScale, 0.014 * sizeScale, appear - 0.1, 0.6);
      const axis = FORWARD.clone()
        .addScaledVector(f.perp, Math.sign(reachIn) * 0.5)
        .add(new THREE.Vector3(rng() - 0.5, rng() - 0.5, 0).multiplyScalar(0.5))
        .normalize();
      roses.push({
        pos: head,
        quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis),
        size,
        appear: appear + 0.3,
        bloom: appear + 1 + rng() * 0.9,
        maxOpen: kind === "rose" ? 1 : 0.12,
        phase: rng() * 10,
      });
    }
  }

  // Instanced meshes
  const petalGeo = sheetGeometry(PETAL_BUD, PETAL_OPEN);
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, roses.length * PETALS_PER_ROSE);
  const sepals = new THREE.InstancedMesh(sheetGeometry(SEPAL), sepalMat, roses.length * SEPALS_PER_ROSE);
  const hipGeo = new THREE.SphereGeometry(0.13, 14, 10);
  const hips = new THREE.InstancedMesh(hipGeo, sepalMat, roses.length);
  const leafMesh = new THREE.InstancedMesh(sheetGeometry(LEAF), leafMat, leaves.length);
  const thornGeo = new THREE.ConeGeometry(0.014, 0.055, 5).translate(0, 0.0275, 0);
  const thornMesh = new THREE.InstancedMesh(thornGeo, new THREE.MeshStandardMaterial({ color: palette.thorn, roughness: 0.6 }), thorns.length);
  for (const m of [petals, sepals, hips, leafMesh, thornMesh]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  const color = new THREE.Color();
  roses.forEach((r, ri) => {
    const tone = 0.85 + rng() * 0.25;
    let k = 0;
    RINGS.forEach((ring) => {
      for (let j = 0; j < ring.n; j++) petals.setColorAt(ri * PETALS_PER_ROSE + k++, color.setScalar(ring.shade * tone));
    });
  });
  if (petals.instanceColor) petals.instanceColor.needsUpdate = true;

  // Per-frame scratch
  const mRose = new THREE.Matrix4();
  const m = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qSway = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sv = new THREE.Vector3();
  const morphDummy = new THREE.Mesh(petalGeo);
  morphDummy.updateMorphTargets();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  const growEnd = Math.max(...tubes.map((t) => t.start + t.dur), ...leaves.map((l) => l.appear + 1));
  const bloomEnd = Math.max(...roses.map((r) => r.bloom + BLOOM_DUR + RINGS.length * 0.32));
  let staticDone = false;

  /** t: seconds since the frame started growing; time: wall clock for wind and sway (0 when still). */
  function update(t: number, time: number) {
    const growing = t < growEnd + 0.1;
    for (const tube of tubes) {
      const n = Math.floor(clamp01((t - tube.start) / tube.dur) * tube.segs);
      tube.mesh.geometry.setDrawRange(0, n * RADIAL * 6);
    }

    if (growing || !staticDone) {
      thorns.forEach((th, i) => {
        const s = smooth(th.appear, th.appear + 0.4, t);
        thornMesh.setMatrixAt(i, s > 0 ? tmp.copy(th.m).multiply(m.makeScale(s, s, s)) : ZERO);
      });
      thornMesh.instanceMatrix.needsUpdate = true;
      staticDone = !growing;
    }

    // Storm wind: slow gusts with a fast flutter on top
    const gust = 0.5 + 0.5 * Math.sin(time * 0.35) * Math.sin(time * 0.17 + 1);
    leaves.forEach((l, i) => {
      const s = smooth(l.appear, l.appear + 0.7, t) * l.scale;
      if (s <= 0) return leafMesh.setMatrixAt(i, ZERO);
      e.set(Math.sin(time * 1.3 + l.phase) * 0.08 * (0.4 + gust), Math.sin(time * 2.1 + l.phase) * 0.22 * gust, 0);
      q.copy(l.quat).multiply(qSway.setFromEuler(e));
      leafMesh.setMatrixAt(i, m.compose(l.pos, q, sv.setScalar(s)));
    });
    leafMesh.instanceMatrix.needsUpdate = true;

    // Instanced morphs live only in morphTexture, which dispose() clears: rebuild it whenever it is missing.
    const blooming = t < bloomEnd + 0.1 || petals.morphTexture === null;
    roses.forEach((r, ri) => {
      const appear = smooth(r.appear, r.appear + 0.9, t);
      const sway = 0.05 + 0.04 * gust;
      e.set(Math.sin(time * 0.7 + r.phase) * sway, 0, Math.cos(time * 0.55 + r.phase) * sway);
      q.copy(r.quat).multiply(qSway.setFromEuler(e));
      mRose.compose(r.pos, q, sv.setScalar(Math.max(1e-4, r.size * appear)));

      const sepalOpen = smooth(r.bloom - 0.8, r.bloom + 1.2, t) * (r.maxOpen < 1 ? 0.45 : 1);
      for (let k = 0; k < SEPALS_PER_ROSE; k++) {
        m.makeRotationY((k / SEPALS_PER_ROSE) * Math.PI * 2 + r.phase)
          .multiply(tmp.makeTranslation(0, -0.03, 0.07))
          .multiply(tmp.makeRotationX(0.15 + sepalOpen * 1.75))
          .multiply(tmp.makeScale(0.36, 0.62, 0.62));
        sepals.setMatrixAt(ri * SEPALS_PER_ROSE + k, m.premultiply(mRose));
      }
      hips.setMatrixAt(ri, m.makeTranslation(0, -0.05, 0).multiply(tmp.makeScale(1, 0.9, 1)).premultiply(mRose));

      let k = 0;
      RINGS.forEach((ring, ringIndex) => {
        for (let j = 0; j < ring.n; j++, k++) {
          const progress = (t - r.bloom - ringIndex * 0.32 - j * 0.05) / BLOOM_DUR;
          const o = smoother(progress) * r.maxOpen;
          const idx = ri * PETALS_PER_ROSE + k;
          const sc = ring.bud + (1 - ring.bud) * o;
          m.makeRotationY(k * GOLDEN + r.phase)
            .multiply(tmp.makeTranslation(0, ring.h, ring.r0 * (1 + o * 0.6)))
            .multiply(tmp.makeRotationX(ring.budA + (ring.openA - ring.budA) * o))
            .multiply(tmp.makeScale(ring.wid * sc, ring.len * sc, ring.len * sc));
          petals.setMatrixAt(idx, m.premultiply(mRose));
          if (blooming) {
            morphDummy.morphTargetInfluences![0] = o * ring.curl;
            petals.setMorphAt(idx, morphDummy);
          }
        }
      });
    });
    petals.instanceMatrix.needsUpdate = true;
    sepals.instanceMatrix.needsUpdate = true;
    hips.instanceMatrix.needsUpdate = true;
    if (blooming && petals.morphTexture) petals.morphTexture.needsUpdate = true;
  }

  const objects: THREE.Object3D[] = [...tubes.map((t) => t.mesh), petals, sepals, hips, leafMesh, thornMesh];

  function dispose() {
    for (const o of objects) {
      if (o instanceof THREE.InstancedMesh) o.dispose();
      (o as THREE.Mesh).geometry.dispose();
    }
    for (const mat of [vineMat, petalMat, sepalMat, leafMat, thornMesh.material as THREE.Material]) mat.dispose();
    for (const tex of [petalTex.map, petalTex.bump, leafTex]) tex.dispose();
  }

  return { objects, update, dispose };
}

// ---------------------------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------------------------

function Garden({ still, onReady, layout, palette }: { still: boolean; onReady?: () => void; layout: GardenLayout; palette: GardenPaletteName }) {
  const { viewport, scene, gl, camera } = useThree();
  const W = Math.round((viewport.width / 2) * 20) / 20;
  const H = Math.round((viewport.height / 2) * 20) / 20;
  const garden = useMemo(() => buildGarden(W, H, layout, GARDEN_PALETTES[palette]), [W, H, layout, palette]);
  const key = useRef<THREE.DirectionalLight>(null);
  const start = useRef<number | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const readied = useRef(false);

  useEffect(() => () => garden.dispose(), [garden]);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.4;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    const light = key.current;
    if (!light) return;
    const cam = light.shadow.camera;
    cam.left = -W - 1;
    cam.right = W + 1;
    cam.top = H + 1;
    cam.bottom = -H - 1;
    cam.updateProjectionMatrix();
  }, [W, H]);

  useEffect(() => {
    if (still) return;
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [still]);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    start.current ??= now;
    garden.update(still ? 60 : now - start.current, still ? 0 : now);
    if (!still) {
      // A touch of parallax so the frame reads as depth in front of the canvas
      camera.position.x += (pointer.current.x * 0.35 - camera.position.x) * 0.04;
      camera.position.y += (pointer.current.y * 0.2 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
    }
    if (!readied.current) {
      readied.current = true;
      onReady?.();
    }
  });

  return (
    <>
      <hemisphereLight args={["#9fb0d4", "#2a1408", 0.9]} />
      <ambientLight color="#7d86a8" intensity={0.3} />
      {/* Warm storm-break key, casting onto the canvas */}
      <directionalLight
        ref={key}
        castShadow
        position={[1.6, 2.4, 9]}
        color="#ffd9b0"
        intensity={2.5}
        shadow-mapSize={[1536, 1536]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      {/* Sunset rim from behind the frame, lighting petal edges crimson */}
      <directionalLight position={[-5, 2, -4]} color={GARDEN_PALETTES[palette].rim} intensity={1.5} />
      <mesh position={[0, 0, -0.6]} receiveShadow>
        <planeGeometry args={[W * 2.8, H * 2.8]} />
        <shadowMaterial color="#07030a" opacity={0.38} />
      </mesh>
      {garden.objects.map((o) => (
        <primitive key={o.uuid} object={o} />
      ))}
    </>
  );
}

export function RoseVineScene({ active, still, onReady, layout = "climb", palette = "crimson" }: { active: boolean; still: boolean; onReady?: () => void; layout?: GardenLayout; palette?: GardenPaletteName }) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 10], fov: 35, near: 0.1, far: 50 }}
      frameloop={still ? "demand" : active ? "always" : "never"}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      style={{ pointerEvents: "none" }}
    >
      <Garden still={still} onReady={onReady} layout={layout} palette={palette} />
    </Canvas>
  );
}
