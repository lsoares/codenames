import type { CardProvider } from './providers'

interface Pokemon {
  sprites: { other: { 'official-artwork': { front_default: string | null } } }
}

// Fetches 20 Pokémon official-artwork images. Picks random dex numbers (1–1025)
// so boards vary between games — the iconic silhouettes and names make strong
// card faces. Throws if too few have artwork or a request fails, so the caller
// can fall back to another provider. No key required.
async function fetch(): Promise<string[]> {
  const ids = new Set<number>()
  while (ids.size < 30) ids.add(Math.floor(Math.random() * 1025) + 1)

  const pokemon = await Promise.all(
    [...ids].map((id) =>
      window
        .fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
        .then((r) => (r.ok ? (r.json() as Promise<Pokemon>) : null))
        .catch(() => null),
    ),
  )

  const faces = pokemon.flatMap((p) => {
    const url = p?.sprites.other['official-artwork'].front_default
    return url ? [url] : []
  })

  if (faces.length < 20) throw new Error('PokeAPI returned too few images')
  return faces.slice(0, 20)
}

export const pokemon: CardProvider = {
  id: 'pokemon',
  label: 'Pokémon',
  icon: '⚡',
  kind: 'image',
  fetch,
}
