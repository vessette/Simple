# Recurring reporting: what has to be written down before anything moves to Vick

**For:** Roselen and Taiwo, who do or know the reporting, and Ali, who set this requirement. **Capability:** `sales.da_revenue_reporting_transition`, first release (autonomy:R0). **Not done:** this release needs a duty list written from an interview, and that interview hasn't happened.

## Two things already known that change this story

1. **"DA" means the Data Analytics bootcamp, not a Data Analyst role.** Ali confirmed this on 10 November (`docs/discovery/03-role-and-da-transition.md:10`). This story's title, "Data Analyst … duties transitioning to AI", is the reading Ali corrected. **Ali:** the plan's wording should change at the source. Is this story about the recurring sales and enrolment *reports*, or should it be retired?
2. **The recurring reporting belongs to Taiwo in the sources, not Roselen** (`03-role-and-da-transition.md:17`). So the interview needs **both** of them.

## What the story asks for

A written list of the recurring reporting duties, from an interview. For each duty, at least one named report, and for each report a named data source, or an honest **"unsourced"**. Until that list exists, the capability's scope is **unknown**, and Vick says so rather than guessing.

## What's prepared for the interview

A draft with four **candidate** reports, taken from Taiwo's brief. None is confirmed:

| Duty | Candidate report | Data source (as far as I can find) |
|---|---|---|
| Daily enrolment reporting | Daily enrolment dashboard | The enrolments roster (`GET /api/admin/enrollments`) |
| Cohort progress | Weekly cohort progress | **Unsourced**: no platform source found |
| Subscriptions and revenue | Monthly subscription and MRR trends | The revenue page's subscriptions data (`GET /api/admin/revenue/subscriptions`) |
| Cohort retrospective | End-of-cohort retrospective | **Unsourced** |

There's also a check (`dutyList.js`) that says mechanically whether a list meets the story's bar. A test proves the draft does **not** pass, because nobody has been interviewed.

## The interview: about 20 minutes, Roselen and Taiwo

For each recurring report either of you produces or receives:
1. **What is it called, and what question does it answer?**
2. **Who does it today, and how long does it take?**
3. **Where does the data come from?** A screen, an export, a spreadsheet, or "I put it together by hand".
4. **Who receives it, how often, in which timezone, and how?** (Email, a meeting, Basecamp.)
5. **Should it stay with a person, move to Vick as a draft for you to check, or be split?**
6. **Who checks it before it goes out?**

And two closing questions:
- **Are the four candidate reports above still produced?**
- **Is there anything you report on regularly that isn't on the list?**

Answers go straight into `dutyList.json`, with who was interviewed and when. When the check passes, the scope becomes known, and only then can anyone propose which reports Vick drafts.

## What I need

- **Ali:** reword or retire this story, given that "DA" means the bootcamp.
- **Roselen and Taiwo:** 20 minutes together for the questions above. It could fit into the existing Wednesday check-in.

Code: [dutyList.js](dutyList.js). Tests: [dutyList.test.js](dutyList.test.js), 5 tests. The draft: [dutyList.json](dutyList.json).
