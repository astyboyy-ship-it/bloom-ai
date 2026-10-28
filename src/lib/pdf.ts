/**
 * A minimal text PDF (PDF 1.4): a bold title and monospaced body, wrapped and paginated on US Letter.
 * No dependencies; enough for a contract export. Characters outside Latin-1 are transliterated.
 */

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const SIZE = 9.5;
const LEAD = 12.5;
// Courier advances 0.6 em per character.
const COLS = Math.floor((PAGE_W - MARGIN * 2) / (SIZE * 0.6));
const ROWS = Math.floor((PAGE_H - MARGIN * 2 - 30) / LEAD);

const ascii = (s: string) =>
  s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/[·•]/g, "-")
    .replace(/×/g, "x")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7e]/g, "?");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function wrap(text: string) {
  const out: string[] = [];
  // Split before transliterating: ascii() would turn the newlines themselves into "?".
  for (const raw of text.split(/\r?\n/)) {
    let line = ascii(raw);
    const indent = /^\s*/.exec(line)?.[0] ?? "";
    while (line.length > COLS) {
      let cut = line.lastIndexOf(" ", COLS);
      // A break inside the leading whitespace would loop forever on long unbroken tokens (keys, signatures).
      if (cut <= (/^\s*/.exec(line)?.[0].length ?? 0)) cut = COLS;
      out.push(line.slice(0, cut));
      line = indent + "  " + line.slice(cut).trimStart();
    }
    out.push(line);
  }
  return out;
}

export function textPdf(title: string, body: string): Blob {
  const lines = wrap(body);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += ROWS) pages.push(lines.slice(i, i + ROWS));
  if (!pages.length) pages.push([]);

  const objs: string[] = [];
  const add = (s: string) => objs.push(s); // the new length is the 1-based object number
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add(""); // pages, filled in below
  const mono = add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>");
  const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids: number[] = [];
  pages.forEach((page, pi) => {
    let y = PAGE_H - MARGIN;
    let s = `BT /F2 13 Tf ${MARGIN} ${y} Td (${esc(ascii(title))}) Tj ET\n`;
    s += `BT /F1 8 Tf ${PAGE_W - MARGIN - 60} ${MARGIN / 2} Td (Page ${pi + 1} of ${pages.length}) Tj ET\n`;
    y -= 30;
    s += `BT /F1 ${SIZE} Tf ${LEAD} TL ${MARGIN} ${y} Td\n`;
    for (const l of page) s += `(${esc(l)}) Tj T*\n`;
    s += "ET";
    const content = add(`<< /Length ${s.length} >>\nstream\n${s}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${mono} 0 R /F2 ${bold} 0 R >> >> /Contents ${content} 0 R >>`));
  });
  objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  // Everything above is ASCII, so string length equals byte length for the xref offsets.
  let pdf = "%PDF-1.4\n";
  const offsets = objs.map((o, i) => {
    const at = pdf.length;
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
    return at;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
