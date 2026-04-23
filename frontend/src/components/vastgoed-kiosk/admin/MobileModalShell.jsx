import { X, Check, Loader2 } from 'lucide-react';

/**
 * Mobile-friendly modal shell:
 * - Fullscreen on mobile (<640px), centered dialog on desktop
 * - Sticky header with close (X) button
 * - Scrollable body
 * - Sticky footer with safe-area-inset-bottom padding
 *
 * Usage:
 *   <MobileModalShell title="Nieuw Appartement" subtitle="Vul gegevens" onClose={...} onSubmit={...} loading={...} submitLabel="Opslaan" maxWidth="max-w-md">
 *     <form-fields />
 *   </MobileModalShell>
 */
function MobileModalShell({
  title,
  subtitle,
  onClose,
  onSubmit,
  loading = false,
  submitLabel = 'Opslaan',
  cancelLabel = 'Annuleren',
  maxWidth = 'sm:max-w-md',
  children,
  hideFooter = false,
  testIdPrefix = 'modal',
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[70] flex items-stretch sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        className={`bg-white sm:rounded-2xl shadow-2xl w-full ${maxWidth} h-[calc(100dvh-env(safe-area-inset-top,0px))] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid={`${testIdPrefix}-close`}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:scale-95 flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 space-y-3">{children}</div>
        </div>

        {/* Sticky footer */}
        {!hideFooter && (
          <div
            className="flex gap-2 p-3 border-t border-slate-100 flex-shrink-0 bg-white sm:bg-slate-50"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
          >
            <button
              type="button"
              onClick={onClose}
              data-testid={`${testIdPrefix}-cancel`}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 active:scale-[0.98] transition"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              data-testid={`${testIdPrefix}-save`}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? 'Bezig...' : submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileModalShell;
