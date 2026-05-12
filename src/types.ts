export type TF = 'Daily' | '4H' | '1H' | '15m';

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

export interface Zone { top: number; bottom: number; tf: TF; strength?: number; createdAt?: number; }
export interface FVG { top: number; bottom: number; tf: TF; ageHours?: number; }
export interface Sweep { level: number; wickTop: number; wickBottom: number; time: number; tf: TF; valid: boolean; }
