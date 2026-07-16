export async function getApiKey(): Promise<string | null> {
  return idbGet('aiKey:groq')
}

export async function setApiKey(key: string): Promise<void> {
  return idbSet('aiKey:groq', key)
}

export async function clearApiKey(): Promise<void> {
  return idbDelete('aiKey:groq')
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('codenames', 1)
    const timer = setTimeout(() => reject(new Error('IndexedDB open timed out')), 8000)
    const settle = <T>(fn: (arg: T) => void, arg: T) => { clearTimeout(timer); fn(arg) }
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onsuccess = () => settle(resolve, req.result)
    req.onerror = () => settle(reject, req.error)
    req.onblocked = () => settle(reject, new Error('IndexedDB open blocked'))
  })
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly').objectStore('kv').get(key)
    tx.onsuccess = () => resolve((tx.result as string) ?? null)
    tx.onerror = () => reject(tx.error)
  })
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite').objectStore('kv').put(value, key)
    tx.onsuccess = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite').objectStore('kv').delete(key)
    tx.onsuccess = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
