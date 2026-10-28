/** Edge regions for the Aware Infrastructure demo, positioned on a 1000×500 stylised world grid. */

export type RegionId =
  | "us-west"
  | "us-east"
  | "ca-central"
  | "sa-east"
  | "eu-west"
  | "eu-central"
  | "eu-north"
  | "me-central"
  | "af-south"
  | "ap-south"
  | "ap-southeast"
  | "ap-east"
  | "ap-northeast"
  | "au-east";

export type Region = { id: RegionId; city: string; x: number; y: number; nodes: number; neighbors: RegionId[] };

export const REGIONS: Region[] = [
  { id: "us-west", city: "San Francisco", x: 165, y: 190, nodes: 5, neighbors: ["us-east", "ca-central", "ap-northeast"] },
  { id: "us-east", city: "Virginia", x: 292, y: 188, nodes: 5, neighbors: ["us-west", "ca-central", "eu-west", "sa-east"] },
  { id: "ca-central", city: "Toronto", x: 276, y: 156, nodes: 3, neighbors: ["us-east", "us-west"] },
  { id: "sa-east", city: "São Paulo", x: 360, y: 362, nodes: 3, neighbors: ["us-east", "af-south"] },
  { id: "eu-west", city: "London", x: 488, y: 138, nodes: 5, neighbors: ["eu-central", "eu-north", "us-east"] },
  { id: "eu-central", city: "Frankfurt", x: 520, y: 152, nodes: 5, neighbors: ["eu-west", "eu-north", "me-central"] },
  { id: "eu-north", city: "Stockholm", x: 534, y: 106, nodes: 3, neighbors: ["eu-west", "eu-central"] },
  { id: "me-central", city: "Dubai", x: 640, y: 228, nodes: 3, neighbors: ["eu-central", "ap-south", "af-south"] },
  { id: "af-south", city: "Johannesburg", x: 562, y: 382, nodes: 3, neighbors: ["me-central", "sa-east"] },
  { id: "ap-south", city: "Mumbai", x: 704, y: 238, nodes: 4, neighbors: ["me-central", "ap-southeast", "ap-east"] },
  { id: "ap-southeast", city: "Singapore", x: 776, y: 300, nodes: 4, neighbors: ["ap-south", "ap-east", "au-east"] },
  { id: "ap-east", city: "Hong Kong", x: 818, y: 230, nodes: 4, neighbors: ["ap-southeast", "ap-northeast", "ap-south"] },
  { id: "ap-northeast", city: "Tokyo", x: 884, y: 190, nodes: 4, neighbors: ["ap-east", "us-west"] },
  { id: "au-east", city: "Sydney", x: 906, y: 396, nodes: 3, neighbors: ["ap-southeast"] },
];

export const REGION_IDS = REGIONS.map((r) => r.id) as [RegionId, ...RegionId[]];
export const getRegion = (id: RegionId) => REGIONS.find((r) => r.id === id)!;
export const TOTAL_NODES = REGIONS.reduce((s, r) => s + r.nodes, 0);

/** Requests per second one edge node absorbs before latency degrades. */
export const NODE_CAPACITY_RPS = 9_000;
/** Requests per second one burst serverless instance absorbs. */
export const INSTANCE_CAPACITY_RPS = 2_500;
