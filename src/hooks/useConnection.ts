import { useEffect } from "react"
import { useSessionStore } from "../stores/sessionStore"
import type { ConnectionHealth } from "../types"

export function useConnection() {
  const { connectionHealth, setConnectionHealth } = useSessionStore()

  useEffect(() => {
    if (!window.monacopilot) return

    const cleanup = window.monacopilot.onConnectionChange((status) => {
      setConnectionHealth(status as ConnectionHealth)
    })

    return cleanup
  }, [setConnectionHealth])

  return { connectionHealth }
}
