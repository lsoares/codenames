import { useState } from 'react'
import { Profile, profileEmojis } from './Profile'
import styles from './ProfileForm.module.css'

export function savedProfile(): Profile | null {
  try {
    const { name, emoji } = JSON.parse(localStorage.getItem('codenames:profile') ?? '{}')
    return Profile.of(String(name ?? ''), String(emoji ?? ''))
  } catch {
    return null
  }
}

export function ProfileForm(props: {
  current: Profile | null
  onSave: (profile: Profile) => void
}) {
  const [name, setName] = useState(props.current?.name ?? '')
  const [emoji, setEmoji] = useState(
    () => props.current?.emoji ?? profileEmojis[Math.floor(Math.random() * profileEmojis.length)],
  )
  const profile = Profile.of(name, emoji)
  return (
    <main className={styles.screen}>
      <form
        className={`card ${styles.form}`}
        onSubmit={(event) => {
          event.preventDefault()
          if (!profile) return
          localStorage.setItem('codenames:profile', JSON.stringify(profile))
          props.onSave(profile)
        }}
      >
        <img src="/favicon.svg" alt="" className={styles.logo} />
        <h1 className={styles.title}>Who's playing?</h1>
        <input
          className={styles.name}
          value={name}
          aria-label="Your name"
          placeholder="Your name"
          maxLength={Profile.maxNameLength}
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
        <fieldset className={styles.emojis}>
          <legend className={styles.legend}>Pick your emoji</legend>
          {profileEmojis.map((option) => (
            <label key={option} className={styles.emoji}>
              <input
                type="radio"
                name="emoji"
                value={option}
                checked={option === emoji}
                onChange={() => setEmoji(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={!profile}>
          Let's play
        </button>
      </form>
    </main>
  )
}
