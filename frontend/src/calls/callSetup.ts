import type {CallSetup} from '../domain';
import {isWidgetLayout} from '../widgets/layout';

const storageKey = (userId: string, callId: string) => `ecallipse.call-setup.${userId}.${callId}`;

export function saveCallSetup(userId: string, callId: string, setup: CallSetup) {
  try {
    localStorage.setItem(storageKey(userId, callId), JSON.stringify(setup));
  } catch {
    // The call still works with the fallback setup if storage is unavailable.
  }
}

export function loadCallSetup(userId: string, callId: string): CallSetup | null {
  try {
    const stored = localStorage.getItem(storageKey(userId, callId));
    const parsed = stored ? JSON.parse(stored) as CallSetup : null;
    return parsed && typeof parsed.presetId === 'string' && isWidgetLayout(parsed.layout) ? {
      presetId: parsed.presetId,
      layout: parsed.layout,
      goal: typeof parsed.goal === 'string' ? parsed.goal : '',
      checklist: Array.isArray(parsed.checklist) ? parsed.checklist.filter((item) => typeof item === 'string') : [],
    } : null;
  } catch {
    return null;
  }
}

/** One checklist item per line; blank lines are ignored. */
export function parseChecklist(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}
