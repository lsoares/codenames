# AGENTS.md

## Self-documenting code — comments are a last resort

Write code that explains itself; do not narrate it. Before adding a comment, make the
code say it: intent-revealing names, small well-named functions, value objects, guards,
early returns, and tests.

**Do not add comments that:**
- restate what the code does, or explain how it works
- give usage examples or document return/throw conditions (encode those as tests)
- act as section dividers or headers

**Only acceptable as a rare exception:** a terse one-line warning of a genuine,
non-obvious correctness hazard the code cannot express (e.g. a wire-protocol/ordering
constraint, a library quirk workaround), and functional/tooling directives
(`eslint-disable`, `@ts-expect-error`, `prettier-ignore`, …).

Delete dead and unused code rather than commenting it out.

Background: https://lsoares.medium.com/towards-self-documenting-code-371364bdccbb
and https://blog.stackademic.com/towards-self-documenting-code-part-ii-c92a0f58d249

## Speak the ubiquitous language

Name everything in the domain's vocabulary — here, Codenames: spymaster, operative,
clue, guess, reveal, mark, team, board, assassin, deck, turn. Not technical or CRUD
terms.

- Name by intent and domain meaning, never by implementation. Prefer `revealCard`
  over `updateCard`, `eligibleClients` over `list`, `clientId` over `uuid`.
- Functions/methods start with a verb and name the specific use case, not generic CRUD.
- Avoid technical jargon in code, tests, file/folder names, and user-facing copy.
- Tests read as domain behaviour: helpers that mirror user actions (`giveClue`,
  `revealCard`), Arrange-Act-Assert, no technical references.
- Git commits describe user-facing purpose, not implementation
  (e.g. "Esc clears the current picks", not "reset selected state").

Background: https://lsoares.medium.com/speaking-the-ubiquitous-language-033223a4dd5d

## Writing functions

- **Command–query separation**: a function either returns data (query) or changes
  state (command), not both.
- **No flag arguments**: a boolean that switches behaviour means two functions. Split
  them; put the choice at the call site.
- **Single level of abstraction**: don't mix high- and low-level steps in one body;
  extract intent-named helpers. Keep domain logic separate from I/O.
- **Start names with a verb**; predicates read as `isX` / `hasX`.
- **Short parameter lists**: group related params into an object/DTO; prefer value
  objects over primitive obsession.
- **Guards and checks**: validate preconditions early (fail fast); they double as docs.
- **Declare variables just before use**, smallest possible scope; inline single-use.
- **Don't reach outside scope** (globals, module constants, env) — inject dependencies.
- **Don't share for the sake of it**: a private duplicate can beat a shared utility that
  couples unrelated callers.

Background: https://levelup.gitconnected.com/principles-for-writing-functions-113600e1bead

## Magic numbers are usually fine

Do **not** extract a named constant for a value used in one or two cohesive places —
inline literals carry less cognitive load and keep the decision atomic. `setPageSize(50)`
needs no `DEFAULT_PAGE_SIZE`.

Extract a constant only when it genuinely adds meaning:
- a low-level code needing semantics (`NOT_FOUND` for `-1`), kept private to its owner;
- an arbitrary value whose units/intent are otherwise unclear (a timeout in ms), as a
  local/private constant;
- an actual standard (`Math.PI`) — use the library's, don't roll your own.

Never centralise constants in a shared `constants.ts`, and never promote a private
constant to global just so a test can import it — tests hardcode their own literals.

Background: https://medium.com/codex/when-magic-numbers-are-not-magic-fcdf034295a5

## Locate elements by role, not CSS or test-ids

In UI/e2e tests, find elements the way a user (or assistive tech) perceives them.

Priority order:
1. Role + accessible name — `getByRole('button', { name: 'Give clue' })`
2. User-visible text / label
3. Test-ids — only when nothing else fits
4. CSS / XPath selectors — avoid

CSS selectors and test-ids couple tests to markup, fail for the wrong reasons (and
pass when the UI is actually broken), and add test-only cruft. Role-based queries stay
stable through refactors, double as documentation, and push the app toward semantic,
accessible HTML.

Background: https://lsoares.medium.com/stop-using-css-and-test-ids-to-locate-elements-0001041d1709

## A testing strategy that supports refactoring

