# Team licenses and sponsored seats

**For:** Roselen, who signs off on this capability, and Ali, who approves seat allocation and pricing. **Capability:** `sales.team_license_and_sponsored_seat_administration`, first release (autonomy:R2). Allocation and pricing stay a human decision, always.

## What it does

Vick explains three things. It never prices, allocates, redeems or reassigns a seat.

1. **The team-license tiers, with their prices.**
2. **How an employee redeems a seat**, step by step from the platform code.
3. **The state of a named sponsor's seat block:** seats purchased, codes issued, and how many are redeemed, available, reassigned or expired. It gives counts only, never names or codes.

## Prices: only from the approved source, and only when every copy agrees

The platform already has an approved source for public prices: the **claims registry** (`claimsRegistry.ts`). A price there only shows on a page if it's marked verified. Vick quotes a team-license price only when:
- its registry entry is verified, **and**
- every other copy of that price on the platform says the same.

If any copy disagrees, Vick says the price is **unknown** and names both copies, rather than picking one.

| Tier | Seats | Price | Source |
|---|---|---|---|
| Team | 5 to 14 | **$1,200** per seat, per year | `claimsRegistry.ts:486-495` |
| Department | 15 to 49 | **$950** per seat, per year | `claimsRegistry.ts:497-506` |
| Enterprise | 50 or more | Scoped on a call | `claimsRegistry.ts:508-517` |

**Today every copy agrees:** the sponsorship page (`SponsorshipPage.tsx:176`, `:183`) and the pricing page's "from $950" (`PricingPage.tsx:22`). The retired $4,500 and the old "$1,788 per seat" are marked do-not-publish in the registry, and Vick refuses to quote them.

Two things worth knowing:
- **The sponsorship page types its prices in directly** rather than reading the registry. So the registry's checks don't apply there, and its list of pages allowed to show these prices doesn't include `/sponsorship`. The figures match today, but nothing keeps them matching. That's for Kes.
- **The registry last checked these prices on 7 August.** If team prices have changed since, the registry needs updating first. Vick will follow it.

## What I found in redemption

The core guards work. Each code is unique, the seat is locked while it's redeemed, and a second attempt with the same code gets the same enrolment back, not a new one. Two gaps:

1. **Redemption doesn't check whether the sponsor has paid.** A code from a sponsor whose invoice is pending or cancelled still creates a **paid** enrolment (`sponsorController.ts:207-228`). Vick flags any sponsor in that state who still has unredeemed codes.
2. **Nothing in the platform creates seat codes.** They're added by hand, so "never more redemptions than seats bought" depends on whoever adds them. Production has one sponsor with 25 seats bought and no codes at all (`dayNinetyReportService.ts:76-80`), so none of those 25 can be redeemed yet. Vick reports both too few codes and too many.

3. **The public redemption form tells a stranger more than it should.** No sponsor has codes yet, so nothing has been exposed, but it should be fixed before the first code goes out:
   - an expired code gets a different message from a made-up one, so someone guessing learns which codes are real;
   - a code someone already used answers "welcome back" with that person's internal enrolment id, without checking it's the same person;
   - if a used code's enrolment has been deleted, the code works again for anyone;
   - unlike the other sponsor forms, it has no limit on how many attempts one address can make (`enrollmentRoutes.ts:20`).

How to fix 1 to 3, issue codes safely, and the tests that prove it are in the revised specification for Kes: [REDEMPTION_SPEC_FOR_KES.md](REDEMPTION_SPEC_FOR_KES.md).

Also: an old sponsorship kit document in the code (`frontend/src/docs/CorporateSponsorshipKit.md`) still says **$4,500 per participant**. As far as I can find, nothing shows it or emails it; the kit email has no prices. It should be deleted or marked retired so nobody reuses it.

## What I need

- **Ali:** which sponsor billing states should allow codes to be issued and redeemed? My suggestion: paid and invoiced yes, pending and cancelled no. Who adds seat codes for the 25-seat sponsor? The other open decisions are listed at the end of the spec.
- **Roselen:** when a sponsor asks about prices, are the registry figures ($1,200 and $950) still right? And do sponsors usually name all their employees when they buy, or add people over time?
- **Kes:** check the spec's list of how the redemption form can end, and size the fix.

Code: [teamLicenses.js](teamLicenses.js). Tests: [teamLicenses.test.js](teamLicenses.test.js), 7 tests. Registry entries and price copies, copied from the platform: [fixtures/sources.json](fixtures/sources.json).
