import React from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Beaker } from "lucide-react"
import { useSessionStore } from "../stores/sessionStore"
import i18n from "../i18n"

interface SettingsPanelProps {
  onClose: () => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const { settings, updateSettings } = useSessionStore()

  const handleLanguageChange = (lang: "de" | "en") => {
    updateSettings({ language: lang })
    i18n.changeLanguage(lang)
    if (window.monacopilot) {
      window.monacopilot.updateSettings({ language: lang })
    }
  }

  const handleSettingChange = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    updateSettings({ [key]: value })
    if (window.monacopilot) {
      window.monacopilot.updateSettings({ [key]: value })
    }
  }

  return (
    <div className="p-3 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="p-1 hover:bg-mona-hover rounded transition-colors">
          <ArrowLeft size={14} className="text-copilot-text-muted" />
        </button>
        <h2 className="font-heading text-sm font-bold text-copilot-text">{t("settings.title")}</h2>
      </div>

      <div className="flex flex-col gap-3">
        <SettingRow label={t("settings.language")}>
          <div className="flex gap-1">
            {(["de", "en"] as const).map((lang) => (
              <button key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-3 py-1 text-[10px] rounded transition-colors uppercase
                  ${settings.language === lang
                    ? "mona-gradient text-white"
                    : "bg-mona-surface text-copilot-text-muted border border-copilot-border hover:bg-mona-hover"}`}>
                {lang}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label={t("settings.fontSize")}>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={12}
              max={20}
              value={settings.fontSize}
              onChange={(e) => handleSettingChange("fontSize", parseInt(e.target.value))}
              className="flex-1 h-1 accent-mona-primary"
            />
            <span className="text-[10px] text-copilot-text-muted w-6 text-right">{settings.fontSize}</span>
          </div>
        </SettingRow>

        <SettingRow label={t("settings.darkMode")}>
          <ToggleSwitch
            checked={settings.darkMode}
            onChange={(v) => handleSettingChange("darkMode", v)}
          />
        </SettingRow>

        <div className="border-t border-copilot-border pt-3 mt-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Beaker size={12} className="text-purple-400" />
            <span className="text-[10px] font-semibold text-copilot-text">{t("settings.betaFeatures")}</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">BETA</span>
          </div>
          <p className="text-[9px] text-copilot-text-muted mb-2">{t("settings.betaDescription")}</p>
          <SettingRow label={t("settings.enableBeta")}>
            <ToggleSwitch
              checked={settings.betaFeaturesEnabled}
              onChange={(v) => handleSettingChange("betaFeaturesEnabled", v)}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  )
}

const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-copilot-text-secondary">{label}</span>
    {children}
  </div>
)

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)}
    className={`relative w-8 h-4 rounded-full transition-colors
      ${checked ? "bg-mona-primary" : "bg-gray-300 dark:bg-gray-600"}`}>
    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform
      ${checked ? "left-4" : "left-0.5"}`} />
  </button>
)

export default SettingsPanel
