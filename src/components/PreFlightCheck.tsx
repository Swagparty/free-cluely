import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Mic, Shield, CheckCircle, XCircle, Volume2, RefreshCw, ChevronDown, ChevronUp, Monitor, Headphones } from "lucide-react"

interface AudioDevice {
  deviceId: string
  label: string
  kind: string
}

interface PreFlightCheckProps {
  candidateName: string
  onReady: (config: { micDeviceId: string; systemDeviceId?: string }) => void
  onCancel: () => void
}

type CallType = "video" | "phone" | "in_person"

const PreFlightCheck: React.FC<PreFlightCheckProps> = ({ candidateName, onReady, onCancel }) => {
  const { t } = useTranslation()
  const [micGranted, setMicGranted] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([])
  const [selectedMic, setSelectedMic] = useState("")
  const [selectedSystem, setSelectedSystem] = useState("__screen_share__")
  const [callType, setCallType] = useState<CallType>("video")
  const [showAdvanced, setShowAdvanced] = useState(false)

  const loadDevices = async () => {
    setChecking(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setMicGranted(true)

      const devices = await navigator.mediaDevices.enumerateDevices()

      const audioInputs = devices
        .filter(d => d.kind === "audioinput")
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || t("preflight.defaultMic"),
          kind: d.kind
        }))

      setInputDevices(audioInputs)

      if (audioInputs.length > 0 && !selectedMic) {
        setSelectedMic(audioInputs[0].deviceId)
      }
    } catch {
      setMicGranted(false)
    }
    setChecking(false)
  }

  useEffect(() => {
    loadDevices()
  }, [])

  useEffect(() => {
    if (callType === "video") {
      setSelectedSystem("__screen_share__")
    } else if (callType === "phone") {
      setSelectedSystem("")
    } else {
      setSelectedSystem("")
    }
  }, [callType])

  const handleReady = () => {
    onReady({
      micDeviceId: selectedMic,
      systemDeviceId: selectedSystem || undefined
    })
  }

  const callTypes: { id: CallType; icon: any; label: string; desc: string }[] = [
    { id: "video", icon: Monitor, label: t("preflight.videoCall"), desc: t("preflight.videoCallDesc") },
    { id: "phone", icon: Headphones, label: t("preflight.phoneCall"), desc: t("preflight.phoneCallDesc") },
    { id: "in_person", icon: Mic, label: t("preflight.inPerson"), desc: t("preflight.inPersonDesc") }
  ]

  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-y-auto">
      <div className="text-center">
        <h2 className="font-heading text-sm font-bold text-copilot-text">{t("preflight.title")}</h2>
        <p className="text-[10px] text-copilot-text-muted mt-1">{t("preflight.subtitle")}</p>
        <p className="text-xs text-mona-primary-light font-medium mt-1">{candidateName}</p>
      </div>

      <div className="mona-card p-3 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
          ${micGranted === true ? "bg-copilot-success/15" : micGranted === false ? "bg-copilot-error/15" : "bg-mona-surface"}`}>
          {micGranted === true ? (
            <CheckCircle size={16} className="text-copilot-success" />
          ) : micGranted === false ? (
            <XCircle size={16} className="text-copilot-error" />
          ) : (
            <Mic size={16} className="text-copilot-text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-copilot-text">{t("preflight.micPermission")}</div>
          <div className="text-[10px] text-copilot-text-muted">
            {micGranted === true ? t("preflight.micReady") :
             micGranted === false ? t("preflight.micDenied") :
             t("preflight.micChecking")}
          </div>
        </div>
        {micGranted === false && (
          <button onClick={loadDevices} disabled={checking}
            className="text-[10px] px-3 py-1.5 rounded mona-gradient text-white font-medium
              hover:opacity-90 transition-opacity disabled:opacity-50">
            {t("preflight.retry")}
          </button>
        )}
      </div>

      {micGranted && (
        <>
          <div className="mona-card p-3">
            <div className="text-[10px] font-semibold text-copilot-text mb-2">{t("preflight.callTypeTitle")}</div>
            <div className="flex flex-col gap-1.5">
              {callTypes.map((ct) => {
                const Icon = ct.icon
                const isSelected = callType === ct.id
                return (
                  <button key={ct.id} onClick={() => setCallType(ct.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all text-left
                      ${isSelected 
                        ? "border-mona-primary bg-mona-primary/10" 
                        : "border-copilot-border hover:border-copilot-text-muted"}`}>
                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0
                      ${isSelected ? "bg-mona-primary/20" : "bg-mona-surface"}`}>
                      <Icon size={12} className={isSelected ? "text-mona-primary" : "text-copilot-text-muted"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] font-medium ${isSelected ? "text-copilot-text" : "text-copilot-text-secondary"}`}>
                        {ct.label}
                      </div>
                      <div className="text-[9px] text-copilot-text-muted">{ct.desc}</div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-mona-primary flex items-center justify-center">
                        <CheckCircle size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {callType === "video" && (
            <div className="mona-surface p-2.5 flex items-start gap-2">
              <Monitor size={12} className="text-mona-primary-light mt-0.5 shrink-0" />
              <p className="text-[9px] text-copilot-text-secondary leading-relaxed">
                {t("preflight.videoTip")}
              </p>
            </div>
          )}

          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] text-copilot-text-muted hover:text-copilot-text-secondary transition-colors">
            <span>{t("preflight.advancedSettings")}</span>
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showAdvanced && (
            <div className="mona-surface p-3 flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Mic size={11} className="text-copilot-text-muted" />
                    <span className="text-[10px] text-copilot-text-secondary">{t("preflight.selectMic")}</span>
                  </div>
                  <button onClick={loadDevices} className="p-1 hover:bg-mona-hover rounded">
                    <RefreshCw size={10} className="text-copilot-text-muted" />
                  </button>
                </div>
                <select value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)}
                  className="w-full px-2 py-1.5 bg-mona-card border border-copilot-border rounded
                    text-[10px] text-copilot-text outline-none focus:border-mona-primary">
                  {inputDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Volume2 size={11} className="text-copilot-text-muted" />
                  <span className="text-[10px] text-copilot-text-secondary">{t("preflight.capturePartner")}</span>
                </div>
                <select value={selectedSystem} onChange={(e) => setSelectedSystem(e.target.value)}
                  className="w-full px-2 py-1.5 bg-mona-card border border-copilot-border rounded
                    text-[10px] text-copilot-text outline-none focus:border-mona-primary">
                  <option value="">{t("preflight.noCapture")}</option>
                  <option value="__screen_share__">{t("preflight.screenShare")}</option>
                  {inputDevices
                    .filter(d => d.deviceId !== selectedMic)
                    .map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))
                  }
                </select>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mona-surface p-2.5 flex items-start gap-2">
        <Shield size={12} className="text-green-500 mt-0.5 shrink-0" />
        <p className="text-[9px] text-copilot-text-muted leading-relaxed">
          {t("preflight.privacyNote")}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button onClick={handleReady} disabled={micGranted !== true || !selectedMic}
          className="w-full py-2.5 rounded-md mona-gradient text-white text-sm font-semibold
            hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center justify-center gap-1.5">
          <Mic size={14} />
          {micGranted === true ? t("preflight.ready") : t("preflight.notReady")}
        </button>
        <button onClick={onCancel}
          className="w-full py-2 rounded-md border border-copilot-border text-xs
            text-copilot-text-secondary hover:bg-mona-hover transition-colors">
          {t("preflight.cancel")}
        </button>
      </div>
    </div>
  )
}

export default PreFlightCheck
