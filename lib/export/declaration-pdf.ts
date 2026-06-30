/**
 * Build the inventor's declaration (37 CFR 1.63 / PTO-AIA-01 style) as a one-page-per-inventor
 * PDF for the inventor to actually sign by hand, then upload back into Pincite. The typed
 * S-signature in the app is a record of the attestation; the operative signature is the one
 * placed on this document. Pure pdf-lib, no native dependency.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DECLARATION_STATEMENTS } from "@/lib/export/filing-package";

const BLACK = rgb(0, 0, 0);

export async function buildDeclarationPdf(opts: {
  title: string;
  inventors: { legal_name: string }[];
}): Promise<Uint8Array> {
  const { title } = opts;
  const inventors =
    opts.inventors.length > 0 ? opts.inventors : [{ legal_name: "" }];
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 612; // US Letter, points
  const H = 792;
  const margin = 72;
  const maxW = W - margin * 2;

  // Word-wrap helper.
  const wrap = (text: string, f: typeof font, size: number): string[] => {
    const out: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > maxW && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
    return out;
  };

  for (const inv of inventors) {
    const page = doc.addPage([W, H]);
    let y = H - margin;
    const draw = (
      text: string,
      f: typeof font,
      size: number,
      gap = 6,
    ) => {
      for (const ln of wrap(text, f, size)) {
        page.drawText(ln, { x: margin, y, size, font: f, color: BLACK });
        y -= size + gap;
      }
    };

    draw("DECLARATION (37 CFR 1.63)", bold, 14, 12);
    draw(`Title of the invention: ${title.trim() || "[not provided]"}`, font, 11, 14);
    draw("As a named inventor in the above-identified application, I declare that:", font, 11, 10);

    DECLARATION_STATEMENTS.forEach((s, i) => {
      y -= 2;
      page.drawText(`${i + 1}.`, { x: margin, y, size: 11, font, color: BLACK });
      for (const ln of wrap(s, font, 11)) {
        page.drawText(ln, { x: margin + 18, y, size: 11, font, color: BLACK });
        y -= 11 + 5;
      }
      y -= 4;
    });

    y -= 24;
    const lineY = (label: string, value: string) => {
      page.drawText(label, { x: margin, y, size: 11, font, color: BLACK });
      page.drawLine({
        start: { x: margin + 90, y: y - 2 },
        end: { x: W - margin, y: y - 2 },
        thickness: 0.75,
        color: BLACK,
      });
      if (value)
        page.drawText(value, {
          x: margin + 96,
          y: y + 2,
          size: 11,
          font,
          color: BLACK,
        });
      y -= 34;
    };
    lineY("Inventor:", inv.legal_name || "");
    lineY("Signature:", "");
    lineY("Date:", "");

    y -= 8;
    draw(
      "Sign and date above by hand (or apply your USPTO S-signature), then upload the signed copy in Pincite. Pincite does not file for you.",
      font,
      9,
      4,
    );
  }

  return await doc.save();
}
