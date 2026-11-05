# Project Standards: Sales, Enrollment & Subscriptions

**Who this is for:** everyone who works on or depends on the Sales, Enrollment & Subscriptions software. That includes engineers, and also the managers, admissions staff and stakeholders who never read code.
**Status:** Draft for team review.

---

## Why we have standards at all

Think of this software as a shared filing system that several people keep at the same time. If everyone labels folders their own way, files things in their own order and leaves no notes, the system still works for a while. Then someone goes on vacation, a customer is charged twice, and nobody can find out why.

Coding standards are the house rules for that filing system. They exist for three reasons:

1. **Anyone can pick up anyone's work.** Code gets read far more often than it gets written. When it all looks the same, a new team member can fix a problem in hours instead of days.
2. **Mistakes in this area cost real money and trust.** This software handles prospective students, enrollments and recurring payments. A bug here can overcharge a customer, lose a lead or enroll someone in the wrong course.
3. **Problems can be traced.** When something goes wrong, clear names, consistent structure and good notes let us find the cause quickly and explain it honestly to the person affected.

The four sections below cover naming, formatting, best practices and documentation. Each one opens with a plain explanation, then lists the rules engineers follow.

---

## 1. Naming Conventions

### In plain terms

Every piece of code has a name, the way every folder in a filing cabinet has a label. A label like `stuff2` tells you nothing. A label like `pendingEnrollments` tells you exactly what's inside.

### Why it matters to the business

- **Fewer misunderstandings.** If one engineer calls someone a "lead", another calls them a "prospect" and a third calls them a "contact", they may be treating the same person three different ways. That is how one person ends up getting three follow-up emails.
- **Faster fixes.** When a manager reports "renewals are failing", an engineer can search for `renewal` and land in the right place straight away.
- **Shared vocabulary.** The words in the code match the words the admissions and sales teams use, so business conversations and technical conversations line up.

### The standards

**Use one agreed word per business concept.** These are the terms for this area. Engineers use these words, and no synonyms:

| Business term | Meaning | Avoid saying |
|---|---|---|
| Lead | A person who has shown interest but has not enrolled | prospect, contact, user |
| Qualified lead | A lead the coordinator has confirmed is viable | hot lead, good lead |
| Enrollment | One person's registration in one course or program | signup, registration, order |
| Subscription | A recurring payment arrangement tied to an enrollment | plan, membership |
| Payment | One money transaction, successful or not | charge, transaction, bill |
| Refund | Money returned against a specific payment | credit, reversal |

When a new business concept comes up, the team agrees on its name **before** anyone writes code for it, and adds it to this table.

**Names describe what something is or does, in full words.**

| Good | Poor | Why |
|---|---|---|
| `enrollmentStartDate` | `esd`, `date1` | Abbreviations force the reader to guess |
| `calculateRefundAmount` | `doRefund`, `process` | The name says exactly what the step produces |
| `isSubscriptionActive` | `flag`, `status2` | Yes/no values read like a question |
| `MAX_PAYMENT_RETRIES` | `n`, `x` | Fixed settings are easy to spot and change |

**Follow the casing style of the language in use.** Casing means how words are joined: `enrollmentDate`, `EnrollmentDate` or `enrollment_date`. Each programming language has a convention, and we follow it rather than inventing our own. The point is consistency, so a reader never has to wonder whether two spellings are two different things.

