# Heartwood TCG engine (work in progress)

Rules engine, card conversion and computer opponent for the new turn-based Heartwood TCG format. No screen yet; not used by the live game.

- `cards.js`: converts the Classic cards to TCG stats, plus new Tools, Reactions, Events, 12 Keepers and starter decks
- `engine.js`: the rules (Dawn, Work, Fell, Dusk; Sap; Clearing/Treeline; Rings and Heartwood; Keepers; React window) and a simple computer opponent
- `sim.js`: `node tcg/sim.js 150` plays thousands of games and prints faction, Keeper and first-player win rates
