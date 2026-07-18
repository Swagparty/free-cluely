import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft, User, Mail, Phone, MapPin, Briefcase, Calendar,
  FileText, MessageSquare, Tag, Download, Clock, Info, Edit3, Mic, Settings2, Save
} from "lucide-react"
import { getDisplayName } from "./InterviewSelector"

type Tab = "info" | "documents" | "notes" | "setup"

export interface InterviewSetup {
  jobPosting: string
  customPrompt: string
}

interface CandidateProfileProps {
  applicant: any
  onBack: () => void
  onStartSession?: (setup?: InterviewSetup) => void
}

const CandidateProfile: React.FC<CandidateProfileProps> = ({ applicant, onBack, onStartSession }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>("setup")
  const [interviewSetup, setInterviewSetup] = useState<InterviewSetup>(() => {
    const savedDefault = localStorage.getItem("mona_live_default_prompt") || ""
    return { jobPosting: "", customPrompt: savedDefault }
  })

  const name = getDisplayName(applicant)
  const email = applicant.email || ""
  const phone = applicant.mobilnummer || applicant.phone || applicant.telefon || applicant.phoneNumber || ""
  const files = applicant.files || []
  const logs = applicant.logs || []
  const notes = applicant.notes || applicant.notizen || ""

  const handleStartWithSetup = () => {
    if (onStartSession) {
      onStartSession(interviewSetup)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.FC<any>; count?: number }[] = [
    { id: "setup", label: t("profile.tabSetup"), icon: Settings2 },
    { id: "info", label: t("profile.tabInfo"), icon: Info },
    { id: "documents", label: t("profile.tabDocuments"), icon: FileText, count: files.length },
    { id: "notes", label: t("profile.tabNotes"), icon: MessageSquare, count: logs.length + (notes ? 1 : 0) }
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-copilot-border bg-mona-surface/50 shrink-0">
        <button onClick={onBack}
          className="p-1 hover:bg-mona-hover rounded transition-colors">
          <ArrowLeft size={14} className="text-copilot-text-muted" />
        </button>
        <div className="w-7 h-7 rounded-full mona-gradient flex items-center justify-center shrink-0">
          <User size={12} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-copilot-text truncate">{name}</div>
          {email && <div className="text-[10px] text-copilot-text-muted truncate">{email}</div>}
        </div>
      </div>

      {onStartSession && (
        <div className="px-3 py-2 border-b border-copilot-border shrink-0">
          <button onClick={handleStartWithSetup}
            className="w-full py-2 rounded-md mona-gradient text-white text-xs font-semibold
              hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
            <Mic size={13} />
            {t("session.startInterview")}
          </button>
        </div>
      )}

      <div className="flex border-b border-copilot-border shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium
                transition-colors border-b-2 ${isActive
                  ? "text-mona-primary border-mona-primary"
                  : "text-copilot-text-muted border-transparent hover:text-copilot-text-secondary"}`}
            >
              <Icon size={12} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[9px] px-1 py-0.5 rounded-full ${isActive
                  ? "bg-mona-primary/20 text-mona-primary"
                  : "bg-gray-700 text-copilot-text-muted"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "setup" && <SetupTab setup={interviewSetup} onSetupChange={setInterviewSetup} />}
        {activeTab === "info" && <InfoTab applicant={applicant} />}
        {activeTab === "documents" && <DocumentsTab files={files} applicantId={applicant.id} />}
        {activeTab === "notes" && <NotesTab logs={logs} notes={notes} userNotes={applicant.userNotes || ""} applicantId={applicant.id} />}
      </div>
    </div>
  )
}

const SetupTab: React.FC<{ setup: InterviewSetup; onSetupChange: (setup: InterviewSetup) => void }> = ({ setup, onSetupChange }) => {
  const { t } = useTranslation()
  const [defaultSaved, setDefaultSaved] = useState(false)

  const handleJobPostingChange = (value: string) => {
    onSetupChange({ ...setup, jobPosting: value })
  }

  const handlePromptChange = (value: string) => {
    onSetupChange({ ...setup, customPrompt: value })
  }

  const saveAsDefault = () => {
    localStorage.setItem("mona_live_default_prompt", setup.customPrompt)
    setDefaultSaved(true)
    setTimeout(() => setDefaultSaved(false), 2000)
  }

  const loadDefault = () => {
    const saved = localStorage.getItem("mona_live_default_prompt") || ""
    onSetupChange({ ...setup, customPrompt: saved })
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="mona-card p-3 border-l-2 border-l-mona-primary">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Settings2 size={13} className="text-mona-primary" />
          <span className="text-xs font-semibold text-copilot-text">{t("setup.prepTitle")}</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">{t("setup.optional")}</span>
        </div>
        <p className="text-[10px] text-copilot-text-secondary leading-relaxed">
          {t("setup.prepDescription")}
        </p>
      </div>

      <div className="mona-surface p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-copilot-text">{t("setup.jobPostingTitle")}</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-500 font-medium">{t("setup.recommended")}</span>
          </div>
        </div>
        <p className="text-[9px] text-copilot-text-muted mb-2 leading-relaxed">
          {t("setup.jobPostingHelp")}
        </p>
        <textarea
          value={setup.jobPosting}
          onChange={(e) => handleJobPostingChange(e.target.value)}
          placeholder={t("setup.jobPostingPlaceholder")}
          rows={4}
          className="w-full px-2.5 py-2 bg-mona-card border border-copilot-border rounded-md
            text-[10px] text-copilot-text outline-none focus:border-mona-primary transition-colors
            resize-none leading-relaxed"
        />
        {setup.jobPosting ? (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-4 h-4 rounded-full bg-green-500/15 flex items-center justify-center">
              <span className="text-green-500 text-[10px]">✓</span>
            </div>
            <span className="text-[9px] text-green-500">{t("setup.jobPostingReady")}</span>
          </div>
        ) : (
          <p className="text-[9px] text-copilot-text-muted mt-1.5 italic">{t("setup.jobPostingSkip")}</p>
        )}
      </div>

      <div className="mona-surface p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-copilot-text">{t("setup.promptTitle")}</span>
          </div>
          <div className="flex items-center gap-1">
            {defaultSaved && (
              <span className="text-[8px] text-copilot-success">{t("setup.defaultSaved")}</span>
            )}
            <button
              onClick={saveAsDefault}
              className="text-[8px] px-1.5 py-0.5 rounded bg-mona-primary/10 text-mona-primary-light
                hover:bg-mona-primary/20 transition-colors flex items-center gap-0.5"
            >
              <Save size={8} />
              {t("setup.saveAsDefault")}
            </button>
            {localStorage.getItem("mona_live_default_prompt") && (
              <button
                onClick={loadDefault}
                className="text-[8px] px-1.5 py-0.5 rounded bg-copilot-bg-tertiary text-copilot-text-muted
                  hover:bg-mona-hover transition-colors"
              >
                {t("setup.loadDefault")}
              </button>
            )}
          </div>
        </div>
        <p className="text-[9px] text-copilot-text-muted mb-2 leading-relaxed">
          {t("setup.promptHelp")}
        </p>
        <textarea
          value={setup.customPrompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          placeholder={t("setup.promptPlaceholder")}
          rows={3}
          className="w-full px-2.5 py-2 bg-mona-card border border-copilot-border rounded-md
            text-[10px] text-copilot-text outline-none focus:border-mona-primary transition-colors
            resize-none leading-relaxed"
        />
        <p className="text-[9px] text-copilot-text-muted mt-1">
          {t("setup.promptHint")}
        </p>
      </div>
    </div>
  )
}

const InfoTab: React.FC<{ applicant: any }> = ({ applicant }) => {
  const { t } = useTranslation()

  const rows: { icon: React.FC<any>; label: string; value: string }[] = []

  const email = applicant.email || ""
  const phone = applicant.mobilnummer || applicant.telefonnummer || applicant.phone || applicant.telefon || ""
  const wohnort = applicant.Wohnort || applicant.wohnort || {}
  const locationParts = [wohnort.strasse, wohnort.hausnummer, wohnort.postleitzahl, wohnort.city, wohnort.country].filter(Boolean)
  const location = locationParts.length > 0
    ? locationParts.join(" ")
    : applicant.location || applicant.ort || applicant.stadt || ""
  const jobTitle = applicant.jobTitle || applicant.stellenbezeichnung || ""
  const source = applicant.quelle || applicant.origin || ""
  const status = applicant.status || ""
  const created = applicant.created
  const createdGerman = applicant.createdGerman || ""
  const skills = applicant.skills || applicant.qualifikationen || []

  if (email) rows.push({ icon: Mail, label: t("profile.email"), value: email })
  if (phone) rows.push({ icon: Phone, label: t("profile.phone"), value: phone })
  if (location) rows.push({ icon: MapPin, label: t("profile.location"), value: location })
  if (jobTitle) rows.push({ icon: Briefcase, label: t("profile.jobApplied"), value: jobTitle })
  if (source) rows.push({ icon: Tag, label: t("profile.source"), value: source })
  if (status) rows.push({ icon: Info, label: t("profile.status"), value: status })

  if (createdGerman) {
    rows.push({ icon: Calendar, label: t("profile.created"), value: createdGerman })
  } else if (created) {
    const dateStr = created._seconds
      ? new Date(created._seconds * 1000).toLocaleDateString("de-DE")
      : typeof created === "string"
        ? new Date(created).toLocaleDateString("de-DE")
        : ""
    if (dateStr) rows.push({ icon: Calendar, label: t("profile.created"), value: dateStr })
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      {rows.map((row, i) => {
        const Icon = row.icon
        return (
          <div key={i} className="flex items-start gap-2 mona-surface p-2">
            <Icon size={12} className="text-copilot-text-muted mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-copilot-text-muted">{row.label}</div>
              <div className="text-xs text-copilot-text break-all">{row.value}</div>
            </div>
          </div>
        )
      })}

      {skills.length > 0 && (
        <div className="mona-surface p-2">
          <div className="text-[10px] text-copilot-text-muted mb-1.5">{t("profile.skills")}</div>
          <div className="flex flex-wrap gap-1">
            {skills.map((skill: any, i: number) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-mona-primary/10
                text-mona-primary-light border border-mona-primary/20">
                {typeof skill === "string" ? skill : String(skill)}
              </span>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 && skills.length === 0 && (
        <div className="text-center py-6">
          <Info size={24} className="text-copilot-text-muted mx-auto mb-2" />
          <p className="text-xs text-copilot-text-muted">Keine Informationen verfügbar</p>
        </div>
      )}
    </div>
  )
}

const DocumentsTab: React.FC<{ files: any[]; applicantId: string }> = ({ files, applicantId: _applicantId }) => {
  const { t } = useTranslation()

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText size={28} className="text-copilot-text-muted mx-auto mb-2" />
        <p className="text-xs text-copilot-text-muted">{t("profile.noDocuments")}</p>
      </div>
    )
  }

  const handleOpen = (file: any) => {
    const url = file.downloadURL || file.url
    if (url) {
      window.open(url, "_blank")
    }
  }

  return (
    <div className="p-3 flex flex-col gap-1.5">
      {files.map((file: any, index: number) => {
        const fileName = file.fileName || file.name || `Datei ${index + 1}`
        const mimeType = file.mimeType || ""
        const isPDF = mimeType.includes("pdf")
        const isImage = mimeType.includes("image")
        const hasUrl = !!(file.downloadURL || file.url)

        return (
          <button key={index} onClick={() => hasUrl && handleOpen(file)}
            disabled={!hasUrl}
            className="mona-surface p-2.5 flex items-center gap-2 text-left
              hover:border-mona-primary/30 transition-colors disabled:opacity-50 cursor-pointer">
            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0
              ${isPDF ? "bg-red-500/15" : isImage ? "bg-blue-500/15" : "bg-gray-500/15"}`}>
              <FileText size={14} className={
                isPDF ? "text-red-400" : isImage ? "text-blue-400" : "text-gray-400"
              } />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-copilot-text truncate">{fileName}</div>
              {mimeType && (
                <div className="text-[10px] text-copilot-text-muted">{mimeType.split("/").pop()}</div>
              )}
              {file.createdISO && (
                <div className="text-[9px] text-copilot-text-muted">
                  {new Date(file.createdISO).toLocaleDateString("de-DE")}
                </div>
              )}
            </div>
            {hasUrl && (
              <Download size={12} className="text-mona-primary-light shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}

const NotesTab: React.FC<{ logs: any[]; notes: string; userNotes: string; applicantId: string }> = ({ logs, notes, userNotes: initialUserNotes, applicantId }) => {
  const { t } = useTranslation()
  const [userNotes, setUserNotes] = useState(initialUserNotes)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  const handleSave = async () => {
    if (!window.monacopilot || !dirty) return
    setSaving(true)
    setSaved(false)
    try {
      await window.monacopilot.updateApplicantNotes(applicantId, userNotes)
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error("Failed to save notes:", err)
    }
    setSaving(false)
  }

  const handleChange = (value: string) => {
    setUserNotes(value)
    setDirty(true)
    setSaved(false)
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Edit3 size={11} className="text-mona-primary-light" />
            <span className="text-[10px] font-semibold text-copilot-text-secondary uppercase tracking-wide">
              {t("profile.myNotes")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {saved && (
              <span className="text-[9px] text-copilot-success animate-fade-in">{t("profile.saved")}</span>
            )}
            <button onClick={handleSave} disabled={saving || !dirty}
              className="text-[10px] px-2 py-1 rounded mona-gradient text-white font-medium
                disabled:opacity-30 hover:opacity-90 transition-opacity">
              {saving ? t("profile.saving") : t("profile.save")}
            </button>
          </div>
        </div>
        <textarea
          value={userNotes}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleSave}
          placeholder={t("profile.notesPlaceholder")}
          rows={4}
          className="w-full px-2.5 py-2 bg-mona-surface border border-copilot-border rounded-md
            text-xs text-copilot-text outline-none focus:border-mona-primary transition-colors
            resize-none leading-relaxed"
        />
      </div>

      {(logs.length > 0 || notes) && (
        <div>
          <div className="text-[10px] font-semibold text-copilot-text-secondary uppercase tracking-wide mb-1.5">
            {t("profile.colleagues")}
          </div>

          {notes && (
            <div className="mona-surface p-2.5 mb-1.5">
              <div className="text-xs text-copilot-text leading-relaxed whitespace-pre-wrap">{notes}</div>
            </div>
          )}

          {logs.map((log: any, i: number) => {
            const message = log.message || log.text || log.action || log.note || JSON.stringify(log)
            const timestamp = log.timestamp || log.created || log.date || ""
            const author = log.user || log.author || log.by || ""

            let dateStr = ""
            if (timestamp) {
              try {
                if (timestamp._seconds) {
                  dateStr = new Date(timestamp._seconds * 1000).toLocaleString("de-DE")
                } else if (typeof timestamp === "string") {
                  dateStr = new Date(timestamp).toLocaleString("de-DE")
                }
              } catch { /* ignore */ }
            }

            return (
              <div key={i} className="mona-surface p-2.5 mb-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  {author && (
                    <span className="text-[10px] font-medium text-mona-primary-light">{author}</span>
                  )}
                  {dateStr && (
                    <span className="text-[9px] text-copilot-text-muted flex items-center gap-0.5">
                      <Clock size={8} /> {dateStr}
                    </span>
                  )}
                </div>
                <div className="text-xs text-copilot-text leading-relaxed">
                  {typeof message === "string" ? message : JSON.stringify(message)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {logs.length === 0 && !notes && !userNotes && (
        <div className="text-center py-4">
          <p className="text-[10px] text-copilot-text-muted">{t("profile.noNotes")}</p>
        </div>
      )}
    </div>
  )
}

export default CandidateProfile
