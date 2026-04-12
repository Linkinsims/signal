// Settings Page — Telegram, Theme, Preferences
'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { loadTelegramConfig, saveTelegramConfig, sendTestMessage, TelegramConfig } from '@/lib/telegram';

export default function SettingsPage() {
  const { userMode, setUserMode, currency, setCurrency, theme, toggleTheme } = useStore();
  const [tg, setTg] = useState<TelegramConfig>({
    botToken: '', chatId: '', enabled: false,
    alertOnLong: true, alertOnShort: true, alertOnWatch: false, cooldownMinutes: 60,
  });
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setTg(loadTelegramConfig());
  }, []);

  function handleSaveTelegram() {
    saveTelegramConfig(tg);
    setTestResult('Settings saved ✅');
    setTimeout(() => setTestResult(null), 3000);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await sendTestMessage(tg.botToken, tg.chatId);
    setTestResult(result.success ? 'Test message sent ✅' : `Error: ${result.error}`);
    setTesting(false);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Settings</h1>
        <p className="text-sm text-muted mt-1">Configure your preferences and integrations</p>
      </div>

      {/* Theme */}
      <div className="card">
        <h2 className="text-sm font-semibold text-primary mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Dark Mode</p>
            <p className="text-xs text-muted">Toggle between light and dark theme</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              theme === 'dark' ? 'bg-accent' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
              theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* User Mode */}
      <div className="card">
        <h2 className="text-sm font-semibold text-primary mb-4">Trading Mode</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setUserMode('beginner')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
              userMode === 'beginner' ? 'bg-accent text-white' : 'bg-surface-2 text-muted'
            }`}
          >
            🟢 Beginner
          </button>
          <button
            onClick={() => setUserMode('advanced')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
              userMode === 'advanced' ? 'bg-accent text-white' : 'bg-surface-2 text-muted'
            }`}
          >
            🔵 Advanced
          </button>
        </div>
        <p className="text-xs text-muted mt-3">
          {userMode === 'beginner'
            ? 'Simplified signals with clear direction. Technical details hidden.'
            : 'Full technical suite: RSI, MACD, EMA, Bollinger, ATR, S&D zones, divergence.'}
        </p>
      </div>

      {/* Currency */}
      <div className="card">
        <h2 className="text-sm font-semibold text-primary mb-4">Currency</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrency('USD')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
              currency === 'USD' ? 'bg-accent text-white' : 'bg-surface-2 text-muted'
            }`}
          >
            $ USD
          </button>
          <button
            onClick={() => setCurrency('ZAR')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
              currency === 'ZAR' ? 'bg-accent text-white' : 'bg-surface-2 text-muted'
            }`}
          >
            R ZAR
          </button>
        </div>
      </div>

      {/* Telegram */}
      <div className="card">
        <h2 className="text-sm font-semibold text-primary mb-1">Telegram Alerts</h2>
        <p className="text-xs text-muted mb-4">Get signal alerts sent to your Telegram. Credentials stored locally only.</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary">Enable Telegram Alerts</span>
            <button
              onClick={() => setTg({ ...tg, enabled: !tg.enabled })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                tg.enabled ? 'bg-accent' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                tg.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <input
            type="text"
            value={tg.botToken}
            onChange={(e) => setTg({ ...tg, botToken: e.target.value })}
            placeholder="Bot Token (from @BotFather)"
            className="input font-mono text-xs"
          />
          <input
            type="text"
            value={tg.chatId}
            onChange={(e) => setTg({ ...tg, chatId: e.target.value })}
            placeholder="Chat ID"
            className="input font-mono text-xs"
          />

          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input type="checkbox" checked={tg.alertOnLong} onChange={(e) => setTg({ ...tg, alertOnLong: e.target.checked })} className="accent-accent" />
              LONG signals
            </label>
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input type="checkbox" checked={tg.alertOnShort} onChange={(e) => setTg({ ...tg, alertOnShort: e.target.checked })} className="accent-accent" />
              SHORT signals
            </label>
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input type="checkbox" checked={tg.alertOnWatch} onChange={(e) => setTg({ ...tg, alertOnWatch: e.target.checked })} className="accent-accent" />
              WATCH signals
            </label>
          </div>

          <div>
            <label className="text-xs text-muted">Alert cooldown (minutes)</label>
            <input
              type="number"
              value={tg.cooldownMinutes}
              onChange={(e) => setTg({ ...tg, cooldownMinutes: parseInt(e.target.value) || 60 })}
              className="input mt-1"
              min={1}
              max={1440}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSaveTelegram} className="btn-primary text-sm flex-1">Save Settings</button>
            <button
              onClick={handleTest}
              disabled={testing || !tg.botToken || !tg.chatId}
              className="btn-outline text-sm flex-1 disabled:opacity-50"
            >
              {testing ? 'Sending...' : 'Send Test'}
            </button>
          </div>

          {testResult && (
            <p className={`text-xs font-medium ${testResult.includes('✅') ? 'text-success' : 'text-danger'}`}>
              {testResult}
            </p>
          )}
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
          🔒 All settings are stored in your browser&apos;s localStorage. Telegram tokens are sent directly from your browser to Telegram&apos;s API — they never touch our servers.
        </p>
      </div>
    </div>
  );
}
