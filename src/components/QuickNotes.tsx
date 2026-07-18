import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { StickyNote, Plus } from "lucide-react"
import { useSessionStore } from "../stores/sessionStore"
import { v4 as uuidv4 } from "uuid"

const QuickNotes: React.FC = () => {
  const { t } = useTranslation()
  const { notes, addNote, sessionId, coverageState } = useSessionStore()
  const [text, setText] = useState("")
  const [selectedCompetency, setSelectedCompetency] = useState("")

  const handleAdd = async () => {
    if (!text.trim()) return

    const note = {
      id: uuidv4(),
      text: text.trim(),
      competencyId: selectedCompetency || undefined,
      timestamp: new Date().toISOString()
    }

    addNote(note)

    if (window.monacopilot && sessionId) {
      await window.monacopilot.sendAction(sessionId, {
        action: "add_note",
        noteText: note.text,
        competencyId: note.competencyId
      })
    }

    setText("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="px-3 py-2 border-b border-copilot-border">
      <div className="flex items-center gap-1.5 mb-2">
        <StickyNote size={13} className="text-copilot-success" />
        <span className="text-xs font-semibold text-copilot-text">{t("notes.title")}</span>
        {notes.length > 0 && (
          <span className="text-[10px] text-copilot-text-muted">({notes.length})</span>
        )}
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("notes.placeholder")}
          className="flex-1 px-2 py-1.5 bg-mona-surface border border-copilot-border rounded
            text-xs text-copilot-text outline-none focus:border-mona-primary/50 transition-colors"
        />
        <button onClick={handleAdd} disabled={!text.trim()}
          className="p-1.5 rounded mona-gradient text-white disabled:opacity-40
            hover:opacity-90 transition-opacity">
          <Plus size={12} />
        </button>
      </div>

      {coverageState.length > 0 && (
        <select value={selectedCompetency} onChange={(e) => setSelectedCompetency(e.target.value)}
          className="mt-1.5 w-full px-2 py-1 bg-mona-surface border border-copilot-border rounded
            text-[10px] text-copilot-text-secondary outline-none">
          <option value="">{t("notes.addToScorecard")}</option>
          {coverageState.map((c) => (
            <option key={c.competencyId} value={c.competencyId}>{c.competencyName}</option>
          ))}
        </select>
      )}

      {notes.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 max-h-[100px] overflow-y-auto">
          {notes.slice(-5).reverse().map((note) => (
            <div key={note.id} className="text-[10px] text-copilot-text-secondary px-2 py-1
              bg-mona-surface/50 rounded">
              {note.text}
              {note.competencyId && (
                <span className="text-mona-primary-light ml-1">
                  [{coverageState.find((c) => c.competencyId === note.competencyId)?.competencyName}]
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default QuickNotes
