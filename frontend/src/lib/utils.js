import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Currency formatting utilities for Suriname Finance OS

export const CURRENCIES = {
  SRD: { symbol: 'SRD', name: 'Surinaamse Dollar', locale: 'nl-SR' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'nl-NL' },
};

export const formatCurrency = (amount, currency = 'SRD', showSymbol = true) => {
  const config = CURRENCIES[currency] || CURRENCIES.SRD;
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount || 0));
  
  const sign = amount < 0 ? '-' : '';
  
  if (showSymbol) {
    if (currency === 'SRD') {
      return `${sign}SRD ${formatted}`;
    }
    return `${sign}${config.symbol} ${formatted}`;
  }
  return `${sign}${formatted}`;
};

export const formatDate = (dateString, format = 'short') => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  
  if (format === 'short') {
    return date.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  
  if (format === 'long') {
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  
  return date.toISOString().split('T')[0];
};

export const formatNumber = (num, decimals = 2) => {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num || 0);
};

export const formatPercentage = (value) => {
  return `${formatNumber(value, 1)}%`;
};

export const getStatusColor = (status) => {
  const colors = {
    draft: 'bg-slate-100 text-slate-700',
    concept: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    verzonden: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    betaald: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    verlopen: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-500',
    geannuleerd: 'bg-slate-100 text-slate-500',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-amber-100 text-amber-700',
    planning: 'bg-slate-100 text-slate-700',
    active: 'bg-blue-100 text-blue-700',
    actief: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    voltooid: 'bg-green-100 text-green-700',
    on_hold: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    partial: 'bg-amber-100 text-amber-700',
    gedeeltelijk_betaald: 'bg-amber-100 text-amber-700',
    delivered: 'bg-green-100 text-green-700',
    received: 'bg-green-100 text-green-700',
    invoiced: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    nieuw: 'bg-amber-100 text-amber-700',
    matched: 'bg-blue-100 text-blue-700',
    gematched: 'bg-blue-100 text-blue-700',
    reconciled: 'bg-green-100 text-green-700',
    posted: 'bg-green-100 text-green-700',
    geboekt: 'bg-green-100 text-green-700',
    reversed: 'bg-red-100 text-red-700',
    herinnering: 'bg-orange-100 text-orange-700',
  };
  return colors[status] || 'bg-slate-100 text-slate-700';
};

export const getStatusLabel = (status) => {
  const labels = {
    draft: 'Concept',
    concept: 'Concept',
    sent: 'Verzonden',
    verzonden: 'Verzonden',
    paid: 'Betaald',
    betaald: 'Betaald',
    overdue: 'Vervallen',
    verlopen: 'Verlopen',
    cancelled: 'Geannuleerd',
    geannuleerd: 'Geannuleerd',
    accepted: 'Geaccepteerd',
    rejected: 'Afgewezen',
    expired: 'Verlopen',
    planning: 'Planning',
    active: 'Actief',
    actief: 'Actief',
    completed: 'Voltooid',
    voltooid: 'Voltooid',
    on_hold: 'In wacht',
    confirmed: 'Bevestigd',
    partial: 'Gedeeltelijk',
    gedeeltelijk_betaald: 'Gedeeltelijk betaald',
    delivered: 'Geleverd',
    received: 'Ontvangen',
    invoiced: 'Gefactureerd',
    pending: 'In behandeling',
    nieuw: 'Nieuw',
    matched: 'Gematcht',
    gematched: 'Gematcht',
    reconciled: 'Afgestemd',
    posted: 'Geboekt',
    geboekt: 'Geboekt',
    reversed: 'Omgekeerd',
    herinnering: 'Herinnering',
  };
  return labels[status] || status;
};

export const accountTypes = {
  asset: 'Activa',
  activa: 'Activa',
  liability: 'Passiva',
  passiva: 'Passiva',
  equity: 'Eigen Vermogen',
  eigen_vermogen: 'Eigen Vermogen',
  revenue: 'Omzet',
  omzet: 'Omzet',
  expense: 'Kosten',
  kosten: 'Kosten',
};

export const journalTypes = {
  bank: 'Bank',
  cash: 'Kas',
  kas: 'Kas',
  sales: 'Verkoop',
  verkoop: 'Verkoop',
  purchase: 'Inkoop',
  inkoop: 'Inkoop',
  memorial: 'Memoriaal',
  memoriaal: 'Memoriaal',
};
