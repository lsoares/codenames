import type { Face } from '../Face'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

export const art: Deck = {
  title: 'Art',
  category: 'abstract',
  difficulty: 'brutal',
  icon: '🎨',
  description: 'Genuinely abstract painting from WikiArt',
  source: 'WikiArt',
  sourceUrl: 'https://www.wikiart.org',
  fetch,
}

const PAINTINGS = [
  'https://uploads8.wikiart.org/images/marsden-hartley/painting-number-5-1915.jpg',
  'https://uploads4.wikiart.org/images/wassily-kandinsky/to-the-unknown-voice-1916.jpg',
  'https://uploads8.wikiart.org/images/theo-van-doesburg/composition-i-still-life-1916.jpg',
  'https://uploads5.wikiart.org/images/vladimir-tatlin/composition-the-month-of-may.jpg',
  'https://uploads5.wikiart.org/images/alexej-von-jawlensky/variation-1916.jpg',
  'https://uploads4.wikiart.org/images/theo-van-doesburg/dance-i.jpg',
  'https://uploads7.wikiart.org/images/marsden-hartley/sextant-1917.jpg',
  'https://uploads0.wikiart.org/images/georgia-o-keeffe/series-i-no-3.jpg',
  'https://uploads0.wikiart.org/images/jean-hugo/panneaux-de-signalisation-de-chemin-de-fer-1918.jpg',
  'https://uploads5.wikiart.org/images/rudolf-bauer/con-roso-1918.jpg',
  'https://uploads3.wikiart.org/images/wassily-kandinsky/white-oval-1919.jpg',
  'https://uploads1.wikiart.org/images/janos-mattis-teutsch/composition-1919(5).jpg',
  'https://uploads2.wikiart.org/images/otto-freundlich/composition-1919.jpg',
  'https://uploads5.wikiart.org/images/hilma-af-klint/the-mahatmas-present-standing-point-series-ii-no-2a-1920.jpg',
  'https://uploads0.wikiart.org/images/janos-mattis-teutsch/composition-1920-5.jpg',
  'https://uploads1.wikiart.org/images/enrico-prampolini/untitled-1920.jpg',
  'https://uploads7.wikiart.org/images/paul-klee/add-in-red-1921(1).jpg',
  'https://uploads1.wikiart.org/images/janos-mattis-teutsch/composition-1921(2).jpg',
  'https://uploads8.wikiart.org/images/victor-servranckx/opus-1-1921.jpg',
  'https://uploads0.wikiart.org/images/wassily-kandinsky/small-worlds-iii-1922.jpg',
  'https://uploads1.wikiart.org/images/lyubov-popova/untitled.jpg',
  'https://uploads0.wikiart.org/images/janos-mattis-teutsch/composition-1922-2.jpg',
  'https://uploads1.wikiart.org/images/janos-mattis-teutsch/composition-1922-10.jpg',
  'https://uploads4.wikiart.org/images/syed-haider-raza/prakriti-purush-i.jpg',
  'https://uploads0.wikiart.org/images/wassily-kandinsky/black-and-violet-1923.jpg',
  'https://uploads1.wikiart.org/images/constantin-brancusi/bird-in-space-1923-1.jpg',
  'https://uploads0.wikiart.org/images/janos-mattis-teutsch/composition-1923-3.jpg',
  'https://uploads0.wikiart.org/images/otto-freundlich/head-self-portrait-1923.jpg',
  'https://uploads2.wikiart.org/images/wassily-kandinsky/black-relationship-1924.jpg',
  'https://uploads3.wikiart.org/images/arthur-dove/sunrise-1924.jpg',
  'https://uploads4.wikiart.org/images/david-kakabadze/constructive-decorative-composition-1924-3(1).jpg',
  'https://uploads7.wikiart.org/00286/images/fernand-leger/2.jpg',
  'https://uploads0.wikiart.org/images/wassily-kandinsky/in-blue-1925.jpg',
  'https://uploads0.wikiart.org/images/janos-mattis-teutsch/composition-1925-2.jpg',
  'https://uploads3.wikiart.org/images/david-kakabadze/z-the-speared-fish-1925(1).jpg',
  'https://uploads7.wikiart.org/images/paul-klee/the-column-1926(1).jpg',
  'https://uploads4.wikiart.org/images/man-ray/long-distance-from-the-portfolio-revolving-doors-1926.jpg',
  'https://uploads3.wikiart.org/images/jean-fautrier/fleures-noires-1926.jpg',
  'https://uploads7.wikiart.org/images/wassily-kandinsky/dark-freshness-1927.jpg',
  'https://uploads4.wikiart.org/images/adnan-coker/unknown-title.jpg',
  'https://uploads7.wikiart.org/images/adnan-coker/unknown-title(8).jpg',
  'https://uploads8.wikiart.org/images/adnan-coker/unknown-title(17).jpg',
  'https://uploads0.wikiart.org/images/victor-servranckx/opus-14-1927.jpg',
  'https://uploads5.wikiart.org/images/wassily-kandinsky/mild-process-1928.jpg',
  'https://uploads5.wikiart.org/images/paul-klee/neuer-stadtteil-in-m-1928.jpg',
  'https://uploads3.wikiart.org/images/stuart-davis/egg-beater-no-4-1928.jpg',
  'https://uploads0.wikiart.org/images/paul-klee/fire-evening-1929(1).jpg',
  'https://uploads6.wikiart.org/images/paul-klee/crystalline-landscape-1929.jpg',
  'https://uploads1.wikiart.org/images/joaquin-torres-garcia/costruzione-geometrica-1929.jpg',
  'https://uploads3.wikiart.org/images/michel-seuphor/composition-v-1929.jpg',
  'https://uploads6.wikiart.org/images/paul-klee/rhythmic-rythmical-1930(1).jpg',
  'https://uploads3.wikiart.org/images/bice-lazzari/red-and-white-signals-1930(2).jpg',
  'https://uploads5.wikiart.org/images/paul-klee/the-light-and-so-much-else-1931(1).jpg',
  'https://uploads0.wikiart.org/images/auguste-herbin/untitled-1931-1.jpg',
  'https://uploads5.wikiart.org/images/wladyslaw-strzeminski/unist-composition-1931.jpg',
  'https://uploads8.wikiart.org/images/gosta-adrian-nilsson/gr-relief-ii-1932.jpg',
  'https://uploads1.wikiart.org/images/edward-wadsworth/dux-et-comes-iv-1932(1).jpg',
  'https://uploads0.wikiart.org/images/joaquin-torres-garcia/constructivo-1933.jpg',
  'https://uploads6.wikiart.org/images/john-ferren/composition-aux-plais-jaunes-1933.jpg',
  'https://uploads0.wikiart.org/images/wassily-kandinsky/surfaces-meeting-1934.jpg',
  'https://uploads7.wikiart.org/images/jean-helion/abstract-copmosition-1934.jpg',
  'https://uploads5.wikiart.org/images/willi-baumeister/soccer-player-1934.jpg',
  'https://uploads5.wikiart.org/images/wassily-kandinsky/brown-with-supplement-1935.jpg',
  'https://uploads1.wikiart.org/images/arthur-dove/lake-afternoon-1935.jpg',
  'https://uploads7.wikiart.org/images/rudolf-bauer/spiritual-pleasures-1935.jpg',
  'https://uploads7.wikiart.org/images/wassily-kandinsky/dominant-curve-1936.jpg',
  'https://uploads2.wikiart.org/images/constantin-flondor/miristedup(1).jpg',
  'https://uploads6.wikiart.org/images/alexej-von-jawlensky/meditation-1936.jpg',
  'https://uploads7.wikiart.org/images/david-smith/unity-of-three-forms-1937.jpg',
  'https://uploads0.wikiart.org/images/john-ferren/lutte-as-ciel-1937.jpg',
  'https://uploads3.wikiart.org/images/paul-klee/heroic-fiddling-1938(1).jpg',
  'https://uploads1.wikiart.org/images/ad-reinhardt/study-for-a-painting-1938-2.jpg',
  'https://uploads0.wikiart.org/images/lawren-harris/abstract-painting-98-1938.jpg',
  'https://uploads8.wikiart.org/images/willi-baumeister/floating-forms-with-white-1938.jpg',
  'https://uploads8.wikiart.org/images/rudolf-bauer/dark-square-1938.jpg',
  'https://uploads8.wikiart.org/images/ad-reinhardt/study-for-a-painting-1939.jpg',
  'https://uploads0.wikiart.org/images/jean-helion/fallen-figure-1939.jpg',
  'https://uploads3.wikiart.org/images/bice-lazzari/senza-titolo-1939(1).jpg',
  'https://uploads8.wikiart.org/images/akkitham-narayanan/untitled-7.jpg',
  'https://uploads1.wikiart.org/images/wassily-kandinsky/sky-blue-1940.jpg',
  'https://uploads5.wikiart.org/images/clyfford-still/ph-351-1940.jpg',
  'https://uploads6.wikiart.org/images/theodore-roszak/bi-polar-in-red-1940.jpg',
  'https://uploads0.wikiart.org/images/arthur-dove/indian-summer-1941.jpg',
  'https://uploads1.wikiart.org/images/wassily-kandinsky/a-floating-figure-1942.jpg',
  'https://uploads0.wikiart.org/images/lawren-harris/abstract-painting-20-1942.jpg',
  'https://uploads2.wikiart.org/00269/images/paul-nash/november-moon-1942-1.jpg',
  'https://uploads5.wikiart.org/images/joaquin-torres-garcia/arte-constructivo-1943.jpg',
  'https://uploads7.wikiart.org/00269/images/paul-nash/landscape-of-the-bagley-woods-1943.jpg',
  'https://uploads5.wikiart.org/images/hilma-af-klint/untitled(2).jpg',
  'https://uploads5.wikiart.org/00209/images/alexander-calder/fetishes-1944.jpg',
  'https://uploads7.wikiart.org/images/francis-picabia/in-favor-of-criticism.jpg',
  'https://uploads6.wikiart.org/images/serge-charchoune/the-violin-s-reflection-1945.jpg',
  'https://uploads3.wikiart.org/images/perle-fine/untitled-1946.jpg',
  'https://uploads4.wikiart.org/images/willi-baumeister/african-tale-1946.jpg',
  'https://uploads2.wikiart.org/00269/images/paul-nash/sunset-flower-1947-1.jpg',
  'https://uploads1.wikiart.org/images/willi-baumeister/primordial-figures-1947.jpg',
  'https://uploads5.wikiart.org/images/tiberiy-szilvashi/untitled.jpg',
  'https://uploads8.wikiart.org/images/tiberiy-szilvashi/untitled-11.jpg',
  'https://uploads8.wikiart.org/images/tiberiy-szilvashi/untitled-21.jpg',
  'https://uploads8.wikiart.org/images/tiberiy-szilvashi/untitled-29.jpg',
  'https://uploads8.wikiart.org/images/tiberiy-szilvashi/untitled-37.jpg',
  'https://uploads5.wikiart.org/images/victor-pasmore/square-motif-green-lilac-1948.jpg',
  'https://uploads5.wikiart.org/images/willi-baumeister/red-landscape-1948.jpg',
  'https://uploads4.wikiart.org/images/victor-pasmore/abstract-in-white-grey-and-ochre-1949.jpg',
  'https://uploads5.wikiart.org/images/joaquin-torres-garcia/unknown-title.jpg',
  'https://uploads1.wikiart.org/images/victor-pasmore/square-motif-blue-and-gold-the-eclipse-1950.jpg',
  'https://uploads2.wikiart.org/images/princess-fahrelnissa-zeid/untitled-1950-1.jpg',
  'https://uploads7.wikiart.org/00182/images/maria-helena-vieira-da-silva/1950-la-garde-des-anges-losi-web-768x497.jpg',
  'https://uploads8.wikiart.org/images/princess-fahrelnissa-zeid/my-hell-1951.jpg',
  'https://uploads0.wikiart.org/images/josef-ma/paysage-1952.jpg',
  'https://uploads8.wikiart.org/images/jock-macdonald/fluctuating-planes-1952.jpg',
  'https://uploads0.wikiart.org/00333/images/else-alfelt/minerals-verso-1952.jpg',
  'https://uploads1.wikiart.org/images/alexander-calder/black-sun-1953.jpg',
  'https://uploads8.wikiart.org/images/alberto-magnelli/animated-tension-1953.jpg',
  'https://uploads7.wikiart.org/images/john-marin/wehawken-sequence.jpg',
  'https://uploads3.wikiart.org/images/princess-fahrelnissa-zeid/the-arena-of-the-sun-1954.jpg',
  'https://uploads0.wikiart.org/images/dimitris-mytaras/interior-1955.jpg',
  'https://uploads6.wikiart.org/images/enrico-prampolini/apparizione-cosmica-ii-1955.jpg',
  'https://uploads8.wikiart.org/images/willi-baumeister/abstrakte-komposition.jpg',
  'https://uploads4.wikiart.org/images/mordecai-ardon/for-the-fallen-triptych-1956.jpg',
  'https://uploads2.wikiart.org/images/alexander-rodchenko/construction.jpg',
  'https://uploads7.wikiart.org/images/jos-sobral-de-almada-negreiros/quadrant-i-1957.jpg',
  'https://uploads6.wikiart.org/images/le-corbusier/adieu-von-1957.jpg',
  'https://uploads1.wikiart.org/images/constantin-brancusi/the-newborn.jpg',
  'https://uploads1.wikiart.org/images/milton-avery/sail-1958.jpg',
  'https://uploads1.wikiart.org/images/anni-albers/tikal-1958.jpg',
  'https://uploads7.wikiart.org/images/tihamer-gyarmathy/celestial-body-1958.jpg',
  'https://uploads7.wikiart.org/00315/images/lois-mailou-jones/shapes-and-colors-1958.jpg',
  'https://uploads2.wikiart.org/images/serge-charchoune/marche-fun-bre-de-beethoven-3-me-tape-1959.jpg',
  'https://uploads1.wikiart.org/images/wolfgang-paalen/la-femme-blonde.jpg',
  'https://uploads3.wikiart.org/images/salvador-dali/untitled-the-lady-of-avignon.jpg',
  'https://uploads3.wikiart.org/images/josef-ma/paysage-bleu-gris-horizontal-1960.jpg',
  'https://uploads4.wikiart.org/images/tihamer-gyarmathy/remembrance-1960.jpg',
  'https://uploads4.wikiart.org/00126/images/alla-horska/sunflower-1960c.jpg',
  'https://uploads6.wikiart.org/images/janos-mattis-teutsch/green-flower-of-the-soul.jpg',
  'https://uploads4.wikiart.org/images/syed-haider-raza/ciel-rouge-sur-le-lac-1961.jpg',
  'https://uploads3.wikiart.org/images/gio-pomodoro/bangle-1961.jpg',
  'https://uploads5.wikiart.org/images/li-yuan-chia/untitled-1962.jpg',
  'https://uploads5.wikiart.org/images/anthony-caro/early-one-morning-1962.jpg',
  'https://uploads1.wikiart.org/00134/images/john-altoon/john-altoon.jpg',
  'https://uploads6.wikiart.org/images/yiannis-moralis/memory-1963.jpg',
  'https://uploads1.wikiart.org/images/gio-pomodoro/forma-distesa-1963.jpg',
  'https://uploads7.wikiart.org/images/roy-lichtenstein/nonobjective-ii-1964.jpg',
  'https://uploads3.wikiart.org/00114/images/george-saru/tumblr-n1ldo3sjum1tur0p6o3-r1-500.jpg',
  'https://uploads3.wikiart.org/images/roy-lichtenstein/yellow-brushstroke-i-1965.jpg',
  'https://uploads6.wikiart.org/images/etienne-hajdu/founette-1965.jpg',
  'https://uploads6.wikiart.org/images/alberto-magnelli/repercussion-4-1965.jpg',
  'https://uploads4.wikiart.org/00315/images/hale-woodruff/yellow-landscape-c-1965.jpg',
  'https://uploads8.wikiart.org/images/josef-ma/m-tamorphose-iv-1966.jpg',
  'https://uploads4.wikiart.org/images/etienne-hajdu/balkis-1966.jpg',
]

