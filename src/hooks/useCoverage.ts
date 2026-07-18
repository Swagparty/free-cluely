import { useEffect, useCallback } from "react"
import { useSessionStore } from "../stores/sessionStore"

export function useCoverage() {
  const {
    coverageState, sessionId,
    updateCoverage, rateCompetency
  } = useSessionStore()

  useEffect(() => {
    if (!window.monacopilot) return

    const cleanup = window.monacopilot.onCoverageUpdate((update) => {
      updateCoverage(update.areas)
    })

    return cleanup
  }, [updateCoverage])

  const rate = useCallback(async (competencyId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    rateCompetency(competencyId, rating)
    if (window.monacopilot && sessionId) {
      await window.monacopilot.sendAction(sessionId, {
        action: "mark_competency",
        competencyId,
        rating
      })
    }
  }, [rateCompetency, sessionId])

  const overallProgress = coverageState.length > 0
    ? Math.round(
        coverageState.reduce((sum, c) => sum + c.depthScore * c.weight, 0) /
        coverageState.reduce((sum, c) => sum + c.weight, 0)
      )
    : 0

  return {
    coverageState,
    overallProgress,
    rate
  }
}
