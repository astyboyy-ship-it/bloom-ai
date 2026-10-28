/**
 * Public-domain paintings used across the site (downloaded from Wikimedia Commons, resized to 2400px).
 * `effects` describes the micro-animations layered onto each canvas.
 */
export type Painting = {
  src: string;
  width: number;
  height: number;
  title: string;
  artist: string;
  year: string;
  source: string;
  /** CSS object-position focal point. */
  focus: string;
  effects: {
    /** Animate water below this line (percent from top) with a gentle ripple. */
    waterline?: number;
    rock?: boolean;
    rain?: boolean;
    lightning?: { x: string; y: string };
    motes?: boolean;
    mist?: boolean;
    /** A breathing light source: moon, sun, or ambient garden light. */
    glow?: { x: string; y: string; color: string; size: string };
  };
};

export const paintings = {
  storm: {
    src: "/paintings/storm.jpg",
    width: 2400,
    height: 1666,
    title: "The Shipwreck",
    artist: "Joseph Vernet",
    year: "1772",
    source: "https://commons.wikimedia.org/wiki/File:Vernet,_Claude_Joseph_-_The_Shipwreck_-_1772FXD.jpg",
    focus: "60% 50%",
    effects: { waterline: 64, rock: true, rain: true, lightning: { x: "82%", y: "46%" } },
  },
  villaDeste: {
    src: "/paintings/villa-deste.jpg",
    width: 2400,
    height: 1873,
    title: "The Grand Staircase of the Villa d'Este at Tivoli",
    artist: "Jean-Honoré Fragonard",
    year: "c. 1760",
    source:
      "https://commons.wikimedia.org/wiki/File:Jean-Honor%C3%A9_Fragonard_-_The_Grand_Staircase_of_the_Villa_d%27Este_at_Tivoli_-_2001.235_-_Minneapolis_Institute_of_Arts.jpg",
    focus: "50% 55%",
    effects: { motes: true, mist: true, glow: { x: "30%", y: "30%", color: "255 196 120", size: "70%" } },
  },
  athens: {
    src: "/paintings/athens.jpg",
    width: 2400,
    height: 1476,
    title: "The Entry of King Otto of Greece in Athens",
    artist: "Peter von Hess",
    year: "1839",
    source: "https://commons.wikimedia.org/wiki/File:Peter_v_Hess_Empfang_K%C3%B6nig_Otto_(1)FXD.jpg",
    focus: "45% 55%",
    effects: { motes: true, glow: { x: "75%", y: "20%", color: "255 236 190", size: "60%" } },
  },
  venice: {
    src: "/paintings/venice-moonlight.jpg",
    width: 2400,
    height: 1669,
    title: "Venice, the Grand Canal in the Moonlight",
    artist: "Karl Heilmayer",
    year: "1892",
    source: "https://commons.wikimedia.org/wiki/File:Karl_Heilmayer_-_Venice,_the_Grand_Canal_in_the_Moonlight.jpg",
    focus: "45% 55%",
    effects: { waterline: 66, glow: { x: "42%", y: "22%", color: "220 230 255", size: "45%" } },
  },
  goldenLandscape: {
    src: "/paintings/golden-landscape.jpg",
    width: 2400,
    height: 1364,
    title: "Landscape with the Adoration of the Golden Calf",
    artist: "Claude Lorrain",
    year: "1653",
    source:
      "https://commons.wikimedia.org/wiki/File:Worship_of_the_Golden_Calf_-_Claude_Gell%C3%A9e,_called_Le_Lorrain_-_Google_Cultural_Institute.jpg",
    focus: "55% 50%",
    effects: { mist: true, motes: true, glow: { x: "68%", y: "56%", color: "255 214 140", size: "55%" } },
  },
  moonlitSea: {
    src: "/paintings/moonlit-sea.jpg",
    width: 2000,
    height: 1210,
    title: "A Moonlit Night at Sea",
    artist: "Ivan Aivazovsky",
    year: "1885",
    source: "https://commons.wikimedia.org/wiki/File:Ivan_Konstantinovich_Aivazovsky_-_A_Moonlit_Night_at_Sea,_1885.jpg",
    focus: "45% 60%",
    effects: { waterline: 52, glow: { x: "46%", y: "64%", color: "210 230 255", size: "40%" } },
  },
  wanderer: {
    src: "/paintings/wanderer.jpg",
    width: 2327,
    height: 2980,
    title: "Wanderer above the Sea of Fog",
    artist: "Caspar David Friedrich",
    year: "c. 1817",
    source: "https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg",
    focus: "50% 44%",
    effects: { mist: true, motes: true, glow: { x: "52%", y: "30%", color: "236 242 252", size: "60%" } },
  },
  temeraire: {
    src: "/paintings/temeraire.jpg",
    width: 2400,
    height: 1783,
    title: "The Fighting Temeraire",
    artist: "J. M. W. Turner",
    year: "1839",
    source: "https://commons.wikimedia.org/wiki/File:The_Fighting_Temeraire,_JMW_Turner,_National_Gallery.jpg",
    focus: "50% 62%",
    effects: { waterline: 76, motes: true, glow: { x: "78%", y: "70%", color: "255 186 104", size: "50%" } },
  },
  consummation: {
    src: "/paintings/consummation.jpg",
    width: 2400,
    height: 1627,
    title: "The Course of Empire: The Consummation of Empire",
    artist: "Thomas Cole",
    year: "1836",
    source: "https://commons.wikimedia.org/wiki/File:Cole_Thomas_The_Consummation_The_Course_of_the_Empire_1836.jpg",
    focus: "48% 50%",
    effects: { mist: true, motes: true, glow: { x: "34%", y: "16%", color: "255 238 205", size: "60%" } },
  },
  destruction: {
    src: "/paintings/destruction.jpg",
    width: 2400,
    height: 1489,
    title: "The Course of Empire: Destruction",
    artist: "Thomas Cole",
    year: "1836",
    source: "https://commons.wikimedia.org/wiki/File:Cole_Thomas_The_Course_of_Empire_Destruction_1836.jpg",
    focus: "50% 45%",
    effects: { mist: true, motes: true, glow: { x: "62%", y: "38%", color: "255 150 90", size: "55%" } },
  },
  issus: {
    src: "/paintings/issus.jpg",
    width: 1837,
    height: 2400,
    title: "The Battle of Alexander at Issus",
    artist: "Albrecht Altdorfer",
    year: "1529",
    source: "https://commons.wikimedia.org/wiki/File:Albrecht_Altdorfer_-_Schlacht_bei_Issus_(Alte_Pinakothek,_M%C3%BCnchen)_-_Google_Art_Project.jpg",
    focus: "50% 38%",
    effects: { mist: true, motes: true, glow: { x: "70%", y: "30%", color: "255 214 150", size: "50%" } },
  },
  forge: {
    src: "/paintings/forge.jpg",
    width: 2400,
    height: 1864,
    title: "The Forge of Vulcan",
    artist: "Diego Velázquez",
    year: "1630",
    source: "https://commons.wikimedia.org/wiki/File:Vel%C3%A1zquez_-_La_Fragua_de_Vulcano_(Museo_del_Prado,_1630).jpg",
    focus: "55% 45%",
    effects: { motes: true, glow: { x: "70%", y: "50%", color: "255 140 70", size: "40%" } },
  },
} satisfies Record<string, Painting>;

export type PaintingKey = keyof typeof paintings;
