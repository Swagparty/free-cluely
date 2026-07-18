import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Minus, X, Settings, ArrowLeft, Loader2, ClipboardCheck, ThumbsUp, ThumbsDown, ArrowRight, History, Search, FileText, Clock, Users, Building, Download, Copy } from "lucide-react"
import { useSessionStore } from "../stores/sessionStore"
import SettingsPanel from "./SettingsPanel"
import InterviewSelector from "./InterviewSelector"
import CandidateProfile, { InterviewSetup } from "./CandidateProfile"
import LiveSession from "./LiveSession"
import JobIntakeSession from "./JobIntakeSession"
import WelcomeScreen from "./WelcomeScreen"
import PreFlightCheck from "./PreFlightCheck"
import { getDisplayName } from "./InterviewSelector"
import type { JobIntakeRequirement, SessionMode, PitchRoadmapStep, PitchChecklistItem } from "../types"

interface SavedInterview {
  id: string
  candidateName: string
  date: string
  transcript: any[]
  scorecard: any
  checklist?: any[]
  applicantId?: string
}

interface SavedJobIntake {
  id: string
  customerName: string
  companyName?: string
  jobTitle: string
  date: string
  requirements: JobIntakeRequirement[]
  transcript: any[]
  notes: string
}

interface SavedSalesCall {
  id: string
  customerName: string
  companyName?: string
  dealName: string
  date: string
  transcript: any[]
  notes: string
  roadmap?: PitchRoadmapStep[]
  checklist?: PitchChecklistItem[]
}

type View = "welcome" | "list" | "profile" | "preflight" | "session" | "summary" | "history" | "history-detail" | "settings" | "job-intake-session" | "job-intake-summary" | "job-intake-history-detail" | "sales-session" | "sales-summary" | "sales-history-detail"

