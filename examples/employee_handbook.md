---
type: handbook
version: "4.2"
created: 2024-01-15
modified: 2026-06-01

facts:
  - id: probation-days
    value: 90
    unit: days
  - id: annual-leave-days
    value: 25
    unit: days/year
  - id: remote-days-allowed
    value: 3
    unit: days/week
  - id: notice-period-junior
    value: 4
    unit: weeks
  - id: notice-period-senior
    value: 8
    unit: weeks

roles:
  new_hire: [core, onboarding]
  manager:  [core, onboarding, management]
  legal:    [core, legal]
---

<!-- @role: core -->
# Employee Handbook

Welcome to the team. This document covers the policies, expectations, and procedures
that apply to all employees. It is reviewed annually and updated as regulations change.

**Version:** 4.2 — effective 2026-06-01
<!-- @/role -->

<!-- @role: core onboarding -->
## Your First 90 Days

The first 90 days are a mutual evaluation period. During this time:

- Weekly 1:1 with your direct manager (Thursday, 30 min)
- Access to all tools and systems is provisioned by IT on day 1
- Full onboarding checklist is in the Notion workspace (pinned in #onboarding Slack)

At day 30, 60, and 90 your manager will conduct a brief structured check-in.
There is no formal review paperwork — these are conversations, not evaluations.

## Working Hours and Remote Policy

Core hours: **10:00–16:00 local time**, Monday to Friday.

Remote work: up to 3 days per week. No approval needed; just block your calendar and
communicate with your team. More than 3 days requires manager agreement.

On-site days are expected Tuesday and Thursday (team collaboration days).

## Leave

Annual leave: 25 days per calendar year (pro-rated for partial years).

- Book via the HR portal at least 2 weeks in advance for periods under 5 days
- At least 4 weeks in advance for 5 or more consecutive days
- Year-end carry-over: up to 5 days. Unused days beyond 5 are forfeited on January 31

Sick leave: self-certification for up to 3 days. A doctor's note is required from
day 4 onward. There is no cap on sick leave; contact HR if you need support.
<!-- @/role -->

<!-- @role: management -->
## Manager Guidelines

### Probation management

If a new hire is not meeting expectations during the 90-day period:

1. Document specific concerns with dates and examples
2. Share concerns with the employee no later than day 60 — no surprises at day 90
3. Contact HR at least 14 days before the probation end date if termination is likely
4. HR will coordinate with Legal for any exit package

Extending probation (up to 30 additional days) is possible with HR approval. Extension
must be communicated in writing before the original end date.

### Performance management

Annual reviews take place in January. Mid-year pulse in July (informal).

Underperformance outside of probation: follow the three-stage process (verbal →
written → final written warning). HR must be copied at every stage. Do not skip stages
without explicit legal approval.

### Redundancy

Collective redundancy (20+ employees within 90 days): legal obligation to notify
authorities and begin consultation. Contact Legal immediately.

Individual redundancy: minimum 4 weeks notice for tenure < 2 years; 1 additional week
per year of service thereafter, up to 12 weeks maximum.

Do not communicate redundancy to the employee before Legal has reviewed the case.
<!-- @/role -->

<!-- @role: legal -->
## Legal and Compliance

### Data protection (GDPR)

Employee personal data is processed under GDPR Article 6(1)(b) (performance of
contract) and 6(1)(c) (legal obligation). Retention periods:

| Data category          | Retention                      |
|------------------------|-------------------------------|
| Payroll records        | 6 years after employment ends |
| Performance reviews    | 3 years after employment ends |
| Disciplinary records   | 2 years from incident date    |
| Recruitment data       | 12 months from application    |

Employees may exercise access, rectification, and erasure rights under GDPR Chapter III.
Route all data subject requests to dpo@example.com within 72 hours of receipt.

### Termination obligations

On the last day of employment:

- IT must revoke all access (accounts, VPN, physical passes) by 17:00
- Employee returns all company equipment within 5 working days
- Final pay including accrued untaken leave is processed in the next payroll cycle

**Garden leave:** if invoked, employee remains employed but does not attend work.
Full salary and benefits continue. Non-compete clauses (where present in the contract)
begin from the termination date, not the start of garden leave.

### Non-disclosure

The NDA signed at onboarding covers all confidential information for 2 years post-
employment. Confidential information includes but is not limited to: customer lists,
pricing models, source code, product roadmaps, and financial projections.

Violations should be reported immediately to legal@example.com.
<!-- @/role -->

[rel:it_onboarding_guide]: # "IT access provisioning steps for new hires"
[rel:hr_leave_portal]: # "booking system for annual leave requests"
[rel:code_of_conduct]: # "detailed conduct standards referenced in section 4.2"
[rel:benefits_guide]: # "health, pension, and perks — separate document updated annually"
