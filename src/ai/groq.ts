export interface ClueRequest {
  key: string
  mineWords: string[]
  assassinWords: string[]
  revealedWords: string[]
}

export async function fetchClue(req: ClueRequest): Promise<{ word: string; count: number }> {
  const systemPrompt = `You are a Codenames spymaster. You see a board of words. Some are yours (MINE), some are deadly (ASSASSIN). Previously revealed words are listed so you don't reuse them.

Give a single-word clue and a count (how many MINE words it connects to). The clue must:
- Be exactly ONE word (no spaces, no hyphens, no proper nouns that are on the board)
- NOT be any word on the board or a derivative of one
- Connect exactly COUNT of your MINE words through meaning, association, or category
- AVOID connecting to ASSASSIN words (these kill the guesser)

Respond with JSON only: {"word":"YOUR_CLUE","count":N}`

  const userMessage = `MINE words: ${req.mineWords.join(', ')}
ASSASSIN words: ${req.assassinWords.join(', ')}
Already revealed: ${req.revealedWords.length > 0 ? req.revealedWords.join(', ') : 'none'}`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${req.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Invalid API key.')
    if (res.status === 429) throw new Error('AI quota exceeded. Try again later.')
    const msg = data.error?.message || `Groq error ${res.status}`
    throw new Error(msg)
  }

  const raw: string = data.choices?.[0]?.message?.content ?? ''
  const parsed = JSON.parse(raw)
  return { word: String(parsed.word).toUpperCase(), count: Number(parsed.count) }
}

export interface GuessRequest {
  key: string
  clue: string
  count: number
  words: string[]
}

export async function fetchGuesses(req: GuessRequest): Promise<string[]> {
  const systemPrompt = `You are a Codenames operative. Your spymaster gave you a one-word clue and a count. You must pick exactly COUNT words from the board that you think the clue refers to.

Rules:
- Pick exactly ${req.count} word(s) from the board
- Choose words most strongly associated with the clue
- You do NOT know which words are yours or which are deadly
- Respond with JSON only: {"guesses":["WORD1","WORD2"]}`

  const userMessage = `Clue: ${req.clue} (${req.count})
Board words: ${req.words.join(', ')}`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${req.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Invalid API key.')
    if (res.status === 429) throw new Error('AI quota exceeded. Try again later.')
    const msg = data.error?.message || `Groq error ${res.status}`
    throw new Error(msg)
  }

  const raw: string = data.choices?.[0]?.message?.content ?? ''
  const parsed = JSON.parse(raw)
  const guesses: string[] = parsed.guesses ?? parsed
  return guesses.slice(0, req.count).map((w) => String(w).toUpperCase())
}
