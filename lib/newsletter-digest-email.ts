import cruisesJson from "@/data/cruises.json";
import { newsletterDigest } from "@/lib/copy";
import { formatPassengers } from "@/lib/format";
import { formatIsoDateHr } from "@/lib/zagreb-calendar";

export type DigestShip = (typeof cruisesJson.ships)[number];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(t: string | null): string {
  return t ?? newsletterDigest.timeUnknown;
}

function shipCompare(a: DigestShip, b: DigestShip): number {
  const ta = a.arrival_time ?? "99:99";
  const tb = b.arrival_time ?? "99:99";
  if (ta !== tb) return ta.localeCompare(tb);
  return a.ship_name.localeCompare(b.ship_name, "hr");
}

export function buildDailyDigestParts(input: {
  isoDate: string;
  ships: DigestShip[];
  appOrigin?: string;
}): { subject: string; html: string; text: string } {
  const dateHr = formatIsoDateHr(input.isoDate);
  const sorted = [...input.ships].sort(shipCompare);
  const totalPax = sorted.reduce((sum, s) => sum + s.passengers, 0);
  const n = sorted.length;

  const subject =
    n === 0
      ? newsletterDigest.subjectNoShips(dateHr)
      : newsletterDigest.subjectWithShips(dateHr, n, formatPassengers(totalPax));

  const summary =
    n === 0
      ? newsletterDigest.summaryNoShips(dateHr)
      : newsletterDigest.summaryWithShips(dateHr, n, formatPassengers(totalPax));

  const rowsHtml =
    n === 0
      ? `<p style="margin:16px 0 0;font:15px/1.5 Inter,system-ui,sans-serif;color:#09090B;">${escapeHtml(newsletterDigest.emptyDayBody)}</p>`
      : `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;border-collapse:collapse;font:14px/1.45 Inter,system-ui,sans-serif;color:#09090B;">
  <thead>
    <tr>
      <th align="left" style="padding:8px 12px;border-bottom:1px solid #E4E4E7;font-weight:600;">${escapeHtml(newsletterDigest.colShip)}</th>
      <th align="left" style="padding:8px 12px;border-bottom:1px solid #E4E4E7;font-weight:600;">${escapeHtml(newsletterDigest.colLine)}</th>
      <th align="left" style="padding:8px 12px;border-bottom:1px solid #E4E4E7;font-weight:600;">${escapeHtml(newsletterDigest.colArrival)}</th>
      <th align="left" style="padding:8px 12px;border-bottom:1px solid #E4E4E7;font-weight:600;">${escapeHtml(newsletterDigest.colDeparture)}</th>
      <th align="right" style="padding:8px 12px;border-bottom:1px solid #E4E4E7;font-weight:600;">${escapeHtml(newsletterDigest.colPassengers)}</th>
    </tr>
  </thead>
  <tbody>
${sorted
  .map(
    (s) => `    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #F4F4F5;font-variant-numeric:tabular-nums;">${escapeHtml(s.ship_name)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #F4F4F5;">${escapeHtml(s.cruise_line)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #F4F4F5;font-variant-numeric:tabular-nums;">${escapeHtml(formatTime(s.arrival_time))}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #F4F4F5;font-variant-numeric:tabular-nums;">${escapeHtml(formatTime(s.departure_time))}</td>
      <td align="right" style="padding:10px 12px;border-bottom:1px solid #F4F4F5;font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(formatPassengers(s.passengers))}</td>
    </tr>`,
  )
  .join("\n")}
  </tbody>
</table>`;

  const origin = input.appOrigin?.replace(/\/$/, "") ?? "";
  const footerExtra =
    origin.length > 0
      ? `<p style="margin:20px 0 0;font:13px/1.5 Inter,system-ui,sans-serif;color:#71717A;"><a href="${escapeHtml(origin)}" style="color:#0F4C75;text-decoration:none;font-weight:600;">${escapeHtml(newsletterDigest.openApp)}</a></p>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="hr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#FFFFFF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;">
    <tr><td style="padding:28px 20px;font-family:Inter,system-ui,sans-serif;">
      <p style="margin:0;font:11px/1.4 Inter,system-ui,sans-serif;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#71717A;">${escapeHtml(newsletterDigest.kicker)}</p>
      <h1 style="margin:8px 0 0;font:22px/1.25 Fraunces,Georgia,serif;font-weight:600;color:#09090B;">${escapeHtml(summary)}</h1>
      ${rowsHtml}
      <p style="margin:24px 0 0;font:13px/1.5 Inter,system-ui,sans-serif;color:#71717A;">${escapeHtml(newsletterDigest.footerLegal)}</p>
      ${footerExtra}
    </td></tr>
  </table>
</body>
</html>`;

  const linesText = sorted.map((s) =>
    newsletterDigest.textShipLine(
      s.ship_name,
      s.cruise_line,
      formatTime(s.arrival_time),
      formatTime(s.departure_time),
      formatPassengers(s.passengers),
    ),
  );

  const textParts = [
    summary,
    "",
    n === 0 ? newsletterDigest.emptyDayBody : linesText.join("\n"),
    "",
    newsletterDigest.footerLegal,
  ];
  if (origin.length > 0) {
    textParts.push("", `${newsletterDigest.openApp}: ${origin}`);
  }

  return { subject, html, text: textParts.join("\n") };
}
