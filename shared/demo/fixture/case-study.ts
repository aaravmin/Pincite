/**
 * The demo matter, as text: Apple's molded fiber food container, US 2012/0024859 A1
 * (inventors Francesco Longoni and Mark E. Doutt, assigned to Apple Inc.). It is the same
 * public case study the README screenshots and e2e/casestudy.spec.ts use, kept mid-review on
 * purpose so the deterministic checks have real findings to show: claim 4 refers to a claim
 * that does not exist, claim 5 is a cumulative multiple dependent claim, claim 3 uses relative
 * terms, and the disclosure names a carrying handle the draft never describes.
 *
 * The detailed description is the reference-numeral version from e2e/casestudy-drawing.spec.ts,
 * which names most of FIG. 1's numerals and omits 16, 44, 46, and 54, so the drawing check
 * circles only the undescribed ones.
 *
 * SINGLE SOURCE OF TRUTH. scripts/build-demo-fixture.mjs turns this into
 * shared/demo/fixture/matter.json (rows, findings, prior-art spans), and the drift test in
 * shared/demo/fixture.test.ts fails when the JSON and this file disagree. Public text only.
 */

export const CASE_STUDY_PROJECT_NAME = "Apple molded fiber food container";

export const CASE_STUDY_APPLICANT = {
  applicant_name: "Apple Inc.",
  applicant_is_inventor: false,
  applicant_is_juristic: true,
  entity_status: "large",
} as const;

export const CASE_STUDY_CLAIMS =
  "1. A molded fiber container suitable for containing a food item, comprising: a base, the base comprising a plurality of ridges integrated with an interior surface of the base, wherein when the food item is placed on at least some of the plurality of ridges, a gap is formed between the food item and the interior surface of the base, the gap assisting in thermally isolating the food item and allowing moisture expelled from the food item to be transported away from the food item; and a lid, the lid comprising a plurality of openings arranged in accordance with at least some of the plurality of ridges, and a moisture channeling feature integrally formed in the lid, the moisture channeling feature cooperating with at least some of the plurality of openings and the gap to provide a path by which at least some of the moisture is transported out of the container.\n" +
  "2. The container of claim 1, wherein the base and the lid are integrally formed from a single piece of molded fiber connected by a hinge.\n" +
  "3. The container of claim 1, wherein the plurality of ridges are arranged substantially concentrically about a center of the base.\n" +
  "4. The container of claim 6, wherein the plurality of openings comprise a plurality of slots.\n" +
  "5. The container of claims 1 and 2, wherein the base and the lid are shaped to nest with a second container.";

/** Section key -> text. Only the sections the case study fills; the rest read as "". */
export const CASE_STUDY_SECTIONS: Record<string, string> = {
  title: "Container",
  background:
    "Food is often delivered in closed containers that trap steam and make the food soggy. These containers also take up storage space when they are empty.",
  summary:
    "A single piece molded fiber container has a ridged base and a vented lid that carry steam away from the food, and the containers nest to save space.",
  detailed_description:
    "The container 10 comprises a lid 12 and a base 24 joined by a hinge 38. The lid 12 carries concentric ridges 14, 18, 20, and 22, an outer rim 26, and a sidewall 28. The base 24 has an interior surface 30, a plurality of vent openings 32, a central hub 34, support recesses 36, and a moisture channeling feature 40 cooperating with channels 42 and a drain 48. A closure tab 50 and a catch 52 hold the lid 12 to the base 24.",
  abstract:
    "A container is constructed in a preformed manner so no assembly is required. A lid is coupled to the base through a hinge so the container is made from a single piece of material. The base and lid nest with a second container to save storage space. The container can be made from molded fiber. Ridges in the base lift the food and a vented lid carries moisture away to keep the food from getting soggy.",
  claims: CASE_STUDY_CLAIMS,
};

export const CASE_STUDY_DISCLOSURE = {
  field_industry: "Food packaging and containers.",
  problem_solved:
    "Hot food in a closed container traps steam and gets soggy. Empty boxes also waste storage space.",
  how_it_works:
    "A single piece of molded fiber forms a ridged base and a hinged lid. The ridges lift the food and create a gap. Openings and a moisture channeling feature in the lid carry the steam out.",
  components:
    "molded fiber base\nintegrated ridges\nhinged lid\nlid openings\nmoisture channeling feature\ncarrying handle",
  advantages:
    "Less soggy food. Nesting saves storage space. Made from recycled molded fiber.",
  alternatives:
    "The ridges can be concentric or radial. The openings can be holes or slots.",
  known_prior_art:
    "Square corrugated pizza boxes. Vented plastic clamshell containers.",
};

export const CASE_STUDY_INVENTORS = [
  {
    legal_name: "Francesco Longoni",
    residence: "Cupertino, CA",
    mailing_address: "1 Apple Park Way, Cupertino, CA 95014",
    citizenship: "",
  },
  {
    legal_name: "Mark E. Doutt",
    residence: "Cupertino, CA",
    mailing_address: "1 Apple Park Way, Cupertino, CA 95014",
    citizenship: "",
  },
];

/**
 * The public patent the case study compares against (a molded fiber container lid), with
 * the text the compare form is given. The pinpoint overlaps in the fixture are the pure
 * matcher's output over this text and the claims above.
 */
export const CASE_STUDY_COMPARISON = {
  patentNumber: "US20060213916A1",
  sourceUrl: "https://patents.google.com/patent/US20060213916A1/en",
  text:
    "A container lid formed of molded cellulose fiber for mating with a base container to hold food items. The lid includes a body with a main portion and a perimeter, and a skirt extending substantially around the perimeter to engage the base.",
};
