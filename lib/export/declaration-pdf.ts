/**
 * Build the inventor's declaration (37 CFR 1.63 / PTO-AIA-01 style) as a one-page-per-inventor
 * PDF - the actual document the inventor signs by hand and uploads back into Pincite, which
 * then bundles it into the filing package. The signature placed on this document is the only
 * operative signature; Pincite never asks for one in-app. Pure pdf-lib, no native dependency.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DECLARATION_STATEMENTS } from "@/lib/export/filing-package";
import { sanitizeOutputText } from "@/lib/text/sanitize";

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
    for (const word of sanitizeOutputText(text).split(/\s+/)) {
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
    draw(`Title of the invention ${title.trim() || "[not provided]"}`, font, 11, 14);
    draw("As a named inventor in the above identified application, I declare that", font, 11, 10);

    DECLARATION_STATEMENTS.forEach((s, i) => {
      y -= 2;
      page.drawText(`${i + 1}.`, { x: margin, y, size: 11, font, color: BLACK });
      for (const ln of wrap(s, font, 11)) {
        page.drawText(ln, { x: margin + 18, y, size: 11, font, color: BLACK });
        y -= 11 + 5;
      }
      y -= 4;
    });

    y -= 6;
    draw(
      "My residence and mailing address are as stated for me in the Application Data Sheet (37 CFR 1.76) filed with this application.",
      font,
      11,
      10,
    );

    y -= 18;
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
    lineY("Inventor", inv.legal_name || "");
    lineY("Signature", "");
    lineY("Date", "");

    y -= 8;
    draw(
      "Sign and date above, then upload the signed copy in Pincite. Pincite does not file for you.",
      font,
      9,
      4,
    );
  }

  return await doc.save();
}

/**
 * Build a power of attorney (PTO/AIA/82 style, 37 CFR 1.32) for an attorney/agent to download,
 * have the applicant sign, and upload. The practitioner is appointed to prosecute; the
 * applicant signs. This is the attorney's document, distinct from the inventor's oath.
 */
export async function buildPoaPdf(opts: {
  title: string;
  applicant: string;
  practitioner: string;
}): Promise<Uint8Array> {
  const { title, applicant, practitioner } = opts;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 612;
  const H = 792;
  const margin = 72;
  const maxW = W - margin * 2;
  const page = doc.addPage([W, H]);
  let y = H - margin;

  const wrap = (text: string, f: typeof font, size: number): string[] => {
    const out: string[] = [];
    let line = "";
    for (const word of sanitizeOutputText(text).split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > maxW && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  };
  const draw = (text: string, f: typeof font, size: number, gap = 6) => {
    for (const ln of wrap(text, f, size)) {
      page.drawText(ln, { x: margin, y, size, font: f, color: BLACK });
      y -= size + gap;
    }
  };

  draw("POWER OF ATTORNEY (37 CFR 1.32)", bold, 14, 12);
  draw(`Title of the invention ${title.trim() || "[not provided]"}`, font, 11, 14);
  draw(
    `The undersigned applicant, ${applicant.trim() || "[applicant]"}, hereby appoints ${practitioner.trim() || "the registered practitioner of record"} to prosecute the above-identified application and to transact all business in the United States Patent and Trademark Office connected with it.`,
    font,
    11,
    14,
  );
  draw(
    "The applicant requests that all correspondence be directed to the appointed practitioner.",
    font,
    11,
    18,
  );

  const lineY = (label: string, value: string) => {
    page.drawText(label, { x: margin, y, size: 11, font, color: BLACK });
    page.drawLine({
      start: { x: margin + 130, y: y - 2 },
      end: { x: W - margin, y: y - 2 },
      thickness: 0.75,
      color: BLACK,
    });
    if (value)
      page.drawText(value, { x: margin + 136, y: y + 2, size: 11, font, color: BLACK });
    y -= 34;
  };
  lineY("Applicant", applicant.trim() || "");
  lineY("Signature", "");
  lineY("Title if juristic", "");
  lineY("Date", "");

  y -= 8;
  draw(
    "Sign and date above, then upload the signed copy in Pincite. The practitioner signs prosecution papers separately as the registered practitioner of record.",
    font,
    9,
    4,
  );
  return await doc.save();
}
