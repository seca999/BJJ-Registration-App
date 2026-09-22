import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  UserCheck, 
  Check, 
  Search, 
  Filter, 
  Edit3, 
  Plus, 
  Award, 
  AlertCircle, 
  RotateCcw, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles,
  Flame,
  Shield,
  Layers,
  MapPin,
  CalendarCheck2,
  Trash2,
  CreditCard,
  UserPlus,
  ArrowRight,
  X,
  Phone,
  Mail,
  ShieldAlert,
  Lock,
  Info,
  UserX,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Tag
} from 'lucide-react';
import { Member, ClassSession, AttendanceRecord, Coach, ClassCategory } from '../types';
import { BeltBadge, checkStudentClassEligibility, ClassEligibilityCheck } from '../utils/bjjBelts';
import { EditClassModal } from './EditClassModal';

interface ClassCheckInViewProps {
  classes: ClassSession[];
  members: Member[];
  attendance: AttendanceRecord[];
  coaches: Coach[];
  onCheckIn: (
    memberId: string,
    className: string,
    coach: string,
    category?: ClassCategory,
    dateStr?: string
  ) => { success: boolean; message: string; remainingAfter: number };
  onUndoCheckIn: (attendanceId: string) => void;
  onSaveClass: (savedClass: ClassSession) => void;
  onDeleteClass: (classId: string) => void;
  onSelectMember?: (member: Member) => void;
  onOpenPaymentForMember?: (memberId: string) => void;
  onOpenSubscriptionPlans?: () => void;
}

// Sound feedback for check-in using Web Audio API
const TRAINING_DAYS: { full: string; short: string }[] = [
  { full: 'Saturday', short: 'Sat' },
  { full: 'Sunday', short: 'Sun' },
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
];

function playCheckInChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignore audio error
  }
}

// Error buzzer sound for blocked student
function playBlockBuzzer() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ignore audio error
  }
}

