import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchClue } from './groq'

describe('fetchClue', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the board to Groq and parses the clue response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{"word":"ANIMAL","count":3}' } }],
      }),
    }))

    const result = await fetchClue({
      key: 'test-key',
      mineWords: ['DOG', 'CAT', 'HORSE'],
      assassinWords: ['BOMB', 'TRAP'],
      revealedWords: ['FISH'],
    })

    expect(result).toEqual({ word: 'ANIMAL', count: 3 })
    expect(fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    )
  })

  it('throws on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Invalid API key.' } }),
    }))

    await expect(fetchClue({
      key: 'bad-key',
      mineWords: ['DOG'],
      assassinWords: ['BOMB'],
      revealedWords: [],
    })).rejects.toThrow('Invalid API key')
  })
})
