import React, { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft, Mic, MicOff, Square, Clock, X, Plus, Trash2,
  FileText, Building, Briefcase, Send, Loader2, Pause, Play,
  CheckCircle, AlertCircle, Copy, Download, Map, CheckSquare,
  ChevronRight, ChevronLeft, Circle
} from "lucide-react"
import { useDebugStore } from "../stores/debugStore"
import type { JobIntakeRequirement, PitchRoadmapStep, PitchChecklistItem } from "../types"

type SessionTab = "guide" | "requirements" | "transcript" | "notes"

interface TranscriptLine { speaker: string; text: string; timestamp: string }

interface JobIntakeSessionProps {
  intakeInfo: {
    customerName: string
    companyName?: string
    jobTitle: string
    roadmap?: PitchRoadmapStep[]
    checklist?: PitchChecklistItem[]
  }
  audioConfig?: { micDeviceId: string; systemDeviceId?: string }
  onEndSession: (data: {
    requirements: JobIntakeRequirement[]
    transcript: TranscriptLine[]
    notes: string
    roadmap?: PitchRoadmapStep[]
    checklist?: PitchChecklistItem[]
  }) => void
  onBack: () => void
  isSalesMode?: boolean
}

const JobIntakeSession: React.FC<JobIntakeSessionProps> = ({
  intakeInfo,
  audioConfig,
  onEndSession,
  onBack,
  isSalesMode = false
}) => {
  const { t } = useTranslation()
  const { log: dbg } = useDebugStore()

  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState("")
  const hasGuide = !!(intakeInfo.roadmap?.length || intakeInfo.checklist?.length)
  const [activeTab, setActiveTab] = useState<SessionTab>(hasGuide ? "guide" : "requirements")
  const [paused, setPaused] = useState(false)
  const [lang, setLang] = useState("multi")
  const [notes, setNotes] = useState("")

  const [requirements, setRequirements] = useState<JobIntakeRequirement[]>([])
  const [newRequirement, setNewRequirement] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newPriority, setNewPriority] = useState<"must_have" | "nice_to_have">("must_have")
  const [analyzing, setAnalyzing] = useState(false)

  const [roadmap, setRoadmap] = useState<PitchRoadmapStep[]>(intakeInfo.roadmap || [])
  const [checklist, setChecklist] = useState<PitchChecklistItem[]>(intakeInfo.checklist || [])

  const transcriptRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(Date.now())
  const deepgramWsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fullTranscriptRef = useRef<string>("")
  const pausedRef = useRef(false)

  useEffect(() => {
    startTimeRef.current = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (transcriptRef.current && activeTab === "transcript") {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript, activeTab])

  useEffect(() => { pausedRef.current = paused }, [paused])

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal || !text.trim() || pausedRef.current) return
    const line: TranscriptLine = { speaker: "Gespräch", text: text.trim(), timestamp: new Date().toISOString() }
    setTranscript(prev => [...prev, line])
    fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + text.trim()
    dbg(`📝 "${text.trim().substring(0, 50)}${text.trim().length > 50 ? "..." : ""}"`)
  }, [dbg])

  const startDeepgram = useCallback(async () => {
    dbg("Deepgram-Verbindung...")
    if (!window.monacopilot) return

    const keyResult = await window.monacopilot.getTranscriptionKey()
    if (!keyResult.success || !keyResult.key) { dbg(`Key-Fehler: ${keyResult.error}`); setError(keyResult.error || ""); return }
    dbg("Deepgram-Key ✓")

    try {
      const micDeviceId = audioConfig?.micDeviceId || "default"
      const systemDeviceId = audioConfig?.systemDeviceId || ""

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: micDeviceId ? { exact: micDeviceId } : undefined, echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      })
      dbg("Mikrofon ✓")

      const audioContext = new AudioContext({ sampleRate: 16000 })
      const micSource = audioContext.createMediaStreamSource(micStream)
      const destination = audioContext.createMediaStreamDestination()
      micSource.connect(destination)

      if (systemDeviceId === "__screen_share__") {
        try {
          dbg("Desktop-Audio...")
          const sysStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { width: { max: 4 }, height: { max: 4 }, frameRate: { max: 1 } } })
          sysStream.getVideoTracks().forEach((t: MediaStreamTrack) => { t.stop(); sysStream.removeTrack(t) })
          if (sysStream.getAudioTracks().length > 0) {
            audioContext.createMediaStreamSource(sysStream).connect(destination)
            dbg("System-Audio ✓")
          }
        } catch (e: any) { dbg(`System-Audio: ${e.message}`) }
      } else if (systemDeviceId) {
        try {
          const sysStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: systemDeviceId }, sampleRate: 16000 } })
          audioContext.createMediaStreamSource(sysStream).connect(destination)
          dbg("Gerät-Audio ✓")
        } catch (e: any) { dbg(`Gerät: ${e.message}`) }
      }

      streamRef.current = destination.stream
      const langParam = lang === "multi" ? "multi" : lang
      const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-3&language=${langParam}&punctuate=true&encoding=linear16&sample_rate=16000`, ["token", keyResult.key])
      deepgramWsRef.current = ws

      ws.onopen = () => {
        dbg("Deepgram ✓")
        setListening(true)
        const ctx = new AudioContext({ sampleRate: 16000 })
        const src = ctx.createMediaStreamSource(destination.stream)
        const proc = ctx.createScriptProcessor(4096, 1, 1)
        proc.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return
          const f = e.inputBuffer.getChannelData(0)
          const i = new Int16Array(f.length)
          for (let j = 0; j < f.length; j++) i[j] = Math.max(-32768, Math.min(32767, Math.floor(f[j] * 32768)))
          ws.send(i.buffer)
        }
        src.connect(proc); proc.connect(ctx.destination)
        mediaRecorderRef.current = { stop: () => { proc.disconnect(); src.disconnect(); ctx.close(); audioContext.close(); micStream.getTracks().forEach(t => t.stop()) } }
      }
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data)
          if (d.channel?.alternatives?.[0]) handleTranscript(d.channel.alternatives[0].transcript || "", d.is_final === true)
        } catch {}
      }
      ws.onerror = () => dbg("Deepgram Fehler")
      ws.onclose = (ev) => { dbg(`Deepgram getrennt (${ev.code})`); setListening(false) }
    } catch (err: any) { dbg(`Mic-Fehler: ${err.message}`); setError(err.message) }
  }, [handleTranscript, dbg, audioConfig, lang])

  useEffect(() => {
    startDeepgram()
    return () => {
      if (deepgramWsRef.current) deepgramWsRef.current.close()
      if (mediaRecorderRef.current) try { mediaRecorderRef.current.stop() } catch {}
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  const togglePause = () => {
    if (paused) {
      if (deepgramWsRef.current && deepgramWsRef.current.readyState === WebSocket.OPEN) {
        dbg("Fortgesetzt ▶")
      } else {
        dbg("Fortgesetzt ▶ (Deepgram neu verbinden...)")
        startDeepgram()
      }
      setPaused(false)
    } else {
      dbg("Pausiert ⏸")
      setPaused(true)
    }
  }

  const addRequirement = () => {
    if (!newRequirement.trim()) return
    const req: JobIntakeRequirement = {
      id: `req-${Date.now()}`,
      requirement: newRequirement.trim(),
      category: newCategory.trim() || "Allgemein",
      priority: newPriority,
      timestamp: new Date().toISOString()
    }
    setRequirements(prev => [...prev, req])
    setNewRequirement("")
    setNewCategory("")
    dbg(`Anforderung hinzugefügt: ${req.requirement}`)
  }

  const removeRequirement = (id: string) => {
    setRequirements(prev => prev.filter(r => r.id !== id))
  }

  const updateRequirementPriority = (id: string, priority: "must_have" | "nice_to_have") => {
    setRequirements(prev => prev.map(r => r.id === id ? { ...r, priority } : r))
  }

  const currentStepIndex = roadmap.findIndex(s => s.status === "current")

  const advanceRoadmap = () => {
    setRoadmap(prev => {
      const currentIdx = prev.findIndex(s => s.status === "current")
      if (currentIdx === -1 || currentIdx >= prev.length - 1) return prev
      return prev.map((s, i) => ({
        ...s,
        status: i < currentIdx + 1 ? "completed" : i === currentIdx + 1 ? "current" : "pending"
      }))
    })
  }

  const goBackRoadmap = () => {
    setRoadmap(prev => {
      const currentIdx = prev.findIndex(s => s.status === "current")
      if (currentIdx <= 0) return prev
      return prev.map((s, i) => ({
        ...s,
        status: i < currentIdx - 1 ? "completed" : i === currentIdx - 1 ? "current" : "pending"
      }))
    })
  }

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ))
  }

  const extractRequirementsFromTranscript = async () => {
    if (!window.monacopilot || !fullTranscriptRef.current.trim()) return
    setAnalyzing(true)
    dbg("Extrahiere Anforderungen aus Transkript...")

    try {
      const result = await window.monacopilot.analyzeTranscript(
        fullTranscriptRef.current,
        {
          name: intakeInfo.customerName,
          jobTitle: intakeInfo.jobTitle,
          customPrompt: `Dies ist ein Job-Intake-Gespräch mit einem Kunden. Extrahiere alle genannten Anforderungen, Qualifikationen und Wünsche für die zu besetzende Stelle "${intakeInfo.jobTitle}".
