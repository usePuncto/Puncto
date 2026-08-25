/**
 * Independent REP-P availability monitor (Cloud Functions scheduler).
 * Calls internal /api/time-clock/monitor/run with shared secret.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';

export const monitorRepPAvailability = onSchedule(
  {
    // 1 min: polling de 5 min é insuficiente para meta interna 99,9%
    // (até ~5 min de outage não detectada ≈ budget mensal de ~43 min a 99,9%).
    // Recomendação: 1 min aqui + monitor externo (UptimeRobot/Better Stack) no /health.
    schedule: 'every 1 minutes',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
  },
  async () => {
    const baseUrl = process.env.PUNCTO_APP_BASE_URL;
    const secret = process.env.REP_P_MONITOR_SECRET;
    if (!baseUrl || !secret) {
      console.warn(
        '[repPMonitor] PUNCTO_APP_BASE_URL or REP_P_MONITOR_SECRET missing — skip'
      );
      return;
    }

    const res = await fetch(`${baseUrl}/api/time-clock/monitor/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rep-p-monitor-secret': secret,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[repPMonitor] monitor/run failed', res.status, text);
      throw new Error(`monitor/run ${res.status}`);
    }

    const json = await res.json();
    console.log('[repPMonitor] ok', json.checked);
  }
);
