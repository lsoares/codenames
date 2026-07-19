export interface ClueRequest {
  key: string
  mineWords: string[]
  assassinWords: string[]
  opponentWords: string[]
  neutralWords: string[]
  revealedWords: string[]
}

export async function fetchClue(
  req: ClueRequest,
): Promise<{ word: string; count: number; targets: string[] }> {
  const systemPrompt = `You are a bold Codenames spymaster. You see a board of words: yours (MINE), opponent (RED), bystanders (NEUTRAL), and deadly (ASSASSIN). Previously revealed words are listed so you don't reuse them.

Give a single-word clue and a count (how many MINE words it connects to). The clue must:
- Be exactly ONE word (no spaces, no hyphens, no proper nouns that are on the board)
- NOT be any word on the board or a derivative of one
- Connect exactly COUNT of your MINE words through meaning, association, or category
- NEVER connect to ASSASSIN words (instant death)
- AVOID connecting to RED words (heavy time penalty) or NEUTRAL words (mild time penalty)

Play aggressively: aim for high counts (2-4) when you can find a clever connection. Take calculated risks to link more words. A count of 1 is a last resort.

Respond with JSON only: {"word":"YOUR_CLUE","count":N,"targets":["WORD1","WORD2"]}`

  const userMessage = `MINE words: ${req.mineWords.join(', ')}
RED words: ${req.opponentWords.join(', ')}
NEUTRAL words: ${req.neutralWords.join(', ')}
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
  const targets: string[] = (parsed.targets ?? []).map((w: string) => String(w).toUpperCase())
  return { word: String(parsed.word).toUpperCase(), count: Number(parsed.count), targets }
}

export interface GuessRequest {
  key: string
  clue: string
  count: number
  words: string[]
}

export async function fetchGuess(req: GuessRequest): Promise<string> {
  const systemPrompt = `You are a Codenames operative. Your spymaster gave you a one-word clue. Pick the ONE word from the board that BEST matches the clue right now.

Rules:
- Pick exactly 1 word from the board
- Choose the word most strongly associated with the clue
- You do NOT know which words are yours or which are deadly
- Be bold: go with your strongest association, even if risky
- Respond with JSON only: {"guess":"WORD"}`

  const userMessage = `Clue: ${req.clue}
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
  return String(parsed.guess ?? parsed).toUpperCase()
}
