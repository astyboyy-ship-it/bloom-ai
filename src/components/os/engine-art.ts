import type { EngineKey } from "@/components/bloom/command/engines";

/**
 * Classical artwork behind each engine's Demo Deck card, chosen for the engine's persona. Every work is in the
 * public domain; files are Wikimedia Commons thumbnails (500px) stored in /public/art/engines.
 */
export const ENGINE_ART: Record<EngineKey, { src: string; title: string; artist: string; year: string; source: string }> = {
  sovereign: { src: "/art/engines/sovereign.jpg", title: "Interior of the Pantheon, Rome", artist: "Giovanni Paolo Panini", year: "c. 1734", source: "https://commons.wikimedia.org/wiki/File:Giovanni_Paolo_Panini_-_Interior_of_the_Pantheon,_Rome_-_Google_Art_Project.jpg" },
  apex: { src: "/art/engines/apex.png", title: "The Colosseum", artist: "Giovanni Battista Piranesi", year: "1757", source: "https://commons.wikimedia.org/wiki/File:Giovanni_Battista_Piranesi,_The_Colosseum.png" },
  coreops: { src: "/art/engines/coreops.jpg", title: "Flywheel mechanism (study)", artist: "Leonardo da Vinci", year: "late 15th century", source: "https://commons.wikimedia.org/wiki/File:Vinci,_Leonardo_Da_-_Volano_(meccanica).jpg" },
  intentpulse: { src: "/art/engines/intentpulse.jpg", title: "Planisphaerium Arateum, Harmonia Macrocosmica", artist: "Andreas Cellarius", year: "1661", source: "https://commons.wikimedia.org/wiki/File:Cellarius_Harmonia_Macrocosmica_-_Planisphaerium_Arateum.jpg" },
  vanguard: { src: "/art/engines/vanguard.jpg", title: "Portolan chart of the Mediterranean", artist: "Anonymous, probably Genoese", year: "c. 1320–1350", source: "https://commons.wikimedia.org/wiki/File:Mediterranean_chart_fourteenth_century2.jpg" },
  cortex: { src: "/art/engines/cortex.jpg", title: "The School of Athens", artist: "Raphael", year: "1511", source: "https://commons.wikimedia.org/wiki/File:%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg" },
  shield: { src: "/art/engines/shield.jpg", title: "The Fortress at Corfu", artist: "Francesco Pige", year: "1849", source: "https://commons.wikimedia.org/wiki/File:1849_Pige_The_Fortress_at_Corfu,_National_Gallery_-_Corfu_Annex_anagoria.jpg" },
  aether: { src: "/art/engines/aether.jpg", title: "Cloud Study", artist: "John Constable", year: "1821", source: "https://commons.wikimedia.org/wiki/File:John_Constable_-_Cloud_Study_-_Google_Art_Project_(2427780).jpg" },
};
