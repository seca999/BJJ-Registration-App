import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  ClipboardList, 
  AlertTriangle, 
  UserPlus, 
  PlusCircle, 
  ShieldAlert, 
  RotateCcw, 
  Download, 
  Upload,
  Award,
  Sparkles,
  Sliders,
  GraduationCap,
  CalendarCheck2,
  CalendarDays,
  Sun,
  Moon,
  GripVertical,
  Check,
  Receipt,
  Tag,
  Database
} from 'lucide-react';
import { Member, PaymentRecord, AttendanceRecord, GymSettings } from '../types';
import { GymLogoDisplay } from './GymLogoDisplay';

export type ActiveTab = 'members' | 'checkin' | 'schedule' | 'coaches' | 'promotions' | 'payments' | 'attendance' | 'renewals' | 'expenses';

// Default order explicitly requested:
// 1. Class Check-In
// 2. Students Directory
// 3. Coaches & Salaries
// 4. Payments & Billing
// 5. Academy Expenses & P&L
// 6. Matboard
// 7. Promotions Tracker
// 8. Attendance Log
// 9. Class Balances & Renewals
const DEFAULT_TAB_ORDER: ActiveTab[] = [
  'checkin',
  'members',
  'coaches',
  'payments',
  'expenses',
  'schedule',
  'promotions',
  'attendance',
  'renewals',
];

