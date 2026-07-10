import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  try {
    // Render 슬립 방지
    if (backendUrl) {
      await fetch(`${backendUrl}/api/v1/health`);
    }
    return NextResponse.json({ status: "ok", pinged: backendUrl });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
