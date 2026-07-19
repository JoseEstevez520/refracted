---
type: protocol
version: "1.0"
created: 2025-06-15
modified: 2026-05-20

facts:
  - id: temp-summer-max
    value: 6
    unit: "C"
  - id: season-start
    value: "June 1"
  - id: season-end
    value: "September 30"

roles:
  training: [core, summer-ops]
  auditor: [core]
  operations: [core, summer-ops]
---

<!-- @role: core -->
# Summer Protocol

Simplified procedures for high season (June-September).
During summer, speed is prioritized over exhaustive checks.

## Key Differences

- Only check the **main cold room** (skip auxiliary rooms)
- Temperature threshold raised to 6C (from 5C)
- Ovens preheat while doing other tasks (parallel workflow)
<!-- @/role -->

<!-- @role: summer-ops -->
## Summer Morning Routine

1. Unlock and ventilation (same as base)
2. Check main cold room only (threshold: 6C)
3. Start oven preheat immediately
4. While ovens warm: stock stations + check reservations
5. Brief team (include seasonal menu items)

## Extended Hours

During summer, the restaurant opens 30 minutes earlier.
Adjust arrival time accordingly. Weekend brunch service
starts at 09:00.
<!-- @/role -->

[rel:protocolo_apertura]: # "simplifies the base protocol for speed during high season"
[rel:checklist_v1]: # "summer version skips items 3-4 from base checklist"
