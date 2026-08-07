import { NextResponse } from "next/server";
import { FALLBACK_MILESTONES, type RoundId } from "@/lib/planner";

/*
 * The original build called the OpenAI API straight from the browser with the
 * key inlined in the page source. That key is now read server-side only and
 * never reaches the client.
 *
 * With OPENAI_API_KEY unset the route returns the same curated fallbacks the
 * old page fell back to, so behaviour is unchanged until a key is configured.
 */

type RoundRef = { id: RoundId; name: string };
type MilestoneGroup = { round: string; milestones: string[] };

function fallbackFor(rounds: RoundRef[]): MilestoneGroup[] {
  return rounds.map((r) => ({
    round: r.name,
    milestones: FALLBACK_MILESTONES[r.id] ?? [
      "Validated product-market fit",
      "Demonstrated traction with early users",
    ],
  }));
}

export async function POST(request: Request) {
  let name = "";
  let description = "";
  let rounds: RoundRef[] = [];

  try {
    const body = await request.json();
    name = typeof body?.name === "string" ? body.name : "";
    description = typeof body?.description === "string" ? body.description : "";
    rounds = Array.isArray(body?.rounds) ? body.rounds : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!rounds.length) {
    return NextResponse.json({ error: "No rounds supplied" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ milestones: fallbackFor(rounds), source: "fallback" });
  }

  const prompt = [
    "You are a startup advisor. Given the startup below, suggest 2 concrete milestones or KPIs a founder must hit BEFORE each financing round to make it fundable. Be specific, use real metrics.",
    "",
    `Startup name: ${name || "(unnamed)"}`,
    `Description: ${description || "(not provided)"}`,
    `Rounds to cover: ${rounds.map((r) => r.name).join(", ")}`,
    "",
    'Respond ONLY with a JSON array, no markdown, no explanation. Format:\n[{"round":"Pre-Seed","milestones":["milestone 1","milestone 2"]},...]',
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI responded ${res.status}`);

    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("no content");

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!Array.isArray(parsed) || !parsed.length) throw new Error("unexpected shape");

    return NextResponse.json({ milestones: parsed as MilestoneGroup[], source: "openai" });
  } catch {
    // Never surface an upstream failure as an error page — the curated
    // fallbacks are useful on their own.
    return NextResponse.json({ milestones: fallbackFor(rounds), source: "fallback" });
  }
}
