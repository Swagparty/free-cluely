import React, { useEffect, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Search, Loader2, User, Briefcase, Mail, ChevronRight, RefreshCw, Mic, ChevronDown, ChevronUp, Users, ClipboardList, Map, CheckSquare, Plus, X, GripVertical, Presentation, FileText, Sparkles, Beaker, Clock, Play } from "lucide-react"
import type { SessionMode, PitchRoadmapStep, PitchChecklistItem } from "../types"
import { useSessionStore } from "../stores/sessionStore"

interface SavedInterview {
  id: string
  candidateName: string
  date: string
  applicantId?: string
}

export function getDisplayName(a: any): string {
  const vorname = a.vorname || a.firstName || a.firstname || ""
  const nachname = a.nachname || a.lastName || a.lastname || ""
  if (vorname || nachname) {
    const full = `${vorname} ${nachname}`.trim()
    if (full) return full
  }
  if (a.name) return a.name
  if (a.fullName) return a.fullName
  if (a.email) return a.email
  if (a.mobilnummer || a.telefonnummer) return a.mobilnummer || a.telefonnummer

  const created = a.created?._seconds
    ? new Date(a.created._seconds * 1000).toLocaleDateString("de-DE")
    : a.createdGerman || ""
  const source = a.quelle || a.origin || ""
  const idShort = (a.id || a.applicantId || "").substring(0, 6)
  return [source, created, idShort].filter(Boolean).join(" · ") || `Bewerber ${idShort}`
}

interface InterviewSelectorProps {
  onSelectApplicant: (applicant: any) => void
  onQuickStart: (candidateInfo: { name: string; jobTitle?: string; notes?: string }) => void
  onStartJobIntake: (intakeInfo: {
    customerName: string
    companyName?: string
    jobTitle: string
    roadmap?: PitchRoadmapStep[]
    checklist?: PitchChecklistItem[]
  }) => void
  onStartSales: (salesInfo: {
    customerName: string
    companyName?: string
    dealName: string
    roadmap?: PitchRoadmapStep[]
    checklist?: PitchChecklistItem[]
  }) => void
}

