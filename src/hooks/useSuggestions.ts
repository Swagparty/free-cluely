import { useEffect, useCallback } from "react"
import { useSessionStore } from "../stores/sessionStore"

export function useSuggestions() {
  const {
    suggestions, dismissedSuggestionIds, notesOnlyMode, sessionId,
    addSuggestion, dismissSuggestion: storeDismiss, useSuggestion: storeUse
  } = useSessionStore()

  useEffect(() => {
    if (!window.monacopilot || notesOnlyMode) return

    const cleanup = window.monacopilot.onSuggestion((suggestion) => {
      addSuggestion(suggestion)
    })

    return cleanup
  }, [addSuggestion, notesOnlyMode])

  const dismiss = useCallback(async (id: string) => {
    storeDismiss(id)
    if (window.monacopilot && sessionId) {
      await window.monacopilot.sendAction(sessionId, {
        action: "dismiss_suggestion",
        suggestionId: id
      })
    }
  }, [storeDismiss, sessionId])

  const use = useCallback(async (id: string) => {
    storeUse(id)
    if (window.monacopilot && sessionId) {
      await window.monacopilot.sendAction(sessionId, {
        action: "use_suggestion",
        suggestionId: id
      })
    }
  }, [storeUse, sessionId])

  return {
    suggestions,
    dismissedCount: dismissedSuggestionIds.length,
    dismiss,
    use
  }
}
