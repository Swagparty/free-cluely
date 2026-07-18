import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { User, ChevronDown, ChevronUp, AlertCircle, Star, Briefcase, DollarSign, MapPin, Phone, Mail, FileText } from "lucide-react"
import { useSessionStore } from "../stores/sessionStore"

const CandidateSnapshot: React.FC = () => {
  const { t } = useTranslation()
  const { candidateContext, applicantData } = useSessionStore()
  const [expanded, setExpanded] = useState(false)

  if (!candidateContext && !applicantData) return null

  const name = candidateContext?.name || ""
  const email = applicantData?.email || ""
  const phone = applicantData?.phone || applicantData?.telefon || applicantData?.mobilnummer || ""
  const location = applicantData?.location || applicantData?.ort || applicantData?.stadt || ""
  const employer = candidateContext?.currentCompany || applicantData?.currentEmployer || applicantData?.arbeitgeber || ""
  const jobTitle = applicantData?.jobTitle || applicantData?.stellenbezeichnung || ""
  const skills = candidateContext?.strengths || applicantData?.skills || applicantData?.qualifikationen || []
  const cvSummary = candidateContext?.cvSummary || applicantData?.cvSummary || applicantData?.zusammenfassung || ""
  const redFlags = candidateContext?.redFlags || []
  const salary = candidateContext?.salaryExpectation || ""
  const tenure = candidateContext?.currentTenure || ""
  const filesCount = applicantData?.files?.length || 0

  return (
    <div className="px-3 py-2">
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full group">
        <div className="flex items-center gap-1.5">
          <User size={13} className="text-mona-primary-light" />
          <span className="text-xs font-semibold text-copilot-text">{t("candidate.title")}</span>
          {name && (
            <span className="text-[10px] text-copilot-text-muted">— {name}</span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={13} className="text-copilot-text-muted" />
        ) : (
          <ChevronDown size={13} className="text-copilot-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2 animate-fade-in">
          {email && (
            <InfoRow icon={Mail} color="text-copilot-info" label={email} />
          )}

          {phone && (
            <InfoRow icon={Phone} color="text-copilot-info" label={phone} />
          )}

          {location && (
            <InfoRow icon={MapPin} color="text-copilot-info" label={location} />
          )}

          {(employer || jobTitle) && (
            <div className="flex items-start gap-1.5">
              <Briefcase size={11} className="text-copilot-info mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-medium text-copilot-text-secondary">{t("candidate.current")}</span>
                <p className="text-xs text-copilot-text">
                  {jobTitle && employer ? `${jobTitle} @ ${employer}` : jobTitle || employer}
                  {tenure && ` (${tenure})`}
                </p>
              </div>
            </div>
          )}

          {skills.length > 0 && (
            <div className="flex items-start gap-1.5">
              <Star size={11} className="text-copilot-success mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-medium text-copilot-text-secondary">{t("candidate.skills")}</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {skills.map((s: any, i: number) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-copilot-success/10
                      text-copilot-success border border-copilot-success/20">
                      {typeof s === "string" ? s : String(s)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {salary && (
            <div className="flex items-start gap-1.5">
              <DollarSign size={11} className="text-copilot-warning mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-medium text-copilot-text-secondary">{t("candidate.salary")}</span>
                <p className="text-xs text-copilot-text">{salary}</p>
              </div>
            </div>
          )}

          {filesCount > 0 && (
            <div className="flex items-start gap-1.5">
              <FileText size={11} className="text-mona-primary-light mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-medium text-copilot-text-secondary">Dokumente</span>
                <p className="text-xs text-copilot-text">{filesCount} Datei(en)</p>
              </div>
            </div>
          )}

          {redFlags.length > 0 && (
            <div className="flex items-start gap-1.5">
              <AlertCircle size={11} className="text-copilot-error mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-medium text-copilot-text-secondary">{t("candidate.flags")}</span>
                <ul className="mt-0.5">
                  {redFlags.map((flag, i) => (
                    <li key={i} className="text-[10px] text-copilot-error/80">{flag}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {cvSummary && (
            <p className="text-[10px] text-copilot-text-muted leading-relaxed mt-1 border-t
              border-copilot-border pt-2">
              {cvSummary}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const InfoRow: React.FC<{ icon: any; color: string; label: string }> = ({ icon: Icon, color, label }) => (
  <div className="flex items-center gap-1.5">
    <Icon size={11} className={`${color} shrink-0`} />
    <span className="text-xs text-copilot-text-secondary truncate">{label}</span>
  </div>
)

export default CandidateSnapshot