Formatiere jede Anforderung als JSON-Objekt mit: requirement (Text), category (z.B. "Qualifikation", "Erfahrung", "Soft Skills", "Technisch"), priority ("must_have" oder "nice_to_have").
Antworte NUR mit einem JSON-Array der Anforderungen.`
        }
      )

      if (result.suggestions?.[0]?.text) {
        try {
          const text = result.suggestions[0].text
          const jsonMatch = text.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            const extracted = JSON.parse(jsonMatch[0])
            const newReqs: JobIntakeRequirement[] = extracted.map((r: any, i: number) => ({
              id: `req-extracted-${Date.now()}-${i}`,
              requirement: r.requirement || r.text || "",
              category: r.category || "Allgemein",
              priority: r.priority === "nice_to_have" ? "nice_to_have" : "must_have",
              timestamp: new Date().toISOString()
            })).filter((r: any) => r.requirement)

            setRequirements(prev => {
              const existingTexts = new Set(prev.map(r => r.requirement.toLowerCase()))
              const unique = newReqs.filter(r => !existingTexts.has(r.requirement.toLowerCase()))
              return [...prev, ...unique]
            })
            dbg(`${newReqs.length} Anforderungen extrahiert`)
          }
        } catch (e) {
          dbg("Parsing-Fehler bei Extraktion")
        }
      }
    } catch (err: any) {
      dbg(`Extraktionsfehler: ${err.message}`)
    }

    setAnalyzing(false)
  }

  const handleEnd = async () => {
    setListening(false)
    if (deepgramWsRef.current) { deepgramWsRef.current.close(); deepgramWsRef.current = null }
    if (mediaRecorderRef.current) try { mediaRecorderRef.current.stop() } catch {}
    dbg("Job-Intake beendet")
    onEndSession({
      requirements,
      transcript: transcript.length > 0 ? transcript : fullTranscriptRef.current
        ? [{ speaker: "Gespräch", text: fullTranscriptRef.current, timestamp: new Date().toISOString() }]
        : [],
      notes,
      roadmap: roadmap.length > 0 ? roadmap : undefined,
      checklist: checklist.length > 0 ? checklist : undefined
    })
  }

  const formatTime = (s: number) => `${Math.floor(s/3600).toString().padStart(2,"0")}:${Math.floor((s%3600)/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`

  const mustHaves = requirements.filter(r => r.priority === "must_have")
  const niceToHaves = requirements.filter(r => r.priority === "nice_to_have")

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-copilot-border bg-mona-card shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="p-1 hover:bg-mona-hover rounded"><ArrowLeft size={13} className="text-copilot-text-muted" /></button>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold text-copilot-text truncate">{intakeInfo.jobTitle}</span>
            <span className="text-[8px] text-copilot-text-muted truncate">
              {intakeInfo.customerName}{intakeInfo.companyName ? ` · ${intakeInfo.companyName}` : ""}
            </span>
          </div>
          <div className={`w-1.5 h-1.5 rounded-full ${paused ? "bg-amber-400" : listening ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${isSalesMode ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
            {isSalesMode ? "SALES" : "JOB INTAKE"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-copilot-text-muted"><Clock size={8} className="inline mr-0.5" />{formatTime(elapsed)}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="text-[8px] bg-mona-surface border border-copilot-border rounded px-1 py-0.5 text-copilot-text-muted outline-none w-12">
            {[{c:"multi",l:"Auto"},{c:"de",l:"DE"},{c:"en",l:"EN"},{c:"fr",l:"FR"},{c:"es",l:"ES"}].map(l => <option key={l.c} value={l.c}>{l.l}</option>)}
          </select>
          <button onClick={togglePause} className={`text-[9px] px-2 py-1 rounded font-medium flex items-center gap-1
            ${paused ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"}`}>
            {paused ? <><Play size={8} />Weiter</> : <><Pause size={8} />Pause</>}
          </button>
          <button onClick={handleEnd} className="text-[9px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium flex items-center gap-1">
            <Square size={8} />{t("session.stop")}
          </button>
        </div>
      </div>

      {error && <div className="px-3 py-1 bg-red-500/10 border-b border-red-500/30"><span className="text-[9px] text-red-400">{error}</span></div>}

      {hasGuide && roadmap.length > 0 && (
        <div className="px-3 py-2 border-b border-copilot-border bg-mona-surface/30 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={goBackRoadmap} disabled={currentStepIndex <= 0}
              className="p-1 rounded hover:bg-mona-hover disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={14} className="text-copilot-text-muted" />
            </button>
            <div className="flex-1 flex items-center gap-1">
              {roadmap.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold shrink-0
                    ${step.status === "completed" ? "bg-green-500 text-white" :
                      step.status === "current" ? "mona-gradient text-white ring-2 ring-mona-primary/30" :
                      "bg-mona-surface border border-copilot-border text-copilot-text-muted"}`}>
                    {step.status === "completed" ? "✓" : idx + 1}
                  </div>
                  {idx < roadmap.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${step.status === "completed" ? "bg-green-500" : "bg-copilot-border"}`} />
                  )}
                </div>
              ))}
            </div>
            <button onClick={advanceRoadmap} disabled={currentStepIndex >= roadmap.length - 1}
              className="p-1 rounded hover:bg-mona-hover disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={14} className="text-copilot-text-muted" />
            </button>
          </div>
          {currentStepIndex >= 0 && (
            <div className="mt-1.5 text-center">
              <span className="text-[10px] font-medium text-copilot-text">{roadmap[currentStepIndex]?.title}</span>
              {roadmap[currentStepIndex]?.description && (
                <p className="text-[9px] text-copilot-text-muted mt-0.5">{roadmap[currentStepIndex].description}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex border-b border-copilot-border shrink-0">
        {(hasGuide ? ["guide", "requirements", "transcript", "notes"] as SessionTab[] : ["requirements", "transcript", "notes"] as SessionTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-medium border-b-2 transition-colors
              ${activeTab === tab ? "text-mona-primary border-mona-primary" : "text-copilot-text-muted border-transparent hover:text-copilot-text-secondary"}`}>
            {tab === "guide" ? <Map size={10} /> : tab === "requirements" ? <CheckCircle size={10} /> : tab === "transcript" ? <FileText size={10} /> : <FileText size={10} />}
            {tab === "guide" ? t("jobIntake.guideTab")
              : tab === "requirements" ? `${t("jobIntake.requirements")} (${requirements.length})`
              : tab === "transcript" ? t("session.tabTranscript") : t("jobIntake.notes")}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "guide" && (
          <div className="px-3 py-2">
            {checklist.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckSquare size={12} className="text-green-400" />
                  <span className="text-[10px] font-semibold text-copilot-text">{t("jobIntake.thingsToMention")}</span>
                  <span className="text-[9px] text-copilot-text-muted ml-auto">
                    {checklist.filter(c => c.checked).length}/{checklist.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {checklist.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-left transition-all ${
                        item.checked
                          ? "border-green-500/40 bg-green-500/10"
                          : "border-copilot-border bg-mona-surface hover:border-mona-primary/40"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        item.checked
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-copilot-border"
                      }`}>
                        {item.checked && <CheckCircle size={10} />}
                      </div>
                      <span className={`text-[10px] flex-1 ${item.checked ? "text-copilot-text-muted line-through" : "text-copilot-text"}`}>
                        {item.text}
                      </span>
                      {item.category && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-copilot-bg-tertiary text-copilot-text-muted">{item.category}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {roadmap.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Map size={12} className="text-blue-400" />
                  <span className="text-[10px] font-semibold text-copilot-text">{t("jobIntake.pitchRoadmap")}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {roadmap.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-md border transition-all ${
                        step.status === "current"
                          ? "border-mona-primary/50 bg-mona-primary/10 ring-1 ring-mona-primary/20"
                          : step.status === "completed"
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-copilot-border bg-mona-surface/50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        step.status === "completed" ? "bg-green-500 text-white" :
                        step.status === "current" ? "mona-gradient text-white" :
                        "bg-mona-surface border border-copilot-border text-copilot-text-muted"
                      }`}>
                        {step.status === "completed" ? "✓" : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-medium ${
                          step.status === "current" ? "text-copilot-text" :
                          step.status === "completed" ? "text-copilot-text-secondary" :
                          "text-copilot-text-muted"
                        }`}>{step.title}</span>
                        {step.description && (
                          <p className="text-[9px] text-copilot-text-muted mt-0.5">{step.description}</p>
                        )}
                      </div>
                      {step.status === "current" && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full mona-gradient text-white font-medium">Jetzt</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={goBackRoadmap} disabled={currentStepIndex <= 0}
                    className="flex-1 py-2 rounded-md border border-copilot-border text-[10px] font-medium text-copilot-text-secondary
                      hover:bg-mona-hover disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                    <ChevronLeft size={12} />
                    {t("jobIntake.previousStep")}
                  </button>
                  <button onClick={advanceRoadmap} disabled={currentStepIndex >= roadmap.length - 1}
                    className="flex-1 py-2 rounded-md mona-gradient text-white text-[10px] font-medium
                      hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                    {t("jobIntake.nextStep")}
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {!hasGuide && (
              <div className="text-center py-6">
                <Map size={24} className="text-copilot-text-muted mx-auto mb-2" />
                <p className="text-[10px] text-copilot-text-muted">{t("jobIntake.noGuideConfigured")}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "requirements" && (
          <div className="px-3 py-2">
            <div className="mb-3 p-2 rounded-lg bg-mona-surface border border-copilot-border">
              <div className="flex gap-1.5 mb-1.5">
                <input
                  type="text"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  placeholder={t("jobIntake.addRequirementPlaceholder")}
                  className="flex-1 px-2 py-1.5 bg-mona-card border border-copilot-border rounded text-[10px] text-copilot-text outline-none focus:border-mona-primary"
                  onKeyDown={(e) => e.key === "Enter" && addRequirement()}
                />
                <button onClick={addRequirement} disabled={!newRequirement.trim()}
                  className="p-1.5 rounded mona-gradient text-white disabled:opacity-30">
                  <Plus size={12} />
                </button>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder={t("jobIntake.categoryPlaceholder")}
                  className="flex-1 px-2 py-1 bg-mona-card border border-copilot-border rounded text-[9px] text-copilot-text outline-none focus:border-mona-primary"
                />
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)}
                  className="px-2 py-1 bg-mona-card border border-copilot-border rounded text-[9px] text-copilot-text outline-none">
                  <option value="must_have">{t("jobIntake.mustHave")}</option>
                  <option value="nice_to_have">{t("jobIntake.niceToHave")}</option>
                </select>
              </div>
            </div>

            {fullTranscriptRef.current.length > 50 && (
              <button onClick={extractRequirementsFromTranscript} disabled={analyzing}
                className="w-full mb-3 py-2 rounded-md border border-mona-primary/30 bg-mona-primary/10 text-[10px] text-mona-primary-light font-medium
                  hover:bg-mona-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                {analyzing ? <><Loader2 size={11} className="animate-spin" />{t("jobIntake.extracting")}</> : <><AlertCircle size={11} />{t("jobIntake.extractFromTranscript")}</>}
              </button>
            )}

            {requirements.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle size={24} className="text-copilot-text-muted mx-auto mb-2" />
                <p className="text-[10px] text-copilot-text-muted">{t("jobIntake.noRequirements")}</p>
                <p className="text-[9px] text-copilot-text-muted mt-1">{t("jobIntake.noRequirementsHint")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {mustHaves.length > 0 && (
                  <div>
                    <div className="text-[9px] font-semibold text-red-400 mb-1.5 flex items-center gap-1">
                      <AlertCircle size={10} />
                      {t("jobIntake.mustHave")} ({mustHaves.length})
                    </div>
                    <div className="flex flex-col gap-1">
                      {mustHaves.map(req => (
                        <RequirementItem key={req.id} req={req} onRemove={removeRequirement} onTogglePriority={updateRequirementPriority} />
                      ))}
                    </div>
                  </div>
                )}
                {niceToHaves.length > 0 && (
                  <div>
                    <div className="text-[9px] font-semibold text-blue-400 mb-1.5 flex items-center gap-1">
                      <CheckCircle size={10} />
                      {t("jobIntake.niceToHave")} ({niceToHaves.length})
                    </div>
                    <div className="flex flex-col gap-1">
                      {niceToHaves.map(req => (
                        <RequirementItem key={req.id} req={req} onRemove={removeRequirement} onTogglePriority={updateRequirementPriority} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "transcript" && (
          <div ref={transcriptRef} className="px-3 py-2">
            {transcript.length === 0 ? (
              <div className="text-center py-4"><span className="text-[10px] text-copilot-text-muted">Deepgram Nova-3 · {lang}</span></div>
            ) : (
              <div className="flex flex-col gap-1">
                {transcript.map((line, i) => (
                  <div key={i} className="text-[10px] leading-relaxed text-copilot-text">
                    <span className="text-[8px] text-copilot-text-muted mr-1">{new Date(line.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="px-3 py-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("jobIntake.notesPlaceholder")}
              className="w-full h-64 px-2.5 py-2 bg-mona-surface border border-copilot-border rounded-md text-xs text-copilot-text outline-none focus:border-mona-primary resize-none leading-relaxed"
            />
          </div>
        )}
      </div>

      {requirements.length > 0 && activeTab !== "requirements" && (
        <button onClick={() => setActiveTab("requirements")}
          className="flex items-center gap-2 px-3 py-1.5 bg-copilot-bg-secondary border-t border-copilot-border shrink-0 hover:bg-copilot-bg-tertiary transition-colors">
          <CheckCircle size={11} className="text-mona-primary" />
          <span className="text-[10px] font-medium text-copilot-text">
            {requirements.length} {t("jobIntake.requirementsCollected")}
          </span>
          <span className="text-[9px] text-copilot-text-muted ml-auto">
            {mustHaves.length} Muss · {niceToHaves.length} Nice-to-have
          </span>
        </button>
      )}
    </div>
  )
}

const RequirementItem: React.FC<{
  req: JobIntakeRequirement
  onRemove: (id: string) => void
  onTogglePriority: (id: string, priority: "must_have" | "nice_to_have") => void
}> = ({ req, onRemove, onTogglePriority }) => (
  <div className={`flex items-start gap-2 px-2 py-1.5 rounded border text-[10px] ${
    req.priority === "must_have"
      ? "border-red-500/30 bg-red-500/5"
      : "border-blue-500/30 bg-blue-500/5"
  }`}>
    <div className="flex-1 min-w-0">
      <span className="text-copilot-text leading-tight">{req.requirement}</span>
      {req.category && req.category !== "Allgemein" && (
        <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded bg-copilot-bg-tertiary text-copilot-text-muted">{req.category}</span>
      )}
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => onTogglePriority(req.id, req.priority === "must_have" ? "nice_to_have" : "must_have")}
        className={`px-1.5 py-0.5 rounded text-[8px] font-medium transition-colors ${
          req.priority === "must_have"
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
        }`}
      >
        {req.priority === "must_have" ? "Muss" : "Nice"}
      </button>
      <button onClick={() => onRemove(req.id)} className="p-0.5 hover:bg-red-500/20 rounded text-copilot-text-muted hover:text-red-400">
        <Trash2 size={10} />
      </button>
    </div>
  </div>
)

export default JobIntakeSession
