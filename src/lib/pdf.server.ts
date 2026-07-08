import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ProtocolDraft = {
  client_name?: string;
  overview?: string;
  training_block?: {
    weeks?: number;
    split?: string;
    key_lifts?: string[];
    progression?: string;
    weekly_schedule?: string;
  };
  peptide_protocol?: {
    overview?: string;
    items?: string;
    educational_disclaimer?: string;
  };
  nutrition_notes?: string;
  recovery_notes?: string;
};

const BLOOD = rgb(0.749, 0.078, 0.094); // ~ #BF1418 from styles
const INK = rgb(0.07, 0.07, 0.09);
const MUTED = rgb(0.42, 0.42, 0.45);

export async function renderProtocolPdf(draft: ProtocolDraft, meta: { title: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 612; const H = 792;
  const MARGIN = 56;
  let page = pdf.addPage([W, H]);
  let y = H - MARGIN;

  const newPage = () => { page = pdf.addPage([W, H]); y = H - MARGIN; drawHeader(); };

  const wrap = (text: string, font: typeof helv, size: number, maxWidth: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        if (cur) lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const drawText = (text: string, opts: { font?: typeof helv; size?: number; color?: typeof BLOOD; gap?: number } = {}) => {
    const font = opts.font ?? helv;
    const size = opts.size ?? 10.5;
    const color = opts.color ?? INK;
    const lines = wrap(text, font, size, W - MARGIN * 2);
    for (const line of lines) {
      if (y < MARGIN + size + 10) newPage();
      page.drawText(line, { x: MARGIN, y, size, font, color });
      y -= size * 1.35;
    }
    y -= opts.gap ?? 4;
  };

  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: BLOOD });
    page.drawText("TITAN ELITE", { x: MARGIN, y: H - 30, size: 11, font: helvBold, color: INK });
    page.drawText("CUSTOM PROTOCOL", { x: W - MARGIN - helv.widthOfTextAtSize("CUSTOM PROTOCOL", 9), y: H - 30, size: 9, font: helv, color: MUTED });
    y = H - 70;
  };

  const drawDivider = () => {
    if (y < MARGIN + 20) newPage();
    page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 0.5, color: MUTED });
    y -= 14;
  };

  const drawH = (text: string, size = 18) => {
    if (y < MARGIN + size + 20) newPage();
    drawText(text, { font: helvBold, size, color: INK, gap: 8 });
  };

  const drawEyebrow = (text: string) => {
    if (y < MARGIN + 20) newPage();
    drawText(text.toUpperCase(), { font: helvBold, size: 8, color: BLOOD, gap: 6 });
  };

  drawHeader();
  // Title block
  drawEyebrow("Protocol");
  drawH(meta.title, 24);
  if (draft.client_name) drawText(`Prepared for ${draft.client_name}`, { color: MUTED, size: 10, gap: 6 });
  drawText(`Generated ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`, { color: MUTED, size: 9, gap: 12 });
  drawDivider();

  if (draft.overview) {
    drawEyebrow("Overview");
    drawText(draft.overview, { gap: 12 });
    drawDivider();
  }

  // Training
  if (draft.training_block) {
    const t = draft.training_block;
    drawEyebrow("Training Block");
    drawH(`${t.weeks ?? "—"}-week block${t.split ? ` · ${t.split}` : ""}`, 16);
    if (t.progression) drawText(t.progression, { gap: 8 });
    if (t.key_lifts?.length) {
      drawEyebrow("Key Lifts");
      drawText(t.key_lifts.map((l) => `• ${l}`).join("\n"), { gap: 8 });
    }
    if (t.weekly_schedule?.length) {
      drawEyebrow("Weekly Schedule");
      for (const day of t.weekly_schedule) {
        drawText(`${day.day} — ${day.focus}`, { font: helvBold, size: 11, gap: 2 });
        for (const s of day.sessions) drawText(`   ${s}`, { size: 10, gap: 2 });
        y -= 4;
      }
    }
    drawDivider();
  }

  // Peptides
  if (draft.peptide_protocol) {
    const p = draft.peptide_protocol;
    drawEyebrow("Peptide Protocol (Educational)");
    if (p.overview) drawText(p.overview, { gap: 8 });
    if (p.items?.length) {
      for (const it of p.items) {
        drawText(it.name, { font: helvBold, size: 11, gap: 2 });
        const meta = [it.dose, it.timing].filter(Boolean).join(" · ");
        if (meta) drawText(meta, { color: MUTED, size: 9, gap: 2 });
        if (it.notes) drawText(it.notes, { size: 10, gap: 6 });
      }
    }
    if (p.educational_disclaimer) {
      y -= 4;
      drawText(p.educational_disclaimer, { color: MUTED, size: 9, gap: 8 });
    }
    drawDivider();
  }

  if (draft.nutrition_notes) {
    drawEyebrow("Nutrition Notes");
    drawText(draft.nutrition_notes, { gap: 12 });
    drawDivider();
  }

  if (draft.recovery_notes) {
    drawEyebrow("Recovery Notes");
    drawText(draft.recovery_notes, { gap: 12 });
    drawDivider();
  }

  // Footer disclaimer on each page
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    pg.drawText("Titan Elite — Educational content. Not medical advice. Consult a licensed provider before use.", {
      x: MARGIN, y: 30, size: 7.5, font: helv, color: MUTED,
    });
    pg.drawText(`${i + 1} / ${pages.length}`, {
      x: W - MARGIN - 20, y: 30, size: 7.5, font: helv, color: MUTED,
    });
  }

  return await pdf.save();
}
