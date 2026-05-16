import { Resend } from "resend";
import { NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false as const, code: "missing_api_key" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false as const, code: "bad_json" }, { status: 400 });
  }

  const raw =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";

  const email = raw.trim().toLowerCase();

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ ok: false as const, code: "invalid_email" }, { status: 400 });
  }

  const resend = new Resend(apiKey);

  const segmentId = process.env.RESEND_SEGMENT_ID?.trim();

  const { error } = await resend.contacts.create({
    email,
    unsubscribed: false,
    ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
  });

  if (error) {
    const name = "name" in error ? String(error.name) : "";
    const message = "message" in error ? String(error.message) : "";

    if (
      name === "restricted_api_key" ||
      message.toLowerCase().includes("restricted to only send emails")
    ) {
      return NextResponse.json(
        { ok: false as const, code: "resend_key_restricted" },
        { status: 403 },
      );
    }

    const hint = `${name} ${message}`.toLowerCase();
    if (
      hint.includes("already") ||
      hint.includes("duplicate") ||
      hint.includes("exists") ||
      hint.includes("unique")
    ) {
      return NextResponse.json({ ok: true as const, duplicate: true });
    }

    console.error("[newsletter] Resend contacts.create:", error);
    return NextResponse.json({ ok: false as const, code: "resend_error" }, { status: 502 });
  }

  return NextResponse.json({ ok: true as const, duplicate: false });
}
