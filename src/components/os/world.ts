/**
 * A stylized world for the Global Pulse map: simplified continent outlines as [lon, lat] rings, filled with a
 * dot grid on an equirectangular projection. Deliberately coarse; it reads as a map at a glance, not an atlas.
 */
type Ring = [number, number][];

const LAND: Ring[] = [
  // North America
  [[-168, 66], [-162, 70], [-140, 70], [-125, 70], [-95, 72], [-80, 74], [-62, 66], [-55, 52], [-66, 45], [-70, 42], [-76, 38], [-80, 32], [-81, 25], [-90, 29], [-97, 27], [-97, 22], [-92, 18], [-87, 21], [-83, 10], [-79, 8], [-86, 13], [-95, 16], [-105, 20], [-110, 23], [-117, 32], [-123, 38], [-125, 48], [-133, 56], [-150, 60], [-165, 60]],
  // South America
  [[-79, 8], [-72, 12], [-62, 11], [-52, 5], [-35, -5], [-39, -15], [-48, -26], [-58, -35], [-65, -42], [-68, -52], [-73, -52], [-75, -42], [-71, -30], [-71, -18], [-77, -12], [-81, -4], [-79, 1], [-77, 8]],
  // Greenland
  [[-55, 60], [-43, 60], [-20, 70], [-18, 77], [-30, 83], [-60, 82], [-70, 77], [-55, 68]],
  // Europe
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [8, 57], [5, 58], [11, 59], [18, 60], [22, 65], [28, 70], [40, 68], [44, 66], [60, 69], [60, 55], [50, 46], [40, 46], [36, 42], [28, 41], [26, 38], [22, 37], [19, 40], [16, 38], [12, 44], [8, 44], [3, 43], [-1, 37], [-6, 36]],
  // Great Britain
  [[-6, 50], [1, 51], [2, 53], [-1, 55], [-3, 58], [-6, 58], [-5, 55], [-3, 54], [-5, 52]],
  // Africa
  [[-17, 21], [-16, 28], [-9, 32], [-5, 36], [10, 37], [11, 33], [20, 31], [25, 32], [32, 31], [34, 28], [37, 22], [43, 12], [51, 12], [48, 4], [41, -2], [40, -10], [40, -16], [35, -24], [32, -29], [27, -34], [20, -35], [18, -31], [15, -27], [12, -18], [13, -10], [9, -1], [9, 4], [4, 6], [-4, 5], [-8, 4], [-13, 8], [-17, 14]],
  // Madagascar
  [[43, -12], [50, -15], [47, -25], [44, -23]],
  // Asia, with Arabia and India
  [[26, 40], [36, 36], [35, 32], [43, 12], [52, 16], [56, 22], [60, 25], [66, 25], [72, 21], [77, 8], [80, 15], [87, 21], [92, 22], [97, 16], [100, 13], [104, 10], [106, 9], [109, 12], [108, 21], [117, 23], [121, 30], [122, 37], [121, 40], [126, 38], [129, 35], [130, 42], [135, 44], [141, 46], [143, 52], [156, 51], [162, 58], [170, 60], [180, 65], [180, 70], [150, 72], [130, 72], [112, 75], [100, 78], [80, 73], [68, 70], [60, 69], [60, 55], [50, 46], [40, 46], [36, 42], [28, 41]],
  // Japan
  [[130, 31], [136, 34], [140, 35], [142, 40], [141, 45], [140, 41], [136, 36], [131, 34]],
  // Sumatra, Java and the islands east
  [[95, 5], [105, -6], [115, -8], [125, -9], [134, -4], [141, -3], [141, -9], [130, -8], [118, -9], [106, -7], [100, 0]],
  // Borneo
  [[109, 2], [117, 7], [119, 1], [116, -4], [110, -3]],
  // Australia
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -25], [153, -31], [150, -37], [143, -39], [138, -35], [131, -31], [124, -34], [115, -34], [114, -26]],
  // New Zealand
  [[172, -34], [178, -38], [174, -41], [171, -46], [167, -46], [172, -41]],
];

function inside([x, y]: [number, number], ring: Ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export const MAP_W = 1000;
export const MAP_H = 470;
const LAT_TOP = 80;
const LAT_BOTTOM = -58;

/** Equirectangular projection into the map's viewBox. */
export const project = (lon: number, lat: number) => ({ x: ((lon + 180) / 360) * MAP_W, y: ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * MAP_H });

/** The land as dots on a 3° grid. */
export const LAND_DOTS: { x: number; y: number }[] = (() => {
  const out: { x: number; y: number }[] = [];
  for (let lat = LAT_TOP - 1.5; lat > LAT_BOTTOM; lat -= 3)
    for (let lon = -178.5; lon < 180; lon += 3) if (LAND.some((r) => inside([lon, lat], r))) out.push(project(lon, lat));
  return out;
})();

export type PulseNode = { id: string; city: string; region: string; lon: number; lat: number };

export const PULSE_NODES: PulseNode[] = [
  { id: "nyc", city: "New York", region: "us-east", lon: -74, lat: 40.7 },
  { id: "sfo", city: "San Francisco", region: "us-west", lon: -122.4, lat: 37.8 },
  { id: "yyz", city: "Toronto", region: "us-east", lon: -79.4, lat: 43.7 },
  { id: "gru", city: "São Paulo", region: "sa-east", lon: -46.6, lat: -23.5 },
  { id: "lhr", city: "London", region: "eu-west", lon: -0.1, lat: 51.5 },
  { id: "fra", city: "Frankfurt", region: "eu-central", lon: 8.7, lat: 50.1 },
  { id: "cdg", city: "Paris", region: "eu-west", lon: 2.35, lat: 48.85 },
  { id: "tlv", city: "Tel Aviv", region: "me-central", lon: 34.8, lat: 32.1 },
  { id: "dxb", city: "Dubai", region: "me-central", lon: 55.3, lat: 25.2 },
  { id: "bom", city: "Mumbai", region: "ap-south", lon: 72.9, lat: 19.1 },
  { id: "sin", city: "Singapore", region: "ap-southeast", lon: 103.8, lat: 1.35 },
  { id: "icn", city: "Seoul", region: "ap-northeast", lon: 127, lat: 37.5 },
  { id: "nrt", city: "Tokyo", region: "ap-northeast", lon: 139.7, lat: 35.7 },
  { id: "syd", city: "Sydney", region: "ap-southeast", lon: 151.2, lat: -33.9 },
  { id: "jnb", city: "Johannesburg", region: "af-south", lon: 28, lat: -26.2 },
];
