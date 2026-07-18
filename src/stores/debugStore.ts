import { create } from "zustand"

interface DebugState {
  logs: string[]
  log: (msg: string) => void
  clear: () => void
}

export const useDebugStore = create<DebugState>((set) => ({
  logs: [],
  log: (msg) => {
    const ts = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    const line = `[${ts}] ${msg}`
    console.log(`[DEBUG] ${msg}`)
    set((state) => ({ logs: [line, ...state.logs].slice(0, 100) }))
  },
  clear: () => set({ logs: [] })
}))
