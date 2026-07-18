import { useCallback, useEffect } from "react"
import { useSessionStore } from "../stores/sessionStore"

export function useSession() {
  const {
    status, sessionId, jobContext, candidateContext,
    startedAt, notesOnlyMode, consentStatus,
    upcomingInterviews, endResponse,
    setStatus, initSession, resetSession,
    setUpcomingInterviews, setEndResponse, setConnectionHealth
  } = useSessionStore()

  useEffect(() => {
    if (!window.monacopilot) return

    const cleanup = window.monacopilot.onConnectionChange((health) => {
      setConnectionHealth(health as any)
    })

    return cleanup
  }, [setConnectionHealth])

  const loadInterviews = useCallback(async () => {
    if (!window.monacopilot) return
    try {
      const interviews = await window.monacopilot.getUpcomingInterviews()
      setUpcomingInterviews(interviews)
    } catch (err) {
      console.error("Failed to load interviews:", err)
    }
  }, [setUpcomingInterviews])

  const startSession = useCallback(async (interviewId: string) => {
    if (!window.monacopilot) return
    setStatus("loading")
    try {
      const data = await window.monacopilot.startSession(interviewId)
      initSession({
        sessionId: data.sessionId || data.session_id,
        jobContext: data.jobContext || data.job_context,
        candidateContext: data.candidateContext || data.candidate_context,
        scorecardTemplate: data.scorecardTemplate || data.scorecard_template,
        consentStatus: data.consentStatus || data.consent_status || "consented",
        notesOnlyMode: data.notesOnlyMode || false
      })
    } catch (err) {
      setStatus("idle")
      throw err
    }
  }, [setStatus, initSession])

  const endSession = useCallback(async () => {
    if (!window.monacopilot || !sessionId) return
    setStatus("ending")
    try {
      const data = await window.monacopilot.endSession(sessionId)
      setEndResponse(data)
    } catch (err) {
      setStatus("active")
      throw err
    }
  }, [sessionId, setStatus, setEndResponse])

  const backToIdle = useCallback(() => {
    resetSession()
  }, [resetSession])

  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0

  return {
    status,
    sessionId,
    jobContext,
    candidateContext,
    startedAt,
    elapsed,
    notesOnlyMode,
    consentStatus,
    upcomingInterviews,
    endResponse,
    loadInterviews,
    startSession,
    endSession,
    backToIdle
  }
}