const ALL_TAB_IDS: ActiveTab[] = [
  'checkin',
  'members',
  'coaches',
  'payments',
  'expenses',
  'schedule',
  'promotions',
  'attendance',
  'renewals',
];

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  members: Member[];
  payments: PaymentRecord[];
  attendance: AttendanceRecord[];
  settings: GymSettings;
  coachesCount: number;
  expensesCount?: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenNewMember: () => void;
  onOpenPayment: () => void;
  onOpenBranding: () => void;
  onOpenSubscriptionPlans?: () => void;
  onOpenDatabase?: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  members,
  attendance,
  settings,
  coachesCount,
  expensesCount = 0,
  theme = 'dark',
  onToggleTheme,
  onOpenNewMember,
  onOpenPayment,
  onOpenBranding,
  onOpenSubscriptionPlans,
  onOpenDatabase,
  onResetData,
  onExportData,
  onImportData,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tab order state initialized from localStorage or DEFAULT_TAB_ORDER
  const [tabOrder, setTabOrder] = useState<ActiveTab[]>(() => {
    try {
      const saved = localStorage.getItem('gym_nav_tabs_order');
      if (saved) {
        const parsed = JSON.parse(saved) as ActiveTab[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validSaved = parsed.filter((id) => ALL_TAB_IDS.includes(id));
          const missing = ALL_TAB_IDS.filter((id) => !validSaved.includes(id));
          return [...validSaved, ...missing];
        }
      }
    } catch {
      // fallback to default
    }
    return DEFAULT_TAB_ORDER;
  });

  // Drag-and-drop state
  const [draggedTab, setDraggedTab] = useState<ActiveTab | null>(null);
  const [dragOverTab, setDragOverTab] = useState<ActiveTab | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const updateTabOrder = (newOrder: ActiveTab[]) => {
    setTabOrder(newOrder);
    try {
      localStorage.setItem('gym_nav_tabs_order', JSON.stringify(newOrder));
    } catch {
      // ignore
    }
    showToast('Tab order saved!');
  };

  const handleDragStart = (e: React.DragEvent, tabId: ActiveTab) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  };

  const handleDragOver = (e: React.DragEvent, targetTabId: ActiveTab) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTab !== targetTabId) {
      setDragOverTab(targetTabId);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, targetTabId: ActiveTab) => {
    if (dragOverTab === targetTabId) {
      setDragOverTab(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetTabId: ActiveTab) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetTabId) {
      setDraggedTab(null);
      setDragOverTab(null);
      return;
    }

    const newOrder = [...tabOrder];
    const fromIndex = newOrder.indexOf(draggedTab);
    const toIndex = newOrder.indexOf(targetTabId);

    if (fromIndex !== -1 && toIndex !== -1) {
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggedTab);
      updateTabOrder(newOrder);
    }

    setDraggedTab(null);
    setDragOverTab(null);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverTab(null);
  };

  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendanceCount = attendance.filter((a) => a.date === todayStr).length;

  // Count members with low or 0 classes
  const urgentRenewalsCount = members.filter(
    (m) =>
      m.membershipType === 'class_pack' &&
      (m.classesRemaining <= 2 || m.status === 'expired' || m.status === 'warning')
  ).length;

  // Tab definitions lookup
  const tabConfigMap: Record<
    ActiveTab,
    {
      id: string;
      label: string;
      shortLabel: string;
      icon: React.ReactNode;
      badge?: React.ReactNode;
    }
  > = {
    checkin: {
      id: 'tab-nav-checkin',
      label: 'Mat Check-In',
      shortLabel: 'Check-In',
      icon: <CalendarCheck2 className="w-3.5 h-3.5 text-red-500 shrink-0" />,
      badge: (
        <span className="ml-1 px-1 py-0.2 rounded-full text-[9px] bg-red-950 text-red-300 border border-red-800 font-bold shrink-0">
          {todayAttendanceCount}
        </span>
      ),
    },
    members: {
      id: 'tab-nav-members',
      label: 'Students',
      shortLabel: 'Students',
      icon: <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
      badge: (
        <span className="ml-1 px-1 py-0.2 rounded-full text-[9px] bg-stone-800 text-stone-300 shrink-0 font-medium">
          {members.length}
        </span>
      ),
    },
    coaches: {
      id: 'tab-nav-coaches',
      label: 'Coaches & Pay',
      shortLabel: 'Coaches',
      icon: <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      badge: (
        <span className="ml-1 px-1 py-0.2 rounded-full text-[9px] bg-amber-950 text-amber-200 border border-amber-800 font-bold shrink-0">
          {coachesCount}
        </span>
      ),
    },
    payments: {
      id: 'tab-nav-payments',
      label: 'Payments',
      shortLabel: 'Payments',
      icon: <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
    },
    expenses: {
      id: 'tab-nav-expenses',
      label: 'Expenses & P&L',
      shortLabel: 'Expenses',
      icon: <Receipt className="w-3.5 h-3.5 text-red-400 shrink-0" />,
      badge: expensesCount > 0 ? (
        <span className="ml-1 px-1 py-0.2 rounded-full text-[9px] bg-red-950 text-red-300 border border-red-800 font-bold shrink-0">
          {expensesCount}
        </span>
      ) : undefined,
    },
    schedule: {
      id: 'tab-nav-schedule',
      label: 'Matboard',
      shortLabel: 'Matboard',
      icon: <CalendarDays className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
    },
    promotions: {
      id: 'tab-nav-promotions',
      label: 'Promotions',
      shortLabel: 'Promotions',
      icon: <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
    },
    attendance: {
      id: 'tab-nav-attendance',
      label: 'Attendance Log',
      shortLabel: 'Log',
      icon: <ClipboardList className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
    },
    renewals: {
      id: 'tab-nav-renewals',
      label: 'Renewals',
      shortLabel: 'Renewals',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      badge:
        urgentRenewalsCount > 0 ? (
          <span className="ml-1 px-1 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shrink-0">
            {urgentRenewalsCount}
          </span>
        ) : undefined,
    },
  };

  return (
    <header className="bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md">
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top brand & quick actions bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between py-3 sm:py-4 gap-4">
          {/* Gym Logo, Title & Slogan */}
          <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto justify-between sm:justify-start">
            <div
              onClick={onOpenBranding}
              className="flex items-center gap-4 sm:gap-5 group cursor-pointer"
              title="Click to resize logo or edit academy name and slogan"
            >
              {/* Gym Logo Display */}
              <div className="relative group-hover:scale-105 transition-transform flex-shrink-0">
                <GymLogoDisplay logo={settings.logo} gymName={settings.gymName} minSize={76} />
                <div className="absolute -bottom-1 -right-1 bg-stone-900 border border-stone-700 p-1 rounded-full text-stone-400 group-hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                  <Sliders className="w-3 h-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight group-hover:text-red-400 transition-colors drop-shadow-xs">
                    {settings.gymName || 'Arte Suave Academy'}
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] sm:text-xs uppercase font-extrabold tracking-wider bg-stone-800 text-amber-400 rounded-md border border-stone-700 shadow-xs">
                    BJJ Mat Ops
                  </span>
                </div>
                {/* Gym Slogan displayed right underneath the logo and title */}
                <p className="text-xs sm:text-sm lg:text-base text-amber-400/95 font-semibold tracking-wide mt-1 italic flex items-center gap-1.5">
                  <span>{settings.slogan || 'Where Technique Conquers Strength'}</span>
                </p>
              </div>
            </div>

            {/* Mobile actions trigger */}
            <div className="sm:hidden flex items-center gap-1.5">
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="p-1.5 rounded-md bg-stone-800 text-stone-200 border border-stone-700 hover:bg-stone-700 transition-colors"
                  title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-400" />
                  )}
                </button>
              )}
              {onOpenDatabase && (
                <button
                  onClick={onOpenDatabase}
                  className="p-1.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700 hover:text-white transition-colors"
                  title="Database Settings & Health Check"
                >
                  <Database className="w-4 h-4 text-emerald-400" />
                </button>
              )}
              <button
                onClick={onOpenBranding}
                className="p-1.5 rounded-md bg-stone-800 text-amber-400 border border-stone-700 hover:bg-stone-700 transition-colors"
                title="Edit Logo & Slogan"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenNewMember}
                className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                title="Register Student"
              >
                <UserPlus className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenPayment}
                className="p-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                title="Record Payment"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar & Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5 lg:gap-3 flex-wrap justify-end">
            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                type="button"
                id="btn-theme-toggle"
                onClick={onToggleTheme}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-white border border-stone-700 rounded-lg text-xs font-bold transition-all shadow-xs"
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            )}

            {/* Quick mini indicators */}
            <div className="flex items-center gap-3 lg:gap-4 px-3 py-1.5 bg-stone-800/80 rounded-lg border border-stone-700/60 text-xs text-stone-300">
              <div className="flex items-center gap-1.5" title="Students on mat today">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-stone-400">On Mat Today:</span>
                <span className="font-semibold text-white">{todayAttendanceCount}</span>
              </div>
              <div className="h-3 w-px bg-stone-700" />
              <div className="flex items-center gap-1.5" title="Total registered students">
                <span className="text-stone-400">Students:</span>
                <span className="font-semibold text-white">{members.length}</span>
              </div>
              <div className="h-3 w-px bg-stone-700" />
              <div className="flex items-center gap-1.5" title="Active instructors">
                <span className="text-stone-400">Coaches:</span>
                <span className="font-semibold text-white">{coachesCount}</span>
              </div>
              {urgentRenewalsCount > 0 && (
                <>
                  <div className="h-3 w-px bg-stone-700" />
                  <button
                    onClick={() => setActiveTab('renewals')}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors font-medium"
                    title="Students needing renewal"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{urgentRenewalsCount} Due</span>
                  </button>
                </>
              )}
            </div>

            {/* Customize Logo & Slogan Button */}
            <button
              id="btn-customize-logo-slogan"
              onClick={onOpenBranding}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-amber-300 border border-stone-700 rounded-lg text-xs font-semibold transition-colors shadow-xs"
              title="Upload / edit gym logo and modify academy slogan"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Logo & Slogan</span>
            </button>

            {/* Subscription Plans & Pricing Button */}
            {onOpenSubscriptionPlans && (
              <button
                id="btn-nav-subscription-plans"
                onClick={onOpenSubscriptionPlans}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-750 text-amber-400 hover:text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                title="Edit 8, 12, and Unlimited plans for Kids, Teens, and Adults"
              >
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Plans & Pricing</span>
              </button>
            )}

            {/* Database & Architecture Button */}
            {onOpenDatabase && (
              <button
                id="btn-nav-database-settings"
                onClick={onOpenDatabase}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-750 text-emerald-400 hover:text-emerald-300 border border-emerald-600/40 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                title="Windows Local Database Path, Health Check & Architecture"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Database</span>
              </button>
            )}

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                id="btn-register-student-header"
                onClick={onOpenNewMember}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Register Student</span>
              </button>

              <button
                id="btn-record-payment-header"
                onClick={onOpenPayment}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>+ Record Payment</span>
              </button>

              {/* Data Tools Menu / Buttons */}
              <div className="flex items-center gap-1 border-l border-stone-700 pl-2">
                <button
                  onClick={onExportData}
                  className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors"
                  title="Export Backup JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors"
                  title="Import Backup JSON"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onImportData}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={onResetData}
                  className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors"
                  title="Reset to Sample Demo Data"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - 100% Full Width Single Line Navigation */}
        <div className="border-t border-stone-800/80 pt-1 w-full overflow-hidden">
          <nav className="w-full flex items-center gap-0.5 sm:gap-1 py-0.5 overflow-x-auto no-scrollbar">
            {tabOrder.map((tabId, index) => {
              const config = tabConfigMap[tabId];
              if (!config) return null;
              const isActive = activeTab === tabId;
              const isBeingDragged = draggedTab === tabId;
              const isDragOver = dragOverTab === tabId && draggedTab !== tabId;

              return (
                <button
                  key={tabId}
                  id={config.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, tabId)}
                  onDragOver={(e) => handleDragOver(e, tabId)}
                  onDragLeave={(e) => handleDragLeave(e, tabId)}
                  onDrop={(e) => handleDrop(e, tabId)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveTab(tabId)}
                  className={`flex-1 group relative flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-1.5 py-1.5 text-[11px] lg:text-xs font-bold border-b-2 whitespace-nowrap transition-all select-none cursor-grab active:cursor-grabbing rounded-t-md min-w-0 ${
                    isActive
                      ? 'border-red-500 text-white bg-stone-800/80 shadow-xs'
                      : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                  } ${isBeingDragged ? 'opacity-35 scale-95 border-dashed border-red-500 bg-red-950/20' : ''} ${
                    isDragOver ? 'border-amber-400 bg-stone-800/90 ring-1 ring-amber-400/50' : ''
                  }`}
                  title={`${config.label} (Drag to reorder • Position #${index + 1})`}
                >
                  <span className="shrink-0">{config.icon}</span>

                  <span className="truncate">
                    <span className="hidden 2xl:inline">{config.label}</span>
                    <span className="inline 2xl:hidden">{config.shortLabel}</span>
                  </span>

                  {config.badge}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Transient toast message */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-50 bg-stone-900 border border-amber-500/50 text-amber-300 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </header>
  );
};
