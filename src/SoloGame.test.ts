import { describe, it, expect } from 'vitest'
import { SoloGame, createSoloGame } from './SoloGame'
import type { Face } from './Face'

const textFace = (text: string): Face => ({ kind: 'text', text })
const faces = (n: number) => Array.from({ length: n }, (_, i) => textFace(`WORD${i}`))

describe('createSoloGame', () => {
  it('creates a 5x4 board with 12 mine and 8 assassin cards', () => {
    const state = createSoloGame(faces(20), null, null, '5x4')

    expect(state.cards).toHaveLength(20)
    expect(state.cards.filter((c) => c.color === 'blue').length).toBe(12)
    expect(state.cards.filter((c) => c.color === 'assassin').length).toBe(8)
    expect(state.result).toBe('playing')
    expect(state.clue).toBeNull()
  })

  it('creates a 5x5 board with 15 mine and 10 assassin cards', () => {
    const state = createSoloGame(faces(25), null, null, '5x5')

    expect(state.cards).toHaveLength(25)
    expect(state.cards.filter((c) => c.color === 'blue').length).toBe(15)
    expect(state.cards.filter((c) => c.color === 'assassin').length).toBe(10)
  })
})

describe('SoloGame', () => {
  const setupGame = () => {
    const state = createSoloGame(faces(20), 'Words', null, '5x4')
    return new SoloGame(state)
  }

  const firstMineIndex = (game: SoloGame) =>
    game.state.cards.findIndex((c) => c.color === 'blue' && !c.revealed)

  const firstAssassinIndex = (game: SoloGame) =>
    game.state.cards.findIndex((c) => c.color === 'assassin')

  it('receiveClue sets the clue and guessesRemaining', () => {
    const game = setupGame().receiveClue('animal', 3)

    expect(game.state.clue).toEqual({ word: 'animal', count: 3 })
    expect(game.state.guessesRemaining).toBe(3)
  })

  it('cannot guess without a clue', () => {
    const game = setupGame()

    expect(game.canAct(0, { team: 'blue', isSpymaster: false })).toBe(false)
  })

  it('a correct guess reveals the card and decrements remaining', () => {
    const game = setupGame().receiveClue('test', 2)
    const mineIdx = firstMineIndex(game)

    const after = game.guess(mineIdx)

    expect(after.state.cards[mineIdx].revealed).toBe(true)
    expect(after.state.cards[mineIdx].outcome).toBe('correct')
    expect(after.state.guessesRemaining).toBe(1)
  })

  it('guessing an assassin ends the game as dead', () => {
    const game = setupGame().receiveClue('trap', 1)
    const assassinIdx = firstAssassinIndex(game)

    const after = game.guess(assassinIdx)

    expect(after.state.result).toBe('dead')
    expect(after.state.cards[assassinIdx].outcome).toBe('assassin')
  })

  it('clue is cleared when all guesses are used', () => {
    const game = setupGame().receiveClue('one', 1)
    const mineIdx = firstMineIndex(game)

    const after = game.guess(mineIdx)

    expect(after.state.clue).toBeNull()
    expect(after.state.guessesRemaining).toBe(0)
  })

  it('revealing all mine cards wins the game', () => {
    let game = setupGame()
    const mineIndices = game.state.cards
      .map((c, i) => (c.color === 'blue' ? i : -1))
      .filter((i) => i >= 0)

    for (const idx of mineIndices) {
      game = game.receiveClue(`clue${idx}`, 1)
      game = game.guess(idx)
    }

    expect(game.state.result).toBe('win')
  })
})
