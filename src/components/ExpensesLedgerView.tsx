import React, { useState, useMemo, useRef } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Building,
  Zap,
  Droplets,
  Wrench,
  ShieldCheck,
  ShoppingBag,
  Share2,
  Download,
  Printer,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Users,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  PieChart,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  ExpenseRecord,
  ExpenseCategory,
  PaymentRecord,
  PaymentMethod,
  Coach,
  AttendanceRecord,
  GymSettings
} from '../types';
import { formatCurrency } from '../utils/currencyUtils';

interface ExpensesLedgerViewProps {
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
  coaches: Coach[];
  attendance: AttendanceRecord[];
  settings: GymSettings;
  onAddExpense: (expense: ExpenseRecord) => void;
  onUpdateExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (expenseId: string) => void;
  onBatchAddExpenses?: (expenses: ExpenseRecord[]) => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Utilities (Water & Electricity)',
  'Rent & Facility Lease',
  'Coach Salaries & Payroll',
  'Maintenance & Cleaning',
  'Equipment & Mat Upgrades',
  'Gear & Merchandise Inventory',
  'Marketing & Software Subscriptions',
  'Taxes, Insurance & Legal',
  'Other / Miscellaneous',
];

const CATEGORY_ICONS: Record<ExpenseCategory, React.ReactNode> = {
  'Utilities (Water & Electricity)': <Zap className="w-4 h-4 text-amber-400" />,
  'Rent & Facility Lease': <Building className="w-4 h-4 text-blue-400" />,
  'Coach Salaries & Payroll': <Users className="w-4 h-4 text-emerald-400" />,
  'Maintenance & Cleaning': <Droplets className="w-4 h-4 text-cyan-400" />,
  'Equipment & Mat Upgrades': <Wrench className="w-4 h-4 text-purple-400" />,
  'Gear & Merchandise Inventory': <ShoppingBag className="w-4 h-4 text-orange-400" />,
  'Marketing & Software Subscriptions': <Share2 className="w-4 h-4 text-pink-400" />,
  'Taxes, Insurance & Legal': <ShieldCheck className="w-4 h-4 text-indigo-400" />,
  'Other / Miscellaneous': <Receipt className="w-4 h-4 text-stone-400" />,
};

