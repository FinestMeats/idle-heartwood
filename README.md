# Idle Heartwood

Playtest build: https://finestmeats.github.io/idle-heartwood/

- `index.html`: the whole game.
- `firestore.rules`: Firebase security rules (paste into Firestore, then Rules, then Publish when they change).
- `polls.json`: community polls shown on the Map tab. An empty list means no polls. Each poll is
  `{"id":"p1","q":"Question?","desc":"Optional detail","opts":["Yes","No","Skip"],"ends":"2026-12-01"}`.
- `scripts/` and `.github/workflows/feedback-to-issues.yml`: every 6 hours, new in-game bug reports and ideas are
  filed here as issues labelled `bug` or `idea` and `from-game`. Needs the `FIREBASE_SERVICE_ACCOUNT` repository secret.