const CopilotShell: React.FC = () => {
  const { t } = useTranslation()
  const isFirstTime = !localStorage.getItem("mona_live_onboarded")

  const [view, setView] = useState<View>(isFirstTime ? "welcome" : "list")
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)
  const [scorecard, setScorecard] = useState<any>(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)
  const [scorecardSaved, setScorecardSaved] = useState(false)
  const [audioConfig, setAudioConfig] = useState<{ micDeviceId: string; systemDeviceId?: string } | null>(null)
  const [interviewSetup, setInterviewSetup] = useState<InterviewSetup | null>(null)
  const [interviews, setInterviews] = useState<SavedInterview[]>(() => {
    try { return JSON.parse(localStorage.getItem("mona_live_interviews") || "[]") } catch { return [] }
  })
  const [selectedInterview, setSelectedInterview] = useState<SavedInterview | null>(null)
  const [historySearch, setHistorySearch] = useState("")

  const [sessionMode, setSessionMode] = useState<SessionMode>("recruiting")
  const [jobIntakeInfo, setJobIntakeInfo] = useState<{
    customerName: string
    companyName?: string
    jobTitle: string
    roadmap?: PitchRoadmapStep[]
    checklist?: PitchChecklistItem[]
  } | null>(null)
  const [jobIntakes, setJobIntakes] = useState<SavedJobIntake[]>(() => {
    try { return JSON.parse(localStorage.getItem("mona_live_job_intakes") || "[]") } catch { return [] }
  })
  const [selectedJobIntake, setSelectedJobIntake] = useState<SavedJobIntake | null>(null)
  const [currentJobIntakeResult, setCurrentJobIntakeResult] = useState<SavedJobIntake | null>(null)

  const [salesInfo, setSalesInfo] = useState<{
    customerName: string
    companyName?: string
    dealName: string
    roadmap?: PitchRoadmapStep[]
    checklist?: PitchChecklistItem[]
  } | null>(null)
  const [salesCalls, setSalesCalls] = useState<SavedSalesCall[]>(() => {
    try { return JSON.parse(localStorage.getItem("mona_live_sales_calls") || "[]") } catch { return [] }
  })
  const [selectedSalesCall, setSelectedSalesCall] = useState<SavedSalesCall | null>(null)
  const [currentSalesResult, setCurrentSalesResult] = useState<SavedSalesCall | null>(null)

  const handleLogout = () => {
    window.monacopilot?.logout()
    useSessionStore.getState().setAuthenticated(false)
  }

  const handleSelectApplicant = (applicant: any) => {
    setSelectedApplicant(applicant)
    setView("profile")
  }

  const handleQuickStart = (info: { name: string; jobTitle?: string; notes?: string }) => {
    setSelectedApplicant({
      id: `quick-${Date.now()}`,
      vorname: info.name,
      jobTitle: info.jobTitle || "",
      userNotes: info.notes || "",
      _isQuickStart: true
    })
    setView("preflight")
  }

  const handleBack = () => {
    setView("list")
    setSelectedApplicant(null)
    setScorecard(null)
    setScorecardSaved(false)
  }

  const handleStartSession = (setup?: InterviewSetup) => {
    if (setup) {
      setInterviewSetup(setup)
    }
    setView("preflight")
  }

  const handlePreflightReady = (config: { micDeviceId: string; systemDeviceId?: string }) => {
    setAudioConfig(config)
    if (sessionMode === "job_intake") {
      setView("job-intake-session")
    } else if (sessionMode === "sales") {
      setView("sales-session")
    } else {
      setView("session")
    }
  }

  const handleStartJobIntake = (info: {
    customerName: string
    companyName?: string
    jobTitle: string
    roadmap?: PitchRoadmapStep[]
    checklist?: PitchChecklistItem[]
  }) => {
    setJobIntakeInfo(info)
    setSessionMode("job_intake")
    setView("preflight")
  }

  const handleStartSales = (info: {
    customerName: string
    companyName?: string
    dealName: string
    roadmap?: PitchRoadmapStep[]
    checklist?: PitchChecklistItem[]
  }) => {
    setSalesInfo(info)
    setSessionMode("sales")
    setView("preflight")
  }

  const handleEndSales = (data: {
    transcript: any[]
    notes: string
    roadmap?: PitchRoadmapStep[]
    checklist?: PitchChecklistItem[]
  }) => {
    if (!salesInfo) return

    const call: SavedSalesCall = {
      id: `sales-${Date.now()}`,
      customerName: salesInfo.customerName,
      companyName: salesInfo.companyName,
      dealName: salesInfo.dealName,
      date: new Date().toISOString(),
      transcript: data.transcript,
      notes: data.notes,
      roadmap: data.roadmap,
      checklist: data.checklist
    }

    const updated = [call, ...salesCalls].slice(0, 50)
    setSalesCalls(updated)
    localStorage.setItem("mona_live_sales_calls", JSON.stringify(updated))

    setCurrentSalesResult(call)
    setView("sales-summary")
  }

  const handleEndJobIntake = (data: {
    requirements: JobIntakeRequirement[]
    transcript: any[]
    notes: string
  }) => {
    if (!jobIntakeInfo) return

    const intake: SavedJobIntake = {
      id: `intake-${Date.now()}`,
      customerName: jobIntakeInfo.customerName,
      companyName: jobIntakeInfo.companyName,
      jobTitle: jobIntakeInfo.jobTitle,
      date: new Date().toISOString(),
      requirements: data.requirements,
      transcript: data.transcript,
      notes: data.notes
    }

    const updated = [intake, ...jobIntakes].slice(0, 50)
    setJobIntakes(updated)
    localStorage.setItem("mona_live_job_intakes", JSON.stringify(updated))

    setCurrentJobIntakeResult(intake)
    setView("job-intake-summary")
  }

  const saveInterviewToHistory = (name: string, transcript: any[], sc: any, applicantId?: string, checklist?: any[]) => {
    const interview: SavedInterview = {
      id: `int-${Date.now()}`,
      candidateName: name,
      date: new Date().toISOString(),
      transcript,
      scorecard: sc,
      checklist,
      applicantId
    }
    const updated = [interview, ...interviews].slice(0, 50)
    setInterviews(updated)
    localStorage.setItem("mona_live_interviews", JSON.stringify(updated))

    if (applicantId && !applicantId.startsWith("quick-") && window.monacopilot) {
      window.monacopilot.saveInterview(applicantId, {
        date: interview.date,
        transcriptText: transcript.map((l: any) => l.text).join(" "),
        scorecard: sc,
        checklist
      }).catch(() => {})
    }
  }

  const [sessionChecklist, setSessionChecklist] = useState<any[]>([])

  const handleEndSession = async (transcript: any[], _suggestions: any[], checklist: any[] = []) => {
    setView("summary")
    setScorecardLoading(true)
    setScorecardSaved(false)
    setSessionChecklist(checklist)

    const name = selectedApplicant ? getDisplayName(selectedApplicant) : "Kandidat"
    let generatedScorecard = null

    if (window.monacopilot && transcript.length > 0) {
      let transcriptText = transcript.map(l => `${l.speaker}: ${l.text}`).join("\n")
      if (checklist.length > 0) {
        const checklistSummary = checklist.map(c =>
          `- ${c.requirement}: ${c.status === "confirmed" ? "✅ Bestätigt" : c.status === "partial" ? "🟡 Teilweise" : "⬜ Offen"}${c.source ? ` (${c.source})` : ""}${c.evidence ? ` — "${c.evidence}"` : ""}`
        ).join("\n")
        transcriptText += `\n\nANFORDERUNGS-CHECKLISTE:\n${checklistSummary}`
      }
      const result = await window.monacopilot.generateScorecard(transcriptText, name)
      if (result.success && result.scorecard) {
        generatedScorecard = result.scorecard
        setScorecard(generatedScorecard)
        setScorecardSaved(true)
      }
    }

    saveInterviewToHistory(name, transcript, generatedScorecard, selectedApplicant?.id, checklist)

    setScorecardLoading(false)
  }

  const candidateName = selectedApplicant ? getDisplayName(selectedApplicant) : ""

  return (
    <div className="flex flex-col h-screen bg-mona-dark">
      <Header
        onLogout={handleLogout}
        onSettings={() => setView(view === "settings" ? "list" : "settings")}
        onHistory={() => setView(view === "history" ? "list" : "history")}
        onApplicants={() => { setView("list"); setSelectedApplicant(null) }}
        settingsOpen={view === "settings"}
        historyOpen={view === "history" || view === "history-detail" || view === "job-intake-history-detail"}
        applicantsOpen={view === "list" || view === "profile" || view === "preflight"}
        inSession={view === "session" || view === "job-intake-session" || view === "sales-session"}
        interviewCount={interviews.length + jobIntakes.length + salesCalls.length}
      />

      <div className="flex-1 overflow-hidden">
        {view === "welcome" && (
          <WelcomeScreen onContinue={() => setView("list")} />
        )}

        {view === "settings" && (
          <div className="h-full overflow-y-auto">
            <SettingsPanel onClose={() => setView("list")} />
          </div>
        )}

        {view === "list" && (
          <InterviewSelector
            onSelectApplicant={handleSelectApplicant}
            onQuickStart={handleQuickStart}
            onStartJobIntake={handleStartJobIntake}
            onStartSales={handleStartSales}
          />
        )}

        {view === "profile" && selectedApplicant && (
          <CandidateProfile
            applicant={selectedApplicant}
            onBack={handleBack}
            onStartSession={handleStartSession}
          />
        )}

        {view === "preflight" && (selectedApplicant || (sessionMode === "job_intake" && jobIntakeInfo)) && (
          <PreFlightCheck
            candidateName={sessionMode === "job_intake" ? (jobIntakeInfo?.jobTitle || "Job Intake") : candidateName}
            onReady={handlePreflightReady}
            onCancel={() => setView(sessionMode === "job_intake" ? "list" : (selectedApplicant?._isQuickStart ? "list" : "profile"))}
          />
        )}

        {view === "session" && selectedApplicant && (
          <LiveSession
            applicant={selectedApplicant}
            audioConfig={audioConfig || undefined}
            initialSetup={interviewSetup || undefined}
            onEndSession={handleEndSession}
            onBack={() => setView("profile")}
          />
        )}

        {view === "job-intake-session" && jobIntakeInfo && (
          <JobIntakeSession
            intakeInfo={jobIntakeInfo}
            audioConfig={audioConfig || undefined}
            onEndSession={handleEndJobIntake}
            onBack={() => setView("list")}
          />
        )}

        {view === "sales-session" && salesInfo && (
          <JobIntakeSession
            intakeInfo={{
              customerName: salesInfo.customerName,
              companyName: salesInfo.companyName,
              jobTitle: salesInfo.dealName,
              roadmap: salesInfo.roadmap,
              checklist: salesInfo.checklist
            }}
            audioConfig={audioConfig || undefined}
            onEndSession={(data) => handleEndSales({
              transcript: data.transcript,
              notes: data.notes,
              roadmap: data.roadmap,
              checklist: data.checklist
            })}
            onBack={() => setView("list")}
            isSalesMode={true}
          />
        )}

        {view === "summary" && (
          <div className="h-full overflow-y-auto p-3">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setView(selectedApplicant?._isQuickStart ? "list" : "profile")}
                className="p-1 hover:bg-mona-hover rounded transition-colors">
                <ArrowLeft size={14} className="text-copilot-text-muted" />
              </button>
              <ClipboardCheck size={16} className="text-mona-primary" />
              <h2 className="font-heading text-sm font-bold text-copilot-text">{t("summary.title")}</h2>
            </div>

            {scorecardLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 size={24} className="text-mona-primary animate-spin" />
                <p className="text-xs text-copilot-text-secondary">{t("summary.generating")}</p>
              </div>
            ) : scorecard ? (
              <div className="flex flex-col gap-3">
                {scorecardSaved && (
                  <div className="bg-copilot-success/10 border border-copilot-success/30 rounded-md px-3 py-1.5 text-center">
                    <span className="text-[10px] text-copilot-success">{t("summary.saved")}</span>
                  </div>
                )}

                <div className="mona-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-copilot-text-secondary">{t("summary.overallFit")}</span>
                    <span className="text-sm font-bold text-copilot-text">{scorecard.overallFit}</span>
                  </div>
                  <p className="text-xs text-copilot-text leading-relaxed">{scorecard.candidateSummary}</p>
                </div>

                {scorecard.competencyScores?.length > 0 && (
                  <div className="mona-card p-3">
                    <span className="text-xs font-semibold text-copilot-text mb-2 block">{t("summary.competencies")}</span>
                    <div className="flex flex-col gap-1.5">
                      {scorecard.competencyScores.map((score: any, i: number) => (
                        <div key={i} className="mona-surface p-2 flex items-center justify-between">
                          <span className="text-[10px] text-copilot-text-secondary">{score.competencyId}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(n => (
                              <div key={n} className={`w-4 h-4 rounded text-[9px] flex items-center justify-center
                                ${n <= score.suggestedRating ? "mona-gradient text-white" : "bg-gray-700 text-copilot-text-muted"}`}>
                                {n}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {scorecard.strengths?.length > 0 && (
                  <div className="mona-card p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ThumbsUp size={12} className="text-copilot-success" />
                      <span className="text-xs font-semibold text-copilot-text">{t("summary.strengths")}</span>
                    </div>
                    <ul className="flex flex-col gap-1">
                      {scorecard.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-[10px] text-copilot-text-secondary pl-3">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {scorecard.concerns?.length > 0 && (
                  <div className="mona-card p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ThumbsDown size={12} className="text-copilot-error" />
                      <span className="text-xs font-semibold text-copilot-text">{t("summary.concerns")}</span>
                    </div>
                    <ul className="flex flex-col gap-1">
                      {scorecard.concerns.map((c: string, i: number) => (
                        <li key={i} className="text-[10px] text-copilot-text-secondary pl-3">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {scorecard.suggestedNextSteps?.length > 0 && (
                  <div className="mona-card p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ArrowRight size={12} className="text-copilot-info" />
                      <span className="text-xs font-semibold text-copilot-text">{t("summary.nextSteps")}</span>
                    </div>
                    <ul className="flex flex-col gap-1">
                      {scorecard.suggestedNextSteps.map((s: string, i: number) => (
                        <li key={i} className="text-[10px] text-copilot-text-secondary pl-3">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {sessionChecklist.length > 0 && <ChecklistSummary items={sessionChecklist} />}

                <button onClick={handleBack}
                  className="w-full py-2 rounded-md border border-copilot-border text-xs
                    text-copilot-text-secondary hover:bg-mona-hover transition-colors">
                  {t("summary.backToIdle")}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-copilot-text-muted">{t("summary.noData")}</p>
                <button onClick={handleBack}
                  className="mt-4 px-4 py-2 rounded-md border border-copilot-border text-xs
                    text-copilot-text-secondary hover:bg-mona-hover transition-colors">
                  {t("summary.backToIdle")}
                </button>
              </div>
            )}
          </div>
        )}

        {view === "job-intake-summary" && currentJobIntakeResult && (
          <JobIntakeSummary
            intake={currentJobIntakeResult}
            onBack={() => { setView("list"); setJobIntakeInfo(null); setCurrentJobIntakeResult(null); setSessionMode("recruiting") }}
          />
        )}

        {view === "job-intake-history-detail" && selectedJobIntake && (
          <JobIntakeSummary
            intake={selectedJobIntake}
            onBack={() => { setView("history"); setSelectedJobIntake(null) }}
          />
        )}

        {view === "sales-summary" && currentSalesResult && (
          <SalesCallSummary
            call={currentSalesResult}
            onBack={() => { setView("list"); setSalesInfo(null); setCurrentSalesResult(null); setSessionMode("recruiting") }}
          />
        )}

        {view === "sales-history-detail" && selectedSalesCall && (
          <SalesCallSummary
            call={selectedSalesCall}
            onBack={() => { setView("history"); setSelectedSalesCall(null) }}
          />
        )}

        {view === "history" && (
          <div className="h-full overflow-y-auto p-3">
            <h2 className="font-heading text-sm font-bold text-copilot-text mb-2 flex items-center gap-1.5">
              <History size={14} className="text-mona-primary" />
              {t("history.title")}
            </h2>

            {(interviews.length > 3 || jobIntakes.length > 3) && (
              <div className="relative mb-2">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-copilot-text-muted" />
                <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder={t("history.search")}
                  className="w-full pl-7 pr-3 py-1.5 bg-mona-surface border border-copilot-border rounded-md text-[10px] text-copilot-text outline-none focus:border-mona-primary" />
              </div>
            )}

            {interviews.length === 0 && jobIntakes.length === 0 ? (
              <div className="text-center py-8">
                <History size={24} className="text-copilot-text-muted mx-auto mb-2" />
                <p className="text-xs text-copilot-text-muted">{t("history.empty")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {jobIntakes.length > 0 && (
                  <div>
                    <div className="text-[9px] font-semibold text-blue-400 mb-1.5 flex items-center gap-1">
                      <Building size={10} />
                      {t("history.jobIntakes")} ({jobIntakes.length})
                    </div>
                    <div className="flex flex-col gap-1">
                      {jobIntakes
                        .filter(ji => !historySearch || ji.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
                          ji.jobTitle.toLowerCase().includes(historySearch.toLowerCase()) ||
                          ji.companyName?.toLowerCase().includes(historySearch.toLowerCase()))
                        .map(ji => (
                          <button key={ji.id} onClick={() => { setSelectedJobIntake(ji); setView("job-intake-history-detail") }}
                            className="mona-surface p-2.5 text-left hover:border-blue-400/40 transition-colors cursor-pointer flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                              <Building size={11} className="text-blue-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-medium text-copilot-text truncate">{ji.jobTitle}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] text-copilot-text-muted">{ji.customerName}{ji.companyName ? ` · ${ji.companyName}` : ""}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock size={8} className="text-copilot-text-muted" />
                                <span className="text-[9px] text-copilot-text-muted">{new Date(ji.date).toLocaleDateString("de-DE")}</span>
                                <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-400">{ji.requirements.length} Anf.</span>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {interviews.length > 0 && (
                  <div>
                    <div className="text-[9px] font-semibold text-mona-primary-light mb-1.5 flex items-center gap-1">
                      <Users size={10} />
                      {t("history.interviews")} ({interviews.length})
                    </div>
                    <div className="flex flex-col gap-1">
                      {interviews
                        .filter(iv => !historySearch || iv.candidateName.toLowerCase().includes(historySearch.toLowerCase()) ||
                          iv.transcript.some((l: any) => l.text?.toLowerCase().includes(historySearch.toLowerCase())))
                        .map(iv => (
                          <button key={iv.id} onClick={() => { setSelectedInterview(iv); setView("history-detail") }}
                            className="mona-surface p-2.5 text-left hover:border-mona-primary/40 transition-colors cursor-pointer flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-mona-primary/15 flex items-center justify-center shrink-0">
                              <FileText size={11} className="text-mona-primary-light" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-medium text-copilot-text truncate">{iv.candidateName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock size={8} className="text-copilot-text-muted" />
                                <span className="text-[9px] text-copilot-text-muted">{new Date(iv.date).toLocaleDateString("de-DE")} {new Date(iv.date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                                {iv.scorecard && <span className="text-[8px] px-1 py-0.5 rounded bg-copilot-success/15 text-copilot-success">Scorecard</span>}
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {salesCalls.length > 0 && (
                  <div>
                    <div className="text-[9px] font-semibold text-purple-400 mb-1.5 flex items-center gap-1">
                      <FileText size={10} />
                      {t("history.salesCalls")} ({salesCalls.length})
                    </div>
                    <div className="flex flex-col gap-1">
                      {salesCalls
                        .filter(sc => !historySearch || sc.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
                          sc.dealName.toLowerCase().includes(historySearch.toLowerCase()) ||
                          sc.companyName?.toLowerCase().includes(historySearch.toLowerCase()))
                        .map(sc => (
                          <button key={sc.id} onClick={() => { setSelectedSalesCall(sc); setView("sales-history-detail") }}
                            className="mona-surface p-2.5 text-left hover:border-purple-400/40 transition-colors cursor-pointer flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
                              <FileText size={11} className="text-purple-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-medium text-copilot-text truncate">{sc.dealName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] text-copilot-text-muted">{sc.customerName}{sc.companyName ? ` · ${sc.companyName}` : ""}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock size={8} className="text-copilot-text-muted" />
                                <span className="text-[9px] text-copilot-text-muted">{new Date(sc.date).toLocaleDateString("de-DE")}</span>
                                {sc.checklist && <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/15 text-purple-400">{sc.checklist.filter(c => c.checked).length}/{sc.checklist.length}</span>}
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === "history-detail" && selectedInterview && (
          <div className="h-full overflow-y-auto p-3">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => { setView("history"); setSelectedInterview(null) }}
                className="p-1 hover:bg-mona-hover rounded"><ArrowLeft size={14} className="text-copilot-text-muted" /></button>
              <div>
                <div className="text-xs font-semibold text-copilot-text">{selectedInterview.candidateName}</div>
                <div className="text-[9px] text-copilot-text-muted">{new Date(selectedInterview.date).toLocaleString("de-DE")}</div>
              </div>
            </div>

            {selectedInterview.scorecard && (
              <div className="mona-card p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-copilot-text-secondary">Bewertung</span>
                  <span className="text-sm font-bold text-copilot-text">{selectedInterview.scorecard.overallFit}</span>
                </div>
                {selectedInterview.scorecard.candidateSummary && (
                  <p className="text-[10px] text-copilot-text leading-relaxed">{selectedInterview.scorecard.candidateSummary}</p>
                )}
                {selectedInterview.scorecard.strengths?.length > 0 && (
                  <div className="mt-2"><span className="text-[9px] text-copilot-success font-medium">Stärken: </span>
                    <span className="text-[9px] text-copilot-text-secondary">{selectedInterview.scorecard.strengths.join(", ")}</span></div>
                )}
                {selectedInterview.scorecard.concerns?.length > 0 && (
                  <div className="mt-1"><span className="text-[9px] text-copilot-error font-medium">Bedenken: </span>
                    <span className="text-[9px] text-copilot-text-secondary">{selectedInterview.scorecard.concerns.join(", ")}</span></div>
                )}
              </div>
            )}

            {selectedInterview.checklist && selectedInterview.checklist.length > 0 && (
              <ChecklistSummary items={selectedInterview.checklist} />
            )}

            <div className="mona-card p-3">
              <h3 className="text-[10px] font-semibold text-copilot-text-secondary mb-2">Transkript</h3>
              {selectedInterview.transcript.length > 3 && (
                <div className="relative mb-2">
                  <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-copilot-text-muted" />
                  <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Im Transkript suchen..."
                    className="w-full pl-6 pr-3 py-1 bg-mona-surface border border-copilot-border rounded text-[9px] text-copilot-text outline-none focus:border-mona-primary" />
                </div>
              )}
              <div className="flex flex-col gap-1">
                {selectedInterview.transcript
                  .filter((l: any) => !historySearch || l.text?.toLowerCase().includes(historySearch.toLowerCase()))
                  .map((line: any, i: number) => (
                    <div key={i} className="text-[10px] text-copilot-text leading-relaxed">
                      <span className="text-[8px] text-copilot-text-muted mr-1">
                        {line.timestamp ? new Date(line.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}
                      </span>
                      {historySearch ? (
                        <span dangerouslySetInnerHTML={{
                          __html: line.text?.replace(new RegExp(`(${historySearch})`, "gi"), '<mark class="bg-mona-primary/30 text-copilot-text rounded px-0.5">$1</mark>') || ""
                        }} />
                      ) : line.text}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const JobIntakeSummary: React.FC<{ intake: SavedJobIntake; onBack: () => void }> = ({ intake, onBack }) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const mustHaves = intake.requirements.filter(r => r.priority === "must_have")
  const niceToHaves = intake.requirements.filter(r => r.priority === "nice_to_have")

  const generateCRMText = () => {
    let text = `JOB INTAKE: ${intake.jobTitle}\n`
    text += `Kunde: ${intake.customerName}${intake.companyName ? ` (${intake.companyName})` : ""}\n`
    text += `Datum: ${new Date(intake.date).toLocaleDateString("de-DE")}\n\n`

    if (mustHaves.length > 0) {
      text += `MUSS-ANFORDERUNGEN:\n`
      mustHaves.forEach((r, i) => {
        text += `${i + 1}. ${r.requirement}${r.category !== "Allgemein" ? ` [${r.category}]` : ""}\n`
      })
      text += "\n"
    }

    if (niceToHaves.length > 0) {
      text += `NICE-TO-HAVE:\n`
      niceToHaves.forEach((r, i) => {
        text += `${i + 1}. ${r.requirement}${r.category !== "Allgemein" ? ` [${r.category}]` : ""}\n`
      })
      text += "\n"
    }

    if (intake.notes) {
      text += `NOTIZEN:\n${intake.notes}\n`
    }

    return text
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCRMText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = generateCRMText()
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `job-intake-${intake.jobTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date(intake.date).toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="p-1 hover:bg-mona-hover rounded transition-colors">
          <ArrowLeft size={14} className="text-copilot-text-muted" />
        </button>
        <ClipboardCheck size={16} className="text-blue-400" />
        <h2 className="font-heading text-sm font-bold text-copilot-text">{t("jobIntake.summaryTitle")}</h2>
      </div>

      <div className="mona-card p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Building size={14} className="text-blue-400" />
          <span className="text-sm font-bold text-copilot-text">{intake.jobTitle}</span>
        </div>
        <div className="text-[10px] text-copilot-text-muted">
          {intake.customerName}{intake.companyName ? ` · ${intake.companyName}` : ""}
        </div>
        <div className="text-[9px] text-copilot-text-muted mt-1">
          {new Date(intake.date).toLocaleString("de-DE")}
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button onClick={handleCopy}
          className="flex-1 py-2 rounded-md border border-copilot-border text-[10px] font-medium
            text-copilot-text hover:bg-mona-hover transition-colors flex items-center justify-center gap-1.5">
          <Copy size={11} />
          {copied ? t("jobIntake.copied") : t("jobIntake.copyForCRM")}
        </button>
        <button onClick={handleDownload}
          className="flex-1 py-2 rounded-md border border-copilot-border text-[10px] font-medium
            text-copilot-text hover:bg-mona-hover transition-colors flex items-center justify-center gap-1.5">
          <Download size={11} />
          {t("jobIntake.download")}
        </button>
      </div>

      {intake.requirements.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-[10px] text-copilot-text-muted">{t("jobIntake.noRequirementsCollected")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {mustHaves.length > 0 && (
            <div className="mona-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-semibold text-red-400">{t("jobIntake.mustHave")} ({mustHaves.length})</span>
              </div>
              <div className="flex flex-col gap-1">
                {mustHaves.map((req, i) => (
                  <div key={req.id} className="flex items-start gap-2 text-[10px]">
                    <span className="text-copilot-text-muted shrink-0">{i + 1}.</span>
                    <span className="text-copilot-text">{req.requirement}</span>
                    {req.category && req.category !== "Allgemein" && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-copilot-bg-tertiary text-copilot-text-muted shrink-0">{req.category}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {niceToHaves.length > 0 && (
            <div className="mona-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-semibold text-blue-400">{t("jobIntake.niceToHave")} ({niceToHaves.length})</span>
              </div>
              <div className="flex flex-col gap-1">
                {niceToHaves.map((req, i) => (
                  <div key={req.id} className="flex items-start gap-2 text-[10px]">
                    <span className="text-copilot-text-muted shrink-0">{i + 1}.</span>
                    <span className="text-copilot-text">{req.requirement}</span>
                    {req.category && req.category !== "Allgemein" && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-copilot-bg-tertiary text-copilot-text-muted shrink-0">{req.category}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {intake.notes && (
        <div className="mona-card p-3 mt-3">
          <span className="text-[10px] font-semibold text-copilot-text-secondary block mb-1">{t("jobIntake.notes")}</span>
          <p className="text-[10px] text-copilot-text leading-relaxed whitespace-pre-wrap">{intake.notes}</p>
        </div>
      )}

      {intake.transcript.length > 0 && (
        <div className="mona-card p-3 mt-3">
          <span className="text-[10px] font-semibold text-copilot-text-secondary block mb-1">{t("session.tabTranscript")}</span>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {intake.transcript.map((line: any, i: number) => (
              <div key={i} className="text-[9px] text-copilot-text-muted leading-relaxed">
                {line.text}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onBack}
        className="w-full mt-4 py-2 rounded-md border border-copilot-border text-xs
          text-copilot-text-secondary hover:bg-mona-hover transition-colors">
        {t("summary.backToIdle")}
      </button>
    </div>
  )
}

const SalesCallSummary: React.FC<{ call: SavedSalesCall; onBack: () => void }> = ({ call, onBack }) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const completedChecklist = call.checklist?.filter(c => c.checked).length || 0
  const totalChecklist = call.checklist?.length || 0

  const generateSummaryText = () => {
    let text = `SALES CALL: ${call.dealName}\n`
    text += `Kunde: ${call.customerName}${call.companyName ? ` (${call.companyName})` : ""}\n`
    text += `Datum: ${new Date(call.date).toLocaleDateString("de-DE")}\n\n`

    if (call.roadmap && call.roadmap.length > 0) {
      text += `PITCH-ABLAUF:\n`
      call.roadmap.forEach((step, i) => {
        const statusIcon = step.status === "completed" ? "✓" : step.status === "current" ? "→" : "○"
        text += `${statusIcon} ${i + 1}. ${step.title}\n`
      })
      text += "\n"
    }

    if (call.checklist && call.checklist.length > 0) {
      text += `CHECKLIST (${completedChecklist}/${totalChecklist}):\n`
      call.checklist.forEach(item => {
        text += `${item.checked ? "☑" : "☐"} ${item.text}\n`
      })
      text += "\n"
    }

    if (call.notes) {
      text += `NOTIZEN:\n${call.notes}\n`
    }

    return text
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateSummaryText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="p-1 hover:bg-mona-hover rounded transition-colors">
          <ArrowLeft size={14} className="text-copilot-text-muted" />
        </button>
        <FileText size={16} className="text-purple-400" />
        <h2 className="font-heading text-sm font-bold text-copilot-text">{t("sales.summaryTitle")}</h2>
      </div>

      <div className="mona-card p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} className="text-purple-400" />
          <span className="text-sm font-bold text-copilot-text">{call.dealName}</span>
        </div>
        <div className="text-[10px] text-copilot-text-muted">
          {call.customerName}{call.companyName ? ` · ${call.companyName}` : ""}
        </div>
        <div className="text-[9px] text-copilot-text-muted mt-1">
          {new Date(call.date).toLocaleString("de-DE")}
        </div>
      </div>

      <button onClick={handleCopy}
        className="w-full mb-3 py-2 rounded-md border border-copilot-border text-[10px] font-medium
          text-copilot-text hover:bg-mona-hover transition-colors flex items-center justify-center gap-1.5">
        <Copy size={11} />
        {copied ? t("jobIntake.copied") : t("sales.copySummary")}
      </button>

      {call.checklist && call.checklist.length > 0 && (
        <div className="mona-card p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-copilot-text">{t("sales.checklistCompleted")}</span>
            <span className="text-[10px] text-copilot-text-muted">{completedChecklist}/{totalChecklist}</span>
          </div>
          <div className="flex flex-col gap-1">
            {call.checklist.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-[10px]">
                <span className={item.checked ? "text-green-400" : "text-copilot-text-muted"}>
                  {item.checked ? "✓" : "○"}
                </span>
                <span className={item.checked ? "text-copilot-text" : "text-copilot-text-muted"}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {call.roadmap && call.roadmap.length > 0 && (
        <div className="mona-card p-3 mb-3">
          <span className="text-[10px] font-semibold text-copilot-text block mb-2">{t("sales.pitchProgress")}</span>
          <div className="flex flex-col gap-1">
            {call.roadmap.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2 text-[10px]">
                <span className={step.status === "completed" ? "text-green-400" : step.status === "current" ? "text-mona-primary" : "text-copilot-text-muted"}>
                  {step.status === "completed" ? "✓" : step.status === "current" ? "→" : "○"}
                </span>
                <span className={step.status === "completed" ? "text-copilot-text" : "text-copilot-text-muted"}>
                  {i + 1}. {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {call.notes && (
        <div className="mona-card p-3 mb-3">
          <span className="text-[10px] font-semibold text-copilot-text-secondary block mb-1">{t("jobIntake.notes")}</span>
          <p className="text-[10px] text-copilot-text leading-relaxed whitespace-pre-wrap">{call.notes}</p>
        </div>
      )}

      {call.transcript.length > 0 && (
        <div className="mona-card p-3">
          <span className="text-[10px] font-semibold text-copilot-text-secondary block mb-1">{t("session.tabTranscript")}</span>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {call.transcript.map((line: any, i: number) => (
              <div key={i} className="text-[9px] text-copilot-text-muted leading-relaxed">
                {line.text}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onBack}
        className="w-full mt-4 py-2 rounded-md border border-copilot-border text-xs
          text-copilot-text-secondary hover:bg-mona-hover transition-colors">
        {t("summary.backToIdle")}
      </button>
    </div>
  )
}

const ChecklistSummary: React.FC<{ items: any[] }> = ({ items }) => {
  const confirmed = items.filter(c => c.status === "confirmed").length
  const partial = items.filter(c => c.status === "partial").length
  return (
    <div className="mona-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ClipboardCheck size={12} className="text-mona-primary" />
          <span className="text-xs font-semibold text-copilot-text">Anforderungen</span>
        </div>
        <span className="text-[10px] text-copilot-text-muted">{confirmed}/{items.length} erfüllt{partial > 0 ? `, ${partial} teilweise` : ""}</span>
      </div>
      <div className="flex flex-col gap-1">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center gap-2 text-[10px]">
            <span className="shrink-0">
              {item.status === "confirmed" ? "✅" : item.status === "partial" ? "🟡" : "⬜"}
            </span>
            <span className={`flex-1 ${item.status === "unconfirmed" ? "text-copilot-text-muted" : "text-copilot-text"}`}>
              {item.requirement}
            </span>
            {item.source && (
              <span className={`px-1 py-0.5 rounded text-[8px] font-medium shrink-0 ${
                item.source === "CV" ? "bg-blue-500/20 text-blue-400" :
                item.source === "Interview" ? "bg-purple-500/20 text-purple-400" :
                item.source === "Beide" ? "bg-teal-500/20 text-teal-400" : ""
              }`}>{item.source}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const Header: React.FC<{
  onLogout: () => void
  onSettings: () => void
  onHistory: () => void
  onApplicants: () => void
  settingsOpen?: boolean
  historyOpen?: boolean
  applicantsOpen?: boolean
  inSession?: boolean
  interviewCount?: number
}> = ({ onLogout, onSettings, onHistory, onApplicants, settingsOpen, historyOpen, applicantsOpen, inSession, interviewCount }) => {
  const { t } = useTranslation()
  const { settings } = useSessionStore()

  return (
    <div className="draggable-area flex items-center justify-between px-3 py-2
      bg-mona-card border-b border-copilot-border select-none shrink-0">
      <div className="flex items-center gap-2">
        <img
          src={settings.darkMode ? "/logo_light.png" : "/logo_dark.png"}
          alt="MONA"
          className="h-4"
        />
        <span className="font-heading text-sm font-bold text-copilot-text">Live</span>
        {inSession && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-copilot-error/20 text-copilot-error font-medium animate-pulse">
            LIVE
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {!inSession && (
          <>
            <button onClick={onApplicants}
              className="p-1 hover:bg-mona-hover rounded transition-colors"
              title="Kandidaten">
              <Users size={13} className={applicantsOpen ? "text-mona-primary" : "text-copilot-text-muted"} />
            </button>
            <button onClick={onHistory}
              className="p-1 hover:bg-mona-hover rounded transition-colors relative"
              title="Verlauf">
              <History size={13} className={historyOpen ? "text-mona-primary" : "text-copilot-text-muted"} />
              {interviewCount ? <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-mona-primary text-[7px] text-white flex items-center justify-center">{interviewCount > 9 ? "9+" : interviewCount}</span> : null}
            </button>
            <button onClick={onSettings}
              className="p-1 hover:bg-mona-hover rounded transition-colors"
              title={t("settings.title")}>
              <Settings size={13} className={settingsOpen ? "text-mona-primary" : "text-copilot-text-muted"} />
            </button>
            <button onClick={onLogout}
              className="text-[10px] text-copilot-text-muted hover:text-copilot-text px-1.5 py-0.5
                rounded hover:bg-mona-hover transition-colors">
              {t("auth.logout")}
            </button>
          </>
        )}
        <button onClick={() => window.monacopilot?.toggleWindow()}
          className="p-1 hover:bg-mona-hover rounded transition-colors">
          <Minus size={13} className="text-copilot-text-muted" />
        </button>
        <button onClick={() => window.monacopilot?.quitApp()}
          className="p-1 hover:bg-red-500/20 rounded transition-colors">
          <X size={13} className="text-copilot-text-muted hover:text-red-400" />
        </button>
      </div>
    </div>
  )
}

export default CopilotShell
