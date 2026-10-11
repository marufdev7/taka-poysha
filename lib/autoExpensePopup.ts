export interface AutoPopupState {
  date: string; // YYYY-MM-DD
  count: number; // 0, 1, or 2
  slotsTriggered: {
    slot1: boolean;
    slot2: boolean;
  };
  timestamps: number[];
  skipForToday: boolean;
  enabled: boolean;
}

const STORAGE_KEY = 'auto_expense_popup_state';

// Helper to get local date string YYYY-MM-DD
export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAutoExpensePopupState(): AutoPopupState {
  const today = getTodayKey();
  const defaultState: AutoPopupState = {
    date: today,
    count: 0,
    slotsTriggered: {
      slot1: false,
      slot2: false,
    },
    timestamps: [],
    skipForToday: false,
    enabled: true,
  };

  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed: Partial<AutoPopupState> = JSON.parse(raw);

    // If date has rolled over to a new day, reset today's counters but retain 'enabled' preference
    if (parsed.date !== today) {
      return {
        ...defaultState,
        enabled: parsed.enabled ?? true,
      };
    }

    return {
      date: today,
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      slotsTriggered: {
        slot1: !!parsed.slotsTriggered?.slot1,
        slot2: !!parsed.slotsTriggered?.slot2,
      },
      timestamps: Array.isArray(parsed.timestamps) ? parsed.timestamps : [],
      skipForToday: !!parsed.skipForToday,
      enabled: parsed.enabled ?? true,
    };
  } catch (err) {
    console.error('Failed to read auto expense popup state:', err);
    return defaultState;
  }
}

export function saveAutoExpensePopupState(state: AutoPopupState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save auto expense popup state:', err);
  }
}

export function checkShouldTriggerAutoPopup(): {
  shouldTrigger: boolean;
  slot: 1 | 2 | null;
  count: number;
} {
  const state = getAutoExpensePopupState();

  if (!state.enabled || state.skipForToday) {
    return { shouldTrigger: false, slot: null, count: state.count };
  }

  // Already triggered twice today
  if (state.count >= 2) {
    return { shouldTrigger: false, slot: null, count: state.count };
  }

  // First time of the day
  if (state.count === 0 || !state.slotsTriggered.slot1) {
    return { shouldTrigger: true, slot: 1, count: state.count };
  }

  // Second time of the day
  if (state.count === 1) {
    const firstTimestamp = state.timestamps[0] || 0;
    const now = Date.now();
    const hoursSinceFirst = (now - firstTimestamp) / (1000 * 60 * 60);
    const currentHour = new Date().getHours();

    // Trigger Slot 2 if:
    // 1) At least 3 hours have passed since the 1st popup, OR
    // 2) Current local time is afternoon/evening (>= 15:00) AND at least 2 hours have passed.
    // (If firstTimestamp is 0, allow trigger)
    if (firstTimestamp === 0 || hoursSinceFirst >= 3 || (currentHour >= 15 && hoursSinceFirst >= 2)) {
      return { shouldTrigger: true, slot: 2, count: state.count };
    }
  }

  return { shouldTrigger: false, slot: null, count: state.count };
}

export function markAutoPopupShown(slot: 1 | 2) {
  const state = getAutoExpensePopupState();
  const newState: AutoPopupState = {
    ...state,
    count: Math.min(2, state.count + 1),
    slotsTriggered: {
      ...state.slotsTriggered,
      [slot === 1 ? 'slot1' : 'slot2']: true,
    },
    timestamps: [...state.timestamps, Date.now()],
  };
  saveAutoExpensePopupState(newState);
  return newState;
}

export function markSkipForToday() {
  const state = getAutoExpensePopupState();
  const newState: AutoPopupState = {
    ...state,
    skipForToday: true,
  };
  saveAutoExpensePopupState(newState);
  return newState;
}

export function toggleAutoPopupEnabled(enabled?: boolean) {
  const state = getAutoExpensePopupState();
  const newState: AutoPopupState = {
    ...state,
    enabled: typeof enabled === 'boolean' ? enabled : !state.enabled,
  };
  saveAutoExpensePopupState(newState);
  return newState;
}

export function resetTodayAutoPopup() {
  const today = getTodayKey();
  const state = getAutoExpensePopupState();
  const newState: AutoPopupState = {
    date: today,
    count: 0,
    slotsTriggered: {
      slot1: false,
      slot2: false,
    },
    timestamps: [],
    skipForToday: false,
    enabled: state.enabled,
  };
  saveAutoExpensePopupState(newState);
  return newState;
}
