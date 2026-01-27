/**
 * Utility functions for formatting values
 */

/**
 * Format a number as currency (euros)
 */
export function formatMoney(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)} mil mill. €`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)} mill. €`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)} mil €`;
  }
  return `${value.toLocaleString('es-ES')} €`;
}

/**
 * Format market value with appropriate suffix
 */
export function formatMarketValue(value: number | string | undefined): string {
  if (typeof value === 'string' && value.includes('€')) {
    return value;
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)} mill. €`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)} mil €`;
  }
  return `${num.toLocaleString('es-ES')} €`;
}

/**
 * Format group ID to readable name
 */
export function formatGroupName(groupId: string): string {
  return groupId
    .replace('E3G', 'Grupo ')
    .replace('E4G', 'Grupo ');
}

/**
 * Format league ID to readable name
 */
export function formatLeagueName(leagueId: string): string {
  const names: { [key: string]: string } = {
    primeraFederacion: 'Primera Federación',
    segundaFederacion: 'Segunda Federación',
  };
  return names[leagueId] || leagueId;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format date short
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES');
}