export const ExpensesLedgerView: React.FC<ExpensesLedgerViewProps> = ({
  expenses,
  payments,
  coaches,
  attendance,
  settings,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onBatchAddExpenses,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(8); // 8 = September (0-indexed)
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Paid' | 'Pending'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);
  const [isSyncPayrollModalOpen, setIsSyncPayrollModalOpen] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Utilities (Water & Electricity)');
  const [formAmount, setFormAmount] = useState<number>(100);
  const [formDate, setFormDate] = useState('2026-09-22');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('Bank Transfer / ACH');
  const [formVendor, setFormVendor] = useState('');
  const [formInvoiceRef, setFormInvoiceRef] = useState('');
  const [formStatus, setFormStatus] = useState<'Paid' | 'Pending' | 'Scheduled'>('Paid');
  const [formNotes, setFormNotes] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formRecurringInterval, setFormRecurringInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Compute date range strings based on selected year and month
  const { startDateStr, endDateStr, periodLabel } = useMemo(() => {
    if (selectedMonth === 'ALL') {
      return {
        startDateStr: `${selectedYear}-01-01`,
        endDateStr: `${selectedYear}-12-31`,
        periodLabel: `Full Year ${selectedYear}`,
      };
    }

    const monthNum = selectedMonth + 1;
    const monthPadded = String(monthNum).padStart(2, '0');
    const startStr = `${selectedYear}-${monthPadded}-01`;
    // Last day of month
    const lastDay = new Date(selectedYear, monthNum, 0).getDate();
    const endStr = `${selectedYear}-${monthPadded}-${String(lastDay).padStart(2, '0')}`;

    return {
      startDateStr: startStr,
      endDateStr: endStr,
      periodLabel: `${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
    };
  }, [selectedYear, selectedMonth]);

  // Pre-calculate monthly expenses totals for the selected year across all 12 months
  const monthlyExpensesSummary = useMemo(() => {
    const summary = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      monthName: MONTH_NAMES[i],
      monthShort: MONTH_SHORT[i],
      count: 0,
      total: 0,
    }));

    expenses.forEach((exp) => {
      if (exp.date && exp.date.startsWith(`${selectedYear}-`)) {
        const parts = exp.date.split('-');
        const m = parseInt(parts[1], 10) - 1;
        if (m >= 0 && m < 12) {
          summary[m].count += 1;
          summary[m].total += exp.amount;
        }
      }
    });

    return summary;
  }, [expenses, selectedYear]);

  // Navigate previous/next month
  const handlePrevMonth = () => {
    if (selectedMonth === 'ALL') {
      setSelectedMonth(11);
      return;
    }
    if (selectedMonth === 0) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth((prev) => (prev as number) - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'ALL') {
      setSelectedMonth(0);
      return;
    }
    if (selectedMonth === 11) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth((prev) => (prev as number) + 1);
    }
  };

  // Filter expenses by date range, category, status, and search query
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Date filter
      if (exp.date < startDateStr || exp.date > endDateStr) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && exp.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchVendor = exp.recipientOrVendor?.toLowerCase().includes(q) || false;
        const matchInvoice = exp.invoiceRef?.toLowerCase().includes(q) || false;
        const matchNotes = exp.notes?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchVendor && !matchInvoice && !matchNotes) return false;
      }

      return true;
    });
  }, [expenses, startDateStr, endDateStr, categoryFilter, statusFilter, searchQuery]);

  // Calculate Revenue from Payments in the exact same date range
  const filteredPayments = useMemo(() => {
    return payments.filter(
      (p) => p.date >= startDateStr && p.date <= endDateStr && p.status === 'Completed'
    );
  }, [payments, startDateStr, endDateStr]);

  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [filteredPayments]);

  // Financial Metrics
  const totalExpensesAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const paidExpensesAmount = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.status === 'Paid')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const pendingExpensesAmount = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.status === 'Pending' || e.status === 'Scheduled')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const netProfit = totalRevenue - totalExpensesAmount;
  const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Breakdown by Category
  const categoryBreakdown = useMemo(() => {
    const map = new Map<ExpenseCategory, { count: number; total: number }>();
    EXPENSE_CATEGORIES.forEach((cat) => map.set(cat, { count: 0, total: 0 }));

    filteredExpenses.forEach((e) => {
      const current = map.get(e.category) || { count: 0, total: 0 };
      map.set(e.category, {
        count: current.count + 1,
        total: current.total + e.amount,
      });
    });

    return Array.from(map.entries())
      .map(([cat, data]) => ({
        category: cat,
        count: data.count,
        total: data.total,
        percentage: totalExpensesAmount > 0 ? (data.total / totalExpensesAmount) * 100 : 0,
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, totalExpensesAmount]);

  // Calculate Coach Salaries for the Selected Period from Attendance
  const calculatedCoachPayroll = useMemo(() => {
    const periodAttendance = attendance.filter(
      (a) => a.date >= startDateStr && a.date <= endDateStr
    );

    // Group by unique session
    const sessionMap = new Map<string, { date: string; className: string; coachName: string; studentCount: number }>();
    periodAttendance.forEach((rec) => {
      const key = `${rec.date}__${rec.className}__${rec.coach || ''}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          date: rec.date,
          className: rec.className,
          coachName: rec.coach,
          studentCount: 1,
        });
      } else {
        const s = sessionMap.get(key)!;
        s.studentCount += 1;
      }
    });

    return coaches.map((coach) => {
      const cSessions = Array.from(sessionMap.values()).filter(
        (s) =>
          s.coachName.toLowerCase().includes(coach.fullName.toLowerCase()) ||
          (coach.nickname && s.coachName.toLowerCase().includes(coach.nickname.toLowerCase()))
      );

      let totalEarned = 0;
      if (coach.payType === 'per_class') {
        cSessions.forEach((s) => {
          let sessionPay = coach.rate;
          if (
            coach.studentBonusThreshold &&
            coach.studentBonusAmount &&
            s.studentCount > coach.studentBonusThreshold
          ) {
            sessionPay += (s.studentCount - coach.studentBonusThreshold) * coach.studentBonusAmount;
          }
          totalEarned += sessionPay;
        });
      } else if (coach.payType === 'monthly_fixed') {
        totalEarned = coach.rate;
      } else if (coach.payType === 'hourly') {
        totalEarned = cSessions.length * coach.rate;
      } else if (coach.payType === 'per_student') {
        const totalStudents = cSessions.reduce((acc, s) => acc + s.studentCount, 0);
        totalEarned = totalStudents * coach.rate;
      }

      // Check if already logged as expense in this date range
      const alreadyLogged = expenses.some(
        (e) =>
          e.category === 'Coach Salaries & Payroll' &&
          (e.coachId === coach.id || e.recipientOrVendor?.toLowerCase().includes(coach.fullName.toLowerCase())) &&
          e.date >= startDateStr &&
          e.date <= endDateStr
      );

      return {
        coach,
        sessionsCount: cSessions.length,
        totalEarned,
        alreadyLogged,
      };
    });
  }, [attendance, coaches, expenses, startDateStr, endDateStr]);

  // Handlers for Add / Edit Modal
  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormCategory('Utilities (Water & Electricity)');
    setFormAmount(100);
    // Default date to currently selected year and month
    const m = selectedMonth === 'ALL' ? 8 : (selectedMonth as number);
    const monthPadded = String(m + 1).padStart(2, '0');
    setFormDate(`${selectedYear}-${monthPadded}-15`);
    setFormPaymentMethod('Bank Transfer / ACH');
    setFormVendor('');
    setFormInvoiceRef('');
    setFormStatus('Paid');
    setFormNotes('');
    setFormIsRecurring(false);
    setFormRecurringInterval('monthly');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormAmount(exp.amount);
    setFormDate(exp.date);
    setFormPaymentMethod(exp.paymentMethod);
    setFormVendor(exp.recipientOrVendor || '');
    setFormInvoiceRef(exp.invoiceRef || '');
    setFormStatus(exp.status);
    setFormNotes(exp.notes || '');
    setFormIsRecurring(!!exp.isRecurring);
    setFormRecurringInterval(exp.recurringInterval || 'monthly');
    setIsAddEditModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const saved: ExpenseRecord = {
      id: editingExpense?.id || `exp-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory,
      amount: Number(formAmount) || 0,
      currency: settings.currencySymbol,
      date: formDate,
      paymentMethod: formPaymentMethod,
      recipientOrVendor: formVendor.trim() || undefined,
      invoiceRef: formInvoiceRef.trim() || undefined,
      status: formStatus,
      notes: formNotes.trim() || undefined,
      isRecurring: formIsRecurring,
      recurringInterval: formIsRecurring ? formRecurringInterval : undefined,
      coachId: editingExpense?.coachId,
    };

    if (editingExpense) {
      onUpdateExpense(saved);
    } else {
      onAddExpense(saved);
    }
    setIsAddEditModalOpen(false);
    setEditingExpense(null);
  };

  // 1-Click Import Coach Salaries to Expenses
  const handleSyncCoachPayroll = () => {
    const newExpensesToLog: ExpenseRecord[] = [];
    calculatedCoachPayroll.forEach((item) => {
      if (!item.alreadyLogged && item.totalEarned > 0) {
        newExpensesToLog.push({
          id: `exp-payroll-${item.coach.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: `${item.coach.fullName} - ${periodLabel} Teaching Payroll`,
          category: 'Coach Salaries & Payroll',
          amount: item.totalEarned,
          currency: settings.currencySymbol,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'Bank Transfer / ACH',
          recipientOrVendor: item.coach.fullName,
          invoiceRef: `PAY-${item.coach.id.toUpperCase().replace('COACH-', '')}-${startDateStr.substring(0, 7)}`,
          status: 'Paid',
          notes: `Payroll for ${item.sessionsCount} classes taught during ${periodLabel}. Verified from mat check-ins.`,
          coachId: item.coach.id,
        });
      }
    });

    if (newExpensesToLog.length > 0) {
      if (onBatchAddExpenses) {
        onBatchAddExpenses(newExpensesToLog);
      } else {
        newExpensesToLog.forEach((e) => onAddExpense(e));
      }
    }
    setIsSyncPayrollModalOpen(false);
  };

  // Print/Export
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center text-white shadow-md">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Academy Expenses & P&L
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-[11px] font-mono text-stone-300 font-bold">
                {filteredExpenses.length} Records
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Track utilities (water & power), facility rent, maintenance, equipment, and coach salaries.
            </p>
          </div>
        </div>

        {/* TOP ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSyncPayrollModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            title="Import coach teaching compensation from mat attendance into expenses"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Sync Coach Payroll</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
            title="Print or Save Expense Report"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-colors shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log New Expense</span>
          </button>
        </div>
      </div>

      {/* KPI DASHBOARD CARDS: REVENUE vs EXPENSES vs NET PROFIT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Revenue */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Tuition Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono-digits">
            {formatCurrency(totalRevenue, 'JOD')}
          </div>
          <div className="mt-1 text-[11px] text-stone-400 flex items-center justify-between">
            <span>{filteredPayments.length} Student Payments</span>
            <span className="text-emerald-400 font-semibold">{periodLabel}</span>
          </div>
        </div>

        {/* 2. Total Expenses */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono-digits">
            {formatCurrency(totalExpensesAmount, 'JOD')}
          </div>
          <div className="mt-1 text-[11px] text-stone-400 flex items-center justify-between">
            <span>Paid: {formatCurrency(paidExpensesAmount, 'JOD')}</span>
            {pendingExpensesAmount > 0 && (
              <span className="text-amber-400 font-semibold">
                Pending: {formatCurrency(pendingExpensesAmount, 'JOD')}
              </span>
            )}
          </div>
        </div>

        {/* 3. Net Operating Profit */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Net Academy Profit</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                netProfit >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-black font-mono-digits ${
              netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(netProfit, 'JOD')}
          </div>
          <div className="mt-1 text-[11px] text-stone-400 flex items-center justify-between">
            <span>Margin: {profitMarginPercent.toFixed(1)}%</span>
            <span className={netProfit >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {netProfit >= 0 ? 'Profitable' : 'Deficit'}
            </span>
          </div>
        </div>

        {/* 4. Top Cost Driver */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Primary Outflow</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-black text-white truncate">
            {categoryBreakdown[0]?.category.split(' ')[0] || 'Rent'}
          </div>
          <div className="mt-1 text-[11px] text-stone-400 flex items-center justify-between">
            <span>
              {categoryBreakdown[0]
                ? `${formatCurrency(categoryBreakdown[0].total, 'JOD')} (${categoryBreakdown[0].percentage.toFixed(0)}%)`
                : 'No expenses'}
            </span>
            <span className="text-amber-400 font-semibold">{categoryBreakdown.length} Categories</span>
          </div>
        </div>
      </div>

      {/* MONTHLY CALENDAR SELECTOR STRIP (EACH MONTH OF THE YEAR) */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">Monthly Expense Timeline</span>
                <span className="text-xs font-bold text-red-400 bg-red-950/60 border border-red-900/60 px-2 py-0.5 rounded-md">
                  {periodLabel}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                View, record, and manage academy expenses for each specific month of the year
              </p>
            </div>
          </div>

          {/* Year Switcher & Prev/Next Month Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl border border-stone-700 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl border border-stone-700 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 12-Month Selector Buttons with totals & badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {monthlyExpensesSummary.map((item) => {
            const isSelected = selectedMonth === item.monthIndex;
            return (
              <button
                key={item.monthIndex}
                type="button"
                onClick={() => setSelectedMonth(item.monthIndex)}
                className={`p-2 rounded-xl text-center flex flex-col items-center justify-between transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-red-600 text-white border-red-500 shadow-md ring-2 ring-red-500/20'
                    : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:bg-stone-800 hover:border-stone-700'
                }`}
              >
                <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-stone-200'}`}>
                  {item.monthShort}
                </span>
                <span
                  className={`text-[10px] font-mono mt-1 font-semibold ${
                    isSelected ? 'text-red-100' : item.total > 0 ? 'text-amber-400' : 'text-stone-500'
                  }`}
                >
                  {item.total > 0 ? `${item.total} JOD` : '0 JOD'}
                </span>
                {item.count > 0 && (
                  <span
                    className={`mt-1 text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-black/30 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {item.count} items
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View all months shortcut */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSelectedMonth(selectedMonth === 'ALL' ? 8 : 'ALL')}
            className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
              selectedMonth === 'ALL'
                ? 'bg-stone-800 text-red-400 border-red-500/50'
                : 'text-stone-400 hover:text-stone-200 border-stone-800'
            }`}
          >
            {selectedMonth === 'ALL' ? '✓ Showing Full Year (All Months)' : 'Show Full Year Overview'}
          </button>
        </div>
      </div>

      {/* EXPENSE CATEGORY DISTRIBUTION PROGRESS BARS */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-red-500" />
              <span>Expense Allocation Breakdown for {periodLabel}</span>
            </span>
            <span className="text-stone-400">
              Total Outflow: <strong className="text-white">{formatCurrency(totalExpensesAmount, 'JOD')}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryBreakdown.map((item) => (
              <div
                key={item.category}
                onClick={() => setCategoryFilter(categoryFilter === item.category ? 'ALL' : item.category)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  categoryFilter === item.category
                    ? 'bg-stone-850 border-red-500 shadow-sm'
                    : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    {CATEGORY_ICONS[item.category]}
                    <span className="text-xs font-bold text-white truncate">{item.category}</span>
                  </div>
                  <span className="text-xs font-mono font-black text-white shrink-0">
                    {formatCurrency(item.total, 'JOD')}
                  </span>
                </div>

                <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
                  <span>{item.count} entries</span>
                  <span className="font-mono font-bold text-stone-300">{item.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER CONTROLS TOOLBAR */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Secondary Filters: Category & Status */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Expense Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="Paid">Paid Only</option>
              <option value="Pending">Pending / Scheduled</option>
            </select>
          </div>

          {/* Search Query */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              placeholder="Search expenses, vendors, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-stone-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-xs text-stone-400">
          <div>
            Viewing expenses for <strong className="text-white">{periodLabel}</strong>
          </div>
          <div>
            Showing <strong className="text-white">{filteredExpenses.length}</strong> of{' '}
            <strong className="text-stone-300">{expenses.length}</strong> entries
          </div>
        </div>
      </div>

      {/* ITEMIZED EXPENSE LEDGER TABLE */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Itemized Expenses Ledger ({periodLabel})</h3>
            <p className="text-xs text-stone-400">Operational costs, facility bills, equipment & payroll disbursements.</p>
          </div>
          <span className="text-xs font-mono text-stone-400">
            Total Outflow: <strong className="text-amber-400">{formatCurrency(totalExpensesAmount, 'JOD')}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase tracking-wider font-semibold border-b border-stone-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Expense Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vendor / Payee</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-400" />
                    <p className="text-sm font-bold text-stone-400">No expenses recorded for {periodLabel}</p>
                    <p className="text-xs text-stone-600 mt-1">Click "+ Log New Expense" to add what you paid in {periodLabel}.</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-stone-850/60 transition-colors">
                    {/* Date */}
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-300 whitespace-nowrap">
                      {exp.date}
                    </td>

                    {/* Title & Notes */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-xs">{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-stone-400 truncate max-w-xs">{exp.notes}</div>
                      )}
                      {exp.isRecurring && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-cyan-400 mt-0.5">
                          <RefreshCw className="w-2.5 h-2.5" /> Recurring ({exp.recurringInterval})
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[11px] font-medium border border-stone-700">
                        {CATEGORY_ICONS[exp.category]}
                        <span>{exp.category}</span>
                      </div>
                    </td>

                    {/* Vendor / Payee */}
                    <td className="py-3.5 px-4 text-stone-300">
                      <div>{exp.recipientOrVendor || '—'}</div>
                      {exp.invoiceRef && (
                        <div className="text-[10px] font-mono text-stone-500">Ref: {exp.invoiceRef}</div>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 text-stone-400 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-stone-500" />
                        {exp.paymentMethod}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-mono-digits font-black text-sm text-white whitespace-nowrap">
                      {formatCurrency(exp.amount, 'JOD')}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          exp.status === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {exp.status === 'Paid' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{exp.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1.5 bg-stone-800 hover:bg-red-950 hover:text-red-400 text-stone-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUB-MODAL 1: ADD / EDIT EXPENSE */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-800/60 flex items-center justify-center text-red-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">
                  {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Expense Description / Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Electricity & AC Bill - September"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Expense Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Amount ({settings.currencySymbol}) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-stone-400 font-bold">
                      {settings.currencySymbol}
                    </span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={0.5}
                      value={formAmount}
                      onChange={(e) => setFormAmount(Number(e.target.value))}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono-digits font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Payment Method</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Bank Transfer / ACH">Bank Transfer / ACH</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Zelle">Zelle / App Transfer</option>
                    <option value="Other">Other / Cheque</option>
                  </select>
                </div>
              </div>

              {/* Vendor & Invoice Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    placeholder="e.g. Electric Power Co, CleanMat Supplies"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Invoice / Receipt #</label>
                  <input
                    type="text"
                    value={formInvoiceRef}
                    onChange={(e) => setFormInvoiceRef(e.target.value)}
                    placeholder="e.g. INV-2026-881"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Settlement Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Paid', 'Pending', 'Scheduled'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formStatus === st
                          ? st === 'Paid'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-amber-600 text-white border-amber-500'
                          : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Notes / Itemization</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Monthly dojo facility power and hot shower hot water tank heating..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Recurring Switch */}
              <div className="flex items-center justify-between p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                <div>
                  <label className="text-xs font-bold text-white cursor-pointer">Recurring Operational Cost</label>
                  <p className="text-[11px] text-stone-400">Repeats on a regular cycle (e.g. monthly lease or power bill)</p>
                </div>
                <input
                  type="checkbox"
                  checked={formIsRecurring}
                  onChange={(e) => setFormIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded bg-stone-950 border-stone-700 text-red-600 focus:ring-red-500 cursor-pointer"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md cursor-pointer"
                >
                  {editingExpense ? 'Save Changes' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: SYNC COACH PAYROLL TO EXPENSES */}
      {isSyncPayrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Sync Coach Payroll to Expenses</h3>
                  <p className="text-[11px] text-stone-400">Period: {periodLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncPayrollModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-stone-300 leading-relaxed">
                The system calculated coach teaching compensation from verified student attendance check-in logs for{' '}
                <strong className="text-emerald-400">{periodLabel}</strong>:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {calculatedCoachPayroll.map((item) => (
                  <div
                    key={item.coach.id}
                    className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{item.coach.fullName}</div>
                      <div className="text-[11px] text-stone-400">
                        {item.sessionsCount} sessions taught • {item.coach.role}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-400 font-mono-digits">
                        {formatCurrency(item.totalEarned, 'JOD')}
                      </div>
                      <span
                        className={`text-[10px] font-semibold ${
                          item.alreadyLogged ? 'text-stone-500' : 'text-amber-400'
                        }`}
                      >
                        {item.alreadyLogged ? '✓ Already Logged' : '+ Ready to Post'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Automatic Expense Posting</span>
                </div>
                <p className="text-[11px] text-emerald-400/80">
                  Clicking Sync will create itemized expense entries under <strong>"Coach Salaries & Payroll"</strong> so your P&L accurately accounts for instructor payouts.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSyncPayrollModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSyncCoachPayroll}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-colors cursor-pointer"
                >
                  Post Payroll Entries
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-red-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Expense Entry?</h3>
                <p className="text-xs text-stone-400">Remove expense from the academy ledger.</p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950/90 rounded-xl border border-stone-800 space-y-1.5 text-xs">
              <p className="font-bold text-white text-sm">{expenseToDelete.title}</p>
              <p className="text-stone-400">
                Category: <strong className="text-stone-200">{expenseToDelete.category}</strong>
              </p>
              <p className="text-stone-400">
                Amount:{' '}
                <strong className="text-red-400">
                  {formatCurrency(expenseToDelete.amount, 'JOD')}
                </strong>{' '}
                • Date: <strong className="text-stone-200">{expenseToDelete.date}</strong>
              </p>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Are you sure you want to permanently delete this expense? This action will update your Net Profit calculation immediately.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteExpense(expenseToDelete.id);
                  setExpenseToDelete(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
