import type { Face } from '../Face'
import type { Deck } from './deck'

export const pokemon: Deck = {
  id: 'pokemon',
  label: 'Pokémon',
  category: 'culture',
  difficulty: 'tough',
  icon: '⚡',
  description: 'Official Pokémon artwork',
  source: 'PokéAPI',
  sourceUrl: 'https://pokeapi.co',
  fetch,
}

interface Pokemon {
  name: string
  sprites: { other: { 'official-artwork': { front_default: string | null } } }
}

async function fetch(total = 20): Promise<Face[]> {
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
    return p && url ? [{ url, name: p.name }] : []
  })

  if (faces.length < total) throw new Error('PokeAPI returned too few images')
  return faces.slice(0, total).map(({ url, name }) => ({
    kind: 'image',
    url,
    tooltip: name.charAt(0).toUpperCase() + name.slice(1),
    link: `https://www.pokemon.com/us/pokedex/${name}`,
  }))
}