Test observable behaviour, not implementation — so internal refactors don't break tests.

- **Vertical slices by default**: exercise a whole use case top-to-bottom through the
  real layers, the way the software is actually used. Add a narrow unit test only for
  genuinely complex domain logic.
- **Don't mock the system under test.** Replace dependencies only at the boundary
  (localhost stubs, in-memory equivalents). Never mock what you don't own.
- **Verify state/effects, not interactions** — check the resulting balance, not that a
  method was called.
- **Don't couple test structure to code structure.** Tests fail for business reasons,
  never technical ones. If you're editing tests for technical reasons, the strategy is off.
- **Outside-in**: write the interface/behaviour assertion first, implement downward.

Background: https://medium.com/codex/a-testing-strategy-that-supports-refactoring-36999d8c60b8

## Avoid mocks

Mocks give false safety (everything isolated, nothing proven to work together), couple
tests to implementation, and drown the domain in technical detail.

- **Black-box / state verification**: drive the system through its public surface and
  assert on observable state — use existing queries to check what commands did.
- **Dogfooding**: use the same API level across Arrange, Act and Assert; rely on the
  system to test the system.
- **Use real dependencies** where they're inherent (in-memory or temp-file DB — fast and
  deterministic). Stub only true external services, at the boundary. Never mock what you
  don't own.

Background: https://medium.com/codex/how-to-avoid-mocks-f8576e71dd20

## Domain-centric (clean) architecture

Protect the domain; keep technology a detail.

- **Dependency rule**: source dependencies point inward. The domain (entities, use
  cases, ports) never depends on infrastructure (DB, web, framework, env).
- **Ports belong to the domain**; adapters implement them. Primary adapters (controllers,
  CLI, tests) drive the domain; secondary adapters (repos, API clients, loggers) are
  driven by it and are replaceable.
- **No business logic in adapters** — they only translate/validate syntactically.
- **Entities carry domain logic and invariants** (no anemic models); never expose them
  raw — use serializers/presenters.
- **Use cases are first-class**, named with verbs, pure (side effects pushed to adapters).
- Wire dependencies in a composition root; inject them. Abstract every third-party API.

Background: https://medium.com/codex/clean-architecture-for-dummies-df6561d42c94

## Organize by use case; avoid code hotspots

A hotspot is a large, low-cohesion file that everything imports and every change touches.
Oversharing — not duplication — is the enemy.

- **Vertical slices**: group by use case, not technical layer. Code that changes together
  stays together.
- **One file per use case / entry point**, self-contained: its request/response models,
  errors, helpers, parsing and validation all live there. "There's no other place to look."
- **Don't share for the sake of DRY**: before extracting shared code, ask if the
  similarity is coincidental. A private duplicate beats coupling unrelated use cases.
  Share only true repositories, entities, and value objects.
- **Ban generic names**: no `core`, `base`, `common`, `manager`, `helper`, `util`, `types`.
- **One test file per use case**, injecting only that use case's real dependencies.
- Refactor hotspots in baby steps behind high-level tests — never big-bang.

Background: https://medium.com/codex/avoiding-code-hotspots-a-use-case-driven-approach-2bcc12e4b878

## Pragmatic exception handling

- **Guards (preconditions) and checks (postconditions)** — fail fast with a clear message.
- **Don't use exceptions for control flow**; prevent the error instead (the exception is
  for the unavoidable-but-recoverable, e.g. a network retry).
- **Raise in the domain, handle at the boundary**: adapters translate domain exceptions
  into HTTP codes / UI messages; repositories/clients wrap technical errors. Reduce the
  number of places that handle exceptions.
- **One top-level unhandled-exception handler** (log, report, generic failure) for
  runtime/technical faults — the last responsible moment.
- **Never `catch (Exception)` indiscriminately**; catch specific, contextual ones. Preserve
  cause when re-throwing (`raise X from e`).
- **Decentralize exceptions** next to their use case — no `errors.ts` dumping ground, no
  sharing an exception across unrelated use cases. No log-and-throw.
- Consider an **Operation Result** for expected business outcomes; keep exceptions for bugs.
- Create a custom exception only when you have an immediate need to handle it.

Background: https://medium.com/codex/pragmatic-exception-handling-3831f7ce0980
