// Telegram Bot Integration
// All credentials stored in localStorage — never sent to our servers

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  alertOnLong: boolean;
  alertOnShort: boolean;
  alertOnWatch: boolean;
  cooldownMinutes: number; // Don't re-alert same asset within this window
}

// Track last alert timestamps per symbol
const lastAlertTimes: Record<string, number> = {};

export function getDefaultTelegramConfig(): TelegramConfig {
  return {
    botToken: '',
    chatId: '',
    enabled: false,
    alertOnLong: true,
    alertOnShort: true,
    alertOnWatch: false,
    cooldownMinutes: 60,
  };
}

export function loadTelegramConfig(): TelegramConfig {
  if (typeof window === 'undefined') return getDefaultTelegramConfig();
  try {
    const stored = localStorage.getItem('telegram_config');
    return stored ? { ...getDefaultTelegramConfig(), ...JSON.parse(stored) } : getDefaultTelegramConfig();
  } catch {
    return getDefaultTelegramConfig();
  }
}

export function saveTelegramConfig(config: TelegramConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('telegram_config', JSON.stringify(config));
}

export interface SignalAlertData {
  asset: string;
  type: 'LONG' | 'SHORT' | 'WATCH';
  price: number;
  confidence: number;
  reason: string;
  tp: number;
  sl: number;
  rr: number;
  mtf?: { '15m': string; '1H': string; '4H': string };
}

function formatMessage(data: SignalAlertData): string {
  const mtfLine = data.mtf
    ? `\nTimeframes: 15m ${data.mtf['15m'] === 'bullish' ? '✅' : data.mtf['15m'] === 'bearish' ? '🔴' : '⚠️'} | 1H ${data.mtf['1H'] === 'bullish' ? '✅' : data.mtf['1H'] === 'bearish' ? '🔴' : '⚠️'} | 4H ${data.mtf['4H'] === 'bullish' ? '✅' : data.mtf['4H'] === 'bearish' ? '🔴' : '⚠️'}`
    : '';

  return `⚡ NEW SIGNAL — ${data.asset}
Type: ${data.type}
Price: $${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
Confidence: ${data.confidence}%
Reason: ${data.reason}
TP: $${data.tp.toLocaleString(undefined, { maximumFractionDigits: 2 })} | SL: $${data.sl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
R/R: 1:${data.rr.toFixed(1)}${mtfLine}
— Powered by SIGNAL`;
}

export async function sendTelegramAlert(data: SignalAlertData): Promise<{ success: boolean; error?: string }> {
  const config = loadTelegramConfig();

  if (!config.enabled || !config.botToken || !config.chatId) {
    return { success: false, error: 'Telegram not configured' };
  }

  // Check signal type filter
  if (data.type === 'LONG' && !config.alertOnLong) return { success: false, error: 'LONG alerts disabled' };
  if (data.type === 'SHORT' && !config.alertOnShort) return { success: false, error: 'SHORT alerts disabled' };
  if (data.type === 'WATCH' && !config.alertOnWatch) return { success: false, error: 'WATCH alerts disabled' };

  // Cooldown check
  const now = Date.now();
  const lastAlert = lastAlertTimes[data.asset] || 0;
  if (now - lastAlert < config.cooldownMinutes * 60 * 1000) {
    return { success: false, error: `Cooldown active (${config.cooldownMinutes}min)` };
  }

  try {
    const message = formatMessage(data);
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const result = await response.json();

    if (result.ok) {
      lastAlertTimes[data.asset] = now;
      return { success: true };
    } else {
      return { success: false, error: result.description || 'Unknown Telegram error' };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function sendTestMessage(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ SIGNAL — Test message received! Your Telegram alerts are configured correctly.',
      }),
    });

    const result = await response.json();
    if (result.ok) return { success: true };
    return { success: false, error: result.description || 'Failed to send' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
