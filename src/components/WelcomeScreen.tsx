import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Users, Mic, ClipboardCheck, Shield, ChevronRight, Sparkles, Volume2 } from "lucide-react"
import { useSessionStore } from "../stores/sessionStore"

interface WelcomeScreenProps {
  onContinue: () => void
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const { t } = useTranslation()
  const { settings } = useSessionStore()
  const [step, setStep] = useState(0)

  const handleContinue = () => {
    if (step < 2) {
      setStep(step + 1)
    } else {
      localStorage.setItem("mona_live_onboarded", "true")
      onContinue()
    }
  }

  return (
    <div className="flex flex-col h-full p-5 items-center justify-center gap-4 overflow-y-auto">
      <img
        src={settings.darkMode ? "/logo_light.png" : "/logo_dark.png"}
        alt="MONA"
        className="h-7"
      />

      {step === 0 && (
        <div className="flex flex-col gap-4 w-full animate-fade-in">
          <div className="text-center">
            <h1 className="font-heading text-lg font-bold text-copilot-text">{t("welcome.title")}</h1>
            <p className="text-xs text-copilot-text-secondary mt-1">{t("welcome.subtitle")}</p>
          </div>

          <div className="mona-card p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg mona-gradient flex items-center justify-center shrink-0">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold text-copilot-text">{t("welcome.whatTitle")}</div>
              <p className="text-[10px] text-copilot-text-secondary mt-0.5 leading-relaxed">
                {t("welcome.whatDesc")}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { icon: Users, key: "step1" },
              { icon: Mic, key: "step2" },
              { icon: ClipboardCheck, key: "step3" }
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="mona-surface p-2.5 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-mona-primary/15 flex items-center justify-center shrink-0">
                    <Icon size={12} className="text-mona-primary-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium text-copilot-text">{t(`welcome.${s.key}title`)}</div>
                    <p className="text-[9px] text-copilot-text-muted leading-snug">{t(`welcome.${s.key}short`)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4 w-full animate-fade-in">
          <div className="text-center">
            <h2 className="font-heading text-base font-bold text-copilot-text">{t("welcome.audioTitle")}</h2>
            <p className="text-[10px] text-copilot-text-secondary mt-1">{t("welcome.audioSubtitle")}</p>
          </div>

          <div className="mona-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 size={14} className="text-mona-primary" />
              <span className="text-xs font-semibold text-copilot-text">{t("welcome.audioHow")}</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="mona-surface p-2 text-[10px] text-copilot-text-secondary">
                <span className="font-medium text-copilot-text">1.</span> {t("welcome.audioStep1")}
              </div>
              <div className="mona-surface p-2 text-[10px] text-copilot-text-secondary">
                <span className="font-medium text-copilot-text">2.</span> {t("welcome.audioStep2")}
              </div>
              <div className="mona-surface p-2 text-[10px] text-copilot-text-secondary">
                <span className="font-medium text-copilot-text">3.</span> {t("welcome.audioStep3")}
              </div>
            </div>
          </div>

          <div className="mona-surface p-2.5 flex items-start gap-2">
            <Mic size={12} className="text-copilot-text-muted mt-0.5 shrink-0" />
            <p className="text-[9px] text-copilot-text-muted leading-relaxed">
              {t("welcome.audioTip")}
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4 w-full animate-fade-in">
          <div className="text-center">
            <h2 className="font-heading text-base font-bold text-copilot-text">{t("welcome.privacyTitle")}</h2>
            <p className="text-[10px] text-copilot-text-secondary mt-1">{t("welcome.privacySubtitle")}</p>
          </div>

          <div className="mona-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-green-500" />
              <span className="text-xs font-semibold text-copilot-text">{t("welcome.privacyHow")}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {["privacy1", "privacy2", "privacy3", "privacy4"].map((key) => (
                <div key={key} className="flex items-start gap-2 text-[10px]">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-copilot-text-secondary">{t(`welcome.${key}`)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mona-surface p-2.5">
            <p className="text-[9px] text-copilot-text-muted leading-relaxed mb-2">
              {t("welcome.privacyNote")}
            </p>
            <div className="flex flex-wrap gap-2 text-[8px]">
              <a href="https://b14436f9-dc40-4f8e-a6ab-199c3202cab6.usrfiles.com/ugd/b14436_c239504ee6de4fd5b9cb898b6e1f5ea0.pdf" 
                 target="_blank" rel="noopener noreferrer"
                 className="text-mona-primary-light hover:underline">{t("welcome.linkTerms")}</a>
              <span className="text-copilot-border">•</span>
              <a href="https://www.mona-ai.de/_files/ugd/b14436_5f60e2eb4c564e30bf11e42d952bfa9e.pdf" 
                 target="_blank" rel="noopener noreferrer"
                 className="text-mona-primary-light hover:underline">{t("welcome.linkAVB")}</a>
              <span className="text-copilot-border">•</span>
              <a href="https://www.mona-ai.de/_files/ugd/b14436_998e9eb20e0541268c178e1a306cea6b.pdf" 
                 target="_blank" rel="noopener noreferrer"
                 className="text-mona-primary-light hover:underline">{t("welcome.linkPrivacy")}</a>
            </div>
          </div>
        </div>
      )}

      <div className="w-full mt-auto flex flex-col gap-2">
        <div className="flex justify-center gap-1.5 mb-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-mona-primary" : "bg-copilot-border"}`} />
          ))}
        </div>

        <button onClick={handleContinue}
          className="w-full py-2.5 rounded-md mona-gradient text-white text-sm font-semibold
            hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
          {step < 2 ? t("welcome.next") : t("welcome.start")}
          <ChevronRight size={14} />
        </button>

        {step < 2 && (
          <button onClick={() => { localStorage.setItem("mona_live_onboarded", "true"); onContinue() }}
            className="text-[10px] text-copilot-text-muted hover:text-copilot-text-secondary transition-colors">
            {t("welcome.skip")}
          </button>
        )}
      </div>
    </div>
  )
}

export default WelcomeScreen
