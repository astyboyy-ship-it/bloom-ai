Bloom AI Desktop installers for Windows (.exe) and macOS universal (.dmg) are attached below.

## Bloom Scout

Bloom Scout runs bounded sandbox negotiations on the Bloom Exchange relay. When the other side can't close on its own, Scout records the exact point it stopped and gives the owner a four-section brief, instead of inventing an agreement.

Two scripted scenarios, two outcomes:

| Scenario | What happens | Record |
|---|---|---|
| Fleet API procurement | The counterpart hits an `AUTHORITY_CEILING` at $0.72 per 1k tokens. Provisional sandbox terms clear; the 12-month term goes to the owner. | Dual-signed receipt in the relay's Merkle ledger |
| GPU rendering capacity | The counterpart has no margin policy for the request (`KNOWLEDGE_OR_POLICY_GAP`), so the owner's agent rejects instead of guessing. | Transcript hash only; no receipt is invented |

- **Signed gap notes.** The relay has no move for "I lack authority", so the admission is recorded on the Bloom AI side: an Ed25519-signed note bound to the transcript event it followed. Moving or editing it breaks the signature.
- **Owner brief.** What happened, where the counterpart stopped, the proof, and the decision left open (options stay inside the owner's sealed ceiling). It goes to the desk's approval queue and audit log; nothing is emailed or sent anywhere.
- **Desk tab** `Bloom Scout` (`/desk/exchange-scout`): feed, run console and owner briefs, in English, Spanish and Hebrew.
- **Live runs are off by default.** They need `BLOOM_SCOUT_LIVE=1` and a verified Operator access key, and are limited to 3 a minute per key and 20 a day per deployment. Each live run leaves a permanent public record on the relay under neutral sandbox names.
- **Sandbox policy before anything is signed:** no real company names, no binding language, short-lived intents and rooms, at most 4 counters, prices up to $10,000.

## Bloom Exchange tools in the engines

| Engine | Tool | What it does |
|---|---|---|
| Sovereign | `exchange_verify_receipt` | Accepts a Bloom Exchange settlement only after its receipt verifies (canonical hash, both Ed25519 signatures, RFC 6962 ledger inclusion, revocation); otherwise holds it for a person. Read-only. |
| Aether | `exchange_commit_terms` | Seals a price floor or ceiling as a salted commitment in the relay's `bloom-mandate/1` format and clamps the quote to it. |
| Cortex | `handoff_gap_detect` | Rule-based detection of authority ceilings and knowledge or policy gaps in a counterparty's words. A hit becomes a p0 action owned by a person, never a commitment. |
| Shield | `exchange_payload_policy` | Runs the sandbox policy on an outgoing payload. Refusals are written to the audit log as security events and show in the Threat Matrix. |

Simulated engine runs call these tools only when their input is present (for example, a receipt hash in the command).

Hardening covered by adversarial tests:
- Receipt verification is bound to the requested hash, so a relay that answers with a different, validly signed receipt fails. Tampered prices, terms, keys, signatures, ledger proofs and revoked receipts fail too.
- The sandbox policy normalizes text before checking it, so a real company name hidden with soft hyphens, zero-width characters, full-width letters or spacing is still refused. Refusal messages are fixed text and never echo the payload.
- `handoff_gap_detect` handles typographic apostrophes and more phrasings ("run this by legal", "above my pay grade", "set by headquarters").
- `exchange_commit_terms` rounds fractional-cent limits toward safety (a buyer's ceiling down, a seller's floor up) and refuses zero, negative, non-finite or out-of-range input.

## Try it locally

```bash
git clone https://github.com/astyboyy-ship-it/bloom-ai.git && cd bloom-ai
npm ci
npm run scout:simulate
```

`scout:simulate` plays both scenarios against an in-process simulated relay, with fresh Ed25519 keys and real hashes, signatures and Merkle proofs. It makes no network calls and needs no API keys; after `npm ci` it finishes in a few seconds.

## Also since v0.6.0

- **Bloom Exchange clearinghouse** at `/exchange`: double-blind vault, Shield firewall, Sovereign's deterministic clamp, Ed25519-signed `BLOOM-XCH` certificates, omni-protocol ingestion, Sovereign Private Nodes, and the operating desk.
- **Landing page:** `#exchange` and `#scout` sections, each ending with a "Where it's incorporated" explorer that lists every engine, architecture and platform layer as Live, New or Not used.
- **Neural Control Plane:** operations room with live telemetry, topology, trace stream and controls.
- **Security:** live model runs require a verified key, with spend caps and durable rate limits; runs fall back to simulation when the model provider is out of credits.
- **Pulse:** company pages and an architecture feed.
- **Private showcase** (real company names and logos) exists only in local desktop builds (`npm run desktop:local`) and is never compiled into a Vercel build.

## Verify

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
