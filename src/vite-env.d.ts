/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UNSPLASH_ACCESS_KEY?: string
  readonly VITE_PEXELS_API_KEY?: string
  readonly VITE_PEER_HOST?: string
  readonly VITE_PEER_PORT?: string
  readonly VITE_PEER_PATH?: string
  readonly VITE_PEER_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
