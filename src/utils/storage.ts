import { Member, PaymentRecord, AttendanceRecord, ClassSession, GymSettings, Coach, TimetableConfig, SubscriptionPlan, ExpenseRecord } from '../types';
import { INITIAL_MEMBERS, INITIAL_PAYMENTS, INITIAL_ATTENDANCE, INITIAL_CLASSES, DEFAULT_SETTINGS, INITIAL_COACHES, INITIAL_SUBSCRIPTION_PLANS, INITIAL_EXPENSES } from '../data/sampleData';
import { DEFAULT_TIMETABLE_CONFIG } from '../data/timetableData';

const STORAGE_KEYS = {
  MEMBERS: 'bjj_gym_members_v2',
  PAYMENTS: 'bjj_gym_payments_v2',
  ATTENDANCE: 'bjj_gym_attendance_v2',
  CLASSES: 'bjj_gym_classes_v3',
  SETTINGS: 'bjj_gym_settings_v3',
  COACHES: 'bjj_gym_coaches_v1',
  TIMETABLE: 'bjj_gym_timetable_v1',
  PLANS: 'bjj_gym_plans_v1',
  EXPENSES: 'bjj_gym_expenses_v1',
};

export function loadMembers(): Member[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!data) {
      saveMembers(INITIAL_MEMBERS);
      return INITIAL_MEMBERS;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load members from localStorage', err);
    return INITIAL_MEMBERS;
  }
}

let autoSyncDebounceTimer: any = null;

/**
 * Automatically debounces synchronization to the local SQLite database file on Windows disk
 */
export function triggerDiskDatabaseSync(): void {
  if (typeof window === 'undefined') return;
  if (autoSyncDebounceTimer) clearTimeout(autoSyncDebounceTimer);
  autoSyncDebounceTimer = setTimeout(async () => {
    try {
      const configRaw = localStorage.getItem('bjj_gym_db_config_v1');
      const targetPath = configRaw ? JSON.parse(configRaw).storagePath : 'C:\\BJJ Academy\\Database\\bjj_master.db';
      
      const payload = {
        members: loadMembers(),
        classes: loadClasses(),
        attendance: loadAttendance(),
        payments: loadPayments(),
        coaches: loadCoaches(),
        subscriptionPlans: loadSubscriptionPlans(),
        expenses: loadExpenses(),
        timetableConfig: loadTimetableConfig(),
        settings: loadSettings(),
        ibjjfTransfers: JSON.parse(localStorage.getItem('bjj_gym_ibjjf_transfers_v1') || '[]'),
      };

      fetch('/api/database/build-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath, data: payload }),
      }).catch(() => {});
    } catch {
      // background sync
    }
  }, 1200);
}

export function saveMembers(members: Member[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save members to localStorage', err);
  }
}

export function loadPayments(): PaymentRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!data) {
      savePayments(INITIAL_PAYMENTS);
      return INITIAL_PAYMENTS;
    }
    const parsed: PaymentRecord[] = JSON.parse(data);
    return parsed.map(p => ({
      ...p,
      currency: !p.currency || p.currency === '$' ? 'JOD' : p.currency,
    }));
  } catch (err) {
    console.error('Failed to load payments from localStorage', err);
    return INITIAL_PAYMENTS;
  }
}

export function savePayments(payments: PaymentRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save payments to localStorage', err);
  }
}

export function loadAttendance(): AttendanceRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!data) {
      saveAttendance(INITIAL_ATTENDANCE);
      return INITIAL_ATTENDANCE;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load attendance from localStorage', err);
    return INITIAL_ATTENDANCE;
  }
}

export function saveAttendance(records: AttendanceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save attendance to localStorage', err);
  }
}

export function loadClasses(): ClassSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
    if (!data) {
      saveClasses(INITIAL_CLASSES);
      return INITIAL_CLASSES;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load classes from localStorage', err);
    return INITIAL_CLASSES;
  }
}

export function saveClasses(classes: ClassSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save classes to localStorage', err);
  }
}

export function loadSettings(): GymSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      // Check if v2 exists
      const oldV2 = localStorage.getItem('bjj_gym_settings_v2');
      if (oldV2) {
        const parsedOld = JSON.parse(oldV2);
        const merged: GymSettings = {
          ...DEFAULT_SETTINGS,
          ...parsedOld,
          currencySymbol: !parsedOld.currencySymbol || parsedOld.currencySymbol === '$' ? 'JOD' : parsedOld.currencySymbol,
          slogan: parsedOld.slogan || DEFAULT_SETTINGS.slogan,
          logo: parsedOld.logo || DEFAULT_SETTINGS.logo,
        };
        saveSettings(merged);
        return merged;
      }
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      currencySymbol: !parsed.currencySymbol || parsed.currencySymbol === '$' ? 'JOD' : parsed.currencySymbol,
      slogan: parsed.slogan || DEFAULT_SETTINGS.slogan,
      logo: {
        ...DEFAULT_SETTINGS.logo,
        ...(parsed.logo || {}),
      },
    };
  } catch (err) {
    console.error('Failed to load settings from localStorage', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GymSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }
}