const InterviewSelector: React.FC<InterviewSelectorProps> = ({ onSelectApplicant, onQuickStart, onStartJobIntake, onStartSales }) => {
  const { t } = useTranslation()
  const { settings } = useSessionStore()
  const betaEnabled = settings.betaFeaturesEnabled
  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [quickName, setQuickName] = useState("")
  const [quickJob, setQuickJob] = useState("")
  const [showDb, setShowDb] = useState(true)
  const [sessionMode, setSessionMode] = useState<SessionMode>("recruiting")

  const lastInterview = useMemo<SavedInterview | null>(() => {
    try {
      const saved = localStorage.getItem("mona_live_interviews")
      if (!saved) return null
      const interviews = JSON.parse(saved) as SavedInterview[]
      if (interviews.length === 0) return null
      const recent = interviews[0]
      const interviewDate = new Date(recent.date)
      const now = new Date()
      const hoursSince = (now.getTime() - interviewDate.getTime()) / (1000 * 60 * 60)
      if (hoursSince > 168) return null
      return recent
    } catch {
      return null
    }
  }, [])
  const [intakeCustomer, setIntakeCustomer] = useState("")
  const [intakeCompany, setIntakeCompany] = useState("")
  const [intakeJobTitle, setIntakeJobTitle] = useState("")
  const [showPitchSetup, setShowPitchSetup] = useState(false)
  const [roadmapSteps, setRoadmapSteps] = useState<PitchRoadmapStep[]>([
    { id: "1", title: "Begrüßung & Vorstellung", status: "pending" },
    { id: "2", title: "Bedarf verstehen", status: "pending" },
    { id: "3", title: "Anforderungen aufnehmen", status: "pending" },
    { id: "4", title: "Nächste Schritte", status: "pending" }
  ])
  const [checklistItems, setChecklistItems] = useState<PitchChecklistItem[]>([
    { id: "c1", text: "Unternehmen vorstellen", checked: false },
    { id: "c2", text: "Nach Budget fragen", checked: false },
    { id: "c3", text: "Timeline klären", checked: false },
    { id: "c4", text: "Entscheidungsprozess erfragen", checked: false }
  ])
  const [newStepTitle, setNewStepTitle] = useState("")
  const [newChecklistText, setNewChecklistText] = useState("")

  const [uploadingCV, setUploadingCV] = useState(false)

  const [salesCustomer, setSalesCustomer] = useState("")
  const [salesCompany, setSalesCompany] = useState("")
  const [salesDealName, setSalesDealName] = useState("")
  const [salesPitchText, setSalesPitchText] = useState("")
  const [salesRoadmap, setSalesRoadmap] = useState<PitchRoadmapStep[]>([])
  const [salesChecklist, setSalesChecklist] = useState<PitchChecklistItem[]>([])
  const [parsingPitch, setParsingPitch] = useState(false)
  const [pitchParsed, setPitchParsed] = useState(false)

  useEffect(() => {
    loadApplicants()
  }, [])

  const loadApplicants = async () => {
    if (!window.monacopilot) return
    setLoading(true)
    setError("")

    try {
      const result = await window.monacopilot.getApplicants()
      setApplicants(result.data || [])
    } catch (err: any) {
      setError(err.message || t("applicant.error"))
    }

    setLoading(false)
  }

  const handleUploadCV = async () => {
    if (!window.monacopilot) return
    setUploadingCV(true)
    setError("")

    try {
      const result = await window.monacopilot.uploadCV()
      if (result.canceled) {
        setUploadingCV(false)
        return
      }
      if (!result.success) {
        setError(result.error || t("applicant.uploadError"))
      } else {
        await loadApplicants()
      }
    } catch (err: any) {
      setError(err.message || t("applicant.uploadError"))
    }

    setUploadingCV(false)
  }

  const handleQuickStart = () => {
    if (!quickName.trim()) return
    onQuickStart({
      name: quickName.trim(),
      jobTitle: quickJob.trim() || undefined,
      notes: undefined
    })
  }

  const handleJobIntakeStart = () => {
    if (!intakeCustomer.trim() || !intakeJobTitle.trim()) return
    onStartJobIntake({
      customerName: intakeCustomer.trim(),
      companyName: intakeCompany.trim() || undefined,
      jobTitle: intakeJobTitle.trim(),
      roadmap: roadmapSteps.length > 0 ? roadmapSteps.map((s, i) => ({ ...s, status: i === 0 ? "current" : "pending" })) : undefined,
      checklist: checklistItems.length > 0 ? checklistItems : undefined
    })
  }

  const addRoadmapStep = () => {
    if (!newStepTitle.trim()) return
    setRoadmapSteps(prev => [...prev, { id: `step-${Date.now()}`, title: newStepTitle.trim(), status: "pending" }])
    setNewStepTitle("")
  }

  const removeRoadmapStep = (id: string) => {
    setRoadmapSteps(prev => prev.filter(s => s.id !== id))
  }

  const addChecklistItem = () => {
    if (!newChecklistText.trim()) return
    setChecklistItems(prev => [...prev, { id: `check-${Date.now()}`, text: newChecklistText.trim(), checked: false }])
    setNewChecklistText("")
  }

  const removeChecklistItem = (id: string) => {
    setChecklistItems(prev => prev.filter(c => c.id !== id))
  }

  const handleSalesStart = () => {
    if (!salesCustomer.trim() || !salesDealName.trim()) return
    onStartSales({
      customerName: salesCustomer.trim(),
      companyName: salesCompany.trim() || undefined,
      dealName: salesDealName.trim(),
      roadmap: salesRoadmap.length > 0 ? salesRoadmap.map((s, i) => ({ ...s, status: i === 0 ? "current" : "pending" })) : undefined,
      checklist: salesChecklist.length > 0 ? salesChecklist : undefined
    })
  }

  const parsePitchDocument = async () => {
    if (!salesPitchText.trim() || !window.monacopilot) return
    setParsingPitch(true)
    setPitchParsed(false)

    try {
      const result = await window.monacopilot.analyzeTranscript(
        salesPitchText,
        {
          name: "Pitch Parser",
          customPrompt: `Analysiere dieses Pitch/Demo-Dokument und extrahiere:

1. ROADMAP: Die Hauptschritte/Phasen des Pitches (z.B. "Act 1", "Phase 2", Zeitabschnitte wie "Minute 0-10", etc.)
2. CHECKLIST: Wichtige Punkte die angesprochen werden müssen (z.B. aus "Pre-Demo Checklist", "Things to mention", etc.)

Antworte NUR mit diesem JSON-Format:
{
  "roadmap": [
    {"title": "Schritt-Titel", "description": "Kurze Beschreibung (optional)"}
  ],
  "checklist": [
    {"text": "Punkt der angesprochen werden muss", "category": "Kategorie (optional)"}
  ]
}

Extrahiere maximal 10 Roadmap-Schritte und maximal 20 Checklist-Punkte. Halte die Titel kurz und prägnant.`
        }
      )

      if (result.suggestions?.[0]?.text) {
        try {
          const text = result.suggestions[0].text
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])

            if (parsed.roadmap?.length > 0) {
              setSalesRoadmap(parsed.roadmap.map((r: any, i: number) => ({
                id: `step-${Date.now()}-${i}`,
                title: r.title || "",
                description: r.description || "",
                status: "pending" as const
              })).filter((r: any) => r.title))
            }

            if (parsed.checklist?.length > 0) {
              setSalesChecklist(parsed.checklist.map((c: any, i: number) => ({
                id: `check-${Date.now()}-${i}`,
                text: c.text || "",
                category: c.category || "",
                checked: false
              })).filter((c: any) => c.text))
            }

            setPitchParsed(true)
          }
        } catch (e) {
          console.error("Parse error:", e)
        }
      }
    } catch (err) {
      console.error("AI parsing error:", err)
    }

    setParsingPitch(false)
  }

  const removeSalesRoadmapStep = (id: string) => {
    setSalesRoadmap(prev => prev.filter(s => s.id !== id))
  }

  const removeSalesChecklistItem = (id: string) => {
    setSalesChecklist(prev => prev.filter(c => c.id !== id))
  }

  const filtered = searchTerm.trim()
    ? applicants.filter((a) => {
        const name = getDisplayName(a).toLowerCase()
        const email = (a.email || "").toLowerCase()
        const job = (a.jobTitle || a.stellenbezeichnung || "").toLowerCase()
        const term = searchTerm.toLowerCase()
        return name.includes(term) || email.includes(term) || job.includes(term)
      })
    : applicants

  return (
    <div className="flex flex-col h-full">
      {betaEnabled && (
        <div className="p-2 border-b border-copilot-border shrink-0">
          <div className="flex rounded-lg bg-mona-surface p-0.5">
            <button
              onClick={() => setSessionMode("recruiting")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[9px] font-medium transition-all
                ${sessionMode === "recruiting"
                  ? "mona-gradient text-white shadow-sm"
                  : "text-copilot-text-muted hover:text-copilot-text"}`}
            >
              <Users size={11} />
              {t("mode.recruiting")}
            </button>
            <button
              onClick={() => setSessionMode("job_intake")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[9px] font-medium transition-all relative
                ${sessionMode === "job_intake"
                  ? "mona-gradient text-white shadow-sm"
                  : "text-copilot-text-muted hover:text-copilot-text"}`}
            >
              <ClipboardList size={11} />
              {t("mode.jobIntake")}
              <span className="absolute -top-1 -right-1 text-[6px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">BETA</span>
            </button>
            <button
              onClick={() => setSessionMode("sales")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[9px] font-medium transition-all relative
                ${sessionMode === "sales"
                  ? "mona-gradient text-white shadow-sm"
                  : "text-copilot-text-muted hover:text-copilot-text"}`}
            >
              <Presentation size={11} />
              {t("mode.sales")}
              <span className="absolute -top-1 -right-1 text-[6px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">BETA</span>
            </button>
          </div>
        </div>
      )}

      {sessionMode === "job_intake" ? (
        <div className="p-3 flex-1 overflow-y-auto">
          <div className="flex items-center gap-1.5 mb-2">
            <ClipboardList size={13} className="text-mona-primary" />
            <span className="text-xs font-semibold text-copilot-text">{t("jobIntake.title")}</span>
          </div>
          <p className="text-[10px] text-copilot-text-muted mb-3">{t("jobIntake.subtitle")}</p>

          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[9px] text-copilot-text-muted mb-1 block">{t("jobIntake.customerLabel")}</label>
              <input
                type="text"
                value={intakeCustomer}
                onChange={(e) => setIntakeCustomer(e.target.value)}
                placeholder={t("jobIntake.customerPlaceholder")}
                className="w-full px-2.5 py-2 bg-mona-surface border border-copilot-border rounded-md
                  text-copilot-text text-xs outline-none focus:border-mona-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] text-copilot-text-muted mb-1 block">{t("jobIntake.companyLabel")}</label>
              <input
                type="text"
                value={intakeCompany}
                onChange={(e) => setIntakeCompany(e.target.value)}
                placeholder={t("jobIntake.companyPlaceholder")}
                className="w-full px-2.5 py-1.5 bg-mona-surface border border-copilot-border rounded-md
                  text-copilot-text text-[10px] outline-none focus:border-mona-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] text-copilot-text-muted mb-1 block">{t("jobIntake.jobTitleLabel")} *</label>
              <input
                type="text"
                value={intakeJobTitle}
                onChange={(e) => setIntakeJobTitle(e.target.value)}
                placeholder={t("jobIntake.jobTitlePlaceholder")}
                className="w-full px-2.5 py-2 bg-mona-surface border border-copilot-border rounded-md
                  text-copilot-text text-xs outline-none focus:border-mona-primary transition-colors"
              />
            </div>
          </div>

          <button
            onClick={() => setShowPitchSetup(!showPitchSetup)}
            className="w-full mt-3 flex items-center justify-between px-2.5 py-2 rounded-md bg-mona-surface border border-copilot-border hover:border-mona-primary/40 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Map size={11} className="text-blue-400" />
              <span className="text-[10px] font-medium text-copilot-text">{t("jobIntake.pitchSetup")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-copilot-text-muted">
                {roadmapSteps.length} {t("jobIntake.steps")} · {checklistItems.length} {t("jobIntake.checklistItems")}
              </span>
              {showPitchSetup ? <ChevronUp size={11} className="text-copilot-text-muted" /> : <ChevronDown size={11} className="text-copilot-text-muted" />}
            </div>
          </button>

          {showPitchSetup && (
            <div className="mt-2 flex flex-col gap-3">
              <div className="p-2.5 rounded-lg bg-mona-surface border border-copilot-border">
                <div className="flex items-center gap-1.5 mb-2">
                  <Map size={11} className="text-blue-400" />
                  <span className="text-[10px] font-semibold text-copilot-text">{t("jobIntake.roadmapTitle")}</span>
                </div>
                <p className="text-[9px] text-copilot-text-muted mb-2">{t("jobIntake.roadmapHint")}</p>

                <div className="flex flex-col gap-1 mb-2">
                  {roadmapSteps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-mona-card border border-copilot-border/50">
                      <span className="text-[9px] text-copilot-text-muted w-4">{idx + 1}.</span>
                      <span className="text-[10px] text-copilot-text flex-1">{step.title}</span>
                      <button onClick={() => removeRoadmapStep(step.id)} className="p-0.5 hover:bg-red-500/20 rounded">
                        <X size={10} className="text-copilot-text-muted hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    placeholder={t("jobIntake.addStepPlaceholder")}
                    className="flex-1 px-2 py-1 bg-mona-card border border-copilot-border rounded text-[9px] text-copilot-text outline-none focus:border-mona-primary"
                    onKeyDown={(e) => e.key === "Enter" && addRoadmapStep()}
                  />
                  <button onClick={addRoadmapStep} disabled={!newStepTitle.trim()}
                    className="p-1 rounded bg-blue-500/20 text-blue-400 disabled:opacity-30 hover:bg-blue-500/30">
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-mona-surface border border-copilot-border">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckSquare size={11} className="text-green-400" />
                  <span className="text-[10px] font-semibold text-copilot-text">{t("jobIntake.checklistTitle")}</span>
                </div>
                <p className="text-[9px] text-copilot-text-muted mb-2">{t("jobIntake.checklistHint")}</p>

                <div className="flex flex-col gap-1 mb-2">
                  {checklistItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-mona-card border border-copilot-border/50">
                      <CheckSquare size={10} className="text-green-400/50 shrink-0" />
                      <span className="text-[10px] text-copilot-text flex-1">{item.text}</span>
                      <button onClick={() => removeChecklistItem(item.id)} className="p-0.5 hover:bg-red-500/20 rounded">
                        <X size={10} className="text-copilot-text-muted hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder={t("jobIntake.addChecklistPlaceholder")}
                    className="flex-1 px-2 py-1 bg-mona-card border border-copilot-border rounded text-[9px] text-copilot-text outline-none focus:border-mona-primary"
                    onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                  />
                  <button onClick={addChecklistItem} disabled={!newChecklistText.trim()}
                    className="p-1 rounded bg-green-500/20 text-green-400 disabled:opacity-30 hover:bg-green-500/30">
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <button onClick={handleJobIntakeStart} disabled={!intakeCustomer.trim() || !intakeJobTitle.trim()}
            className="w-full py-2.5 mt-3 rounded-md mona-gradient text-white text-xs font-semibold
              hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-1.5">
            <ClipboardList size={12} />
            {t("jobIntake.start")}
          </button>

          <div className="mt-3 p-2.5 rounded-lg bg-mona-surface/50 border border-copilot-border/50">
            <p className="text-[9px] text-copilot-text-muted leading-relaxed">
              {t("jobIntake.hint")}
            </p>
          </div>
        </div>
      ) : sessionMode === "sales" ? (
        <div className="p-3 flex-1 overflow-y-auto">
          <div className="flex items-center gap-1.5 mb-2">
            <Presentation size={13} className="text-purple-400" />
            <span className="text-xs font-semibold text-copilot-text">{t("sales.title")}</span>
          </div>
          <p className="text-[10px] text-copilot-text-muted mb-3">{t("sales.subtitle")}</p>

          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[9px] text-copilot-text-muted mb-1 block">{t("sales.customerLabel")}</label>
              <input
                type="text"
                value={salesCustomer}
                onChange={(e) => setSalesCustomer(e.target.value)}
                placeholder={t("sales.customerPlaceholder")}
                className="w-full px-2.5 py-2 bg-mona-surface border border-copilot-border rounded-md
                  text-copilot-text text-xs outline-none focus:border-mona-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] text-copilot-text-muted mb-1 block">{t("sales.companyLabel")}</label>
              <input
                type="text"
                value={salesCompany}
                onChange={(e) => setSalesCompany(e.target.value)}
                placeholder={t("sales.companyPlaceholder")}
                className="w-full px-2.5 py-1.5 bg-mona-surface border border-copilot-border rounded-md
                  text-copilot-text text-[10px] outline-none focus:border-mona-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] text-copilot-text-muted mb-1 block">{t("sales.dealLabel")} *</label>
              <input
                type="text"
                value={salesDealName}
                onChange={(e) => setSalesDealName(e.target.value)}
                placeholder={t("sales.dealPlaceholder")}
                className="w-full px-2.5 py-2 bg-mona-surface border border-copilot-border rounded-md
                  text-copilot-text text-xs outline-none focus:border-mona-primary transition-colors"
              />
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={11} className="text-purple-400" />
              <span className="text-[10px] font-semibold text-copilot-text">{t("sales.pitchDocument")}</span>
            </div>
            <p className="text-[9px] text-copilot-text-muted mb-2">{t("sales.pitchHint")}</p>
            <textarea
              value={salesPitchText}
              onChange={(e) => { setSalesPitchText(e.target.value); setPitchParsed(false) }}
              placeholder={t("sales.pitchPlaceholder")}
              rows={5}
              className="w-full px-2.5 py-2 bg-mona-surface border border-copilot-border rounded-md
                text-copilot-text text-[10px] outline-none focus:border-mona-primary transition-colors resize-none leading-relaxed"
            />
            <button
              onClick={parsePitchDocument}
              disabled={!salesPitchText.trim() || parsingPitch}
              className="w-full mt-2 py-2 rounded-md bg-purple-500/20 border border-purple-500/30 text-[10px] font-medium
                text-purple-300 hover:bg-purple-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center gap-1.5"
            >
              {parsingPitch ? (
                <><Loader2 size={11} className="animate-spin" />{t("sales.parsing")}</>
              ) : (
                <><Sparkles size={11} />{t("sales.parseWithAI")}</>
              )}
            </button>
          </div>

          {pitchParsed && (salesRoadmap.length > 0 || salesChecklist.length > 0) && (
            <div className="mt-3 flex flex-col gap-2">
              {salesRoadmap.length > 0 && (
                <div className="p-2.5 rounded-lg bg-mona-surface border border-copilot-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Map size={11} className="text-blue-400" />
                      <span className="text-[10px] font-semibold text-copilot-text">{t("sales.extractedRoadmap")}</span>
                    </div>
                    <span className="text-[9px] text-copilot-text-muted">{salesRoadmap.length} {t("jobIntake.steps")}</span>
                  </div>
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                    {salesRoadmap.map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-mona-card border border-copilot-border/50">
                        <span className="text-[9px] text-copilot-text-muted w-4">{idx + 1}.</span>
                        <span className="text-[9px] text-copilot-text flex-1 truncate">{step.title}</span>
                        <button onClick={() => removeSalesRoadmapStep(step.id)} className="p-0.5 hover:bg-red-500/20 rounded">
                          <X size={9} className="text-copilot-text-muted hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {salesChecklist.length > 0 && (
                <div className="p-2.5 rounded-lg bg-mona-surface border border-copilot-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <CheckSquare size={11} className="text-green-400" />
                      <span className="text-[10px] font-semibold text-copilot-text">{t("sales.extractedChecklist")}</span>
                    </div>
                    <span className="text-[9px] text-copilot-text-muted">{salesChecklist.length} {t("jobIntake.checklistItems")}</span>
                  </div>
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                    {salesChecklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-mona-card border border-copilot-border/50">
                        <CheckSquare size={9} className="text-green-400/50 shrink-0" />
                        <span className="text-[9px] text-copilot-text flex-1 truncate">{item.text}</span>
                        <button onClick={() => removeSalesChecklistItem(item.id)} className="p-0.5 hover:bg-red-500/20 rounded">
                          <X size={9} className="text-copilot-text-muted hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={handleSalesStart} disabled={!salesCustomer.trim() || !salesDealName.trim()}
            className="w-full py-2.5 mt-3 rounded-md mona-gradient text-white text-xs font-semibold
              hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-1.5">
            <Presentation size={12} />
            {t("sales.start")}
          </button>

          <div className="mt-3 p-2.5 rounded-lg bg-mona-surface/50 border border-copilot-border/50">
            <p className="text-[9px] text-copilot-text-muted leading-relaxed">
              {t("sales.hint")}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="p-3 border-b border-copilot-border shrink-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Mic size={13} className="text-mona-primary" />
              <span className="text-xs font-semibold text-copilot-text">{t("quickstart.title")}</span>
            </div>
            <p className="text-[10px] text-copilot-text-muted mb-2">{t("quickstart.subtitle")}</p>

            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder={t("quickstart.namePlaceholder")}
                className="w-full px-2.5 py-2 bg-mona-surface border border-copilot-border rounded-md
                  text-copilot-text text-xs outline-none focus:border-mona-primary transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleQuickStart()}
              />
              <input
                type="text"
                value={quickJob}
                onChange={(e) => setQuickJob(e.target.value)}
                placeholder={t("quickstart.jobPlaceholder")}
                className="w-full px-2.5 py-1.5 bg-mona-surface border border-copilot-border rounded-md
                  text-copilot-text text-[10px] outline-none focus:border-mona-primary transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleQuickStart()}
              />
              <button onClick={handleQuickStart} disabled={!quickName.trim()}
                className="w-full py-2 rounded-md mona-gradient text-white text-xs font-semibold
                  hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-1.5">
                <Mic size={12} />
                {t("quickstart.start")}
              </button>
            </div>
          </div>
        </>
      )}

      {sessionMode === "recruiting" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {lastInterview && (
            <div className="px-3 pt-2 shrink-0">
              <div className="mona-card p-2.5 border-l-2 border-l-mona-primary animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-mona-primary/15 flex items-center justify-center shrink-0">
                      <Clock size={12} className="text-mona-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-copilot-text-muted">{t("quickstart.lastInterview")}</div>
                      <div className="text-xs font-medium text-copilot-text truncate">{lastInterview.candidateName}</div>
                      <div className="text-[9px] text-copilot-text-muted">
                        {new Date(lastInterview.date).toLocaleDateString(settings.language === "de" ? "de-DE" : "en-US", { 
                          weekday: "short", 
                          month: "short", 
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => onQuickStart({ name: lastInterview.candidateName })}
                    className="px-2.5 py-1.5 rounded-md mona-gradient text-white text-[10px] font-medium
                      hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0"
                  >
                    <Play size={10} />
                    {t("quickstart.continueWith")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button onClick={() => setShowDb(!showDb)}
            className="flex items-center justify-between px-3 py-2 hover:bg-mona-hover transition-colors shrink-0">
            <span className="text-[10px] text-copilot-text-muted">{t("quickstart.or")}</span>
            <div className="flex items-center gap-1">
              {!loading && applicants.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-mona-primary/15 text-mona-primary-light">
                  {applicants.length}
                </span>
              )}
              {showDb ? <ChevronUp size={11} className="text-copilot-text-muted" /> : <ChevronDown size={11} className="text-copilot-text-muted" />}
            </div>
          </button>

          {showDb && (
            <div className="flex-1 flex flex-col overflow-hidden px-3 pb-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Loader2 size={18} className="text-mona-primary animate-spin" />
                  <span className="text-[10px] text-copilot-text-secondary">{t("applicant.loading")}</span>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 mb-2">
                      <span className="text-red-400 text-[10px]">{error}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="relative flex-1">
                      <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-copilot-text-muted" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t("applicant.filterPlaceholder")}
                        className="w-full pl-7 pr-3 py-1.5 bg-mona-surface border border-copilot-border rounded-md
                          text-copilot-text text-[10px] outline-none focus:border-mona-primary transition-colors"
                      />
                    </div>
                    <button onClick={loadApplicants} title={t("applicant.refresh")}
                      className="p-1.5 hover:bg-mona-hover rounded-md border border-copilot-border transition-colors">
                      <RefreshCw size={12} className="text-copilot-text-muted" />
                    </button>
                    <button onClick={handleUploadCV} disabled={uploadingCV} title={t("applicant.uploadCV")}
                      className="p-1.5 hover:bg-mona-primary/10 rounded-md border border-mona-primary/30 transition-colors
                        disabled:opacity-40 disabled:cursor-not-allowed">
                      {uploadingCV
                        ? <Loader2 size={12} className="text-mona-primary-light animate-spin" />
                        : <Plus size={12} className="text-mona-primary-light" />}
                    </button>
                  </div>

                  {uploadingCV && (
                    <div className="mb-2 p-3 rounded-lg bg-mona-primary/5 border border-mona-primary/20 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <Loader2 size={14} className="text-mona-primary animate-spin shrink-0" />
                        <span className="text-[10px] text-copilot-text-secondary">{t("applicant.parsing")}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="text-center py-4">
                        <User size={20} className="text-copilot-text-muted mx-auto mb-1" />
                        <p className="text-[10px] text-copilot-text-muted">{t("applicant.noResults")}</p>
                        <p className="text-[9px] text-copilot-text-muted mt-1">{t("applicant.noResultsHint")}</p>
                      </div>
                    ) : (
                      filtered.map((applicant) => (
                        <button
                          key={applicant.id || applicant.applicantId}
                          onClick={() => onSelectApplicant(applicant)}
                          className="mona-surface p-2 text-left hover:border-mona-primary/40 transition-colors
                            cursor-pointer flex items-center gap-2 group"
                        >
                          <div className="w-6 h-6 rounded-full bg-mona-primary/15 flex items-center justify-center shrink-0">
                            <User size={10} className="text-mona-primary-light" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-medium text-copilot-text truncate">
                              {getDisplayName(applicant)}
                            </div>
                            {applicant.email && (
                              <div className="flex items-center gap-1">
                                <Mail size={8} className="text-copilot-text-muted" />
                                <span className="text-[9px] text-copilot-text-muted truncate">{applicant.email}</span>
                              </div>
                            )}
                          </div>
                          <ChevronRight size={12} className="text-copilot-text-muted group-hover:text-mona-primary transition-colors shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default InterviewSelector
