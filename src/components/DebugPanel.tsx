import React, { useState } from "react"
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { useDebugStore } from "../stores/debugStore"

const DebugPanel: React.FC = () => {
  const { logs, clear } = useDebugStore()
  const [open, setOpen] = useState(true)

  return (
    <div className="border-t border-copilot-border shrink-0 bg-mona-card">
      <div 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1 hover:bg-mona-hover transition-colors cursor-pointer select-none">
        <span className="text-[9px] font-mono text-copilot-text-muted">
          DEBUG ({logs.length})
        </span>
        <div className="flex items-center gap-1">
          {open && (
            <button onClick={(e) => { e.stopPropagation(); clear() }}
              className="p-0.5 hover:bg-mona-hover rounded">
              <Trash2 size={8} className="text-copilot-text-muted" />
            </button>
          )}
          {open ? <ChevronDown size={9} className="text-copilot-text-muted" /> : <ChevronUp size={9} className="text-copilot-text-muted" />}
        </div>
      </div>

      {open && (
        <div className="px-3 pb-2 max-h-[120px] overflow-y-auto bg-black/30 font-mono">
          {logs.length === 0 ? (
            <div className="text-[8px] text-copilot-text-muted">No events yet</div>
          ) : (
            logs.map((line, i) => (
              <div key={i} className="text-[8px] text-green-400/80 leading-tight">{line}</div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default DebugPanel
