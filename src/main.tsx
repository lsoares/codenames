import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClassicApp } from './classic/App'
import './analytics'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClassicApp />
  </StrictMode>,
)
