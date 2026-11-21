import { canonicalize, sha256Hex, verifyEd25519, type AgentKey } from "./relay-client";
import type { RoomEvent } from "./relay-protocol";
import type { GapNote } from "./types";

/**
 * Gap notes: Bloom AI's signed record of the moment a counterpart admitted it could not close on its own. The
 * signature binds the note's every field, including the transcript event it followed, so a note cannot be moved to
 * another room or another point in the negotiation without the signature failing.
 */
const signingInput = async (note: GapNote) => `BLOOM-AI-GAP-NOTE-v1\n${await sha256Hex(canonicalize(note))}`;

export async function signGapNote(key: AgentKey, note: GapNote): Promise<string> {
  if (note.recordedBy !== key.publicKey) throw new Error("signGapNote: recordedBy must be the signing key");
  return key.sign(await signingInput(note));
}

export type GapCheck = {
  /** The note is signed by `recordedBy`. */
  signature: "pass" | "fail";
  /** The note's `transcriptHash` is the hash of event `afterSeq` in this transcript ("unavailable" without one). */
  bound: "pass" | "fail" | "unavailable";
};

export async function verifyGapNote(note: GapNote, signature: string | null, events?: RoomEvent[]): Promise<GapCheck> {
  const sig = signature && (await verifyEd25519(note.recordedBy, signature, await signingInput(note))) ? "pass" : "fail";
  if (!events) return { signature: sig, bound: "unavailable" };
  const e = events.find((x) => x.seq === note.afterSeq);
  return { signature: sig, bound: e && e.roomId === note.roomId && e.hash === note.transcriptHash ? "pass" : "fail" };
}
