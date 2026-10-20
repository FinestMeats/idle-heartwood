# Heartwood TCG — testing notes

- **Every balance or rules test uses the smart opponent on both sides** (`smart.js`, smart vs smart).
  The old quick AI (`aiWork`/`aiFell` in engine.js) is only a playout policy inside smart.js and the
  in-game opponent; its results were shown to be misleading (it lost 89% to smart play).
- Test bench: add a named change to `variants.js`, then `./run_var.sh 50 base myvariant` (800 games per
  variant, both cores) and `node report_var.js base myvariant`. Use 150 per pairing (2,400 games) to confirm.
- Rule switches live in engine.js: `setTrample`, `setTargets`, `setRule('fatigue'|'guardBonus', v)`.
- Targets for a healthy build: factions 45–55%, Keepers 40–60%, first player under 55%,
  out-of-cards under 5%, median 16–24 total turns.
- `QUICK=1 node sim.js` only for speed checks, never for balance decisions.
