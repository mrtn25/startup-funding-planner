/* ══════════════════════════════════════════════════════════════
   Holding on to a plan: in the URL, and in named local scenarios.

   The URL codec deflates the JSON before base64url-ing it, using the
   platform's own CompressionStream — a full plan with the customer
   list is a few kilobytes of very repetitive JSON, which compresses
   to roughly a fifth of that. Where CompressionStream is missing the
   payload simply goes in uncompressed; the leading flag byte says
   which, so old links keep working either way.
   ══════════════════════════════════════════════════════════════ */

import { DEFAULT_INPUTS, type Customer, type PlanInputs } from "./plan";
import { ROSTER } from "./roster";

export type PlanState = { inputs: PlanInputs; customers: Customer[] };

export const DEFAULT_STATE: PlanState = { inputs: DEFAULT_INPUTS, customers: ROSTER };

export const URL_PARAM = "p";
const STORAGE_KEY = "inplicit.scenarios.v1";

/* ── base64url over bytes ── */

function toB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const p = s.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(p + "=".repeat((4 - (p.length % 4)) % 4));
  // Allocated rather than Uint8Array.from, so the buffer type is concrete
  // enough for the stream writer to accept it.
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function through(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/* ── The codec ── */

export async function encodeState(state: PlanState): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ v: 1, i: state.inputs, c: state.customers }));
  if (typeof CompressionStream === "undefined") return `0${toB64url(json)}`;
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  void writer.write(json);
  void writer.close();
  return `1${toB64url(await through(cs.readable))}`;
}

export async function decodeState(token: string): Promise<PlanState | null> {
  try {
    const flag = token[0];
    const bytes = fromB64url(token.slice(1));
    let json: Uint8Array;
    if (flag === "1") {
      if (typeof DecompressionStream === "undefined") return null;
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      void writer.write(bytes);
      void writer.close();
      json = await through(ds.readable);
    } else {
      json = bytes;
    }
    const parsed = JSON.parse(new TextDecoder().decode(json));
    return normalise(parsed);
  } catch {
    return null;
  }
}

/**
 * A decoded plan is untrusted input — it comes out of a URL. Every field is
 * taken from the defaults unless the payload supplies one of the right type,
 * so a truncated or hand-edited link degrades to a working plan rather than
 * a crash.
 */
function normalise(raw: unknown): PlanState | null {
  if (!raw || typeof raw !== "object") return null;
  const { i, c } = raw as { i?: unknown; c?: unknown };
  if (!i || typeof i !== "object") return null;

  const src = i as Record<string, unknown>;
  const inputs = { ...DEFAULT_INPUTS };
  for (const key of Object.keys(DEFAULT_INPUTS) as (keyof PlanInputs)[]) {
    const v = src[key];
    const fallback = DEFAULT_INPUTS[key];
    if (typeof fallback === "number" && typeof v === "number" && isFinite(v)) {
      (inputs[key] as number) = v;
    } else if (typeof fallback === "boolean" && typeof v === "boolean") {
      (inputs[key] as boolean) = v;
    } else if (typeof fallback === "string" && typeof v === "string") {
      (inputs[key] as string) = v;
    }
  }
  inputs.months = Math.min(120, Math.max(1, Math.round(inputs.months)));

  const customers: Customer[] = Array.isArray(c)
    ? (c as unknown[]).slice(0, 400).map((row, idx) => {
        const r = (row ?? {}) as Record<string, unknown>;
        const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);
        return {
          id: typeof r.id === "string" ? r.id : `u${idx}`,
          name: typeof r.name === "string" ? r.name.slice(0, 120) : "",
          type: r.type === "channel" ? "channel" : "direct",
          segment: r.segment === "enterprise" ? "enterprise" : "mittelstand",
          pilotMonth: num(r.pilotMonth),
          pilotRevenue: num(r.pilotRevenue),
          subMonth: num(r.subMonth),
          subACV: num(r.subACV),
          expand: r.expand !== false,
          note: typeof r.note === "string" ? r.note.slice(0, 300) : "",
        };
      })
    : [];

  return { inputs, customers };
}

/* ── Named scenarios in localStorage ── */

export type ScenarioMap = Record<string, PlanState>;

export function loadScenarios(): ScenarioMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: ScenarioMap = {};
    for (const [name, value] of Object.entries(parsed)) {
      const st = normalise(value);
      if (st) out[name] = st;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveScenario(name: string, state: PlanState): ScenarioMap {
  const all = loadScenarios();
  all[name] = { inputs: state.inputs, customers: state.customers };
  persist(all);
  return all;
}

export function deleteScenario(name: string): ScenarioMap {
  const all = loadScenarios();
  delete all[name];
  persist(all);
  return all;
}

function persist(all: ScenarioMap) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        Object.fromEntries(Object.entries(all).map(([n, s]) => [n, { v: 1, i: s.inputs, c: s.customers }])),
      ),
    );
  } catch {
    /* Private mode or a full quota — the URL is still the durable copy. */
  }
}
