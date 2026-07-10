import type { Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

export const dogs: CardProvider = { id: 'dogs', label: 'Dogs', icon: '🐶', description: 'Dogs acting out HTTP status codes', credit: { label: 'HTTP Dogs', url: 'https://http.dog' }, hidden: true, fetch }

const CODES = [
  100, 101, 102, 200, 201, 202, 203, 204, 206, 207, 300, 301, 302, 303, 304,
  307, 308, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412,
  413, 414, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431,
  444, 450, 451, 499, 500, 501, 502, 503, 504, 506, 507, 508, 510, 511, 599,
]

async function fetch(): Promise<Face[]> {
  return shuffle(CODES)
    .slice(0, 20)
    .map((code) => ({ kind: 'image', url: `https://http.dog/${code}.jpg`, fit: 'contain' }))
}
