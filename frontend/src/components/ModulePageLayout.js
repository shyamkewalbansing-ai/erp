import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * ModulePageLayout - Herbruikbare layout component voor module pagina's
 * 
 * @param {string} title - Pagina titel
 * @param {string} subtitle - Optionele subtitel/beschrijving
 * @param {ReactNode} actions - Actieknoppen rechts in de header
 * @param {ReactNode} children - Pagina content
 * @param {boolean} loading - Toon loading spinner
 * @param {string} loadingText - Optionele loading tekst
 * @param {string} variant - 'emerald' (standaard) of 'dark' voor verschillende stijlen
 * @param {string} testId - data-testid voor testing
 */
export function ModulePageLayout({ 
  title, 
  subtitle, 
  actions, 
  children, 
  loading = false,
  loadingText = 'Laden...',
  variant = 'emerald',
  testId
}) {
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground">{loadingText}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      data-testid={testId}
    >
      {variant === 'emerald' ? (
        <EmeraldHeader title={title} subtitle={subtitle} actions={actions} />
      ) : (
        <DarkHeader title={title} subtitle={subtitle} actions={actions} />
      )}
      {children}
    </div>
  );
}

/**
 * Emerald gradient hero header - standaard stijl
 */
function EmeraldHeader({ title, subtitle, actions }) {
  return (
    <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-emerald-100 text-sm sm:text-base">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Dark slate/emerald hero header - alternatieve stijl
 */
function DarkHeader({ title, subtitle, actions }) {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4 sm:p-6 lg:p-8 mx-2 sm:mx-0 mt-2 sm:mt-0">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>
      {/* Glow effect */}
      <div className="hidden sm:block absolute top-0 right-0 w-48 lg:w-72 h-48 lg:h-72 bg-emerald-500/30 rounded-full blur-[80px]"></div>
      
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-slate-300 text-sm sm:text-base">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * StatsGrid - Herbruikbare stats grid met kaarten
 * 
 * @param {Array} stats - Array van stat objecten met icon, label, value, subValue, color
 * @param {number} columns - Aantal kolommen (2, 3, 4, 5)
 * @param {boolean} overlapping - Of de grid overlapt met de header (-mt-6)
 */
export function StatsGrid({ stats, columns = 4, overlapping = true }) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 lg:grid-cols-5'
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${overlapping ? '-mt-6' : 'mt-6'}`}>
      <div className={`grid ${gridCols[columns] || gridCols[4]} gap-3 sm:gap-4`}>
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
    </div>
  );
}

/**
 * StatCard - Individuele statistiek kaart
 */
export function StatCard({ icon: Icon, label, value, subValue, color = 'emerald', onClick }) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-500/10 text-blue-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
    purple: 'bg-purple-500/10 text-purple-500',
    slate: 'bg-slate-500/10 text-slate-500'
  };

  const CardWrapper = onClick ? 'button' : 'div';
  
  return (
    <CardWrapper 
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-5 border border-slate-200/50 dark:border-slate-700/50 ${onClick ? 'hover:shadow-xl transition-shadow cursor-pointer w-full text-left' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-lg ${colorClasses[color] || colorClasses.emerald} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground truncate">{subValue}</p>
          )}
        </div>
      </div>
    </CardWrapper>
  );
}

/**
 * ContentSection - Wrapper voor content secties met max-width
 */
export function ContentSection({ children, className = '' }) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * PageCard - Standaard kaart voor pagina content
 */
export function PageCard({ title, children, actions, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}

export default ModulePageLayout;
