'use client'

// Target Options Menu
// Context menu for Prospecting Target cards

interface TargetOptionsMenuProps {
  onRemoveFromProspecting: () => void
  onCancel: () => void
}

export function TargetOptionsMenu({
  onRemoveFromProspecting,
  onCancel,
}: TargetOptionsMenuProps) {
  return (
    <div
      className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-card-bg border border-border rounded-lg shadow-lg p-2 min-w-[200px]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            onRemoveFromProspecting()
          }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 rounded transition-colors text-text-muted hover:text-text-primary"
        >
          Retirer de la prospection
        </button>
      </div>
    </div>
  )
}
