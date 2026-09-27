# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                 | `wontfix`                 | Will not be actioned                     |

`done` is not one of the five roles the skills know about, but a ticket that has been built needs a state of its own, or "all the boxes are ticked" has to be read out loud to find out. It is the only state here that is not a role, and it means the ticket's acceptance list is ticked and the work is committed.

| Not a triage role         | `done`                    | Built, checked and committed             |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.
