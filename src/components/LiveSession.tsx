import React, { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft, Mic, MicOff, Square, Clock, AlertTriangle, X,
  MessageCircle, BarChart3, ShieldAlert, ChevronRight, Send,
  FileText, User as UserIcon, Settings2, Loader2, Pause, Play,
  Mail, Phone, MapPin, Briefcase, Download, StickyNote, Edit3,
  CheckCircle
} from "lucide-react"
import { getDisplayName } from "./InterviewSelector"
import { useDebugStore } from "../stores/debugStore"

type SessionTab = "checklist" | "transcript" | "candidate" | "setup"

interface TranscriptLine { speaker: string; text: string; timestamp: string }
interface SuggestionItem {
  id: string; type: string; text: string; reason: string; priority: string
}
interface ChecklistItem {
  id: string; requirement: string; category: string; priority: string
  status: "confirmed" | "partial" | "unconfirmed"; source: string; evidence?: string
  matchedInCV?: boolean
}

interface LiveSessionProps {
  applicant: any
  audioConfig?: { micDeviceId: string; systemDeviceId?: string }
  initialSetup?: { jobPosting: string; customPrompt: string }
  onEndSession: (transcript: TranscriptLine[], suggestions: SuggestionItem[], checklist: ChecklistItem[]) => void
  onBack: () => void
}

const typeConfig: Record<string, { icon: any; color: string; bgClass: string; label: string }> = {
  follow_up: { icon: MessageCircle, color: "text-amber-400", bgClass: "border-amber-400/40 bg-amber-400/5", label: "NACHFRAGE" },
  consistency: { icon: AlertTriangle, color: "text-red-400", bgClass: "border-red-400/40 bg-red-400/5", label: "KONSISTENZ" },
  coverage: { icon: BarChart3, color: "text-blue-400", bgClass: "border-blue-400/40 bg-blue-400/5", label: "ABDECKUNG" },
  bias_alert: { icon: ShieldAlert, color: "text-orange-500", bgClass: "border-orange-500/40 bg-orange-500/5", label: "AGG-WARNUNG" }
}

const SILENCE_TRIGGER_MS = 3000
const MIN_NEW_WORDS_FOR_ANALYSIS = 15