function loads(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(src)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function attribution(url: string): string | undefined {
  const match = url.match(/\/images\/([^/]+)\/(.+)\.[a-z]+$/i)
  if (!match) return undefined
  const titleize = (slug: string): string =>
    slug
      .replace(/-web-\d+x\d+$/, '')
      .replace(/\(\d+\)$/, '')
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  return `${titleize(match[2])} — ${titleize(match[1])}`
}

function wikiartPage(url: string): string | undefined {
  const match = url.match(/\/images\/([^/]+)\/(.+)\.[a-z]+$/i)
  return match
    ? `https://www.wikiart.org/en/${match[1]}/${match[2].replace(/\(\d+\)$/, '')}`
    : undefined
}

async function fetch(total = 20): Promise<Face[]> {
  const pool = shuffle(PAINTINGS)
  const faces = new Set<string>()
  for (let i = 0; i < pool.length && faces.size < total; i += 26) {
    for (const src of await Promise.all(pool.slice(i, i + 26).map(loads))) if (src) faces.add(src)
  }

  if (faces.size < total) throw new Error('WikiArt returned too few images')
  return [...faces].slice(0, total).map((url) => ({
    kind: 'image',
    url,
    tooltip: attribution(url),
    fit: 'contain',
    link: wikiartPage(url),
  }))
}
