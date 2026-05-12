export type TF = 'Daily' | '4H' | '1H' | '15m';

export interface Zone { top: number; bottom: number; tf: TF; strength?: number; createdAt?: number; }
export interface FVG { top: number; bottom: number; tf: TF; ageHours?: number; }
export interface Sweep { level: number; wickTop: number; wickBottom: number; time: number; tf: TF; valid: boolean; }

const CONFIG = {
  strategyName: 'S&D + Liquidity Gaps + Sweeps + FVG (confluence)',
  timeframes: { HTF: 'Daily' as TF, MTF: '4H' as TF, LTF: '1H' as TF, ETF: '15m' as TF },
  detection: {
    fvg: { lookbackCandles: 10, minGapPct: 0.0002, markTFs: ['4H','1H','15m'] },
    orderBlock: { impulseThresholdPct: 0.005, minImpulseCandles: 3, markTFs: ['Daily','4H','1H'] },
    liquidityGap: { minSizePips: 5, markTFs: ['1H','15m'] },
    sweep: { confirmationWindowCandles: 3, wickBufferPct: 0.0003, markTFs: ['4H','1H','15m'] },
    atrMultiplierStop: { ETF: 1.0 }
  },
  confluence: { requireMin: 2, priorityWeights: { HTF_OB: 30, MTF_FVG: 25, LTF_gap: 15, sweep: 30 } },
  risk: { riskPerTradePct: 1.0, dailyMaxPct: 3.0, weeklyMaxPct: 8.0 },
  execution: { slippageEstPct: 0.0001, spreadThresholdPct: 0.0005 }
};

export default CONFIG;
