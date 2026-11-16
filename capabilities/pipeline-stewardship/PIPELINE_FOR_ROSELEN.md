# Pipeline stages, lead temperature and the forecast

**For:** Roselen, who signs off on this capability, plus Taiwo (admissions) and Ali. **Capability:** `sales.pipeline_stage_and_lead_temperature_stewardship`, first release (autonomy:R2).

## What it does

Vick explains, without changing anything:
- **Where a named lead sits** in the pipeline.
- **What that lead's temperature is based on:** its recent activity, or a manual setting by an admin.
- **What the pipeline stats say:** leads per stage.
- **What the forecast says,** as a number of **expected enrolments**, never as money.

Every figure comes from a named platform endpoint and field, so you can check it.

## The forecast is a count, not revenue

The forecast page multiplies expected enrolments by **$4,500** to show "projected revenue" and "pipeline value" (`opportunityScoringService.ts:18`, `:394-403`). $4,500 is a retired price that nobody has ever paid. And a projection isn't money collected anyway. So Vick reports the forecast only as expected enrolments, and refuses the dollar figures, even when asked for them directly.

The expected enrolments are themselves assumptions. They're the number of leads at each level times a fixed conversion rate: 2% for cold prospects up to 75% for ready-to-close (`:38-44`). Those rates aren't measured. Vick says so.

## Temperature: "unknown" when there's no activity

The platform works out temperature from a lead's last 90 days of interactions (`leadClassificationService.ts:36-73`). A lead with **no** interactions scores 0, which the platform shows as **cold**. That makes a lead nobody has contacted look the same as one who went quiet.

Vick reports that case as **unknown**, not cold. When the temperature was set by hand, Vick says so, and gives the date.

## Things worth knowing

- **The "new lead" count is inflated.** The stats add any lead with a blank or unrecognised stage to "new lead" (`leadService.ts:704-717`). Vick passes the number on but says so.
- **Automatic stage moves only go forward** (`pipelineService.ts`), so a recompute never moves a stage back. But if you move a lead *back* by hand, an automatic trigger such as a campaign email sent can move it forward again. If that's not what you want, it's a change for Kes.
- **The brief has some details wrong:**
  - the endpoints are `PATCH /api/admin/leads/:id/pipeline` and `GET /api/admin/pipeline/stats`, not `…/pipeline-stage` and `…/leads/pipeline-stats`;
  - the scoring code is `services/opportunityScoringService.ts`, not the `inbox` file of the same name, which scores email;
  - the $4,500 in the forecast is in the opportunity scoring service, not the revenue dashboard. The dashboard's copy was removed.
- **The same $4,500 problem is already on the list.** The revenue guard flagged the Opportunities page for it. Ali decided on 10 September that it should read the price setting and be labelled as an assumption, and that fix hasn't been built yet.

## What I need

- **Roselen:** should a lead you've moved back by hand stay where you put it, even if an automatic email goes out?
- **Ali:** is it time to remove the dollar figures from the forecast page, or build the fix you decided in September?

Code: [pipelineExplainer.js](pipelineExplainer.js). Tests: [pipelineExplainer.test.js](pipelineExplainer.test.js), 7 tests. Example responses (made up): [fixtures/responses.json](fixtures/responses.json).
