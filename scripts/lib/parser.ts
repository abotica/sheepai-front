import * as cheerio from "cheerio";
import type { CruiseShip } from "./types.js";

/**
 * Parses cruisetimetables.com's Split year-page HTML into structured CruiseShip rows.
 *
 * Document structure (verified 2026-05-16):
 *   <div class='psovde-month'><b>May</b></a>
 *     <div class='psovde-listing'>
 *       <div class='psovde-day'>Sat 16<br>...</div>
 *       <div class='psovde-cruiseline'><img alt='MSC Cruises logo'></div>
 *       <div class='psovde-ship'><a>MSC Armonia</a></div>
 *       <div class='psovde-times'>a 0800 d 1700</div>
 *       <div class='psovde-passengers'>1952</div>
 *     </div>
 *     ...
 *   <div class='psovde-month'><b>June</b>...
 *
 * Notes:
 * - psovde-day is empty for additional ships on the same day; carry previous day.
 * - psovde-times may be empty, contain only `a HHMM`, only `d HHMM`, or free-form
 *   text like "early morning" — handled by returning null for missing values.
 * - psovde-passengers may include commas; we strip non-digits.
 */

const MONTH_TO_NUM: Record<string, number> = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseTime(raw: string | undefined, marker: "a" | "d"): string | null {
  if (!raw) return null;
  const re = new RegExp(`${marker}\\s*(\\d{4})`);
  const m = raw.match(re);
  if (!m) return null;
  const digits = m[1]!;
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const hours = parseInt(hh, 10);
  const minutes = parseInt(mm, 10);
  if (hours > 23 || minutes > 59) return null;
  return `${hh}:${mm}`;
}

function parsePassengers(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function parseDayNumber(raw: string): number | null {
  const cleaned = raw.replace(/<br[^>]*>/gi, " ");
  const m = cleaned.match(/\b(\d{1,2})\b/);
  return m ? parseInt(m[1]!, 10) : null;
}

function parseCruiseLine(altText: string): string {
  return altText.replace(/\s*logo\s*$/i, "").trim();
}

export function parseCruisePage(
  html: string,
  year: number,
): CruiseShip[] {
  const $ = cheerio.load(html);

  const ships: CruiseShip[] = [];
  let currentMonth: number | null = null;
  let currentDay: number | null = null;

  $(".psovde-month, .psovde-listing").each((_, el) => {
    const $el = $(el);
    const cls = $el.attr("class") || "";

    if (cls.includes("psovde-month")) {
      const text = $el.text().trim();
      const monthMatch = text.match(/^(\w+)/);
      if (monthMatch) {
        const monthName = monthMatch[1]!;
        const monthNum = MONTH_TO_NUM[monthName];
        if (monthNum) {
          currentMonth = monthNum;
          currentDay = null;
        }
      }
      return;
    }

    const dayRaw = $el.find(".psovde-day").html() || "";
    const parsedDay = parseDayNumber(dayRaw);
    if (parsedDay !== null) {
      currentDay = parsedDay;
    }

    if (currentMonth === null || currentDay === null) return;

    const cruiseLineAlt =
      $el.find(".psovde-cruiseline img").attr("alt") || "Unknown";
    const cruiseLine = parseCruiseLine(cruiseLineAlt);

    const shipName = $el.find(".psovde-ship a").text().trim();
    if (!shipName) return;

    const timesRaw = $el.find(".psovde-times").text().trim();
    const arrival = parseTime(timesRaw, "a");
    const departure = parseTime(timesRaw, "d");

    const passengersRaw = $el.find(".psovde-passengers").text().trim();
    const passengers = parsePassengers(passengersRaw);

    const date = `${year}-${String(currentMonth).padStart(2, "0")}-${String(
      currentDay,
    ).padStart(2, "0")}`;
    const id = `${date}_${slugify(shipName)}`;

    ships.push({
      id,
      date,
      ship_name: shipName,
      cruise_line: cruiseLine,
      arrival_time: arrival,
      departure_time: departure,
      passengers,
    });
  });

  return ships;
}
