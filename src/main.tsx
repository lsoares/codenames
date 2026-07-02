import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Lobby from './ui/Lobby'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Lobby status="" onCreate={() => {}} onJoin={() => {}} />
  </StrictMode>,
)
