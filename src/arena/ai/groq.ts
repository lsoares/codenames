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
  const systemPrompt = `You are an expert Codenames spymaster. The board has: your words (MINE), opponent words (RED), bystanders (NEUTRAL), and deadly words (ASSASSIN).

Your job: give a one-word clue that links as many MINE words as possible while avoiding dangerous words.

Strategy:
1. First scan for pairs/groups of MINE words with a shared theme, category, or strong association
2. Mild overlap with NEUTRAL is acceptable if it lets you link 3+ MINE words
3. Think about double meanings, categories, compound words, and lateral associations
4. Prefer count 2-4 over safe count-1 clues. A good 3-clue beats a perfect 1-clue in a timed game. Never claim count higher than 4

SAFETY CHECK (do this LAST before answering):
- Would a person hearing your clue think of ANY assassin or red word? If yes, REJECT the clue and pick a different one
- Your clue must NOT belong to the same semantic field as any ASSASSIN word
- Example: if HOSPITAL is assassin, clues like MEDIC, NURSE, SURGERY, HEALTH are ALL forbidden

Rules:
- Exactly ONE word (no spaces, hyphens, or board words)
- NOT a derivative or substring of any board word
- The count must equal the number of MINE words you expect the operative to guess

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
  const systemPrompt = `You are a Codenames operative. Your spymaster gave you a one-word clue and a count (how many words on the board relate to the clue).

Think step by step:
1. Consider ALL meanings of the clue (literal, figurative, category, compound words, idioms)
2. For each board word, rate how strongly it connects to ANY meaning of the clue
3. Pick the single STRONGEST match - the word your spymaster most likely intended
4. If multiple words seem equally strong, prefer the more specific/unusual connection (your spymaster chose this clue deliberately to point to their words, not obvious traps)

Rules:
- Pick exactly 1 word from the board
- The count tells you how many words relate - use it to gauge if the connection should be obvious (count=1) or thematic (count=3+)
- Respond with JSON only: {"guess":"WORD"}`

  const userMessage = `Clue: ${req.clue} (count: ${req.count})
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
