import React, { useCallback, useEffect, useState } from "react"
import { useSessionStore } from "./stores/sessionStore"
import LoginScreen from "./components/LoginScreen"
import CopilotShell from "./components/CopilotShell"
import DebugPanel from "./components/DebugPanel"

const DEV_MODE = import.meta.env.VITE_DEV_SKIP_AUTH === "true"

const BASE_WIDTH = 380
const BASE_HEIGHT = 600
const MIN_SCALE = 1
const MAX_SCALE = 2

const App: React.FC = () => {
  const { isAuthenticated, setAuthenticated, settings } = useSessionStore()

  useEffect(() => {
    const updateFontScale = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const widthScale = width / BASE_WIDTH
      const heightScale = height / BASE_HEIGHT
      const scale = Math.min(widthScale, heightScale)
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale))
      document.documentElement.style.setProperty("--font-scale", String(clampedScale))
      document.documentElement.style.fontSize = `${clampedScale * 100}%`
    }

    updateFontScale()
    window.addEventListener("resize", updateFontScale)
    return () => window.removeEventListener("resize", updateFontScale)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (settings.darkMode) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("mona-dark-mode", String(settings.darkMode))
  }, [settings.darkMode])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEV_MODE) {
      setAuthenticated(true)
      setLoading(false)
      return
    }

    if (window.monacopilot) {
      window.monacopilot.checkAuth().then((result) => {
        if (result.authenticated) {
          setAuthenticated(true)
        }
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [setAuthenticated])

  useEffect(() => {
    if (!window.monacopilot) return

    const cleanup = window.monacopilot.onAuthExpired(() => {
      useSessionStore.getState().logout()
    })

    return cleanup
  }, [])

  const handleLoginSuccess = useCallback(() => {
    setAuthenticated(true)
  }, [setAuthenticated])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-mona-dark">
        <div className="flex flex-col items-center gap-3">
          <img
            src={settings.darkMode ? "/logo_light.png" : "/logo_dark.png"}
            alt="MONA"
            className="h-6"
          />
          <div className="w-5 h-5 border-2 border-mona-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-hidden">
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        </div>
        <DebugPanel />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden">
        <CopilotShell />
      </div>
      <DebugPanel />
    </div>
  )
}

export default App
