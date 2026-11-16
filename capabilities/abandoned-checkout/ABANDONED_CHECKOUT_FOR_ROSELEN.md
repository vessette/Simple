# Abandoned checkouts: who started paying and stopped

**For:** Roselen, who signs off on this capability, and Taiwo (admissions). **Capability:** `sales.abandoned_checkout_identification`, first release (autonomy:R2).

## What it does

Give Vick one person's row from the enrolments roster, and it says whether that person is an abandoned checkout and why. It always names the two things that decide it: their **payment status** and their **latest subscription status**. You can check both on the roster yourself.

It contacts nobody and changes nothing. Calling or emailing the people on the list stays with a person.

## How it decides

The rule is the platform's own (`enrollmentPaymentFilter.ts:38-39`). Vick explains it rather than inventing a new one.

| Payment status | Latest subscription | Vick says | Why |
|---|---|---|---|
| pending | pending | **Abandoned checkout**, with the date it started | They started a checkout and didn't pay |
| pending | none | **Excluded: free Explorer signup** | A checkout always creates a subscription row; an Explorer signup never does |
| paid | pending | **Excluded: paid former member** | They paid before; the pending row is a renewal checkout. Not a prospect |
| paid | anything else | **Excluded: paid** | |
| pending | failed, canceled, active or past due | **Not an abandoned checkout** | Shown on "Not paid (any)" only |
| pending invoice or failed | any | **Not an abandoned checkout** | Only "pending" can be one |
| missing, or a value the platform doesn't define | any | **Unknown** | Vick doesn't guess |

When a payment is later linked to an abandoned checkout, the platform marks the person paid (`appPaymentReconcileService.ts:463`), and they drop off the list.

## Two lists

- **Abandoned checkouts**, oldest checkout first. These are the people to call.
- **Not paid (any)**, which also includes Explorer signups and failed checkouts. This matches the roster's own filter.

## One thing I noticed

If a person's payment status is missing, the roster's filter leaves them off every list, but its badge shows them as **"Failed"** (`enrollmentPaymentFilter.ts:66`). Neither tells you the real state. Vick says "unknown" and asks for the row to be checked. I'll raise it with Kes as a small platform fix.

## What I need from you

- **Roselen:** check the table above matches how you'd judge it by hand. Are there any other cases you've seen on a real list that it misses?
- **Taiwo:** is the checkout start date the date you'd want on the call list, or the date of their last activity?

Code: [checkoutExplainer.js](checkoutExplainer.js). Tests: [checkoutExplainer.test.js](checkoutExplainer.test.js), 9 tests. Example rows (made up, P1 to P7): [fixtures/roster.json](fixtures/roster.json).