export function loadCoaches(): Coach[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COACHES);
    if (!data) {
      saveCoaches(INITIAL_COACHES);
      return INITIAL_COACHES;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load coaches from localStorage', err);
    return INITIAL_COACHES;
  }
}

export function saveCoaches(coaches: Coach[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(coaches));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save coaches to localStorage', err);
  }
}

export function loadTimetableConfig(): TimetableConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
    if (!data) {
      saveTimetableConfig(DEFAULT_TIMETABLE_CONFIG);
      return DEFAULT_TIMETABLE_CONFIG;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load timetable config from localStorage', err);
    return DEFAULT_TIMETABLE_CONFIG;
  }
}

export function saveTimetableConfig(config: TimetableConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(config));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save timetable config to localStorage', err);
  }
}

export function loadSubscriptionPlans(): SubscriptionPlan[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PLANS);
    if (!data) {
      saveSubscriptionPlans(INITIAL_SUBSCRIPTION_PLANS);
      return INITIAL_SUBSCRIPTION_PLANS;
    }
    const parsed: SubscriptionPlan[] = JSON.parse(data);
    return parsed.map(p => ({
      ...p,
      currency: !p.currency || p.currency === '$' ? 'JOD' : p.currency,
    }));
  } catch (err) {
    console.error('Failed to load subscription plans from localStorage', err);
    return INITIAL_SUBSCRIPTION_PLANS;
  }
}

export function saveSubscriptionPlans(plans: SubscriptionPlan[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save subscription plans to localStorage', err);
  }
}

export function loadExpenses(): ExpenseRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!data) {
      saveExpenses(INITIAL_EXPENSES);
      return INITIAL_EXPENSES;
    }
    const parsed: ExpenseRecord[] = JSON.parse(data);
    return parsed.map(e => ({
      ...e,
      currency: !e.currency || e.currency === '$' ? 'JOD' : e.currency,
    }));
  } catch (err) {
    console.error('Failed to load expenses from localStorage', err);
    return INITIAL_EXPENSES;
  }
}

export function saveExpenses(expenses: ExpenseRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save expenses to localStorage', err);
  }
}

export function resetAllDataToDefault(): void {
  localStorage.removeItem(STORAGE_KEYS.MEMBERS);
  localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
  localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
  localStorage.removeItem(STORAGE_KEYS.CLASSES);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.COACHES);
  localStorage.removeItem(STORAGE_KEYS.TIMETABLE);
  localStorage.removeItem(STORAGE_KEYS.PLANS);
  localStorage.removeItem(STORAGE_KEYS.EXPENSES);
}

export function exportBackupJSON(): string {
  const exportData = {
    gymSettings: loadSettings(),
    members: loadMembers(),
    payments: loadPayments(),
    attendance: loadAttendance(),
    classes: loadClasses(),
    coaches: loadCoaches(),
    timetable: loadTimetableConfig(),
    subscriptionPlans: loadSubscriptionPlans(),
    expenses: loadExpenses(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(exportData, null, 2);
}

export function importBackupJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.members && Array.isArray(parsed.members)) {
      saveMembers(parsed.members);
    }
    if (parsed.payments && Array.isArray(parsed.payments)) {
      savePayments(parsed.payments);
    }
    if (parsed.attendance && Array.isArray(parsed.attendance)) {
      saveAttendance(parsed.attendance);
    }
    if (parsed.classes && Array.isArray(parsed.classes)) {
      saveClasses(parsed.classes);
    }
    if (parsed.coaches && Array.isArray(parsed.coaches)) {
      saveCoaches(parsed.coaches);
    }
    if (parsed.timetable) {
      saveTimetableConfig(parsed.timetable);
    }
    if (parsed.gymSettings) {
      saveSettings(parsed.gymSettings);
    }
    if (parsed.subscriptionPlans && Array.isArray(parsed.subscriptionPlans)) {
      saveSubscriptionPlans(parsed.subscriptionPlans);
    }
    if (parsed.expenses && Array.isArray(parsed.expenses)) {
      saveExpenses(parsed.expenses);
    }
    return true;
  } catch (err) {
    console.error('Failed to import JSON data', err);
    return false;
  }
}
