import type { Face } from '../Face'
import type { CardProvider } from './providers'

export const pokemon: CardProvider = {
  id: 'pokemon',
  label: 'Pokémon', group: 'culture',
  icon: '⚡',
  description: 'Official Pokémon artwork',
  credit: { label: 'PokéAPI', url: 'https://pokeapi.co' },
  hidden: true,
  fetch,
}

interface Pokemon {
  name: string
  sprites: { other: { 'official-artwork': { front_default: string | null } } }
}

async function fetch(): Promise<Face[]> {
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

  if (faces.length < 20) throw new Error('PokeAPI returned too few images')
  return faces.slice(0, 20).map(({ url, name }) => ({
    kind: 'image',
    url,
    tooltip: name.charAt(0).toUpperCase() + name.slice(1),
    link: `https://www.pokemon.com/us/pokedex/${name}`,
  }))
}
