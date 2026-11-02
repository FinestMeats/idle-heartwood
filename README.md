# Idle Heartwood

Playtest build: https://finestmeats.github.io/idle-heartwood/

- `index.html`: the whole game.
- `firestore.rules`: Firebase security rules (paste into Firestore, then Rules, then Publish when they change).
- `polls.json`: community polls shown on the Map tab. An empty list means no polls. Each poll is
  `{"id":"p1","q":"Question?","desc":"Optional detail","opts":["Yes","No","Skip"],"ends":"2026-12-01"}`.
- `scripts/` and `.github/workflows/feedback-to-issues.yml`: every 6 hours, new in-game bug reports and ideas are
  filed here as issues labelled `bug` or `idea` and `from-game`. Needs the `FIREBASE_SERVICE_ACCOUNT` repository secret.

## Rate limits and cost controls

Anyone can read the page source, sign in anonymously and call Firestore directly, so every write a player can make is
throttled per account in `firestore.rules`, using the server clock (a script can't fake it):
- bug reports and ideas: one a minute (the report and the player's `limits/{uid}` entry are written in one batch);
- Card Club reward-claim codes: one every 20 seconds;
- ladder rows: one update every 5 seconds;
- ladder and poll votes are only readable by signed-in players.

What the rules can't do, set up once in the Firebase / Google Cloud console:
1. **Budget alert:** Google Cloud console → Billing → Budgets & alerts → a small monthly budget (e.g. A$10) with email
   alerts at 50/90/100%. On the free Spark plan there is no bill, but a flood uses up the day's free quota and the game
   stops saving until midnight Pacific time; on Blaze it costs money.
2. **App Check** (Firebase console → App Check → register the web app with reCAPTCHA Enterprise, then Enforce for
   Firestore): blocks requests that don't come from the real game page. Needs the site key added to the page.
3. **Anonymous sign-up limit:** Firebase console → Authentication → Settings → User actions / quotas: keep new anonymous
   accounts per IP low (the default is 100 an hour), since each new account gets its own rate-limit budget.

When `firestore.rules` changes, publish it in the console right after the matching page change goes live: a page and
rules that don't match make feedback, ladder updates and reward claims fail.

## UrgerBae Card Club (`club/`)

Customer page: https://finestmeats.github.io/idle-heartwood/club/ · counter screen: add `?counter` to that link.

Nothing secret is in the page. The checks live in `firestore.rules`:
- **Staff** are Google accounts with a document in `clubStaff` (add them by hand in the Firebase console: Firestore → `clubStaff` → Add document → Document ID = the account ID the counter screen shows, no fields).
- **Today's counter code** is random, made by the first staff device to open the QR each day, and stored in `clubDaily` where only staff can read it. A pack only opens if the database accepts a scan with the live code: one per account per day.
- **Rewards**: the customer taps Claim and gets a 6-character code; staff type it on the counter screen, which shows the set progress, the customer's verified counter visits and whether it's been claimed before, then records the claim. Claims can't be undone or repeated.
- `MIN_VISITS` in `club/src/cards.js` is how many verified visits a real collector needs per reward (about the luckiest 1 in 100). Fewer than that, or more cards than the visits could give, and staff see a warning.

Build: `cd club/src && npm i --no-save qrcode-generator@1 && node build.js web` (writes `club/index.html`).
Tests: `tests/club-rules.test.mjs` (rules, run by GitHub Actions in the Firestore emulator) and `tests/club-flow.cjs` (page flow, `node tests/club-flow.cjs` with Playwright).
