import { useState } from 'react'
import { setApiKey } from './keyStore'
import styles from './AiSetup.module.css'

export function AiSetup(props: { onReady: (key: string) => void }) {
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)

  return (
    <div className={styles.setup}>
      <h2 className={styles.heading}>AI Setup</h2>
      <p className={styles.note}>
        Solo mode uses Groq to generate clues. Your key stays on this device and is sent only to
        Groq.
      </p>
      <form
        className={styles.form}
        onSubmit={async (event) => {
          event.preventDefault()
          const trimmed = key.trim()
          if (!trimmed) return
          setSaving(true)
          await setApiKey(trimmed)
          props.onReady(trimmed)
        }}
      >
        <input
          className={styles.keyInput}
          type="password"
          value={key}
          required
          placeholder="Paste your Groq API key"
          aria-label="API key"
          autoComplete="current-password"
          onChange={(event) => setKey(event.target.value)}
        />
        <button type="submit" className={styles.save} disabled={!key.trim() || saving}>
          Save
        </button>
      </form>
      <a
        className={styles.create}
        href="https://console.groq.com/keys"
        target="_blank"
        rel="noopener noreferrer"
      >
        Create a Groq API key
      </a>
    </div>
  )
}
