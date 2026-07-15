import { type Browser, type Page } from '@playwright/test'

// Return 20 canned photos so the board is deterministic and offline.
export async function stubUnsplash(page: Page): Promise<void> {
  await page.route('**/api.unsplash.com/**', (route) =>
    route.fulfill({
      json: Array.from({ length: 20 }, (_, index) => ({
        urls: {
          small: `https://example.com/${index}.jpg`,
          regular: `https://example.com/${index}.jpg`,
        },
      })),
    }),
  )
}

// Open a fresh tab (own context, stubbed source) hosting a room on a pinned team.
export async function hostRoom(
  browser: Browser,
  team: 'red' | 'blue',
  stub: (page: Page) => Promise<void> = stubUnsplash,
): Promise<{ game: GamePage; code: string }> {
  const page = await (await browser.newContext()).newPage()
  await stub(page)
  const game = new GamePage(page)
  await game.open(team)
  await game.createRoom()
  return { game, code: await game.getRoomCode() }
}

// Open a fresh tab joining a room on a pinned team, waiting until its board is up.
export async function joinRoom(
  browser: Browser,
  code: string,
  team: 'red' | 'blue',
  stub: (page: Page) => Promise<void> = stubUnsplash,
): Promise<GamePage> {
  const page = await (await browser.newContext()).newPage()
  await stub(page)
  const game = new GamePage(page)
  await game.openRoom(code, team)
  await game.getCards().first().waitFor()
  return game
}

// SUT client: drives the app through roles/labels only, hiding locators.
export class GamePage {
  constructor(private readonly page: Page) {}

  // Auto-teams are gated by turn, so pin the host's starting team for a
  // deterministic single-player flow (the host is always auto-assigned red).
  async open(startTeam?: 'red' | 'blue'): Promise<void> {
    if (startTeam) {
      await this.page.addInitScript(
        (team) => localStorage.setItem('codenames:start-team', team),
        startTeam,
      )
    }
    await this.page.goto('/')
  }

  // Join a room. A pinned team makes the joiner land on that side deterministically
  // (auto-seated as its spymaster if the seat is open, else an operative), so a
  // multi-tab game can be set up without relying on the auto-balancer's coin toss.
  async openRoom(code: string, startTeam?: 'red' | 'blue'): Promise<void> {
    if (startTeam) {
      await this.page.addInitScript(
        (team) => localStorage.setItem('codenames:start-team', team),
        startTeam,
      )
    }
    await this.page.goto(`/${code}`)
  }

  // The homepage lists decks; picking one hosts a room. Random is the default
  // (image) deck the suite plays on, so start there and wait for the board.
  async createRoom(): Promise<void> {
    await this.showAllDecks()
    await this.page.getByRole('button', { name: 'Random', exact: true }).click()
    await this.getCards().first().waitFor()
  }

  // The deck grid opens with the Casual difficulty filter pre-selected, which hides
  // the image decks; clearing it makes every deck (like Random) pickable again.
  async showAllDecks(): Promise<void> {
    await this.page.getByRole('button', { name: 'Casual' }).click()
  }

