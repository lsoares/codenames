import { useState } from 'react'
import { setApiKey } from './keyStore'
import styles from './AiSetup.module.css'

export function AiSetup(props: { onReady: (key: string) => void }) {
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)

  return (
    <div className={styles.setup}>
      <h2 className={styles.heading}>AI Setup</h2>
      <p className={styles.privacy}>Your API key stays on your device and is sent only to Groq.</p>
      <form
        className={styles.form}
        onSubmit={async (event) => {
          event.preventDefault()
          const trimmed = key.trim()
          if (!trimmed) return
          setSaving(true)
          try {
            await setApiKey(trimmed)
            props.onReady(trimmed)
          } finally {
            setSaving(false)
          }
        }}
      >
        <input
          className={styles.input}
          type="password"
          value={key}
          placeholder="Paste your Groq API key"
          aria-label="API key"
          autoComplete="current-password"
          onChange={(event) => setKey(event.target.value)}
        />
        <button type="submit" className={styles.button} disabled={!key.trim() || saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
      <p className={styles.link}>
        <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
          Create a Groq API key
        </a>
      </p>
    </div>
  )
}
