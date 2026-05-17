/**
 * Daily digest → contacts in RESEND_SEGMENT_ID.
 *
 * Env (Vercel): CRON_SECRET, RESEND_API_KEY, RESEND_SEGMENT_ID, RESEND_FROM,
 * optional NEXT_PUBLIC_APP_URL (canonical site URL), RESEND_TOPIC_ID.
 */
import cruisesBundled from "@/data/cruises.json";
import { buildDailyDigestParts, type DigestShip } from "@/lib/newsletter-digest-email";
import { calendarDateZagreb } from "@/lib/zagreb-calendar";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
/** Hobby: 10s default; raise on Pro if the segment grows large. */
export const maxDuration = 60;

function deployOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const v = process.env.VERCEL_URL?.trim().replace(/^https?:\/\//, "");
  return v ? `https://${v}` : "";
}

async function loadCruiseShips(): Promise<DigestShip[]> {
  const base = deployOrigin();
  if (base) {
    try {
      const res = await fetch(`${base}/data/cruises.json`, { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { ships: DigestShip[] };
        return json.ships;
      }
      console.warn("[daily-newsletter] cruises fetch failed:", res.status);
    } catch (e) {
      console.warn("[daily-newsletter] cruises fetch error, using bundled JSON", e);
    }
  }
  return cruisesBundled.ships;
}

export async function GET(request: Request) {
  return runDailyNewsletter(request);
}

export async function POST(request: Request) {
  return runDailyNewsletter(request);
}

async function runDailyNewsletter(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("[daily-newsletter] CRON_SECRET is not set");
    return NextResponse.json(
      { ok: false as const, code: "cron_secret_missing" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false as const }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const segmentId = process.env.RESEND_SEGMENT_ID?.trim();
  const from = process.env.RESEND_FROM?.trim();
  const topicId = process.env.RESEND_TOPIC_ID?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { ok: false as const, code: "missing_api_key" },
      { status: 500 },
    );
  }
  if (!segmentId) {
    return NextResponse.json(
      { ok: false as const, code: "missing_segment_id" },
      { status: 500 },
    );
  }
  if (!from) {
    return NextResponse.json(
      { ok: false as const, code: "missing_from" },
      { status: 500 },
    );
  }

  const isoDate = calendarDateZagreb(new Date());
  const ships = await loadCruiseShips();
  const shipsToday = ships.filter((s) => s.date === isoDate);

  const origin = deployOrigin();

  const { subject, html, text } = buildDailyDigestParts({
    isoDate,
    ships: shipsToday,
    ...(origin ? { appOrigin: origin } : {}),
  });

  const resend = new Resend(apiKey);

  let after: string | undefined;
  let recipientPage = 0;
  let batches = 0;
  let recipientsSent = 0;

  while (true) {
    const { data: page, error: listError } = await resend.contacts.list({
      segmentId,
      limit: 100,
      ...(after ? { after } : {}),
    });

    if (listError) {
      console.error("[daily-newsletter] contacts.list:", listError);
      return NextResponse.json(
        { ok: false as const, code: "resend_list_error" },
        { status: 502 },
      );
    }

    if (!page?.data?.length) {
      break;
    }

    recipientPage += 1;
    const lastContact = page.data[page.data.length - 1];
    after = page.has_more && lastContact ? lastContact.id : undefined;

    const subscribed = page.data.filter((c) => !c.unsubscribed);
    if (subscribed.length === 0) {
      if (!after) break;
      continue;
    }

    const chunk = subscribed.map((c) => ({
      from,
      to: [c.email],
      subject,
      html,
      text,
      ...(topicId ? { topicId } : {}),
    }));

    const { error: batchError } = await resend.batch.send(chunk, {
      batchValidation: "permissive",
      idempotencyKey: `daily-newsletter-${isoDate}-p${recipientPage}`,
    });

    if (batchError) {
      console.error("[daily-newsletter] batch.send:", batchError);
      return NextResponse.json(
        { ok: false as const, code: "resend_batch_error", isoDate },
        { status: 502 },
      );
    }

    batches += 1;
    recipientsSent += chunk.length;

    if (!after) break;
  }

  return NextResponse.json({
    ok: true as const,
    isoDate,
    ships: shipsToday.length,
    recipientsSent,
    batches,
  });
}
