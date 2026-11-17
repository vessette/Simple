# Offer packets for you to price and send

**For:** Roselen, who sets prices and sends, and Ali, who approves. **Capability:** `sales.quote_and_offer_packet_preparation`, first release (autonomy:R1). **A human decision, always:** Vick assembles a draft packet, and a person sets any price and sends it.

## What it does

Given a request (an individual, or an employer with a seat count), Vick puts together a draft offer packet from approved material only:
- what the program is;
- the **published price**: $149/mo billed annually for an individual, or the published team tier per seat;
- what participants pay on top for their own tools (Anthropic about $20/mo, API usage under $10/mo).

It also lists **everything it can't state**, so nothing is answered by guesswork:
- refund and cancellation terms (still pending approval);
- start dates (the ones on file have passed);
- prices for 50 or more seats (scoped on a call) or fewer than 5 (not a team tier);
- **anything the buyer asked for** that isn't in the approved terms, such as a discount.

**It never:**
- works out a total (a total for 20 seats is a price you set);
- offers a discount or a custom price;
- sends anything.

This first release runs only on made-up requests.

## Example (made-up employer asking for 20 seats and a discount)

> Offer packet for Employer B: the AI Systems Architect Accelerator.
>
> The membership is the full 12-week, project-based program: all four Architect Intensives, certification prep, an internship experience and guided portfolio projects.
>
> For 20 seats, the published Department tier is $950 per seat, per year. The total, and any terms, are set by Roselen.
>
> On top of the membership, each participant pays their own tools directly: an Anthropic subscription for Claude Code (about $20/mo) and LLM API usage on their own key (most projects under $10/mo).

**For you to decide (not in the packet):**
- refund and cancellation terms;
- the requested "discount for 20 seats";
- start dates.

## What fails the check

Four named tests, as the story requires. A packet fails if it contains:

| | Example that fails |
|---|---|
| **A discount** | "10% discount", "15% off", "special price", "we'll waive the first month" |
| **A bespoke price** | "$129/mo", "$900 per seat", or any total not in an approved source |
| **A refund term** | "Full refund within 14 days" |
| **The word "free"** | "Your first week is free" (Texas rule 40 TAC 807.172(d)) |

**Where prices come from:**
- the membership price from the Sales Hub facts, which match the platform's price setting;
- team prices from the approved claims registry, and **only when every copy on the platform agrees**. If a copy disagrees, the packet leaves the price out and flags it for you.

## What I need from you

1. **Team offers:** the brief notes that approved terms for team or custom offers aren't written down. What would you normally include beyond the per-seat price, such as payment terms or seat reassignment?
2. **Monthly plan:** packets quote the annual price only, per Ali's rule that month-to-month is offered on pushback. Should a packet ever mention the monthly option?

Code: [quotePacket.js](quotePacket.js). Tests: [quotePacket.test.js](quotePacket.test.js), 9 tests. Made-up requests: [fixtures/requests.json](fixtures/requests.json).
