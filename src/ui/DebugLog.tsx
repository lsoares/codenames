import { useEffect, useRef, useState } from 'react'
import styles from './DebugLog.module.css'

type Listener = (lines: string[]) => void

const lines: string[] = []
const listeners = new Set<Listener>()

const record = (level: string, args: unknown[]) => {
  const text = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  lines.push(level === 'info' || level === 'log' ? text : `[${level}] ${text}`)
  if (lines.length > 200) lines.shift()
  const snapshot = [...lines]
  listeners.forEach((listener) => listener(snapshot))
}

;(['log', 'info', 'warn', 'error'] as const).forEach((level) => {
  const original = console[level].bind(console)
  console[level] = (...args: unknown[]) => {
    record(level, args)
    original(...args)
  }
})

export default function DebugLog(props: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [log, setLog] = useState<string[]>([])
  useEffect(() => {
    listeners.add(setLog)
    setLog([...lines])
    return () => void listeners.delete(setLog)
  }, [])
  useEffect(() => {
    if (props.open) dialog.current?.showModal()
  }, [props.open])
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label="Connection logs"
      onClose={props.onClose}
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close()
      }}
    >
      <pre className={styles.log}>{log.join('\n') || 'No logs yet.'}</pre>
    </dialog>
  )
}
