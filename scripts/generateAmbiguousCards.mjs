import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const TOTAL = 280
const OUT = 'generated-cards'
const CONCURRENCY = 3

const NOUNS = [
  'anchor',
  'whale',
  'key',
  'clock',
  'ladder',
  'umbrella',
  'cactus',
  'robot',
  'violin',
  'lighthouse',
  'balloon',
  'crown',
  'anchor',
  'castle',
  'dragon',
  'igloo',
  'kite',
  'lantern',
  'mermaid',
  'octopus',
  'parachute',
  'pyramid',
  'rocket',
  'sailboat',
  'telescope',
  'tractor',
  'volcano',
  'windmill',
  'acorn',
  'bee',
  'bell',
  'boot',
  'bridge',
  'cactus',
  'candle',
  'cannon',
  'compass',
  'crab',
  'diamond',
  'drum',
  'eagle',
  'feather',
  'fountain',
  'glove',
  'guitar',
  'hammer',
  'helmet',
  'hook',
  'jellyfish',
  'kettle',
  'knight',
  'lemon',
  'lock',
  'magnet',
  'mask',
  'moon',
  'mountain',
  'mushroom',
  'nail',
  'needle',
  'nest',
  'owl',
  'palm tree',
  'peacock',
  'pencil',
  'piano',
  'pinecone',
  'pirate',
  'pitcher',
  'planet',
  'pretzel',
  'pumpkin',
  'rabbit',
  'raft',
  'rainbow',
  'ring',
  'saddle',
  'saw',
  'scarecrow',
  'scissors',
  'seahorse',
  'shell',
  'shield',
  'skull',
  'snail',
  'snake',
  'snowman',
  'spider',
  'spoon',
  'star',
  'stethoscope',
  'submarine',
  'sword',
  'teapot',
  'tent',
  'thimble',
  'tooth',
  'top hat',
  'tornado',
  'train',
  'trophy',
  'trumpet',
  'turtle',
  'unicorn',
  'vase',
  'wagon',
  'wand',
  'watch',
  'well',
  'wheel',
  'wheelbarrow',
  'whistle',
  'wig',
  'wolf',
  'anvil',
  'apple',
  'axe',
  'banana',
  'barrel',
  'basket',
  'beard',
  'beetle',
  'bicycle',
  'binoculars',
  'bone',
  'bowtie',
  'brick',
  'broom',
  'bucket',
  'bulb',
  'butterfly',
  'button',
  'cage',
  'camel',
  'camera',
  'chain',
  'chair',
  'cherry',
  'chess',
  'chimney',
  'cloud',
  'clover',
  'coconut',
  'coin',
  'cork',
  'crocodile',
  'cup',
  'dice',
  'dolphin',
  'donut',
  'egg',
  'elephant',
  'envelope',
  'fan',
  'fern',
  'fish',
  'flag',
  'flamingo',
  'flute',
  'fork',
]

async function main() {
  const cap = Number.parseInt(process.argv[2] ?? '', 10)
  const limit = Number.isInteger(cap) && cap > 0 ? cap : TOTAL
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('Set OPENAI_API_KEY in the environment')

  await mkdir(OUT, { recursive: true })
  const manifest = await readManifest()

  const missing = []
  for (let n = 0; n < TOTAL; n++) if (!(await exists(join(OUT, `card-${n}.png`)))) missing.push(n)
  const todo = missing.slice(0, limit)

  console.log(
    `${TOTAL - missing.length}/${TOTAL} already done · generating ${todo.length} this run`,
  )

  let cursor = 0
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < todo.length) {
      const n = todo[cursor++]
      const nouns = pickNouns()
      const b64 = await generate(nouns, key)
      await writeFile(join(OUT, `card-${n}.png`), Buffer.from(b64, 'base64'))
      manifest[n] = nouns
      await writeManifest(manifest)
      console.log(`card-${n}.png · ${nouns.join(' + ')}`)
    }
  })
  await Promise.all(workers)

  console.log('done')
}

function pickNouns() {
  const count = Math.random() < 0.5 ? 2 : 3
  const picked = new Set()
  while (picked.size < count) picked.add(NOUNS[Math.floor(Math.random() * NOUNS.length)])
  return [...picked]
}

function buildPrompt(nouns) {
  const list = nouns.map((n) => `a ${n}`)
  const joined =
    list.length === 3 ? `${list[0]}, ${list[1]} and ${list[2]}` : `${list[0]} and ${list[1]}`
  return `A single whimsical storybook illustration that combines ${joined} into one coherent surreal scene. Flat vector art, bold clean outlines, bright limited colour palette, soft flat shading, centered composition on a plain pale neutral background. Absolutely no text, no letters, no numbers, no words, no logos, no signage, no captions.`
}

async function generate(nouns, key) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: buildPrompt(nouns),
        size: '1024x1024',
        quality: 'low',
        n: 1,
      }),
    })
    if (res.ok) return (await res.json()).data[0].b64_json
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const wait = 2 ** attempt * 1000
      console.warn(`  ${res.status} · retrying in ${wait}ms`)
      await new Promise((r) => setTimeout(r, wait))
      continue
    }
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  }
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(join(OUT, 'manifest.json'), 'utf8'))
  } catch {
    return {}
  }
}

function writeManifest(manifest) {
  return writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
