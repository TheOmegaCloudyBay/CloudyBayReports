# Inventory inbox (opt-in)

Drop your **C-3PO inventory export** here to unlock the *"Subtract my inventory"* toggle
on your Players Data → Gear planner. It nets the gear pieces and relic materials you
already own out of the combined shopping list.

## How to opt in

1. In Discord, run the C-3PO **inventory export** command (`/inventory export`).
   It temporarily logs you out of the game on your device — that's expected.
2. C-3PO sends back a JSON file. Rename it to your **ally code** followed by
   `-inventory.json`, e.g. `141142387-inventory.json`.
3. Put that file in this folder and let the guild know (or drop it in the guild
   channel and it'll be added for you).

The next time the reports are generated, a compact `players/<allyCode>-inv.json`
is produced and the toggle appears on your page.

## What gets published

Only the **owned quantities** the planner needs are published — your gear-piece and
relic-material counts (`players/<allyCode>-inv.json`). The raw export you drop here
(which also contains your mods, currency, etc.) is **git-ignored and never pushed** —
it stays on the machine that runs the report. Delete your compact file any time to opt
back out.
