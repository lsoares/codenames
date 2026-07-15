# Domain language

This project is a variant of **Codenames: Pictures** (official rules: the Czech
Games PDF linked from [HowToPlay.tsx](src/ui/HowToPlay.tsx)). The board holds
**20 cards** split **8 / 7 / 4 / 1** (see [Game.ts](src/Game.ts)).

## Entities & concepts

| Concept (official rules) | Code term | Where | Meaning |
|---|---|---|---|
| Team (red / blue) | `Team = 'red' \| 'blue'` | [Game.ts:3](src/Game.ts#L3) | The two competing teams |
| Starting team | `startingTeam` | [Game.ts:54](src/Game.ts#L54) | Gets 8 agents (one extra card) and plays first |
| Card (picture / agent) | `Card` / `Face` | [Game.ts:12](src/Game.ts#L12), [Face.ts:3](src/Face.ts#L3) | Board card; `Face` is the visual content (glyph/text/image/icon) |
| Card's secret color | `CardColor` | [Game.ts:4](src/Game.ts#L4) | `red`/`blue` (agents), `neutral` (bystander), `assassin` |
| Agent | `red`/`blue` cards | [Game.ts:60-62](src/Game.ts#L60-L62) | A card owned by a team; finding them is the goal |
| Bystander | `'neutral'` | [Game.ts:4](src/Game.ts#L4) | Revealing one just ends the turn |
| Assassin | `'assassin'` | [Game.ts:4](src/Game.ts#L4) | Black card; revealing it loses instantly |
| Key / map | `colors[]` | [Game.ts:60](src/Game.ts#L60) | Secret color layout, seen only by spymasters |
| Spymaster | `'spymaster'` (`ActingRole`) | [Game.ts:43](src/Game.ts#L43) | Sees colors, gives clues |
| Operatives | `'operatives'` (`ActingRole`) | [Game.ts:43](src/Game.ts#L43) | Guess cards from the clue |
| Clue | `Clue { word, count }` | [Game.ts:20-24](src/Game.ts#L20-L24) | One word + a number pointing at N of the team's cards |
| Unlimited clue | `UNLIMITED_CLUE = -1` / count `0` | [Game.ts:26](src/Game.ts#L26), [Game.ts:287](src/Game.ts#L287) | Unlimited guesses (0 or ∞) |
| Turn | `turn: Team` | [Game.ts:32](src/Game.ts#L32) | Whose move it is |
| Phase | `GamePhase = 'clue' \| 'guess'` | [Game.ts:5](src/Game.ts#L5) | `clue`: awaiting a clue; `guess`: awaiting guesses |
| Reveal | `revealed` | [Game.ts:15](src/Game.ts#L15) | Card is flipped; color becomes visible |
| Guess outcome | `GuessOutcome` | [Game.ts:41](src/Game.ts#L41) | `correct`/`wrong`/`neutral`/`assassin` |
| Guesses remaining | `guessesRemaining` | [Game.ts:36](src/Game.ts#L36) | The "N + 1" rule; one over the clue count ends the turn |
| Mark (tentative guess) | `markedBy: Team[]` | [Game.ts:16](src/Game.ts#L16) | Operatives flag cards before flipping (UI aid, not an official rule) |
| Winner | `winner: Team \| null` | [Game.ts:37](src/Game.ts#L37) | First team to find all its agents (or opponent hits the assassin) |

## Actions (domain verbs)

| Action (rules) | Method | Where | Effect |
|---|---|---|---|
| Give clue | `giveClue(word, count)` | [Game.ts:183](src/Game.ts#L183) | Records the clue, enters `guess` phase, sets `guessesRemaining = count + 1` |
| Guess / touch card | `guess(cardIndex)` | [Game.ts:208](src/Game.ts#L208) | Reveals the card; correct continues, wrong/bystander passes turn, assassin loses |
| End turn | `endTurn()` | [Game.ts:196](src/Game.ts#L196) | Ends the turn early and passes to the opponent |
| Mark card | `mark(cardIndex, team)` | [Game.ts:164](src/Game.ts#L164) | Toggles the operatives' tentative mark |
| New game | `newGame(...)` | [Game.ts:153](src/Game.ts#L153) | Shuffles a new key, draws the starting team |

## Rules encoded in the transitions

- **Win by agents:** turn ends in a win when `unrevealedCount(team) === 0` ([Game.ts:226-231](src/Game.ts#L226-L231)).
- **Loss by assassin:** touching `'assassin'` hands the win to the opponent immediately ([Game.ts:223-225](src/Game.ts#L223-L225)).
- **N+1 rule:** correct guesses consume `guessesRemaining`; reaching 0 passes the turn ([Game.ts:233-246](src/Game.ts#L233-L246)).
- **End turn on miss:** flipping any other color (opponent/neutral) passes the turn ([Game.ts:248-254](src/Game.ts#L248-L254)).
- **At least one guess per turn:** operatives cannot pass before guessing; `endTurn` no-ops and the Pass button hides until `hasGuessedThisTurn()` ([Game.ts](src/Game.ts)). Official rule: *Codenames: Pictures*, p.5, "Ending the Turn" — "exactly one clue and one or more guesses".
- **Only the spymaster sees colors:** enforced by `showsColor` / `canAct` ([Game.ts:139-147](src/Game.ts#L139-L147)).
