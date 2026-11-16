# Every place the platform states a price: inventory and live-vs-archive rule (for review)

**For:** Roselen, who signs off on this capability, and Ali. Kes is copied for the fixes, which are Ali's to approve. **Capability:** `sales.price_statement_consistency_audit`, first release (autonomy:R0): the inventory and the rule, written down for review. Nothing here edits a price; a person decides which number is right.
**Scanned:** platform `main` at `ffc1f09`, 16 November 2026. Re-run with `node scripts/priceInventory.mjs <platform-repo> origin/main`.

## The price of record

| What | Price | Where it's defined |
|---|---|---|
| Membership, annual plan | $149 a month, billed $1,788 a year (worked out from the $149, never typed) | `membershipPrice.ts:44-58` |
| Membership, month-to-month | $199 a month | `membershipPrice.ts:44-58` |
| Team seats | $1,200 per seat a year (5 to 14 seats); $950 (15 to 49) | `claimsRegistry.ts:486-506` |
| Retired | $4,500 per participant, retired 13 July 2026; nobody was ever charged it | `claimsRegistry.ts:519-528` (marked do-not-publish) |

## The rule for "live" versus "archive" (proposed; please confirm)

The brief says this rule is unknown, and that the audit can't be trusted to report "clean" until it's agreed. My proposal:

- **Live:** anything production runs or shows to a person:
  - `backend/src` (except tests and one-off scripts);
  - `frontend/src` (except tests and `frontend/src/docs`);
  - everything served from `frontend/public`.
- **Not live:** it can't quote a price to a prospect, so it's listed but never counted as drift:
  - tests;
  - `docs/` and `frontend/src/docs`;
  - operator scripts (`scripts/`, `backend/src/scripts`);
  - code comments;
  - the capability spec files.
- **Seed files are live with a caveat.** They write content into the database, so their text reaches people only if the rows they seeded are still active. The code alone can't tell us that.

**Question for Roselen and Ali:** does this match what you'd call "live"? In particular, should seed text count as live?

## What the scan found

869 lines that state or derive a price. 241 are in live locations:

| Kind | Live | Meaning |
|---|---|---|
| **Stale ($4,500)** | **23** | States or computes the retired price |
| **Assumed price** | **1** | A private per-enrolment figure matching no price of record ($2,500) |
| Agrees | 136 | Every figure on the line is a price of record |
| Reference | 22 | Reads the price of record (merge tag or import), so it can't drift |
| Source of truth | 18 | The price-of-record files themselves |
| Names $4,500 only to reject it | 2 | Guard code, not a price statement |
| **Unclear, a person should look** | **39** | A dollar figure the audit can't place: mostly other products |

### The 23 stale and 1 assumed (all live)

**The two private constants the brief expects** (the positive control: the audit must find these):
- `opportunityScoringService.ts:18`, `PRICE_PER_ENROLLMENT = 4500` (the forecast and opportunities)
- `strategic-intelligence/scenarioSimulationEngine.ts:25`, `PRICE_PER_ENROLLMENT = 4500` (scenario simulations)

**The setting behind the projections:**
- `settingsService.ts:9`, `price_per_enrollment: 4500` (the default)
- `AdminSettingsPage.tsx:122`, which shows 4500 when the setting is empty

**Cora's knowledge base still offers "pay-in-full $4,500":**
- `inbox/coraKnowledgeBase.ts:31`, `:34`, `:185`, `:186`, `:275`
- `inbox/coraKnowledgeBaseQA.ts:17`, `:21`

**Seeded outreach copy:** live only if those campaigns are still active:
- `seedDefaultSequence.ts:21`, `:93`, `:125`, `:160` ("Program Investment: $4,500 per participant")
- `seedColdOutboundPhases.ts:166`, `:191`, `:273`
- `seedColdOutboundCampaign.ts:49`, `:156`
- `seedAllCampaigns.ts:48`
- `seedAliOutreachCampaign.ts:134`
- `seedOfferCampaigns.ts:410`

**Assumed price:**
- `reporting/coryStrategicSimulationEngine.ts:105`, `REVENUE_PER_ENROLLMENT = 2500`

### The 39 unclear, grouped

- **Other products** (not drift, but worth a person confirming):
  - the AI Pilot's $2,500 (`AIPilotLandingPage.tsx`, `AIPilotVerticalPage.tsx`) and the AIXcelerator's $2,500 and $1,750 (`AIXceleratorLandingPage.tsx`);
  - Alumni Champion commissions (`AlumniChampionPage.tsx`);
  - the design kit's Data Science at $4,500 (`frontend/public/knowledge/design/…`), which is a real price for a different program.
- **Our prices on lines with no wording around them:** `SponsorshipPage.tsx:176`, `:183` ($1,200 and $950, which agree with the registry); `PricingPage.tsx` (three lines); `MembershipLanding.tsx`. These appear to agree; a person can confirm in a minute.
- **Whole data files on one line,** which the scan can't break down: `knowledge/sales/kb-data.js`, `kb-data.json`, `knowledge/kb.json`. The platform's own price check already reads these by meaning rather than by digits (`checkPriceAgreement.js`), so I've left them to that check rather than duplicate it.

### Every location the brief named, today

| Brief's location | Today |
|---|---|
| `subscriptionService.ts:55-80` | Now **imports** the price of record (`:79-80`): reference |
| `salesHubCoryController.ts:28` | States $149 / $199: **agrees** |
| `seedKbData.ts:216` | Uses merge tags (`:221`, `:235`, `:249`): reference |
| `PricingPage.tsx:20-23` | A comment; the live prices further down **agree** |
| `paysimpleService.ts:399` | **Fixed:** now a comment explaining the $4,500 default was removed |
| `revenueDashboardService.ts:11` | **Fixed:** the constant is gone |
| `frontend/public/sales-hub/kb-data.js` | That path no longer exists; the data is at `frontend/public/knowledge/sales/kb-data.js` (one line, see above) |

So the brief's "two stale constants" have moved. The two it named were removed. The two that remain are in the opportunity scoring and scenario simulation services, which matches the platform's own list of known exceptions (`checkPriceAgreement.js:58-61`).

## What I need

- **Roselen and Ali:** confirm or change the live-vs-archive rule above.
- **Ali:** the 23 stale lines are part of your action point 2 from Kes's review (choose the per-enrolment price, then approve removing the $4,500 defaults and Cora's $4,500 text). This inventory is the full list for that change. The seeded outreach copy wasn't on Kes's list: are those campaigns still active?
- **Anyone:** a quick look at the 39 unclear lines, most of which are other products.

Code: [priceInventory.js](priceInventory.js) (the classifier and the rule), [../../scripts/priceInventory.mjs](../../scripts/priceInventory.mjs) (the read-only scan). Tests: [priceInventory.test.js](priceInventory.test.js), 7 tests. The live inventory, as locations and figures only (no platform code is copied, since this repository is public): [fixtures/inventory-ffc1f0932.json](fixtures/inventory-ffc1f0932.json).
