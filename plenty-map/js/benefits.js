/* Benefit figures, with where each comes from. Checked 2026-11-18. Update every October (SNAP)
   and every spring (poverty guidelines, WIC). The quick check runs on the phone and is never saved. */

export const AS_OF = "2026-11";

/* USDA FNS, SNAP FY2027 cost-of-living adjustments, 48 states + DC (Oct 1 2026 to Sep 30 2027)
   https://www.usda.gov/sites/default/files/guidance-documents/fna.snap-cola2027.pdf */
const MAX = [306, 562, 808, 1023, 1217, 1463, 1616, 1841], MAX_ADD = 225;

/* HHS 2026 poverty guidelines, 48 states + DC: $15,960 plus $5,680 per extra person (annual). */
const FPL_BASE = 15960, FPL_ADD = 5680;
export const fplMonth = n => (FPL_BASE + FPL_ADD * (Math.max(1, n) - 1)) / 12;

export const SNAP = {
  max: n => n <= 8 ? MAX[Math.max(1, n) - 1] : MAX[7] + (n - 8) * MAX_ADD,
  /* California uses broad-based categorical eligibility: gross income up to 200% of poverty.
     (CDSS CalFresh income guidelines.) Households with someone 60+ or disabled who are over that
     can still qualify on the net income test, so we say "maybe" instead of "no". */
  grossLimit: n => Math.round(fplMonth(n) * 2),
};
/* WIC: 185% of poverty, May 1 2026 to Jun 30 2027 (USDA WIC income eligibility guidelines).
   Anyone on Medi-Cal, CalFresh or CalWORKs meets the income rule automatically. */
export const WIC = { limit: n => Math.round(fplMonth(n) * 1.85) };
/* SUN Bucks (Summer EBT), California 2026: $120 per child. CDSS SUN Bucks FAQ. */
export const SUN_BUCKS = 120;

export const LINKS = {
  calfresh_apply: "https://benefitscal.com/",
  getcalfresh: "https://www.getcalfresh.org/",
  wic: "https://myfamily.wic.ca.gov/",
  sunbucks: "https://www.cdss.ca.gov/sunbucks",
  sd211: "https://211sandiego.org/",
  sdfb: "https://www.sandiegofoodbank.org/get-food/",
  fsd: "https://feedingsandiego.org/find-food/",
  ais: "https://www.sandiegocounty.gov/content/sdc/hhsa/programs/ais/Older-Adults/Meals-Senior-Dining.html",
  marketmatch: "https://marketmatch.org/",
  rmp: "https://www.sandiegocounty.gov/hhsa/programs/ssp/restaurant_meals_program/",
  hr1: "https://cdss.ca.gov/benefits-services/food-nutrition-services/calfresh/frequently-asked-questions",
};
export const PHONES = {
  sd211: "211",
  sdfb: "866-350-3663",
  fsd: "858-452-3663",
  county: "866-262-9881",   // San Diego County Access Customer Service Center (CalFresh)
  ais: "800-339-4661",      // Aging & Independence Services (meals for 60+)
  wic: "888-942-9675",      // California WIC
  sunbucks: "877-328-9677", // SUN Bucks helpline
};