const LiveSession: React.FC<LiveSessionProps> = ({ applicant, audioConfig, initialSetup, onEndSession, onBack }) => {
  const { t } = useTranslation()
  const { log: dbg } = useDebugStore()

  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [currentSugIdx, setCurrentSugIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<SessionTab>("transcript")
  const [analyzing, setAnalyzing] = useState(false)
  const [paused, setPaused] = useState(false)
  const [lang, setLang] = useState("multi")

  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const checklistRef = useRef<ChecklistItem[]>([])

  const [streamingText, setStreamingText] = useState("")
  const [chatInput, setChatInput] = useState("")
  const [chatResponse, setChatResponse] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  const [customPrompt, setCustomPrompt] = useState(initialSetup?.customPrompt || "")
  const [jobPosting, setJobPosting] = useState(initialSetup?.jobPosting || "")

  const transcriptRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(Date.now())
  const deepgramWsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fullTranscriptRef = useRef<string>("")
  const lastAnalyzedWordCount = useRef<number>(0)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const analyzingRef = useRef<boolean>(false)
  const customPromptRef = useRef<string>("")
  const jobPostingRef = useRef<string>("")

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

  useEffect(() => {
    if (!window.monacopilot) return
    const cleanup = window.monacopilot.onStreamPartial((text: string) => {
      setStreamingText(text)
    })
    return cleanup
  }, [])

  useEffect(() => { customPromptRef.current = customPrompt }, [customPrompt])
  useEffect(() => { jobPostingRef.current = jobPosting }, [jobPosting])

  useEffect(() => {
    if (!jobPosting || jobPosting.trim().length < 30) return
    const timer = setTimeout(async () => {
      setChecklistLoading(true)
      dbg(`Anforderungen werden extrahiert (${jobPosting.length} Zeichen)...`)
      try {
        let candidateText = ""
        if (applicant) {
          const stringify = (v: any) => typeof v === "string" ? v : Array.isArray(v) ? JSON.stringify(v) : v ? String(v) : ""
          const parts = [
            applicant.extractedText,
            stringify(applicant.Berufserfahrung),
            stringify(applicant.Ausbildung),
            applicant.skills?.join(", "),
            applicant.jobExperienceTitles?.join(", "),
            applicant.educationTitles?.join(", "),
            applicant.akademischerAbschluss,
          ].filter(Boolean)
          candidateText = parts.join("\n")
        }
        const result = await window.monacopilot!.extractRequirements(jobPosting, candidateText)
        if (result.success && result.requirements) {
          const items: ChecklistItem[] = result.requirements.map((r: any) => ({
            id: r.id, requirement: r.requirement, category: r.category,
            priority: r.priority,
            status: r.matchedInCV ? "confirmed" : "unconfirmed",
            source: r.matchedInCV ? "CV" : "",
            matchedInCV: !!r.matchedInCV
          }))
          setChecklist(items)
          checklistRef.current = items
          dbg(`${items.length} Anforderungen extrahiert (${items.filter(i => i.status === "confirmed").length} aus CV bestätigt)`)
        } else {
          dbg(`Anforderungen-Extraktion fehlgeschlagen: ${result.error || "unbekannt"}`)
        }
      } catch (err: any) {
        dbg(`Anforderungen-Fehler: ${err.message}`)
      } finally {
        setChecklistLoading(false)
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [jobPosting, applicant])

  const getCandidateContext = useCallback(() => {
    const education = applicant.Ausbildung || applicant.ausbildung || []
    const experience = applicant.Berufserfahrung || applicant.berufserfahrung || []
    const extractedText = applicant.extractedText || ""
    const educationTitles = applicant.educationTitles || []
    const jobTitles = applicant.jobExperienceTitles || []
    const location = applicant.Wohnort || applicant.wohnort || {}
    const locationStr = [location.city, location.postleitzahl, location.country].filter(Boolean).join(", ")

    let profile = ""
    if (extractedText) profile += `CV:\n${extractedText.substring(0, 2000)}\n\n`
    if (education.length) profile += `AUSBILDUNG: ${JSON.stringify(education).substring(0, 500)}\n`
    if (educationTitles.length) profile += `BILDUNG: ${educationTitles.join(", ")}\n`
    if (experience.length) profile += `BERUFSERFAHRUNG: ${JSON.stringify(experience).substring(0, 500)}\n`
    if (jobTitles.length) profile += `JOBTITEL: ${jobTitles.join(", ")}\n`
    if (locationStr) profile += `STANDORT: ${locationStr}\n`

    return {
      name: getDisplayName(applicant),
      jobTitle: applicant.jobTitle || applicant.stellenbezeichnung || applicant.berufswunsch || "",
      candidateProfile: profile.trim(),
      skills: applicant.skills || applicant.qualifikationen || [],
      userNotes: applicant.userNotes || "",
      customPrompt: customPromptRef.current,
      jobPosting: jobPostingRef.current,
      checklist: checklistRef.current
    }
  }, [applicant])

  const runAnalysis = useCallback(async () => {
    if (!window.monacopilot || analyzingRef.current) return
    const words = fullTranscriptRef.current.split(/\s+/).length
    if (words - lastAnalyzedWordCount.current < MIN_NEW_WORDS_FOR_ANALYSIS) return

    dbg(`KI-Analyse (${words} Wörter)`)
    lastAnalyzedWordCount.current = words
    analyzingRef.current = true
    setAnalyzing(true)
    setStreamingText("")

    try {
      const result = await window.monacopilot!.analyzeTranscript(fullTranscriptRef.current, getCandidateContext())
      const suggestions = result.suggestions || []
      const checklistUpdates = result.checklistUpdates || []
      if (result.success && suggestions.length > 0) {
        dbg(`${suggestions.length} Vorschläge!`)
        const newSugs = suggestions.map((s: any, i: number) => ({
          id: `sug-${Date.now()}-${i}`, type: s.type || "follow_up",
          text: s.text || "", reason: s.reason || "", priority: s.priority || "medium"
        }))
        setSuggestions(prev => [...newSugs, ...prev])
        setCurrentSugIdx(0)
      } else {
        dbg("Keine Vorschläge")
      }
      if (checklistUpdates.length > 0) {
        dbg(`${checklistUpdates.length} Checklist-Updates`)
        setChecklist(prev => {
          const updated = [...prev]
          for (const upd of checklistUpdates) {
            const idx = updated.findIndex(c => c.id === upd.requirementId)
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                status: upd.status || updated[idx].status,
                source: updated[idx].matchedInCV && upd.source === "interview" ? "Beide" : upd.source || updated[idx].source,
                evidence: upd.evidence || updated[idx].evidence
              }
            }
          }
          checklistRef.current = updated
          return updated
        })
      }
    } catch (err: any) { dbg(`Fehler: ${err.message}`) }

    analyzingRef.current = false
    setAnalyzing(false)
    setStreamingText("")
  }, [getCandidateContext, dbg])

  const scheduleSilenceAnalysis = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => { dbg("Pause → Analyse"); runAnalysis() }, SILENCE_TRIGGER_MS)
  }, [runAnalysis, dbg])

  const pausedRef = useRef(false)
  useEffect(() => { pausedRef.current = paused }, [paused])

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal || !text.trim() || pausedRef.current) return
    const line: TranscriptLine = { speaker: "Gespräch", text: text.trim(), timestamp: new Date().toISOString() }
    setTranscript(prev => [...prev, line])
    fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + text.trim()
    dbg(`📝 "${text.trim().substring(0, 50)}${text.trim().length > 50 ? "..." : ""}"`)
    scheduleSilenceAnalysis()
  }, [scheduleSilenceAnalysis, dbg])

  const handleChat = async () => {
    if (!chatInput.trim() || !window.monacopilot || chatLoading) return
    setChatLoading(true)
    setChatResponse("")
    dbg(`Chat: "${chatInput.trim().substring(0, 40)}"`)

    try {
      const result = await window.monacopilot!.analyzeTranscript(
        fullTranscriptRef.current + `\n\nRECRUITER FRAGT: ${chatInput.trim()}\n\nBeantworte diese Frage kurz und direkt basierend auf dem Transkript.`,
        { ...getCandidateContext(), customPrompt: "Beantworte die Frage des Recruiters direkt. Kurz und präzise." }
      )
      const chatSuggestions = result.suggestions || []
      if (chatSuggestions.length > 0) {
        setChatResponse(chatSuggestions[0].text)
      } else {
        setChatResponse("Keine Antwort verfügbar.")
      }
    } catch { setChatResponse("Fehler bei der Anfrage.") }

    setChatLoading(false)
    setChatInput("")
  }

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

  const dismissSuggestion = () => {
    if (suggestions.length > 0) {
      setSuggestions(prev => prev.filter((_, i) => i !== currentSugIdx))
      setCurrentSugIdx(0)
    }
  }

  // --- Audio setup (same as before) ---
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

  useEffect(() => { startDeepgram(); return () => {
    if (deepgramWsRef.current) deepgramWsRef.current.close()
    if (mediaRecorderRef.current) try { mediaRecorderRef.current.stop() } catch {}
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
  }}, [])

  const handleEnd = async () => {
    setListening(false)
    if (deepgramWsRef.current) { deepgramWsRef.current.close(); deepgramWsRef.current = null }
    if (mediaRecorderRef.current) try { mediaRecorderRef.current.stop() } catch {}
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    dbg("Session beendet")
    await runAnalysis()
    onEndSession(transcript.length > 0 ? transcript : fullTranscriptRef.current ? [{ speaker: "Gespräch", text: fullTranscriptRef.current, timestamp: new Date().toISOString() }] : [], suggestions, checklist)
  }

  const formatTime = (s: number) => `${Math.floor(s/3600).toString().padStart(2,"0")}:${Math.floor((s%3600)/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`

  const currentSuggestion = suggestions.length > 0 ? suggestions[currentSugIdx % suggestions.length] : null
  const config = currentSuggestion ? (typeConfig[currentSuggestion.type] || typeConfig.follow_up) : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-copilot-border bg-mona-card shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="p-1 hover:bg-mona-hover rounded"><ArrowLeft size={13} className="text-copilot-text-muted" /></button>
          <span className="text-[10px] font-semibold text-copilot-text truncate">{getDisplayName(applicant)}</span>
          <div className={`w-1.5 h-1.5 rounded-full ${paused ? "bg-amber-400" : listening ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          {analyzing && <span className="text-[8px] px-1 py-0.5 rounded bg-mona-primary/20 text-mona-primary-light animate-pulse">KI</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-copilot-text-muted"><Clock size={8} className="inline mr-0.5" />{formatTime(elapsed)}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="text-[8px] bg-mona-surface border border-copilot-border rounded px-1 py-0.5 text-copilot-text-muted outline-none w-12">
            {[{c:"multi",l:"Auto"},{c:"de",l:"DE"},{c:"en",l:"EN"},{c:"fr",l:"FR"},{c:"es",l:"ES"},{c:"it",l:"IT"},{c:"nl",l:"NL"},{c:"pl",l:"PL"},{c:"pt",l:"PT"}].map(l => <option key={l.c} value={l.c}>{l.l}</option>)}
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

      {/* HERO: Current Suggestion */}
      <div className="shrink-0 border-b border-copilot-border">
        {currentSuggestion && config ? (
          <div className={`mx-2 my-2 p-3 rounded-xl border-2 ${config.bgClass} animate-fade-in`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <config.icon size={16} className={config.color} />
                <span className={`text-xs font-bold uppercase tracking-wide ${config.color}`}>{config.label}</span>
                {currentSuggestion.priority === "high" && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">!</span>}
              </div>
              <button onClick={dismissSuggestion} className="p-0.5 hover:bg-white/10 rounded"><X size={14} className="text-copilot-text-muted" /></button>
            </div>
            <p className="text-sm text-copilot-text leading-relaxed font-medium">{currentSuggestion.text}</p>
            {currentSuggestion.reason && <p className="text-[10px] text-copilot-text-muted mt-2 italic">{currentSuggestion.reason}</p>}
            {suggestions.length > 1 && (
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-copilot-border/50">
                <span className="text-[9px] text-copilot-text-muted">{currentSugIdx + 1}/{suggestions.length}</span>
                <button onClick={() => setCurrentSugIdx((currentSugIdx + 1) % suggestions.length)}
                  className="text-[10px] px-2.5 py-1 rounded-md mona-gradient text-white font-medium flex items-center gap-1 hover:opacity-90">
                  {t("session.nextSuggestion")} <ChevronRight size={11} />
                </button>
              </div>
            )}
          </div>
        ) : analyzing && streamingText ? (
          <div className="mx-2 my-2 p-3 rounded-xl border border-copilot-border/50 bg-mona-surface/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Loader2 size={12} className="text-mona-primary animate-spin" />
              <span className="text-[9px] text-mona-primary-light font-medium">KI denkt nach...</span>
            </div>
            <p className="text-xs text-copilot-text-secondary leading-relaxed animate-pulse">
              {streamingText.substring(0, 200)}{streamingText.length > 200 ? "..." : ""}
            </p>
          </div>
        ) : (
          <div className="px-3 py-4 text-center">
            {listening ? (
              <div className="flex items-center justify-center gap-2">
                <Mic size={16} className="text-copilot-text-muted animate-pulse" />
                <span className="text-xs text-copilot-text-muted">{t("session.noSuggestions")}</span>
              </div>
            ) : (
              <span className="text-xs text-copilot-text-muted">{t("session.waitingAudio")}</span>
            )}
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="px-2 py-1.5 border-b border-copilot-border shrink-0">
        {chatResponse && (
          <div className="mb-1.5 p-2 rounded-lg bg-mona-primary/10 border border-mona-primary/20">
            <p className="text-[10px] text-copilot-text leading-relaxed">{chatResponse}</p>
            <button onClick={() => setChatResponse("")} className="text-[8px] text-copilot-text-muted mt-1 underline">Schließen</button>
          </div>
        )}
        <div className="flex gap-1">
          <input
            type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleChat()}
            placeholder={t("session.chatPlaceholder")}
            className="flex-1 px-2.5 py-1.5 bg-mona-surface border border-copilot-border rounded-md text-xs text-copilot-text outline-none focus:border-mona-primary"
            disabled={chatLoading}
          />
          <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()}
            className="p-1.5 rounded-md mona-gradient text-white disabled:opacity-30 hover:opacity-90">
            {chatLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-copilot-border shrink-0">
        {(["checklist", "transcript", "candidate", "setup"] as SessionTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-medium border-b-2 transition-colors
              ${activeTab === tab ? "text-mona-primary border-mona-primary" : "text-copilot-text-muted border-transparent hover:text-copilot-text-secondary"}`}>
            {tab === "checklist" ? <CheckCircle size={10} /> : tab === "transcript" ? <FileText size={10} /> : tab === "candidate" ? <UserIcon size={10} /> : <Settings2 size={10} />}
            {tab === "checklist" ? `Check (${checklist.filter(c => c.status === "confirmed").length}/${checklist.length})`
              : tab === "transcript" ? t("session.tabTranscript") : tab === "candidate" ? t("session.tabCandidate") : t("session.tabSetup")}
          </button>
        ))}
      </div>

      {/* Checklist Status Bar */}
      {checklist.length > 0 && activeTab !== "checklist" && (
        <button onClick={() => setActiveTab("checklist")}
          className="flex items-center gap-2 px-3 py-1 bg-copilot-bg-secondary border-b border-copilot-border shrink-0 hover:bg-copilot-bg-tertiary transition-colors">
          <span className="text-[10px] font-medium text-copilot-text">
            {checklist.filter(c => c.status === "confirmed").length}/{checklist.length} Anforderungen erfüllt
          </span>
          <div className="flex gap-0.5 ml-auto">
            {checklist.map(c => (
              <div key={c.id} className={`w-2 h-2 rounded-full ${
                c.status === "confirmed" ? "bg-green-500" : c.status === "partial" ? "bg-yellow-500" : "bg-gray-400"
              }`} title={c.requirement} />
            ))}
          </div>
        </button>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "checklist" && (
          <div className="px-3 py-2">
            {checklistLoading ? (
              <div className="text-center py-4"><span className="text-[10px] text-copilot-text-muted">Anforderungen werden extrahiert...</span></div>
            ) : checklist.length === 0 ? (
              <div className="text-center py-4">
                <span className="text-[10px] text-copilot-text-muted">Stellenanzeige im Setup-Tab einfügen, um Anforderungen zu extrahieren</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {checklist.map(item => (
                  <div key={item.id}
                    className={`flex items-start gap-2 px-2 py-1.5 rounded border text-[10px] ${
                      item.status === "confirmed" ? "border-green-500/30 bg-green-500/5" :
                      item.status === "partial" ? "border-yellow-500/30 bg-yellow-500/5" :
                      "border-copilot-border bg-copilot-bg-secondary"
                    }`}>
                    <span className="mt-0.5 shrink-0">
                      {item.status === "confirmed" ? "✅" : item.status === "partial" ? "🟡" : "⬜"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-copilot-text leading-tight">{item.requirement}</span>
                      {item.evidence && <p className="text-[9px] text-copilot-text-muted mt-0.5 italic">"{item.evidence}"</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.source && (
                        <span className={`px-1 py-0.5 rounded text-[8px] font-medium ${
                          item.source === "CV" ? "bg-blue-500/20 text-blue-400" :
                          item.source === "Interview" ? "bg-purple-500/20 text-purple-400" :
                          item.source === "Beide" ? "bg-teal-500/20 text-teal-400" : ""
                        }`}>{item.source}</span>
                      )}
                      <span className={`px-1 py-0.5 rounded text-[8px] ${
                        item.priority === "must_have" ? "bg-red-500/15 text-red-400" : "bg-copilot-bg-tertiary text-copilot-text-muted"
                      }`}>{item.priority === "must_have" ? "Muss" : "Nice"}</span>
                    </div>
                  </div>
                ))}
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

        {activeTab === "candidate" && (
          <CandidateTab applicant={applicant} />
        )}

        {activeTab === "setup" && (
          <div className="px-3 py-2 flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-medium text-copilot-text-secondary block mb-1">{t("session.setupPromptLabel")}</label>
              <textarea
                value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t("session.setupPromptPlaceholder")}
                rows={3}
                className="w-full px-2.5 py-2 bg-mona-surface border border-copilot-border rounded-md text-xs text-copilot-text outline-none focus:border-mona-primary resize-none leading-relaxed"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-copilot-text-secondary block mb-1">{t("session.setupJobLabel")}</label>
              <textarea
                value={jobPosting} onChange={(e) => setJobPosting(e.target.value)}
                placeholder={t("session.setupJobPlaceholder")}
                rows={6}
                className="w-full px-2.5 py-2 bg-mona-surface border border-copilot-border rounded-md text-xs text-copilot-text outline-none focus:border-mona-primary resize-none leading-relaxed"
              />
            </div>
            {(customPrompt || jobPosting) && <span className="text-[9px] text-copilot-success">{t("session.setupSaved")}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

const CandidateTab: React.FC<{ applicant: any }> = ({ applicant }) => {
  const [userNotes, setUserNotes] = useState(applicant.userNotes || "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSaveNotes = async () => {
    if (!window.monacopilot || !applicant.id || applicant._isQuickStart) return
    setSaving(true)
    try {
      await window.monacopilot.updateApplicantNotes(applicant.id, userNotes)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  const email = applicant.email || ""
  const phone = applicant.mobiltelefon || applicant.mobilnummer || applicant.telefonnummer || ""
  const location = (() => {
    const w = applicant.Wohnort || applicant.wohnort || {}
    return [w.strasse, w.hausnummer, w.postleitzahl, w.city, w.country].filter(Boolean).join(" ") || applicant.ort || ""
  })()
  const jobTitle = applicant.jobTitle || applicant.stellenbezeichnung || applicant.berufswunsch || ""
  const files = applicant.files || []
  const logs = applicant.logs || []
  const notes = applicant.notizen || applicant.notes || ""

  return (
    <div className="px-3 py-2 flex flex-col gap-2">
      {email && <InfoRow icon={Mail} label="E-Mail" value={email} />}
      {phone && <InfoRow icon={Phone} label="Telefon" value={phone} />}
      {location && <InfoRow icon={MapPin} label="Standort" value={location} />}
      {jobTitle && <InfoRow icon={Briefcase} label="Position" value={jobTitle} />}

      {(applicant.cvSummary || applicant.zusammenfassung || applicant.extractedText) && (
        <div className="mona-surface p-2">
          <div className="text-[8px] text-copilot-text-muted mb-1 font-medium">CV / Lebenslauf</div>
          <p className="text-[9px] text-copilot-text leading-relaxed whitespace-pre-wrap">
            {(applicant.cvSummary || applicant.zusammenfassung || applicant.extractedText || "").substring(0, 1000)}
          </p>
        </div>
      )}

      {files.length > 0 && (
        <div className="mona-surface p-2">
          <div className="text-[8px] text-copilot-text-muted mb-1 font-medium flex items-center gap-1">
            <FileText size={9} /> Dokumente ({files.length})
          </div>
          {files.map((file: any, i: number) => {
            const url = file.downloadURL || file.url
            return (
              <div key={i} className="flex items-center justify-between py-0.5">
                <span className="text-[9px] text-copilot-text truncate">{file.fileName || file.name || `Datei ${i+1}`}</span>
                {url && (
                  <button onClick={() => window.open(url, "_blank")} className="p-0.5 hover:bg-mona-hover rounded">
                    <Download size={9} className="text-mona-primary-light" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {(logs.length > 0 || notes) && (
        <div className="mona-surface p-2">
          <div className="text-[8px] text-copilot-text-muted mb-1 font-medium flex items-center gap-1">
            <StickyNote size={9} /> Aktivitäten & Notizen
          </div>
          {notes && <p className="text-[9px] text-copilot-text leading-relaxed whitespace-pre-wrap mb-1">{notes}</p>}
          {logs.slice(0, 5).map((log: any, i: number) => (
            <div key={i} className="text-[9px] text-copilot-text-secondary py-0.5 border-t border-copilot-border/30">
              {log.message || log.text || log.action || JSON.stringify(log).substring(0, 80)}
            </div>
          ))}
        </div>
      )}

      <div className="mona-surface p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[8px] text-copilot-text-muted font-medium flex items-center gap-1">
            <Edit3 size={9} /> Meine Notizen
          </div>
          <div className="flex items-center gap-1">
            {saved && <span className="text-[8px] text-copilot-success">Gespeichert</span>}
            <button onClick={handleSaveNotes} disabled={saving || applicant._isQuickStart}
              className="text-[8px] px-1.5 py-0.5 rounded mona-gradient text-white disabled:opacity-30">
              {saving ? "..." : "Speichern"}
            </button>
          </div>
        </div>
        <textarea value={userNotes} onChange={(e) => setUserNotes(e.target.value)} onBlur={handleSaveNotes}
          placeholder="Notizen zum Kandidaten..."
          rows={3}
          className="w-full px-2 py-1.5 bg-mona-card border border-copilot-border rounded text-[9px] text-copilot-text outline-none focus:border-mona-primary resize-none leading-relaxed"
        />
      </div>
    </div>
  )
}

const InfoRow: React.FC<{ icon?: any; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="mona-surface p-2 flex items-center gap-1.5">
    {Icon && <Icon size={10} className="text-copilot-text-muted shrink-0" />}
    <span className="text-[9px] text-copilot-text-muted">{label}:</span>
    <span className="text-[9px] text-copilot-text truncate">{value}</span>
  </div>
)

export default LiveSession
