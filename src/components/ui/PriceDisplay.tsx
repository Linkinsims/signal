// Price Display Utility Component
'use client';

import { useStore } from '@/lib/store';

interface PriceDisplayProps {
  value: number;
  className?: string;
  showSign?: boolean;
  isNegative?: boolean;
}

export default function PriceDisplay({ value, className = '', showSign = false, isNegative = false }: PriceDisplayProps) {
  const { currency, usdZarRate } = useStore();
  const converted = currency === 'ZAR' ? value * usdZarRate : value;
  const prefix = currency === 'ZAR' ? 'R' : '$';
  const sign = showSign ? (isNegative ? '-' : '+') : '';
  const absVal = Math.abs(converted);

  let formatted: string;
  if (absVal >= 1000000) formatted = `${prefix}${(absVal / 1000000).toFixed(2)}M`;
  else if (absVal >= 1000) formatted = `${prefix}${absVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  else if (absVal >= 1) formatted = `${prefix}${absVal.toFixed(2)}`;
  else if (absVal >= 0.01) formatted = `${prefix}${absVal.toFixed(4)}`;
  else formatted = `${prefix}${absVal.toFixed(6)}`;

  return <span className={`font-mono ${className}`}>{sign}{formatted}</span>;
}

// Hook for formatting prices
export function useFormatPrice() {
  const { currency, usdZarRate } = useStore();

  return (value: number): string => {
    const converted = currency === 'ZAR' ? value * usdZarRate : value;
    const prefix = currency === 'ZAR' ? 'R' : '$';
    const absVal = Math.abs(converted);

    if (absVal >= 1000) return `${prefix}${absVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (absVal >= 1) return `${prefix}${absVal.toFixed(2)}`;
    if (absVal >= 0.01) return `${prefix}${absVal.toFixed(4)}`;
    return `${prefix}${absVal.toFixed(6)}`;
  };
}
