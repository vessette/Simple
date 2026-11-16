// Team licenses and sponsored seats, autonomy:R2.
// Capability: sales.team_license_and_sponsored_seat_administration. Read-only and a human
// decision forever: Vick explains the tiers, how redemption works and the state of a named
// sponsor's seat block. It never prices, allocates, redeems or reassigns a seat.
//
// Prices: the approved source is the platform's claims registry (claimsRegistry.ts), whose
// gate only lets VERIFIED or OWNER_ATTESTED claims render. Vick quotes a price only when
// its claim passes that gate AND every known copy of it on the platform agrees. A copy that
// disagrees makes the price unknown, with the disagreement, never a guess between them.
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ 62c4bde (main, 16 Nov 2026).
//   claims registry   frontend/src/config/claimsRegistry.ts:23-47, :486-543, :758
//   tiers             frontend/src/pages/SponsorshipPage.tsx:172-195
//   redemption        backend/src/controllers/sponsorController.ts:155-260
//   models            backend/src/models/Sponsor.ts:22-32; SponsorSeat.ts:21-29, :81

const PUBLISHABLE = Object.freeze(['VERIFIED', 'OWNER_ATTESTED']);
const amountsIn = (s) => (String(s).match(/\$\s?\d[\d,]*(?:\.\d+)?/g) || []).map((m) => Number(m.replace(/[$,\s]/g, '')));

function validateSources(src) {
  if (!src || !Array.isArray(src.claims) || !Array.isArray(src.copies)) throw new RangeError('Sources need claims and copies arrays.');
}

/**
 * A price, quoted only if its claim is publishable and every copy agrees with it.
 * Returns { status: 'quoted' | 'unknown' | 'refused', ... }.
 */
export function quotePrice(key, src) {
  validateSources(src);
  const claim = src.claims.find((c) => c.key === key);
  if (!claim) return { key, status: 'unknown', price: null, why: `"${key}" is not in the claims registry, so there is no approved source.` };
  if (!PUBLISHABLE.includes(claim.verification)) {
    return { key, status: 'refused', price: null, why: `The registry marks this ${claim.verification}; it may not be quoted (${claim.cite}).` };
  }
  const approved = amountsIn(claim.publicWording);
  const copies = src.copies.filter((c) => c.claim === key);
  const disagree = copies.filter((c) => {
    const got = amountsIn(c.value);
    return got.length !== approved.length || got.some((v, i) => v !== approved[i]);
  });
  if (disagree.length) {
    return {
      key, status: 'unknown', price: null,
      why: `Unreconciled: the registry says "${claim.publicWording}" (${claim.cite}) but ${disagree.map((d) => `${d.where} says "${d.value}"`).join('; ')}. Vick does not choose between them.`,
    };
  }
  return { key, status: 'quoted', price: claim.publicWording, source: claim.cite, verified: claim.lastVerifiedAt, copies_agreeing: copies.map((c) => c.where) };
}

/** The tiers, with each price through quotePrice. Seat ranges are not prices. */
export function tiers(src) {
  validateSources(src);
  if (!Array.isArray(src.tiers)) throw new RangeError('Sources need a tiers array.');
  return src.tiers.map((t) => {
    const q = quotePrice(t.claim, src);
    return { name: t.name, seats: t.seats, unit: t.unit, price: q.status === 'quoted' ? q.price : null, price_status: q.status, price_source: q.source || null, why: q.why || null, cite: t.cite };
  });
}

/** How redemption works, step by step, from the platform code. No prices. */
export const REDEMPTION = Object.freeze([
  { step: 'The sponsor buys a block of seats; each seat is a row with its own redemption code.', cite: 'SponsorSeat.ts:21-29, :81 (code unique)' },
  { step: 'An employee enters a code on the public redemption form; the input is validated first.', cite: 'sponsorController.ts:160-163' },
  { step: 'The seat row is locked for the transaction, so two redemptions of one code cannot both succeed.', cite: 'sponsorController.ts:173-180' },
  { step: 'An unknown code is refused; an expired or reassigned seat is refused.', cite: 'sponsorController.ts:182-188' },
  { step: 'A code already redeemed returns the same enrolment again rather than making a second one.', cite: 'sponsorController.ts:190-205' },
  { step: "Otherwise an enrolment is created in the open sponsor cohort, marked paid, and the seat is marked redeemed and bound to it.", cite: 'sponsorController.ts:219-245' },
]);

const SEAT_STATES = Object.freeze(['available', 'redeemed', 'reassigned', 'expired']);

/**
 * The state of one sponsor's seat block, from the sponsor row and its seat rows. Counts only:
 * no names, no codes, no prices. Flags what a person should look at.
 */
export function seatBlock(sponsor, seats) {
  if (!sponsor || typeof sponsor !== 'object' || !Number.isInteger(sponsor.seats_purchased) || sponsor.seats_purchased < 0) throw new RangeError('A sponsor row with a whole seats_purchased is required.');
  if (!Array.isArray(seats)) throw new RangeError('seats must be the sponsor\'s seat rows (an empty array if none).');
  const counts = Object.fromEntries(SEAT_STATES.map((s) => [s, 0]));
  const unknownState = [];
  for (const s of seats) {
    if (!s || s.sponsor_id !== sponsor.id) throw new RangeError('Every seat row must belong to this sponsor.');
    if (SEAT_STATES.includes(s.status)) counts[s.status] += 1; else unknownState.push(s.status);
  }
  const flags = [];
  const codes = seats.length;
  if (codes < sponsor.seats_purchased) flags.push(`${sponsor.seats_purchased - codes} of ${sponsor.seats_purchased} purchased seats have no redemption code yet, so nobody can redeem them. No code in the platform creates seat codes; someone adds them by hand.`);
  if (codes > sponsor.seats_purchased) flags.push(`Over-allocated: ${codes} seat codes exist for ${sponsor.seats_purchased} purchased seats. Nothing in the platform enforces the limit at redemption.`);
  if (sponsor.billing_status !== 'paid' && counts.available > 0) flags.push(`The sponsor's billing status is "${sponsor.billing_status}", but redemption does not check it: these ${counts.available} available codes would still create paid enrolments (sponsorController.ts:207-228).`);
  if (unknownState.length) flags.push(`${unknownState.length} seat row(s) have a status the platform does not define: ${[...new Set(unknownState)].join(', ')}.`);
  return { sponsor: sponsor.company_name || sponsor.id, purchased: sponsor.seats_purchased, codes_issued: codes, ...counts, billing_status: sponsor.billing_status ?? null, flags, decision_owner: 'A person: allocating, reassigning or adding seats is a human decision.' };
}
