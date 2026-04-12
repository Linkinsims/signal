// Zustand Global State Store
'use client';

import { create } from 'zustand';
import { Signal, AssetClass } from './signals';

export type UserMode = 'beginner' | 'advanced';
export type Currency = 'USD' | 'ZAR';
export type ThemeMode = 'light' | 'dark';
export type ActiveTab = 'dashboard' | 'signals' | 'chart' | 'forecast' | 'portfolio' | 'watchlist' | 'backtester' | 'calendar' | 'settings';

export interface PortfolioHolding {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  quantity: number;
  avgBuyPrice: number;
}

export interface CustomAlert {
  id: string;
  symbol: string;
  condition: 'price_above' | 'price_below' | 'rsi_above' | 'rsi_below';
  value: number;
  triggered: boolean;
  createdAt: number;
}

export interface WatchlistItem {
  symbol: string;
  assetClass: AssetClass;
  order: number;
}

interface AppState {
  // User preferences
  userMode: UserMode;
  currency: Currency;
  theme: ThemeMode;
  usdZarRate: number;
  isLicensed: boolean;
  licenseKey: string;

  // Navigation
  activeTab: ActiveTab;

  // Signals
  signals: Signal[];
  signalFilter: AssetClass | 'all';

  // Portfolio
  portfolio: PortfolioHolding[];

  // Watchlist
  watchlist: WatchlistItem[];

  // Alerts
  customAlerts: CustomAlert[];

  // Real-time prices
  prices: Record<string, { price: number; change24h: number }>;

  // Actions
  setUserMode: (mode: UserMode) => void;
  setCurrency: (currency: Currency) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setUsdZarRate: (rate: number) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setLicensed: (licensed: boolean, key?: string) => void;

  addSignal: (signal: Signal) => void;
  setSignals: (signals: Signal[]) => void;
  setSignalFilter: (filter: AssetClass | 'all') => void;

  addHolding: (holding: PortfolioHolding) => void;
  removeHolding: (id: string) => void;
  updateHolding: (id: string, updates: Partial<PortfolioHolding>) => void;
  setPortfolio: (holdings: PortfolioHolding[]) => void;

  // Watchlist actions
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;
  reorderWatchlist: (items: WatchlistItem[]) => void;
  setWatchlist: (items: WatchlistItem[]) => void;

  addAlert: (alert: CustomAlert) => void;
  removeAlert: (id: string) => void;
  triggerAlert: (id: string) => void;
  setAlerts: (alerts: CustomAlert[]) => void;

  updatePrice: (symbol: string, price: number, change24h: number) => void;
  setBatchPrices: (prices: Record<string, { price: number; change24h: number }>) => void;
}

// Load from localStorage safely
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded, ignore */ }
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  userMode: 'beginner',
  currency: 'USD',
  theme: 'light',
  usdZarRate: 18.5,
  isLicensed: false,
  licenseKey: '',
  activeTab: 'dashboard',
  signals: [],
  signalFilter: 'all',
  portfolio: [],
  watchlist: [],
  customAlerts: [],
  prices: {},

  // Preference actions
  setUserMode: (mode) => {
    set({ userMode: mode });
    saveToStorage('user_mode', mode);
  },
  setCurrency: (currency) => {
    set({ currency });
    saveToStorage('currency', currency);
  },
  setTheme: (theme) => {
    set({ theme });
    saveToStorage('theme', theme);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  },
  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },
  setUsdZarRate: (rate) => set({ usdZarRate: rate }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLicensed: (licensed, key) => {
    set({ isLicensed: licensed, licenseKey: key || '' });
    if (key) saveToStorage('license_key', key);
  },

  // Signal actions
  addSignal: (signal) => {
    const current = get().signals;
    const updated = [signal, ...current].slice(0, 100);
    set({ signals: updated });
  },
  setSignals: (signals) => set({ signals }),
  setSignalFilter: (filter) => set({ signalFilter: filter }),

  // Portfolio actions
  addHolding: (holding) => {
    const updated = [...get().portfolio, holding];
    set({ portfolio: updated });
    saveToStorage('portfolio', updated);
  },
  removeHolding: (id) => {
    const updated = get().portfolio.filter((h) => h.id !== id);
    set({ portfolio: updated });
    saveToStorage('portfolio', updated);
  },
  updateHolding: (id, updates) => {
    const updated = get().portfolio.map((h) => h.id === id ? { ...h, ...updates } : h);
    set({ portfolio: updated });
    saveToStorage('portfolio', updated);
  },
  setPortfolio: (holdings) => set({ portfolio: holdings }),

  // Watchlist actions
  addToWatchlist: (item) => {
    const current = get().watchlist;
    if (current.some(w => w.symbol === item.symbol)) return;
    const updated = [...current, { ...item, order: current.length }];
    set({ watchlist: updated });
    saveToStorage('watchlist', updated);
  },
  removeFromWatchlist: (symbol) => {
    const updated = get().watchlist.filter(w => w.symbol !== symbol);
    set({ watchlist: updated });
    saveToStorage('watchlist', updated);
  },
  reorderWatchlist: (items) => {
    set({ watchlist: items });
    saveToStorage('watchlist', items);
  },
  setWatchlist: (items) => set({ watchlist: items }),

  // Alert actions
  addAlert: (alert) => {
    const updated = [...get().customAlerts, alert];
    set({ customAlerts: updated });
    saveToStorage('custom_alerts', updated);
  },
  removeAlert: (id) => {
    const updated = get().customAlerts.filter((a) => a.id !== id);
    set({ customAlerts: updated });
    saveToStorage('custom_alerts', updated);
  },
  triggerAlert: (id) => {
    const updated = get().customAlerts.map((a) => a.id === id ? { ...a, triggered: true } : a);
    set({ customAlerts: updated });
    saveToStorage('custom_alerts', updated);
  },
  setAlerts: (alerts) => set({ customAlerts: alerts }),

  // Price actions
  updatePrice: (symbol, price, change24h) => {
    set((state) => ({
      prices: { ...state.prices, [symbol]: { price, change24h } },
    }));
  },
  setBatchPrices: (prices) => set({ prices }),
}));

// Initialize state from localStorage (call on app mount)
export function initializeStore() {
  const store = useStore.getState();
  store.setUserMode(loadFromStorage('user_mode', 'beginner'));
  store.setCurrency(loadFromStorage('currency', 'USD'));
  store.setPortfolio(loadFromStorage('portfolio', []));
  store.setAlerts(loadFromStorage('custom_alerts', []));
  store.setWatchlist(loadFromStorage('watchlist', []));

  // Theme
  const savedTheme = loadFromStorage<ThemeMode>('theme', 'light');
  const systemDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = loadFromStorage<string>('theme', '') ? savedTheme : (systemDark ? 'dark' : 'light');
  store.setTheme(theme);

  const key = loadFromStorage<string>('license_key', '');
  if (key) store.setLicensed(true, key);
}