export const ClassCheckInView: React.FC<ClassCheckInViewProps> = ({
  classes,
  members,
  attendance,
  coaches,
  onCheckIn,
  onUndoCheckIn,
  onSaveClass,
  onDeleteClass,
  onSelectMember,
  onOpenPaymentForMember,
  onOpenSubscriptionPlans,
}) => {
  // Current date
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Compute day of week from selected date
  const selectedDayInfo = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayIdx = d.getDay();
    return {
      dayIdx,
      dayFull: dayNames[dayIdx],
      dayShort: shortNames[dayIdx],
      isToday: selectedDate === todayStr,
    };
  }, [selectedDate, todayStr]);

  // Day filter tabs
  const [activeDayFilter, setActiveDayFilter] = useState<string>('TODAY');

  // Currently selected class for active check-in
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Search & Filters for adding students
  const [studentSearch, setStudentSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Adults' | 'Teens' | 'Kids'>('ALL');
  const [eligibilityFilter, setEligibilityFilter] = useState<'ALL' | 'ELIGIBLE_ONLY' | 'INELIGIBLE_ONLY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'LOW_BALANCE'>('ALL');

  // Multi-select for batch check-in
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [checkInFeedback, setCheckInFeedback] = useState<{ memberName: string; remaining: number; action?: 'checkin' | 'refund' } | null>(null);

  // Modal for explaining ineligibility reason
  const [ineligibleModalInfo, setIneligibleModalInfo] = useState<{
    studentName: string;
    studentBelt: string;
    studentAgeGroup: string;
    classTitle: string;
    classCategory: string;
    reason: string;
  } | null>(null);

  // Class Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<ClassSession | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassSession | null>(null);

  // Map of classes for the current day
  const classesForDay = useMemo(() => {
    const currentDay = activeDayFilter === 'TODAY' ? selectedDayInfo.dayFull : activeDayFilter;
    if (activeDayFilter === 'ALL') {
      return classes;
    }

    return classes.filter((c) => {
      if (c.daySchedule && Object.keys(c.daySchedule).includes(currentDay)) {
        return true;
      }
      const short = currentDay.substr(0, 3);
      if (c.daysOfWeek && c.daysOfWeek.some((d) => d.toLowerCase().startsWith(short.toLowerCase()))) {
        return true;
      }
      if (c.time && c.time.toLowerCase().includes(short.toLowerCase())) {
        return true;
      }
      return false;
    });
  }, [classes, activeDayFilter, selectedDayInfo]);

  // Set initial selected class if none is selected
  React.useEffect(() => {
    if (!selectedClassId && classesForDay.length > 0) {
      setSelectedClassId(classesForDay[0].id);
    } else if (selectedClassId && !classes.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(classes[0]?.id || null);
    }
  }, [classesForDay, selectedClassId, classes]);

  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classesForDay[0] || null;
  }, [classes, selectedClassId, classesForDay]);

  // Find head coach & assistant coaches details
  const coachingDetails = useMemo(() => {
    if (!selectedClass) return null;

    // Head Coach lookup
    let headCoachObj = coaches.find(c => c.id === selectedClass.headCoachId);
    if (!headCoachObj) {
      headCoachObj = coaches.find(c => selectedClass.coach.toLowerCase().includes(c.fullName.toLowerCase()));
    }

    const headName = selectedClass.headCoachName || headCoachObj?.fullName || selectedClass.coach.replace(' (Head Coach)', '');
    const headRank = selectedClass.headCoachRank || (headCoachObj ? `${headCoachObj.beltRank} Belt` : 'Black Belt');
    const headPhone = selectedClass.headCoachPhone || headCoachObj?.phone || '(555) 299-8801';
    const headEmail = selectedClass.headCoachEmail || headCoachObj?.email || 'coach@artesuave.bjj';
    const headAvatar = headCoachObj?.avatar;

    // Assistant Coaches lookup
    const assistants = (selectedClass.assistantCoaches && selectedClass.assistantCoaches.length > 0)
      ? selectedClass.assistantCoaches
      : (selectedClass.assistantCoachIds || []).map(id => {
          const c = coaches.find(item => item.id === id);
          return c ? {
            id: c.id,
            fullName: c.fullName,
            role: c.role || 'Assistant Coach',
            rank: `${c.beltRank} Belt`,
            phone: c.phone,
            email: c.email,
            avatar: c.avatar
          } : null;
        }).filter(Boolean);

    return {
      headName,
      headRank,
      headPhone,
      headEmail,
      headAvatar,
      assistants: assistants as any[],
    };
  }, [selectedClass, coaches]);

  // Filter attendance records for selectedDate and selectedClass
  const attendeesForClass = useMemo(() => {
    if (!selectedClass) return [];
    return attendance.filter(
      (a) => a.date === selectedDate && a.className.toLowerCase() === selectedClass.title.toLowerCase()
    );
  }, [attendance, selectedDate, selectedClass]);

  const checkedInMemberIds = useMemo(() => {
    return new Set(attendeesForClass.map((a) => a.memberId));
  }, [attendeesForClass]);

  // Filter students for the check-in list
  const filteredStudents = useMemo(() => {
    return members.filter((m) => {
      // Category match
      if (categoryFilter !== 'ALL' && m.ageGroup !== categoryFilter) {
        return false;
      }

      // Check-in status filter
      const isChecked = checkedInMemberIds.has(m.id);
      if (statusFilter === 'NOT_CHECKED_IN' && isChecked) return false;
      if (statusFilter === 'CHECKED_IN' && !isChecked) return false;
      if (statusFilter === 'LOW_BALANCE') {
        const isUnlimited = m.membershipType === 'monthly_unlimited';
        if (isUnlimited || m.classesRemaining > 2) return false;
      }

      // Eligibility filter
      if (selectedClass) {
        const eligibility = checkStudentClassEligibility(m, selectedClass);
        if (eligibilityFilter === 'ELIGIBLE_ONLY' && !eligibility.isEligible) return false;
        if (eligibilityFilter === 'INELIGIBLE_ONLY' && eligibility.isEligible) return false;
      }

      // Search match
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchesName = m.fullName.toLowerCase().includes(q);
        const matchesBelt = m.beltRank.toLowerCase().includes(q);
        const matchesPhone = m.phone.toLowerCase().includes(q);
        if (!matchesName && !matchesBelt && !matchesPhone) return false;
      }

      return true;
    });
  }, [members, categoryFilter, eligibilityFilter, statusFilter, studentSearch, checkedInMemberIds, selectedClass]);

  // Check In Handler with strict eligibility enforcement
  const handleStudentCheckIn = (member: Member) => {
    if (!selectedClass) return;

    // Strict validation
    const eligibility = checkStudentClassEligibility(member, selectedClass);
    if (!eligibility.isEligible) {
      playBlockBuzzer();
      setIneligibleModalInfo({
        studentName: member.fullName,
        studentBelt: member.beltRank,
        studentAgeGroup: member.ageGroup || 'Adults',
        classTitle: selectedClass.title,
        classCategory: selectedClass.category,
        reason: eligibility.reason || 'This student does not meet IBJJF age or belt requirements for this class.',
      });
      return;
    }

    playCheckInChime();
    const res = onCheckIn(
      member.id,
      selectedClass.title,
      selectedClass.coach,
      selectedClass.category,
      selectedDate
    );

    if (res.success) {
      setCheckInFeedback({
        memberName: member.fullName,
        remaining: res.remainingAfter,
      });
      setTimeout(() => setCheckInFeedback(null), 3500);
    }
  };

  // Batch Check In Handler
  const handleBatchCheckIn = () => {
    if (!selectedClass || batchSelectedIds.length === 0) return;

    let checkedCount = 0;
    let blockedCount = 0;

    batchSelectedIds.forEach((id) => {
      const mem = members.find((m) => m.id === id);
      if (mem && !checkedInMemberIds.has(id)) {
        const eligibility = checkStudentClassEligibility(mem, selectedClass);
        if (eligibility.isEligible) {
          onCheckIn(mem.id, selectedClass.title, selectedClass.coach, selectedClass.category, selectedDate);
          checkedCount++;
        } else {
          blockedCount++;
        }
      }
    });

    if (checkedCount > 0) {
      playCheckInChime();
      setBatchSelectedIds([]);
      setCheckInFeedback({
        memberName: `${checkedCount} Students`,
        remaining: 0,
      });
      setTimeout(() => setCheckInFeedback(null), 3500);
    }

    if (blockedCount > 0) {
      alert(`${blockedCount} student(s) could not be checked in due to strict IBJJF age or belt requirements.`);
    }
  };

  // Get specific time for selected day
  const getClassTimeForCurrentDay = (c: ClassSession) => {
    const day = activeDayFilter === 'TODAY' ? selectedDayInfo.dayFull : activeDayFilter;
    if (c.daySchedule && c.daySchedule[day]) {
      return c.daySchedule[day];
    }
    return c.time;
  };

  // Helper for badge color by class type
  const getClassTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('wrestl')) {
      return 'bg-amber-950 text-amber-300 border-amber-800/90';
    }
    if (t.includes('morning')) {
      return 'bg-sky-950 text-sky-300 border-sky-800/90';
    }
    if (t.includes('no-gi')) {
      return 'bg-purple-950 text-purple-300 border-purple-800/90';
    }
    if (t.includes('sparring') || t.includes('comp')) {
      return 'bg-red-950 text-red-300 border-red-800/90';
    }
    if (t.includes('kids')) {
      return 'bg-emerald-950 text-emerald-300 border-emerald-800/90';
    }
    return 'bg-stone-800 text-stone-200 border-stone-700';
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar: Date Selector & Quick Indicators */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-red-500" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Mat Attendance & Class Check-In
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Enforces strict IBJJF age & belt validation. Kids classes admit youth belts only; adults & teens are restricted.
          </p>
        </div>

        {/* Date Selector & Fast Tabs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-300">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-hidden text-xs cursor-pointer"
            />
          </div>

          {/* Quick day filter tabs: Today + All 6 Days (Sat to Thu) + All Days */}
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs flex-wrap">
            {/* Current Day / Today */}
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayStr);
                setActiveDayFilter('TODAY');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all inline-flex items-center gap-1.5 ${
                activeDayFilter === 'TODAY'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
              title={`Switch to current date (${selectedDayInfo.dayFull})`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Today ({selectedDayInfo.dayShort})</span>
            </button>

            {/* Subtle separator */}
            <div className="h-4 w-px bg-stone-800 hidden sm:block mx-0.5" />

            {/* All 6 days from Sat to Thu next to each other */}
            {TRAINING_DAYS.map((day) => {
              const isCurrentDay = selectedDayInfo.dayShort === day.short;
              const isSelected =
                activeDayFilter === day.full || (activeDayFilter === 'TODAY' && isCurrentDay);

              // Calculate how many classes this day has
              const dayClassCount = classes.filter((c) => {
                if (c.daySchedule && Object.keys(c.daySchedule).includes(day.full)) return true;
                if (c.daysOfWeek && c.daysOfWeek.some((d) => d.toLowerCase().startsWith(day.short.toLowerCase()))) return true;
                if (c.time && c.time.toLowerCase().includes(day.short.toLowerCase())) return true;
                return false;
              }).length;

              return (
                <button
                  key={day.short}
                  type="button"
                  onClick={() => setActiveDayFilter(day.full)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-xs font-black'
                      : 'text-stone-300 hover:text-white hover:bg-stone-900'
                  }`}
                  title={`${day.full} • ${dayClassCount} class(es)`}
                >
                  <span>{day.short}</span>
                  {isCurrentDay && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${
                        isSelected ? 'bg-black/30 text-amber-300' : 'bg-red-600/30 text-red-400'
                      }`}
                    >
                      Now
                    </span>
                  )}
                </button>
              );
            })}

            {/* Subtle separator */}
            <div className="h-4 w-px bg-stone-800 hidden sm:block mx-0.5" />

            {/* All Days button */}
            <button
              type="button"
              onClick={() => setActiveDayFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                activeDayFilter === 'ALL'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              All Days ({classes.length})
            </button>
          </div>

          {/* Manage & Edit Classes / Add Class */}
          <button
            type="button"
            onClick={() => {
              setClassToEdit(null);
              setIsEditModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer"
            title="View all editable academy classes, edit schedules & coaches, or add new classes"
          >
            <BookOpen className="w-4 h-4" />
            <span>Manage & Edit Classes / + Add Class</span>
          </button>

          {/* Subscription Plans & Pricing (Kids, Teens, Adults - 8, 12, Unlimited) */}
          {onOpenSubscriptionPlans && (
            <button
              type="button"
              onClick={onOpenSubscriptionPlans}
              className="px-3.5 py-1.5 bg-stone-850 hover:bg-stone-800 text-amber-400 hover:text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer"
              title="Edit 8-class, 12-class, and Unlimited subscription plans for Kids, Teens, and Adults"
            >
              <Tag className="w-4 h-4 text-amber-400" />
              <span>Subscription Plans & Pricing</span>
            </button>
          )}
        </div>
      </div>

      {/* Classes Carousel / Selector */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
              <span>Scheduled Classes</span>
              <span className="px-2 py-0.2 rounded-full text-[11px] bg-stone-800 text-stone-300">
                {classesForDay.length}
              </span>
              <span className="text-xs text-amber-400 font-bold ml-1">
                • {activeDayFilter === 'TODAY' ? `${selectedDayInfo.dayFull} (Today)` : activeDayFilter === 'ALL' ? 'All Days' : activeDayFilter}
              </span>
            </h2>
            <span className="text-xs text-stone-400 hidden sm:inline">
              — Click any class to activate mat check-in, review coaches, or edit staff
            </span>
          </div>

          <span className="text-xs text-stone-400">
            {attendeesForClass.length} checked in for current selection
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {classesForDay.map((c) => {
            const isSelected = selectedClass?.id === c.id;
            const attendeesCount = attendance.filter(
              (a) => a.date === selectedDate && a.className.toLowerCase() === c.title.toLowerCase()
            ).length;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className={`relative rounded-2xl p-4 transition-all cursor-pointer border text-left flex flex-col justify-between ${
                  isSelected
                    ? 'bg-stone-800/90 border-red-500 ring-2 ring-red-500/40 shadow-xl'
                    : 'bg-stone-900/80 hover:bg-stone-800/60 border-stone-800 hover:border-stone-700 shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getClassTypeColor(
                          c.type
                        )}`}
                      >
                        {c.type}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        c.category === 'Kids' 
                          ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                          : c.category === 'Teens'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-700'
                          : 'bg-stone-950 text-stone-300 border-stone-700'
                      }`}>
                        {c.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setClassToEdit(c);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1 text-stone-400 hover:text-white hover:bg-stone-700 rounded-md transition-colors"
                        title="Edit class & coaching staff"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setClassToDelete(c)}
                        className="p-1 text-stone-400 hover:text-red-400 hover:bg-red-950/50 rounded-md transition-colors"
                        title="Delete class from academy"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                    {c.title}
                  </h3>

                  <div className="mt-2 space-y-1 text-xs text-stone-300">
                    <div className="flex items-center gap-1.5 text-stone-400">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-stone-200">
                        {getClassTimeForCurrentDay(c)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-stone-400">
                      <Award className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>Head Coach: <strong className="text-white">{c.headCoachName || c.coach}</strong></span>
                    </div>

                    {c.assistantCoaches && c.assistantCoaches.length > 0 && (
                      <div className="flex items-center gap-1.5 text-stone-400 text-[11px]">
                        <Users className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>Assistants: {c.assistantCoaches.map(a => a.fullName).join(', ')}</span>
                      </div>
                    )}

                    {c.room && (
                      <div className="flex items-center gap-1.5 text-stone-400">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{c.room}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-xs font-bold text-white">
                      {attendeesCount} Students on Mat
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-red-600 text-white'
                        : 'bg-stone-800 text-stone-300 group-hover:bg-stone-700'
                    }`}
                  >
                    <span>{isSelected ? 'Active Session' : 'Select Class'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTIVE CLASS CHECK-IN STATION */}
      {selectedClass ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Active Class Ribbon */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/70 via-stone-900 to-stone-900 border-b border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white uppercase tracking-wider">
                  Active Mat Check-In
                </span>
                <span className="text-xs text-stone-400 font-medium">
                  {selectedDate} ({selectedDayInfo.dayFull})
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {selectedClass.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-stone-300 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{getClassTimeForCurrentDay(selectedClass)}</span>
                </span>
                <span className="text-stone-500">•</span>
                <span>Category: <strong className="text-white">{selectedClass.category}</strong></span>
                {selectedClass.room && (
                  <>
                    <span className="text-stone-500">•</span>
                    <span>{selectedClass.room}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="px-4 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-center">
                <div className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">
                  Mat Roster
                </div>
                <div className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>{attendeesForClass.length}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setClassToEdit(selectedClass);
                  setIsEditModalOpen(true);
                }}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Class & Staff</span>
              </button>
            </div>
          </div>

          {/* DEDICATED COACHING STAFF & CONTACTS BAR */}
          {coachingDetails && (
            <div className="p-4 bg-stone-950/90 border-b border-stone-800">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Head Coach */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-red-950/80 border border-red-700/80 flex items-center justify-center text-red-400 font-black text-base shadow-sm shrink-0">
                    {coachingDetails.headAvatar ? (
                      <img
                        src={coachingDetails.headAvatar}
                        alt={coachingDetails.headName}
                        className="w-full h-full rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      coachingDetails.headName.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-800/80">
                        Lead Head Coach
                      </span>
                      <span className="text-[11px] text-amber-400 font-semibold">
                        {coachingDetails.headRank}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white mt-0.5">
                      {coachingDetails.headName}
                    </h4>
                    {/* Head Coach Contact Info */}
                    <div className="flex items-center gap-2.5 mt-1 text-[11px] text-stone-400 flex-wrap">
                      {coachingDetails.headPhone && (
                        <a
                          href={`tel:${coachingDetails.headPhone}`}
                          className="inline-flex items-center gap-1 text-stone-300 hover:text-emerald-400 transition-colors"
                          title="Call Head Coach"
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{coachingDetails.headPhone}</span>
                        </a>
                      )}
                      {coachingDetails.headEmail && (
                        <a
                          href={`mailto:${coachingDetails.headEmail}`}
                          className="inline-flex items-center gap-1 text-stone-300 hover:text-blue-400 transition-colors"
                          title="Email Head Coach"
                        >
                          <Mail className="w-3 h-3 text-blue-400" />
                          <span>{coachingDetails.headEmail}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assistant Coaches & Contacts */}
                <div className="flex-1 lg:max-w-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Class Assistants ({coachingDetails.assistants.length})</span>
                    </span>
                    <span className="text-[10px] text-stone-500">Contact directly for questions</span>
                  </div>

                  {coachingDetails.assistants.length === 0 ? (
                    <div className="p-2 rounded-lg bg-stone-900/60 border border-dashed border-stone-800 text-[11px] text-stone-500">
                      No assistant coaches assigned to this session yet. Click "Edit Class & Staff" to assign assistants.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {coachingDetails.assistants.map((ast, idx) => (
                        <div
                          key={ast.id || idx}
                          className="p-2 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between gap-2 shadow-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white truncate">{ast.fullName}</span>
                              <span className="text-[10px] text-amber-400 shrink-0">({ast.rank || 'Coach'})</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                              {ast.phone && (
                                <a href={`tel:${ast.phone}`} className="hover:text-emerald-400 flex items-center gap-0.5">
                                  <Phone className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>{ast.phone}</span>
                                </a>
                              )}
                              {ast.email && (
                                <a href={`mailto:${ast.email}`} className="hover:text-blue-400 flex items-center gap-0.5 truncate max-w-[120px]">
                                  <Mail className="w-2.5 h-2.5 text-blue-400" />
                                  <span className="truncate">{ast.email}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* IBJJF DIVISION & SAFETY NOTICE BANNER */}
          <div className={`px-4 py-3 border-b flex items-start gap-3 ${
            selectedClass.category === 'Kids'
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
              : selectedClass.category === 'Teens'
              ? 'bg-blue-950/40 border-blue-800/60 text-blue-200'
              : 'bg-stone-950 border-stone-800 text-stone-300'
          }`}>
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="text-xs leading-relaxed flex-1">
              {selectedClass.category === 'Kids' && (
                <div>
                  <strong className="text-amber-300">Strict IBJJF Youth Rules Enforced:</strong> Kids classes strictly admit youth students (ages 4-15) holding IBJJF Youth Belts (White, Grey, Yellow, Orange, Green). Adults & Teens are strictly barred from check-in. Adult belts (Blue, Purple, Brown, Black) are prohibited.
                </div>
              )}
              {selectedClass.category === 'Teens' && (
                <div>
                  <strong className="text-blue-300">Teens / Juvenile Rules:</strong> Students ages 16-17 holding White, Blue, or Purple belts. Adult and Kids students cannot be checked into this class.
                </div>
              )}
              {selectedClass.category === 'Adults' && (
                <div>
                  <strong className="text-stone-200">Adult Class:</strong> Members 18+ holding adult ranks (White through Black). Youth students are barred from adult full-contact sparring.
                </div>
              )}
              {selectedClass.category === 'All Levels' && (
                <div>
                  <strong className="text-stone-200">Open Mat Session:</strong> Supervised training under designated Head Coach and Assistant Coaches.
                </div>
              )}
            </div>
          </div>

          {/* Feedback banner if checked in or refunded */}
          {checkInFeedback && (
            <div className={`px-4 py-2.5 border-b text-xs sm:text-sm font-semibold flex items-center justify-between animate-fadeIn ${
              checkInFeedback.action === 'refund'
                ? 'bg-blue-950/90 border-blue-800 text-blue-200'
                : checkInFeedback.remaining < 0
                ? 'bg-amber-950/90 border-amber-800 text-amber-200'
                : 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${checkInFeedback.action === 'refund' ? 'text-blue-400' : checkInFeedback.remaining < 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span>
                  {checkInFeedback.action === 'refund' ? (
                    <span>
                      <strong>{checkInFeedback.memberName}</strong> was removed from {selectedClass.title} roster — <strong>1 class returned to balance</strong>!
                    </span>
                  ) : (
                    <span>
                      <strong>{checkInFeedback.memberName}</strong> was added to roster (consumed 1 class)!
                      {checkInFeedback.remaining < 0 && (
                        <span className="ml-1.5 font-bold text-amber-300">
                          (Class Debt: {Math.abs(checkInFeedback.remaining)} class{Math.abs(checkInFeedback.remaining) > 1 ? 'es' : ''} — will be deducted upon renewal)
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </div>
              <span className="text-xs font-bold">
                {checkInFeedback.remaining < 0 ? (
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                    Debt: {Math.abs(checkInFeedback.remaining)}
                  </span>
                ) : checkInFeedback.remaining >= 0 ? (
                  <span className={checkInFeedback.action === 'refund' ? 'text-blue-300' : 'text-emerald-300'}>
                    {checkInFeedback.remaining} classes remaining
                  </span>
                ) : (
                  <span className="text-blue-300">Unlimited</span>
                )}
              </span>
            </div>
          )}

          {/* Dual Panel: Left = Student Directory to Check In; Right = Current Mat Roster */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-800">
            {/* LEFT COLUMN: Add Students to Class (8 cols on lg) */}
            <div className="lg:col-span-7 xl:col-span-8 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-red-400" />
                    <span>Add Students to This Class</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    System verifies that student age and belt match {selectedClass.category} requirements
                  </p>
                </div>

                {/* Batch Action Button */}
                {batchSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchCheckIn}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md animate-pulse"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Check In Selected ({batchSelectedIds.length})</span>
                  </button>
                )}
              </div>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Search Bar */}
                <div className="sm:col-span-6 relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by student name, belt, or phone..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-red-500"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <div className="sm:col-span-3">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-300 focus:outline-hidden focus:border-red-500"
                  >
                    <option value="ALL">All Divisions</option>
                    <option value="Kids">Kids (Youth Belts)</option>
                    <option value="Teens">Teens (16-17)</option>
                    <option value="Adults">Adults (18+)</option>
                  </select>
                </div>

                {/* Eligibility Filter Dropdown */}
                <div className="sm:col-span-3">
                  <select
                    value={eligibilityFilter}
                    onChange={(e) => setEligibilityFilter(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-hidden focus:border-red-500"
                  >
                    <option value="ALL">All Students</option>
                    <option value="ELIGIBLE_ONLY">✓ Eligible Only</option>
                    <option value="INELIGIBLE_ONLY">⚠️ Ineligible Only</option>
                  </select>
                </div>
              </div>

              {/* Status Quick Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-stone-400 text-[11px] font-medium mr-1">Status:</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'ALL'
                      ? 'bg-stone-700 text-white'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  All ({filteredStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('NOT_CHECKED_IN')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'NOT_CHECKED_IN'
                      ? 'bg-red-900/60 text-red-200 border border-red-700'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Not Checked In
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('CHECKED_IN')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'CHECKED_IN'
                      ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Checked In ({attendeesForClass.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('LOW_BALANCE')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'LOW_BALANCE'
                      ? 'bg-stone-700 text-white'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Low Remaining (&le; 2)
                </button>
              </div>

              {/* Students List */}
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center bg-stone-950/60 rounded-xl border border-stone-800 text-stone-400 text-xs">
                    No students matching your filter criteria.
                  </div>
                ) : (
                  filteredStudents.map((m) => {
                    const isCheckedIn = checkedInMemberIds.has(m.id);
                    const isUnlimited = m.membershipType === 'monthly_unlimited';
                    const isDebt = !isUnlimited && m.classesRemaining < 0;
                    const isZero = !isUnlimited && m.classesRemaining === 0;
                    const isLow = !isUnlimited && m.classesRemaining > 0 && m.classesRemaining <= 2;
                    const isSelectedInBatch = batchSelectedIds.includes(m.id);

                    // Check eligibility against the active class
                    const eligibility: ClassEligibilityCheck = selectedClass 
                      ? checkStudentClassEligibility(m, selectedClass)
                      : { isEligible: true };

                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCheckedIn
                            ? 'bg-emerald-950/20 border-emerald-800/50'
                            : !eligibility.isEligible
                            ? 'bg-red-950/15 border-red-900/60'
                            : isDebt
                            ? 'bg-red-950/25 border-red-800/70'
                            : isZero
                            ? 'bg-amber-950/20 border-amber-800/60'
                            : 'bg-stone-950/80 hover:bg-stone-950 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Checkbox for batch: disabled if ineligible */}
                          {!isCheckedIn && (
                            <input
                              type="checkbox"
                              disabled={!eligibility.isEligible}
                              checked={isSelectedInBatch}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBatchSelectedIds([...batchSelectedIds, m.id]);
                                } else {
                                  setBatchSelectedIds(batchSelectedIds.filter((id) => id !== m.id));
                                }
                              }}
                              className={`rounded border-stone-700 mt-1 w-4 h-4 ${
                                eligibility.isEligible 
                                  ? 'text-red-600 focus:ring-0 cursor-pointer' 
                                  : 'opacity-40 cursor-not-allowed'
                              }`}
                              title={eligibility.isEligible ? 'Select for batch check-in' : eligibility.reason}
                            />
                          )}

                          {/* Student Avatar */}
                          <div 
                            className="shrink-0 cursor-pointer mt-0.5"
                            onClick={() => onSelectMember && onSelectMember(m)}
                            title="View student profile"
                          >
                            {m.avatar ? (
                              <img
                                src={m.avatar}
                                alt={m.fullName}
                                className="w-10 h-10 rounded-full object-cover border border-stone-700 shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-stone-800 text-amber-400 font-bold text-xs flex items-center justify-center border border-stone-700 shadow-xs">
                                {m.fullName.charAt(0)}
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span 
                                onClick={() => onSelectMember && onSelectMember(m)}
                                className="font-bold text-white text-xs sm:text-sm truncate cursor-pointer hover:text-red-400 transition-colors"
                              >
                                {m.fullName}
                              </span>
                              <button
                                type="button"
                                onClick={() => onSelectMember && onSelectMember(m)}
                                className="text-stone-400 hover:text-blue-400 transition-colors p-0.5"
                                title="Edit student details & emergency contact"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              
                              {/* Age group badge */}
                              {m.ageGroup && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  m.ageGroup === 'Kids' 
                                    ? 'bg-amber-950/70 text-amber-300 border-amber-800' 
                                    : m.ageGroup === 'Teens'
                                    ? 'bg-blue-950/70 text-blue-300 border-blue-800'
                                    : 'bg-stone-800 text-stone-300 border-stone-700'
                                }`}>
                                  {m.ageGroup}
                                </span>
                              )}

                              {/* Ineligibility indicator */}
                              {!eligibility.isEligible && (
                                <span 
                                  onClick={() => setIneligibleModalInfo({
                                    studentName: m.fullName,
                                    studentBelt: m.beltRank,
                                    studentAgeGroup: m.ageGroup || 'Adults',
                                    classTitle: selectedClass?.title || '',
                                    classCategory: selectedClass?.category || '',
                                    reason: eligibility.reason || '',
                                  })}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 cursor-pointer inline-flex items-center gap-1"
                                  title="Click to view IBJJF safety reason"
                                >
                                  <Lock className="w-2.5 h-2.5 text-red-400" />
                                  <span>{eligibility.badgeText || 'Ineligible for Class'}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <BeltBadge belt={m.beltRank} stripes={m.stripes} size="sm" />
                              
                              {/* Balance badge */}
                              {isUnlimited ? (
                                <span className="text-[10px] text-emerald-400 font-semibold">
                                  Unlimited
                                </span>
                              ) : isDebt ? (
                                <span className="text-[10px] text-red-300 font-bold bg-red-950 px-2 py-0.5 rounded border border-red-700 inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-red-400" />
                                  <span>Debt: {Math.abs(m.classesRemaining)} class{Math.abs(m.classesRemaining) > 1 ? 'es' : ''} (Deducted on renewal)</span>
                                </span>
                              ) : isZero ? (
                                <span className="text-[10px] text-amber-300 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-700/80">
                                  0 Classes (Will record debt)
                                </span>
                              ) : isLow ? (
                                <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/80">
                                  {m.classesRemaining} left
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400 font-medium">
                                  {m.classesRemaining} classes left
                                </span>
                              )}

                              {m.emergencyContact?.name && (
                                <span
                                  className="text-[10px] text-stone-400 truncate hidden md:inline"
                                  title={`Emergency Contact: ${m.emergencyContact.name} (${m.emergencyContact.phone}) - ${m.emergencyContact.relation || 'Emergency Contact'}`}
                                >
                                  • ICE: <span className="text-stone-300">{m.emergencyContact.name}</span>{' '}
                                  <span className="text-amber-400 font-semibold">({m.emergencyContact.relation || 'Contact'})</span>
                                </span>
                              )}
                            </div>

                            {/* Ineligible explanation text right on the card */}
                            {!eligibility.isEligible && (
                              <p className="text-[11px] text-red-400/90 mt-1 leading-snug flex items-start gap-1 font-medium">
                                <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                                <span>{eligibility.reason}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                          {isCheckedIn ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold rounded-lg inline-flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Checked In</span>
                              </span>
                              
                              {/* Undo checkin button */}
                              {(() => {
                                const record = attendeesForClass.find((a) => a.memberId === m.id);
                                if (record) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => onUndoCheckIn(record.id)}
                                      className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded transition-colors"
                                      title="Cancel attendance / Undo check-in"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : !eligibility.isEligible ? (
                            <button
                              type="button"
                              onClick={() => setIneligibleModalInfo({
                                studentName: m.fullName,
                                studentBelt: m.beltRank,
                                studentAgeGroup: m.ageGroup || 'Adults',
                                classTitle: selectedClass?.title || '',
                                classCategory: selectedClass?.category || '',
                                reason: eligibility.reason || '',
                              })}
                              className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-800/80 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              title={eligibility.reason}
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                              <span>Blocked (IBJJF)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStudentCheckIn(m)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm ${
                                isDebt || isZero
                                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-black'
                                  : 'bg-red-600 hover:bg-red-500 text-white'
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{isDebt || isZero ? '+ Check In (Debt)' : '+ Check In'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Current Attendees on the Mat (4 cols on lg) */}
            <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-5 bg-stone-950/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Current Mat Roster</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Students checked in to this session
                  </p>
                </div>

                <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-black">
                  {attendeesForClass.length} on mat
                </span>
              </div>

              {attendeesForClass.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-stone-800 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-stone-500 mx-auto mb-2">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-stone-300">No students checked in yet</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Use the list on the left to add eligible students to this class.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                  {attendeesForClass.map((a, idx) => {
                    const student = members.find((m) => m.id === a.memberId);
                    return (
                      <div
                        key={a.id}
                        className="p-2.5 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between gap-2 shadow-xs group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] text-stone-500 font-bold w-4 text-right">
                            #{idx + 1}
                          </span>

                          {/* Avatar */}
                          {student?.avatar ? (
                            <img
                              src={student.avatar}
                              alt={a.memberName}
                              className="w-8 h-8 rounded-full object-cover border border-stone-700 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 font-bold text-xs flex items-center justify-center border border-stone-700 shrink-0">
                              {a.memberName.charAt(0)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <span 
                              onClick={() => student && onSelectMember && onSelectMember(student)}
                              className="font-bold text-white text-xs block truncate cursor-pointer hover:text-red-400"
                            >
                              {a.memberName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <BeltBadge belt={a.beltRank} stripes={a.stripes} size="sm" />
                              <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {a.time}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onUndoCheckIn(a.id);
                              const currentBalance = student ? student.classesRemaining : 0;
                              const refundedBalance = currentBalance === -1 ? -1 : currentBalance + 1;
                              setCheckInFeedback({
                                memberName: a.memberName,
                                remaining: refundedBalance,
                                action: 'refund',
                              });
                            }}
                            className="px-2 py-1 text-stone-400 hover:text-red-300 hover:bg-stone-800 rounded transition-colors inline-flex items-center gap-1 text-[11px]"
                            title="Remove student from roster and refund 1 class to balance"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-stone-400 hover:text-red-400" />
                            <span className="hidden sm:inline text-[10px] font-semibold text-stone-400">Remove & Refund</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* IBJJF INELIGIBILITY EXPLANATION MODAL */}
      {ineligibleModalInfo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-red-800/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-stone-100 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-950 border border-red-700 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    IBJJF Class Safety Restriction
                  </h3>
                  <p className="text-xs text-red-400 font-semibold">
                    Registration & Check-In Blocked
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIneligibleModalInfo(null)}
                className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-stone-400 border-b border-stone-800/80 pb-2">
                <span>Student:</span>
                <strong className="text-white text-sm">{ineligibleModalInfo.studentName}</strong>
              </div>
              <div className="flex items-center justify-between text-stone-400 border-b border-stone-800/80 pb-2">
                <span>Rank & Division:</span>
                <span className="text-amber-400 font-bold">{ineligibleModalInfo.studentBelt} Belt ({ineligibleModalInfo.studentAgeGroup})</span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>Attempted Class:</span>
                <strong className="text-white">{ineligibleModalInfo.classTitle} ({ineligibleModalInfo.classCategory})</strong>
              </div>
            </div>

            <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-200 leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Why this student cannot attend:</span>
              </div>
              <p>{ineligibleModalInfo.reason}</p>
            </div>

            <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-[11px] text-stone-400 space-y-1">
              <span className="font-bold text-stone-300 block">IBJJF Regulatory Standard:</span>
              <p>
                • <strong>Kids (Ages 4-15):</strong> Only permitted to hold Youth Belts (White, Grey, Yellow, Orange, Green). Adults & Teens are not permitted in Kids classes for physical safety and child development.
              </p>
              <p>
                • <strong>Adult Belts (Blue, Purple, Brown, Black):</strong> Min age 16 for Blue/Purple, 18 for Brown, 19 for Black. Adult ranks can never be mixed into Kids divisions.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIneligibleModalInfo(null)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Bypasses iframe window.confirm restriction) */}
      {classToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-red-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Academy Class?</h3>
                <p className="text-xs text-stone-400">This class will be permanently removed.</p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950/90 rounded-xl border border-stone-800 space-y-1.5 text-xs">
              <p className="font-black text-white text-sm">{classToDelete.title}</p>
              <div className="flex items-center gap-2 text-stone-400">
                <span>Category: <strong className="text-stone-200">{classToDelete.category}</strong></span>
                <span>•</span>
                <span>Type: <strong className="text-stone-200">{classToDelete.type}</strong></span>
              </div>
              <p className="text-stone-400">
                Head Coach: <strong className="text-stone-200">{classToDelete.headCoachName || classToDelete.coach}</strong>
              </p>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Deleting this class will remove it from <strong>Mat Attendance</strong> and clear scheduled slots on the <strong>Matboard</strong>.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClass(classToDelete.id);
                  setClassToDelete(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Manage Classes Modal */}
      <EditClassModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setClassToEdit(null);
        }}
        classes={classes}
        classSession={classToEdit}
        coaches={coaches}
        onSaveClass={onSaveClass}
        onDeleteClass={onDeleteClass}
      />
    </div>
  );
};