| Kind of thing | TypeScript / JavaScript | Python |
|---|---|---|
| Values and steps | `camelCase` (`refundAmount`) | `snake_case` (`refund_amount`) |
| Types of record | `PascalCase` (`Enrollment`) | `PascalCase` (`Enrollment`) |
| Fixed settings | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE` |
| File names | `enrollmentService.ts` | `enrollment_service.py` |

**Money and time carry their unit in the name.** `priceInCents` and `trialLengthDays` cannot be misread. A bare `price` could mean dollars or cents, and that one ambiguity is a common cause of customers being charged 100 times too much or too little.

---

## 2. Code Formatting

### In plain terms

Formatting is the layout of the code on the page: spacing, indentation and line length. It's the difference between a contract typed in clean paragraphs and the same contract handwritten in one long block. The words are identical, but one of them is far easier to check.

### Why it matters to the business

- **Reviews catch more mistakes.** Every change is reviewed by a second engineer before it goes live. When layout is consistent, the reviewer sees only what actually changed, and a wrong number or a missing step stands out.
- **No time lost on taste.** An automatic tool settles layout, so engineers don't spend meetings debating where spaces go.
- **Cleaner history.** When code is reformatted by hand, a one-line fix can look like a hundred-line change. That hides the real change from anyone auditing it later.

### The standards

**A formatting tool does the work, not people.** Each codebase has an automatic formatter set up (for example Prettier for JavaScript and TypeScript, or Black for Python). It runs every time code is saved, and again as an automatic check before any change can be merged. If the formatter and a person disagree, the formatter wins.

**A style checker (a "linter") catches risky patterns.** This is like a spell checker that also flags grammar likely to cause misunderstandings. A change that fails the linter is not merged.

**Layout rules the tools enforce:**

- Indentation is consistent across the whole codebase (2 spaces in JavaScript and TypeScript, 4 in Python).
- Lines stay under about 100 characters, so code can be read without scrolling sideways.
- Blank lines separate distinct steps, the way paragraphs separate ideas.
- Related code sits together: everything about refunds lives in the refunds area, not scattered across the project.

**Keep files and steps small.** Each file should handle one responsibility and stay under roughly 300 lines. Each step of logic (a "function") should stay under roughly 50 lines. Small pieces are like short chapters: you can understand one in a single sitting, and you can check it properly.

---

## 3. Best Practices

### In plain terms

These are the habits that keep the software safe, correct and trustworthy. Some apply to any software. Others exist because this area handles people's personal details and their money.

### Why it matters to the business

These rules are the difference between "a customer was charged twice and we found out from an angry email" and "the system refused the duplicate charge and logged it." Each rule below names the problem it prevents.

### The standards

**Never charge, email or enroll twice by accident.**
Networks fail and people double-click. Every action with a real-world effect, such as taking a payment, sending an email or creating an enrollment, must be safe to repeat. The system checks whether the action already happened before doing it again. Engineers call this *idempotency*.
*Prevents:* duplicate charges, duplicate welcome emails, the same person enrolled twice.

**Store money as whole cents, never as decimals.**
Computers store decimal numbers with tiny rounding errors. Over thousands of transactions those errors add up to real discrepancies. Storing $49.99 as `4999` cents avoids that.
*Prevents:* totals that don't match the bank statement.

**Store times in one standard zone, and show them in the reader's zone.**
All dates and times are saved in a single universal format (UTC), then converted to Central time, or the viewer's local time, only when shown to a person.
*Prevents:* renewals billing a day early, and deadlines that move when daylight saving time changes.

**Give subscriptions and enrollments a clear set of states.**
A subscription is always in exactly one known state, such as `trialing`, `active`, `past_due`, `canceled` or `expired`, and only certain moves between states are allowed. A canceled subscription cannot quietly become active again.
*Prevents:* people being billed after canceling, or keeping access after a failed payment.

**Check all incoming information before using it.**
Anything that comes from outside, including web forms, payment provider messages and imported lead lists, is checked for the right shape and sensible values before the system acts on it.
*Prevents:* bad data, broken records and some kinds of security attacks.

**Protect personal and payment details.**
- Card numbers are never stored by us. A certified payment provider holds them.
- Passwords, keys and other secrets never appear in code or in logs.
- Personal details (names, emails, phone numbers) appear in logs only when necessary, and are masked where possible.

*Prevents:* data breaches, and failing the security requirements of card networks.

**Plan for things going wrong.**
Every call to an outside service, such as the payment provider, email service or video platform, has a time limit and a limited number of retries. When it still fails, the system records what happened and alerts a person, rather than failing silently.
*Prevents:* problems nobody notices until a customer complains.

**Every change is tested and reviewed before it goes live.**
- Automated tests check that the main path works, that failures are handled, and that edge cases behave (for example: a $0 course, a refund larger than the payment, a subscription renewed on February 29).
- A second engineer reviews every change. Nobody approves their own work.
- Tests never send real emails or take real payments. They use test modes provided by the payment and email services.

*Prevents:* a fix in one place breaking something somewhere else.

**Keep an audit trail.**
Important events, such as an enrollment created, a payment taken, a refund issued or a subscription canceled, are recorded with who or what triggered them and when.
*Prevents:* the "we don't know what happened" conversation with a customer or an auditor.

---

## 4. Documentation Guidelines

### In plain terms

Documentation is the written explanation that travels with the software: the notes in the margin, the instruction manual and the change log. Code shows *what* the computer does. Documentation explains *why*, and how a person should use it.

### Why it matters to the business

- **Knowledge doesn't leave when people do.** If the only person who understands the refund rules goes on leave, the documentation is what keeps the business running.
- **Faster onboarding.** New engineers and interns become productive in days, not weeks.
- **Accountability.** When a stakeholder asks why the system behaves a certain way, there is a written answer with a date on it.

### The standards

**Every project has a README.** This is the front page of the codebase. It covers, in plain language:

- what the software does and who uses it
- how to set it up and run it on a computer, ideally with one command
- how to run the tests
- who to contact about it

**Explain the "why", not the "what", in code comments.** A comment like "add one to the counter" adds nothing. A comment like "Grace period is 3 days because the payment provider retries failed cards for up to 72 hours" saves the next engineer a day of investigation.

**Write business rules down in plain language.** Rules like refund eligibility, trial length, proration when someone changes plans, or what happens when a payment fails are written in a shared document that a non-technical person can read and approve. The code should match the document. If the two disagree, that is treated as a bug.

**Every change has a clear description.** When an engineer submits a change, the description says:

- what changed, in one or two sentences
- why it was needed (link the request or problem report)
- how it was tested
- anything a reviewer or a business owner should know, such as "this changes how refunds are calculated for annual plans"

**Keep a change log for anything customer-facing.** Changes to pricing logic, billing timing, enrollment steps or emails sent to customers are recorded in a dated log that support and admissions staff can read.

**Update documentation in the same change as the code.** Documentation that is updated "later" is usually never updated. A change to a business rule is not finished until its written explanation is updated too.

---

## Quick checklist before any change goes live

Use this as a final check. Each line maps to a section above.

- [ ] Names use the agreed business terms, and money and time names include their unit *(Naming)*
- [ ] The formatter and linter pass with no errors *(Formatting)*
- [ ] Repeating the action cannot charge, email or enroll anyone twice *(Best practices)*
- [ ] Money is in cents and times are stored in UTC *(Best practices)*
- [ ] No secrets or card numbers are in the code or logs *(Best practices)*
- [ ] Tests cover the normal case, the failure case and the edge cases, and they pass *(Best practices)*
- [ ] A second engineer has reviewed and approved the change *(Best practices)*
- [ ] The README, business-rule document and change log are updated where needed *(Documentation)*
- [ ] The change description explains what, why and how it was tested *(Documentation)*

---

## Glossary

| Term | Plain meaning |
|---|---|
| Code review | A second engineer checks a change before it goes live |
| Formatter | A tool that automatically lays out code consistently |
| Linter | A tool that flags risky or sloppy code, like a grammar checker |
| Function | One named step of logic, like one instruction in a procedure |
| Idempotency | Doing something twice has the same result as doing it once |
| README | The front-page guide to a codebase |
| UTC | A single worldwide standard time used for storing dates |
| Test mode | A practice setting for payment and email services, where nothing real happens |
