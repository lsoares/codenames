import { useEffect, useState } from 'react'
import { ClassicApp } from './classic/App'
import { ArenaApp } from './arena/App'

export function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (path.startsWith('/arena-') || path === '/arena')
    return <ArenaApp code={path.startsWith('/arena-') ? path.slice(1) : undefined} />

  return <ClassicApp />
}
