import { NextResponse } from "next/server";
import { REVALIDATE, loadGithubStats } from "./stats";

export async function GET() {
  try {
    const stats = await loadGithubStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=${REVALIDATE * 6}` },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
