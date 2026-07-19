---
type: protocol
version: "2.1"
created: 2025-09-01
modified: 2026-03-15

facts:
  - id: temp-max
    value: 5
    unit: "C"
  - id: temp-summer
    value: 6
    unit: "C"
    valid: jun-sep
  - id: incident-march
    date: 2026-03
    cost: 340
    cause: compressor

roles:
  training: [core, training]
  auditor: [core, audit]
  operations: [core, training, audit]
---

<!-- @role: core -->
# Opening Protocol

Daily opening procedure, Monday to Friday.
<!-- @/role -->

<!-- @role: core training -->
## Temperature Checks

Every morning, check the temperature of the cold rooms
before turning on the stoves. If any exceeds 5C,
notify [[Maintenance]] before continuing.

## Exceptions

In high season (June-September), only check the main
cold room. See [[Summer Protocol]] for details.
<!-- @/role -->

<!-- @role: audit -->
## Incident History

2026-03: Cold room 2 failed overnight. 12kg of product
lost. Cause: compressor. Cost: 340 EUR.
Since then, compressor check added to the checklist.
Same pattern as [[incident_2025_11]].
<!-- @/role -->

[rel:checklist_v1]: # "added compressor check that v1 didn't have"
[rel:summer_protocol]: # "simplifies in summer because the base protocol is too slow"
[rel:incident_2025_11]: # "same failure pattern: overnight compressor"