  // The homepage box for entering an existing room by its code.
  async joinRoomByCode(code: string): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Room code' }).fill(code)
    await this.page.getByRole('button', { name: 'Join' }).click()
  }

  // Pick a homepage deck without waiting for the board, so a test can observe the
  // dealing state while the deck's faces are still being fetched.
  async pickDeck(label: string): Promise<void> {
    await this.showAllDecks()
    await this.page.getByRole('button', { name: label, exact: true }).click()
  }

  // The spinner that replaces a deck tile's icon while its faces are being dealt.
  findDealingSpinner(label: string) {
    return this.page.getByRole('progressbar', { name: `Dealing ${label}` })
  }

  // The room code is the URL path the app puts in the address bar for sharing.
  async getRoomCode(): Promise<string> {
    await this.page.waitForURL(/\/[a-z0-9-]+$/)
    return new URL(this.page.url()).pathname.replace(/^\//, '')
  }

  async reload(): Promise<void> {
    await this.page.reload()
  }

  // At game end, Change deck returns to the deck grid (in the same room); picking
  // a deck there re-deals the board for everyone.
  async changeDeckAtEnd(label: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Change deck' }).click()
    await this.showAllDecks()
    await this.page.getByRole('button', { name: label, exact: true }).click()
  }

  async giveClue(word: string, count: number): Promise<void> {
    await this.page.getByRole('textbox').fill(word)
    await this.page.getByRole('spinbutton').fill(String(count))
    await this.page.getByRole('button', { name: /give clue/i }).click()
  }

  // Type into the clue word field with real key presses, so the browser's
  // maxlength is honoured (fill would bypass it).
  async typeClueWord(text: string): Promise<void> {
    await this.page.getByRole('textbox').pressSequentially(text)
  }

  getClueInput() {
    return this.page.getByRole('textbox')
  }

  getClueCount() {
    return this.page.getByRole('spinbutton')
  }

  // The clue in play, shown to operatives once the spymaster commits it. It's a
  // plain emphasised word with no accessible role, so it's read by its text.
  findActiveClue(word: string) {
    return this.page.getByText(word, { exact: true })
  }

  // At game end, the clues a team gave — one list item per clue, shown on that
  // team's side of the header.
  getTeamClues(team: 'red' | 'blue') {
    return this.page.getByRole('list', { name: `${team} clues` }).getByRole('listitem')
  }

  // The bottom-left button, reserved for spymasters, that leaves for the deck
  // grid (keeping the room) to start a new game on a freshly chosen deck.
  findDeckPickerButton() {
    return this.page.getByRole('button', { name: 'New game — pick a deck' })
  }

  async openDeckPicker(): Promise<void> {
    await this.findDeckPickerButton().click()
  }

  // The banner other players see while a spymaster is over on the deck grid
  // choosing the next deck.
  findRepickNotice() {
    return this.page.getByText(/choosing a new deck/i)
  }

  // The whack-a-mole scoreboard shows while a spymaster thinks; it's the marker
  // that this player is in the mole break.
  findMoleScores() {
    return this.page.getByRole('status', { name: 'Whack-a-mole scores' })
  }

  async leaveMoleGame(): Promise<void> {
    await this.page.keyboard.press('Escape')
  }

  // The banner invite shown while the room still needs players holds the room
  // name (click to copy the link).
  getJoinLinkButton() {
    return this.page.getByRole('button', { name: 'Copy join link' })
  }

  async copyRoomLink(): Promise<void> {
    await this.getJoinLinkButton().click()
  }

  getCopiedNote() {
    return this.page.getByText('Invite link copied!')
  }

  // Spymaster-only: the number of the first unrevealed card of a colour, so an
  // operative (who can't see colours) can be told which card to click.
  async getCardNumber(color: Color): Promise<number> {
    const label = await this.getCard(color).first().getAttribute('aria-label')
    return Number(label?.match(/^Card (\d+)/)?.[1])
  }

  // Every unrevealed card number of a colour (spymaster view).
  async getCardNumbers(color: Color): Promise<number[]> {
    const labels = await this.getCard(color).evaluateAll((els) =>
      els.map((el) => el.getAttribute('aria-label') ?? ''),
    )
    return labels.map((l) => Number(l.match(/^Card (\d+)/)?.[1]))
  }

  // Operative guess by card number (works without seeing the colour).
  async guessNumber(n: number): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(`^Card ${n}(,|$)`) }).click()
  }

  // The operatives' button to end their turn early — only offered once they've
  // made at least one guess this turn.
  findPassButton() {
    return this.page.getByRole('button', { name: 'Pass' })
  }

  // The operatives' guess meter — a summarised pip row labelled "X used out of Y",
  // where Y includes the one bonus guess beyond the clue's number.
  findGuessTally() {
    return this.page.getByRole('img', { name: /used out of/ })
  }

  async pass(): Promise<void> {
    await this.findPassButton().click()
  }

  // Operative marks a card by number via its hover pin icon, allowed on any turn.
  async markCard(n: number): Promise<void> {
    await this.page.getByRole('button', { name: `Mark Card ${n}`, exact: true }).click()
  }

  // A card the viewer sees as marked by their own team.
  findMarkedCard(n: number) {
    return this.page.getByRole('button', { name: `Card ${n}, marked`, exact: true })
  }

  getCards() {
    return this.page.getByRole('button', { name: /^Card \d+/ })
  }

  // Every card the viewer currently sees face-up — a revealed card is disabled.
  findRevealedCards() {
    return this.page.getByRole('button', { name: /^Card \d+/, disabled: true })
  }

  getCard(color: Color, options: { revealed?: boolean } = {}) {
    const label = color === 'neutral' ? 'bystander' : color
    return this.page.getByRole('button', {
      name: new RegExp(`^Card \\d+, ${label}$`),
      disabled: options.revealed ?? false,
    })
  }

  async getCurrentTurn(): Promise<'red' | 'blue'> {
    const title = await this.page.getByTitle(/'s turn$/).getAttribute('title')
    return title?.toLowerCase().startsWith('red') ? 'red' : 'blue'
  }

  // The little team-coloured count card doubles as "join this team".
  async joinTeam(team: 'red' | 'blue'): Promise<void> {
    await this.page.getByRole('button', { name: `Join ${team} team` }).click()
  }

  // The transient toast / sticky announcement shown in the header status pill.
  getByRoleStatus() {
    return this.page.getByRole('status')
  }

  // At game end the winning team's clue list is badged with a trophy labelled
  // "{team} team wins" — a stable, viewer-independent marker of the result.
  getWinBadge(team: 'red' | 'blue') {
    return this.page.getByRole('img', { name: `${team} team wins` })
  }

  // The outcome emoji flashed over a card the instant it's revealed. Labelled by
  // outcome so a guess reads as a hit, miss, neutral, or the assassin.
  findFeedback(outcome: 'correct' | 'wrong' | 'neutral' | 'assassin') {
    const label = {
      correct: 'correct guess',
      wrong: 'wrong guess',
      neutral: 'bystander card',
      assassin: 'assassin',
    }[outcome]
    return this.page.getByRole('img', { name: label })
  }

  // Each player is a labelled face (e.g. "blue operative", "red spymaster"), so
  // counting them reads how many players the room believes are present.
  async countPlayers(): Promise<number> {
    return this.page.getByRole('img', { name: /operative|spymaster/ }).count()
  }
}

type Color = 'red' | 'blue' | 'neutral' | 'assassin'
