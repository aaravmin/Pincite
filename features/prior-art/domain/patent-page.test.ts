import { describe, expect, it } from "vitest";
import { parsePatentPage } from "@/features/prior-art/domain/patent-page";

const BASE = { number: "US1234567B2", url: "https://patents.google.com/patent/US1234567B2/en" };
const IMG = "https://patentimages.storage.googleapis.com/ab/cd";

describe("parsePatentPage", () => {
  it("prefers the DC.title meta tag over the document title", () => {
    const html = `<title>US1234567B2 - Insulated container - Google Patents</title>
      <meta name="DC.title" content="Insulated beverage container"/>`;
    expect(parsePatentPage(html, BASE).title).toBe("Insulated beverage container");
  });

  it("falls back to the document title, stripped of its Google Patents furniture", () => {
    const html = "<title>US1234567B2 - Insulated container - Google Patents</title>";
    expect(parsePatentPage(html, BASE).title).toBe("Insulated container");
  });

  it("decodes html entities and collapses whitespace", () => {
    const html = '<meta name="DC.title" content="Lid &amp;  handle&#39;s mount"/>';
    expect(parsePatentPage(html, BASE).title).toBe("Lid & handle's mount");
  });

  it("takes the abstract from description, then DC.description", () => {
    expect(
      parsePatentPage('<meta name="description" content="An abstract."/>', BASE).abstract,
    ).toBe("An abstract.");
    expect(
      parsePatentPage('<meta name="DC.description" content="Fallback."/>', BASE).abstract,
    ).toBe("Fallback.");
  });

  it("dedupes figure sheets by figure number and orders them numerically", () => {
    const html = `<img src="${IMG}-D00002.png"><img src="${IMG}-D00010.png">
      <img src="${IMG}xx-D00002.png"><img src="${IMG}-D00001.png">`;
    expect(parsePatentPage(html, BASE).figureUrls).toEqual([
      `${IMG}-D00001.png`,
      `${IMG}-D00002.png`,
      `${IMG}-D00010.png`,
    ]);
  });

  it("falls back to a single patent image when no figure sheets are numbered", () => {
    const html = `<img src="${IMG}/thumbnail.png">`;
    expect(parsePatentPage(html, BASE).figureUrls).toEqual([`${IMG}/thumbnail.png`]);
  });

  it("returns no figures when the page has none", () => {
    expect(parsePatentPage("<html></html>", BASE).figureUrls).toEqual([]);
  });

  it('collects inventors, dropping the "Individual" placeholder, capped at six', () => {
    const names = ["Ada L", "Individual", "Bo K", "Cy R", "Di S", "Ed T", "Fi U", "Gu V"];
    const html = names
      .map((n) => `<meta name="DC.contributor" content="${n}" scheme="inventor"/>`)
      .join("");
    expect(parsePatentPage(html, BASE).inventors).toEqual([
      "Ada L",
      "Bo K",
      "Cy R",
      "Di S",
      "Ed T",
      "Fi U",
    ]);
  });

  it("keeps the caller's number and url and never invents content", () => {
    const d = parsePatentPage("<html></html>", BASE);
    expect(d.number).toBe(BASE.number);
    expect(d.url).toBe(BASE.url);
    expect(d.title).toBeNull();
    expect(d.abstract).toBeNull();
    expect(d.inventors).toEqual([]);
  });
});
