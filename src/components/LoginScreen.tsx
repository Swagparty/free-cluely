import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, ExternalLink, Key, X, Sun, Moon, Lightbulb } from "lucide-react"
import { useSessionStore } from "../stores/sessionStore"

interface LoginScreenProps {
  onLoginSuccess: () => void
}

const LOGO_DARK = "/logo_light.png"
const LOGO_LIGHT = "/logo_dark.png"

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation()
  const { settings, updateSettings } = useSessionStore()
  const [waiting, setWaiting] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualKey, setManualKey] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showRetry, setShowRetry] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)

  const tips = t("auth.tips", { returnObjects: true }) as string[]

  useEffect(() => {
    if (!waiting) return
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [waiting, tips.length])

  useEffect(() => {
    if (!waiting) {
      setShowRetry(false)
      return
    }
    const timer = setTimeout(() => setShowRetry(true), 30000)
    return () => clearTimeout(timer)
  }, [waiting, retryCount])

  useEffect(() => {
    if (!window.monacopilot) return

    const cleanup = window.monacopilot.onDeepLink((data) => {
      setWaiting(false)
      if (data.success) {
        onLoginSuccess()
      } else {
        setError(data.error || t("auth.error"))
        setShowManual(true)
      }
    })

    return cleanup
  }, [onLoginSuccess, t])

  const handleOpenPlatform = () => {
    if (!window.monacopilot) return
    setError("")
    setShowRetry(false)
    setRetryCount((c) => c + 1)
    setWaiting(true)
    window.monacopilot.openPlatformLogin()
  }

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualKey.trim() || !window.monacopilot) return

    setError("")
    setLoading(true)

    const result = await window.monacopilot.login(manualKey.trim())
    if (result.success) {
      onLoginSuccess()
    } else {
      setError(result.error || t("auth.error"))
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-mona-dark">
      <div className="draggable-area flex items-center justify-end px-3 py-2
        bg-mona-card border-b border-copilot-border select-none shrink-0">
        <span className="font-heading text-xs font-bold text-copilot-text-muted mr-auto">MONA Live</span>
        <button
          onClick={() => updateSettings({ darkMode: !settings.darkMode })}
          className="p-1 hover:bg-mona-hover rounded transition-colors mr-1"
          title={settings.darkMode ? "Light Mode" : "Dark Mode"}
        >
          {settings.darkMode
            ? <Sun size={13} className="text-copilot-text-muted" />
            : <Moon size={13} className="text-copilot-text-muted" />}
        </button>
        <button
          onClick={() => window.monacopilot?.quitApp()}
          className="p-1 hover:bg-red-500/20 rounded transition-colors"
        >
          <X size={13} className="text-copilot-text-muted hover:text-red-400" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6">

      <div className="mb-8">
        <img
          src={settings.darkMode ? LOGO_DARK : LOGO_LIGHT}
          alt="MONA"
          className="w-40 max-w-[50vw] block mx-auto"
        />
      </div>

      <div className="mona-card w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <h1 className="font-heading text-xl font-bold text-copilot-text">MONA Live</h1>
          <p className="text-copilot-text-secondary text-sm mt-1">{t("auth.subtitle")}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 mb-4">
            <span className="text-red-400 text-xs">{error}</span>
          </div>
        )}

        {waiting ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <Loader2 size={28} className="text-mona-primary animate-spin" />
            <p className="text-sm text-copilot-text-secondary text-center">
              {t("auth.waiting")}
            </p>

            <div className="w-full mt-2 p-3 rounded-lg bg-mona-primary/5 border border-mona-primary/20">
              <div className="flex items-start gap-2">
                <Lightbulb size={14} className="text-mona-primary-light mt-0.5 shrink-0" />
                <p className="text-xs text-copilot-text-secondary leading-relaxed animate-fade-in" key={tipIndex}>
                  {tips[tipIndex]}
                </p>
              </div>
            </div>

            {showRetry && (
              <button
                onClick={handleOpenPlatform}
                className="w-full py-2 rounded-md border border-mona-primary/40 text-mona-primary-light
                  text-xs font-medium hover:bg-mona-primary/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={12} />
                {t("auth.retry")}
              </button>
            )}
            <button
              onClick={() => { setWaiting(false); setShowManual(true) }}
              className="text-[10px] text-copilot-text-muted hover:text-copilot-text-secondary
                transition-colors underline"
            >
              {t("auth.manualFallback")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleOpenPlatform}
              className="w-full py-3 rounded-md mona-gradient text-white text-sm font-semibold
                hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <ExternalLink size={15} />
              {t("auth.openPlatform")}
            </button>

            {!showManual && (
              <button
                onClick={() => setShowManual(true)}
                className="text-[10px] text-copilot-text-muted hover:text-copilot-text-secondary
                  transition-colors text-center"
              >
                {t("auth.haveKey")}
              </button>
            )}

            {showManual && (
              <form onSubmit={handleManualLogin} className="flex flex-col gap-3 mt-2
                border-t border-copilot-border pt-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Key size={12} className="text-copilot-text-muted" />
                  <span className="text-xs text-copilot-text-secondary">{t("auth.pasteKey")}</span>
                </div>
                <input
                  type="text"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="API-Key..."
                  className="w-full px-3 py-2.5 bg-mona-surface border border-copilot-border rounded-md
                    text-copilot-text text-sm outline-none focus:border-mona-primary transition-colors
                    font-mono text-xs"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !manualKey.trim()}
                  className="w-full py-2.5 rounded-md mona-gradient text-white text-sm font-semibold
                    transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                >
                  {loading ? t("auth.loggingIn") : t("auth.login")}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

export default LoginScreen
