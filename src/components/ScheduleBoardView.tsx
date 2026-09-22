import React, { useState, useRef } from 'react';
import {
  CalendarDays,
  Plus,
  Edit3,
  Trash2,
  Printer,
  RotateCcw,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  Image as ImageIcon,
  FileDown,
  Clock,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  User,
  Search,
  Filter,
  Flame,
  Shield,
  BookOpen
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { EditClassModal } from './EditClassModal';
import { MouseTimeRangePicker } from './MouseTimeRangePicker';
import { ACADEMY_TIMETABLE_PRESETS, parseTimeToMinutes, parseTimeRange } from '../utils/timeUtils';
import {
  TimetableConfig,
  TimetableCell,
  TimetableSlot,
  TimetableDay,
  TimetableMat,
  ClassCategory,
  GymSettings,
  ClassSession,
  Coach
} from '../types';
import { DEFAULT_TIMETABLE_CONFIG } from '../data/timetableData';

interface ScheduleBoardViewProps {
  config: TimetableConfig;
  gymSettings: GymSettings;
  classes?: ClassSession[];
  coaches?: Coach[];
  theme?: 'dark' | 'light';
  onUpdateConfig: (updated: TimetableConfig) => void;
  onSyncWithLiveClasses?: () => void;
  onSaveClass?: (savedClass: ClassSession) => void;
  onDeleteClass?: (classId: string) => void;
}

// Full day display names
const DAY_LABELS: Record<TimetableDay, { full: string; short: string }> = {
  SAT: { full: 'Saturday', short: 'SAT' },
  SUN: { full: 'Sunday', short: 'SUN' },
  MON: { full: 'Monday', short: 'MON' },
  TUE: { full: 'Tuesday', short: 'TUE' },
  WED: { full: 'Wednesday', short: 'WED' },
  THU: { full: 'Thursday', short: 'THU' },
  FRI: { full: 'Friday', short: 'FRI' },
};

// Standard time range options for quick slot assignment
const STANDARD_TIME_BLOCKS = [
  '7:00 - 8:00 AM',
  '11:00 AM - 12:15 PM',
  '1:00 - 2:00 PM',
  '2:00 - 3:00 PM',
  '4:20 - 5:20 PM',
  '5:30 - 6:30 PM',
  '6:30 - 7:30 PM',
  '7:30 - 9:00 PM',
  '9:00 - 10:00 PM',
];

export const ScheduleBoardView: React.FC<ScheduleBoardViewProps> = ({
  config,
  gymSettings,
  classes = [],
  coaches = [],
  theme = 'dark',
  onUpdateConfig,
  onSaveClass,
  onDeleteClass,
}) => {
  // Day Filter / View: 'ALL' for multi-day grid or specific day (e.g. 'MON') to only see classes for that day
  const [selectedDayView, setSelectedDayView] = useState<'ALL' | TimetableDay>('ALL');

  // State for Assigning a Class to a Timeslot via Dropdown
  const [assignDropdownCell, setAssignDropdownCell] = useState<{
    slotId: string;
    day: TimetableDay;
  } | null>(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [assignCategoryFilter, setAssignCategoryFilter] = useState<'ALL' | ClassCategory>('ALL');
  const [isManageClassesOpen, setIsManageClassesOpen] = useState(false);

  // State for editing time slot row (time range / mat)
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<TimetableSlot | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [slotTimeRange, setSlotTimeRange] = useState('');
  const [slotMatId, setSlotMatId] = useState('');

  // State for editing mats
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [matsList, setMatsList] = useState<TimetableMat[]>(config.mats);

  // Export states
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reference to printable / exportable grid container
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Helpers
  const getCell = (slotId: string, day: TimetableDay): TimetableCell | undefined => {
    return config.cells.find((c) => c.slotId === slotId && c.day === day);
  };

  const getSlot = (slotId: string): TimetableSlot | undefined => {
    return config.slots.find((s) => s.id === slotId);
  };

  const getMat = (matId: string): TimetableMat | undefined => {
    return config.mats.find((m) => m.id === matId) || config.mats[0];
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to detect if there is a midday unoccupied blank gap between slots (e.g. 9 AM - 4 PM)
  const getMiddayGap = (prevRange?: string, currRange?: string) => {
    if (!prevRange || !currRange) return null;
    const { end: prevEnd } = parseTimeRange(prevRange);
    const { start: currStart } = parseTimeRange(currRange);
    const prevEndMins = parseTimeToMinutes(prevEnd);
    const currStartMins = parseTimeToMinutes(currStart);

    // If previous slot ends before or around noon (<= 12:30 PM) and next slot starts at/after 3:30 PM with gap >= 120 mins
    if (prevEndMins <= 750 && currStartMins >= 960 && currStartMins - prevEndMins >= 120) {
      return {
        gapLabel: `Gym Unoccupied / Blank Midday (${prevEnd} - ${currStart})`,
        start: prevEnd,
        end: currStart,
      };
    }
    return null;
  };

  // Count scheduled classes for a specific day
  const getDayClassesCount = (day: TimetableDay): number => {
    return config.cells.filter((c) => c.day === day && c.title.trim().length > 0).length;
  };

  // Open the Assign Class Dropdown Picker for a slot & day
  const handleOpenAssignDropdown = (slotId: string, day: TimetableDay) => {
    setAssignDropdownCell({ slotId, day });
    setAssignSearchQuery('');
    setAssignCategoryFilter('ALL');
  };

  // Close the Assign Class Dropdown Picker
  const handleCloseAssignDropdown = () => {
    setAssignDropdownCell(null);
    setAssignSearchQuery('');
    setAssignCategoryFilter('ALL');
  };

  // Instantly assign an existing class or preset to the selected timeslot cell
  const handleAssignDirect = (assigned: {
    title: string;
    subtitle?: string;
    instructor?: string;
    category?: ClassCategory;
    matId?: string;
  }) => {
    if (!assignDropdownCell) return;
    const { slotId, day } = assignDropdownCell;
    const slot = getSlot(slotId);
    const targetMatId = assigned.matId || slot?.matId || config.mats[0]?.id || 'mat-1';

    let newCells: TimetableCell[] = [];
    const existing = getCell(slotId, day);

    if (existing) {
      newCells = config.cells.map((c) =>
        c.slotId === slotId && c.day === day
          ? {
              ...c,
              title: assigned.title,
              subtitle: assigned.subtitle,
              instructor: assigned.instructor || c.instructor || gymSettings.defaultCoach,
              matId: targetMatId,
              category: assigned.category || 'Adults',
            }
          : c
      );
    } else {
      const newCell: TimetableCell = {
        id: `cell-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        slotId,
        day,
        title: assigned.title,
        subtitle: assigned.subtitle,
        instructor: assigned.instructor || gymSettings.defaultCoach || 'Professor Lucas Silva',
        matId: targetMatId,
        category: assigned.category || 'Adults',
      };
      newCells = [...config.cells, newCell];
    }

    onUpdateConfig({
      ...config,
      cells: newCells,
    });

    handleCloseAssignDropdown();
    showToast(`Assigned "${assigned.title}" to ${day} slot`);
  };

  // Clear Slot (Unassign / Empty Mat)
  const handleClearCell = () => {
    if (!assignDropdownCell) return;
    const { slotId, day } = assignDropdownCell;
    const newCells = config.cells.filter(
      (c) => !(c.slotId === slotId && c.day === day)
    );
    onUpdateConfig({
      ...config,
      cells: newCells,
    });
    handleCloseAssignDropdown();
    showToast(`Slot cleared on ${day}`);
  };

  // Open Time Slot Modal for Add or Edit
  const handleOpenAddSlot = (defaultTime?: string) => {
    setEditingSlot(null);
    setSlotTimeRange(defaultTime || '04:00 PM - 05:15 PM');
    setSlotMatId(config.mats[0]?.id || 'mat-1');
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setSlotTimeRange(slot.timeRange);
    setSlotMatId(slot.matId);
    setIsSlotModalOpen(true);
  };

  // Save Time Slot (Add or Update)
  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotTimeRange.trim()) return;

    if (editingSlot) {
      // Update existing slot
      const newSlots = config.slots.map((s) =>
        s.id === editingSlot.id
          ? { ...s, timeRange: slotTimeRange.trim(), matId: slotMatId }
          : s
      );
      onUpdateConfig({
        ...config,
        slots: newSlots,
      });
      showToast('Time slot updated');
    } else {
      // Create new slot
      const newSlot: TimetableSlot = {
        id: `slot-${Date.now()}`,
        timeRange: slotTimeRange.trim(),
        matId: slotMatId,
      };
      onUpdateConfig({
        ...config,
        slots: [...config.slots, newSlot],
      });
      showToast('New time slot added');
    }

    setIsSlotModalOpen(false);
  };

  // Delete Time Slot Trigger
  const handleDeleteSlot = (slotId: string) => {
    const slot = getSlot(slotId);
    if (slot) {
      setSlotToDelete(slot);
    }
  };

  // Perform Slot Deletion
  const confirmDeleteSlot = () => {
    if (!slotToDelete) return;
    const slotId = slotToDelete.id;
    const newSlots = config.slots.filter((s) => s.id !== slotId);
    const newCells = config.cells.filter((c) => c.slotId !== slotId);

    onUpdateConfig({
      ...config,
      slots: newSlots,
      cells: newCells,
    });
    setSlotToDelete(null);
    setIsSlotModalOpen(false);
    showToast('Time slot removed');
  };

  // Move Time Slot Row Up or Down
  const handleMoveSlot = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.slots.length) return;

    const newSlots = [...config.slots];
    const temp = newSlots[index];
    newSlots[index] = newSlots[targetIndex];
    newSlots[targetIndex] = temp;

    onUpdateConfig({
      ...config,
      slots: newSlots,
    });
  };

  // Apply Timetable Preset Layout (e.g. Morning & Evening Split, Gym Closed 9am - 4pm)
  const handleApplyTimetablePreset = (presetKey: string) => {
    const preset = ACADEMY_TIMETABLE_PRESETS.find((p) => p.id === presetKey);
    if (!preset) return;

    // Build new slots
    const newSlots: TimetableSlot[] = preset.slots.map((s, idx) => ({
      id: `slot-preset-${idx + 1}-${Date.now()}`,
      timeRange: s.timeRange,
      matId: config.mats[0]?.id || 'mat-1',
    }));

    onUpdateConfig({
      ...config,
      slots: newSlots,
    });
    setIsPresetsModalOpen(false);
    showToast(`Applied "${preset.name}" schedule layout!`);
  };

  // Quick remove empty unoccupied slots
  const handleClearEmptySlots = () => {
    const occupiedSlotIds = new Set(
      config.cells.filter((c) => c.title && c.title.trim().length > 0).map((c) => c.slotId)
    );
    const newSlots = config.slots.filter((s) => occupiedSlotIds.has(s.id));
    if (newSlots.length === 0) {
      showToast('Cannot clear: all slots would be deleted');
      return;
    }
    onUpdateConfig({
      ...config,
      slots: newSlots,
    });
    showToast(`Removed unoccupied empty rows (${config.slots.length - newSlots.length} removed)`);
  };

  // Toggle Friday in timetable days
  const handleToggleFriday = () => {
    const hasFriday = config.days.includes('FRI');
    let newDays: TimetableDay[];
    if (hasFriday) {
      newDays = config.days.filter((d) => d !== 'FRI');
      if (selectedDayView === 'FRI') setSelectedDayView('ALL');
      showToast('Friday removed from matboard');
    } else {
      newDays = [...config.days, 'FRI'];
      showToast('Friday included in matboard');
    }
    onUpdateConfig({
      ...config,
      days: newDays,
    });
  };

  // Save Mat Colors & Names
  const handleSaveMats = () => {
    onUpdateConfig({
      ...config,
      mats: matsList,
    });
    setIsMatModalOpen(false);
    showToast('Mat settings updated');
  };

  // Reset to default sample timetable trigger
  const handleResetToDefaults = () => {
    setIsConfirmingReset(true);
  };

  // Perform Reset to defaults
  const confirmResetDefaults = () => {
    onUpdateConfig(DEFAULT_TIMETABLE_CONFIG);
    setMatsList(DEFAULT_TIMETABLE_CONFIG.mats);
    setSelectedDayView('ALL');
    setIsConfirmingReset(false);
    showToast('Matboard reset to default schedule');
  };

  // Extract as PNG
  const handleExtractPNG = async () => {
    if (!gridContainerRef.current) return;
    setIsExportingPng(true);

    try {
      const element = gridContainerRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // 2x high resolution
        useCORS: true,
        backgroundColor: theme === 'light' ? '#ffffff' : '#0c0a09',
        logging: false,
        ignoreElements: (el) => el.getAttribute('data-export-ignore') === 'true',
      });

      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadLink.download = `matboard-${selectedDayView.toLowerCase()}-${dateStr}.png`;
      downloadLink.href = dataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast('Matboard successfully extracted as PNG!');
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Could not export PNG image. Please try again.');
    } finally {
      setIsExportingPng(false);
    }
  };

  // Extract as PDF
  const handleExtractPDF = async () => {
    if (!gridContainerRef.current) return;
    setIsExportingPdf(true);

    try {
      const element = gridContainerRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // 2x high-resolution capture
        useCORS: true,
        backgroundColor: theme === 'light' ? '#ffffff' : '#0c0a09',
        logging: false,
        ignoreElements: (el) => el.getAttribute('data-export-ignore') === 'true',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const isLandscape = imgWidth >= imgHeight;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      const scaleRatio = Math.min(
        availableWidth / (imgWidth / 2),
        availableHeight / (imgHeight / 2)
      );

      const renderWidth = (imgWidth / 2) * scaleRatio;
      const renderHeight = (imgHeight / 2) * scaleRatio;

      const xOffset = margin + (availableWidth - renderWidth) / 2;
      const yOffset = margin + (availableHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`matboard-${selectedDayView.toLowerCase()}-${dateStr}.pdf`);

      showToast('Matboard successfully extracted as PDF!');
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Could not export PDF document. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Category Badge Helper with vivid styling
  const renderCategoryBadge = (category?: ClassCategory) => {
    switch (category) {
      case 'Kids':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-600/70 shadow-xs">
            Kids
          </span>
        );
      case 'Teens':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-600/70 shadow-xs">
            Teens
          </span>
        );
      case 'Adults':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-stone-900/90 text-amber-300 border border-amber-600/60 shadow-xs">
            Adults
          </span>
        );
    }
  };

  // Filtered live classes for the assign dropdown - ONLY registered academy classes
  const filteredLiveClasses = classes.filter((c) => {
    if (assignCategoryFilter !== 'ALL' && c.category !== assignCategoryFilter) return false;
    if (!assignSearchQuery) return true;
    const q = assignSearchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.coach && c.coach.toLowerCase().includes(q)) ||
      (c.headCoachName && c.headCoachName.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.type && c.type.toLowerCase().includes(q)) ||
      (c.room && c.room.toLowerCase().includes(q)) ||
      (c.daysOfWeek && c.daysOfWeek.some((d) => d.toLowerCase().includes(q)))
    );
  });

  // Calculate day index navigation in single day view
  const currentDayIndex = config.days.indexOf(selectedDayView as TimetableDay);
  const prevDay = currentDayIndex > 0 ? config.days[currentDayIndex - 1] : null;
  const nextDay =
    currentDayIndex >= 0 && currentDayIndex < config.days.length - 1
      ? config.days[currentDayIndex + 1]
      : null;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl border border-amber-500/50 shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Controls Bar: Day Tabs, Export Options & Actions */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-4">
        {/* Row 1: Header Title & Export Tools */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Matboard</span>
                  {selectedDayView !== 'ALL' && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-widest font-black">
                      {DAY_LABELS[selectedDayView].full} Only
                    </span>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
                  Interactive schedule of training mats and day sessions. Click any day to focus or select any slot to assign a class.
                </p>
              </div>
            </div>
          </div>

          {/* Export Actions & Row Management */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsPresetsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Quick timetable layouts: Morning & Evening split, closed midday, or custom hours"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Timetable Hours & Presets</span>
            </button>

            <button
              onClick={handleExtractPNG}
              disabled={isExportingPng}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-white border border-stone-700 hover:border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              title="Download clean high-resolution PNG image of the matboard"
            >
              {isExportingPng ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <ImageIcon className="w-4 h-4 text-amber-400" />
              )}
              <span>Extract PNG</span>
            </button>

            <button
              onClick={handleExtractPDF}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-white border border-stone-700 hover:border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              title="Export formatted printable A4 PDF schedule"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
              ) : (
                <FileDown className="w-4 h-4 text-red-400" />
              )}
              <span>Extract PDF</span>
            </button>

            <button
              onClick={() => handleOpenAddSlot('04:00 PM - 05:15 PM')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-sm cursor-pointer"
              title="Add a new time slot row using mouse time picker"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Time Slot</span>
            </button>

            <div className="flex items-center gap-1 border-l border-stone-800 pl-2">
              <button
                onClick={() => setIsMatModalOpen(true)}
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                title="Configure Mat Names & Colors"
              >
                <Sliders className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleFriday}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
                  config.days.includes('FRI')
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
                }`}
                title="Toggle Friday column on/off"
              >
                Fri {config.days.includes('FRI') ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={handleResetToDefaults}
                className="p-2 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                title="Reset to default academy mat schedule"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Days Navigation Tabs (Press on each day to only see classes for that day) */}
        <div className="border-t border-stone-800 pt-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {/* All Days Overview Tab */}
              <button
                type="button"
                onClick={() => setSelectedDayView('ALL')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                  selectedDayView === 'ALL'
                    ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold scale-[1.02]'
                    : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Days (Full Grid)</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  selectedDayView === 'ALL' ? 'bg-stone-950 text-amber-400' : 'bg-stone-700 text-stone-300'
                }`}>
                  {config.cells.filter(c => c.title.trim()).length}
                </span>
              </button>

              {/* Individual Day Buttons: Press to view classes for that day only */}
              {config.days.map((day) => {
                const count = getDayClassesCount(day);
                const isSelected = selectedDayView === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayView(day)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-500 shadow-md scale-[1.02]'
                        : 'bg-stone-800/60 hover:bg-stone-800 text-stone-300 hover:text-white border-stone-700/50'
                    }`}
                    title={`Click to view only ${DAY_LABELS[day].full}'s classes`}
                  >
                    <span>{day}</span>
                    <span className="text-[10px] opacity-75">({DAY_LABELS[day].full.slice(0, 3)})</span>
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isSelected ? 'bg-black/30 text-white' : 'bg-stone-700 text-amber-300'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick helper tag */}
            <div className="text-[11px] text-stone-400 italic hidden lg:flex items-center gap-1">
              <span>Tip: Click any day button or column header to filter classes for that day</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SINGLE-DAY VIEW (When user clicks a specific day) */}
      {selectedDayView !== 'ALL' && (
        <div className="space-y-4">
          {/* Day Navigation Banner */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedDayView('ALL')}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors"
                title="Return to full multi-day grid"
              >
                <ArrowLeft className="w-5 h-5 text-amber-400" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                    Daily Mat Program
                  </span>
                  <span className="text-stone-500">•</span>
                  <span className="text-xs text-stone-400">
                    {getDayClassesCount(selectedDayView)} Classes Scheduled
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {DAY_LABELS[selectedDayView].full} Classes
                </h3>
              </div>
            </div>

            {/* Day Pager: Previous & Next Day */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {prevDay && (
                <button
                  type="button"
                  onClick={() => setSelectedDayView(prevDay)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-xs font-semibold border border-stone-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{DAY_LABELS[prevDay].full}</span>
                </button>
              )}
              {nextDay && (
                <button
                  type="button"
                  onClick={() => setSelectedDayView(nextDay)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-xs font-semibold border border-stone-700"
                >
                  <span>{DAY_LABELS[nextDay].full}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDayView('ALL')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Full Grid</span>
              </button>
            </div>
          </div>

          {/* Single Day Time Slots List */}
          <div
            ref={gridContainerRef}
            className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3"
          >
            {config.slots.map((slot, index) => {
              const cell = getCell(slot.id, selectedDayView);
              const mat = getMat(cell?.matId || slot.matId);
              const hasClass = cell && cell.title.trim().length > 0;
              const prevSlot = index > 0 ? config.slots[index - 1] : undefined;
              const middayGap = getMiddayGap(prevSlot?.timeRange, slot.timeRange);

              return (
                <React.Fragment key={slot.id}>
                  {/* Midday Blank Gap / Unoccupied Gym Indicator */}
                  {middayGap && (
                    <div className="py-2.5 px-4 bg-stone-950/80 rounded-xl border border-dashed border-stone-800 flex items-center justify-between text-xs text-stone-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-bold text-stone-300">
                          {middayGap.gapLabel}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAddSlot('12:00 PM - 01:15 PM')}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                      >
                        + Insert Midday Class Slot
                      </button>
                    </div>
                  )}

                  <div
                    className={`rounded-xl border transition-all p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      hasClass
                        ? 'bg-stone-850 border-stone-750 hover:border-amber-500/40 shadow-sm'
                        : 'bg-stone-900/60 border-dashed border-stone-800 hover:border-stone-700'
                    }`}
                  >
                  {/* Left: Time & Mat Badge */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 font-mono-digits font-bold text-sm">
                      <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-digits text-sm sm:text-base font-extrabold text-white">
                          {slot.timeRange}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white shadow-xs"
                          style={{ backgroundColor: mat?.bgColor || '#8a7e4b' }}
                        >
                          {mat?.name || 'MAT 01'}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400">
                        {DAY_LABELS[selectedDayView].full} Session
                      </span>
                    </div>
                  </div>

                  {/* Center: Class Details or Empty State */}
                  <div className="flex-1 md:px-4">
                    {hasClass ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base sm:text-lg font-black text-white">
                            {cell.title}
                          </h4>
                          {renderCategoryBadge(cell.category)}
                        </div>
                        {cell.subtitle && (
                          <p className="text-xs text-stone-300 font-medium">{cell.subtitle}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-stone-400 pt-1">
                          <span className="flex items-center gap-1 text-amber-400 font-semibold">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span>Coach: {cell.instructor || gymSettings.defaultCoach || 'Assigned Instructor'}</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-stone-400 italic flex items-center gap-1.5 py-1">
                        <span>No class currently scheduled in this time slot</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Quick Action Dropdown to Assign / Change Class */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto" data-export-ignore="true">
                    <button
                      type="button"
                      onClick={() => handleOpenAssignDropdown(slot.id, selectedDayView)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shadow-sm ${
                        hasClass
                          ? 'bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 hover:border-amber-400/50'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                      title="Open drop down list to assign or modify class"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{hasClass ? 'Change / Assign Class' : 'Assign Class'}</span>
                    </button>

                    {hasClass && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssignDropdownCell({ slotId: slot.id, day: selectedDayView });
                          handleClearCell();
                        }}
                        className="p-2 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors"
                        title="Clear this slot to empty"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: FULL MULTI-DAY TIME GRID (All Days Overview) */}
      {selectedDayView === 'ALL' && (
        <div className="overflow-x-auto rounded-2xl shadow-2xl border border-stone-800">
          <div
            ref={gridContainerRef}
            className="min-w-[980px] bg-stone-900 select-none"
          >
            {/* Table Grid: Column Header */}
            <div
              className="grid border-b border-stone-800 text-center"
              style={{
                gridTemplateColumns: `140px repeat(${config.days.length}, minmax(130px, 1fr))`,
              }}
            >
              {/* TOP-LEFT CORNER BOX: Required explicitly by user as "TIME / DAY" */}
              <div className="p-3.5 bg-black flex items-center justify-center gap-1.5 border-r border-stone-800 text-white">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-extrabold text-xs sm:text-sm tracking-wider text-white">
                  TIME
                </span>
                <span className="text-stone-500 font-bold text-xs">/</span>
                <span className="text-amber-300 font-black text-xs sm:text-sm tracking-wider">
                  DAY
                </span>
              </div>

              {/* Day Column Headers: Press on each day to only see classes for that day */}
              {config.days.map((day) => (
                <div
                  key={day}
                  onClick={() => setSelectedDayView(day)}
                  className="py-3 px-2 bg-stone-900 border-r border-stone-800 hover:bg-stone-800/90 cursor-pointer transition-colors group relative"
                  title={`Click to focus only on ${DAY_LABELS[day].full}'s classes`}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-sm font-black text-white tracking-widest group-hover:text-amber-400 transition-colors">
                      {day}
                    </span>
                    <span className="text-[10px] text-stone-400 font-semibold tracking-wide">
                      {DAY_LABELS[day].full}
                    </span>
                  </div>
                  {/* Subtle indicator hint */}
                  <span className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 text-[9px] text-amber-400 transition-opacity">
                    View Day →
                  </span>
                </div>
              ))}
            </div>

            {/* Time Slot Rows */}
            <div className="divide-y divide-stone-800/80">
              {config.slots.map((slot, slotIdx) => {
                const rowMat = getMat(slot.matId);
                const prevSlot = slotIdx > 0 ? config.slots[slotIdx - 1] : undefined;
                const middayGap = getMiddayGap(prevSlot?.timeRange, slot.timeRange);

                return (
                  <React.Fragment key={slot.id}>
                    {/* Midday Blank Gap Row */}
                    {middayGap && (
                      <div
                        className="bg-stone-950 border-y border-dashed border-stone-850 py-2.5 px-4 flex items-center justify-between"
                        style={{
                          gridColumn: `1 / span ${config.days.length + 1}`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-bold text-stone-400">
                            {middayGap.gapLabel}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenAddSlot('12:00 PM - 01:15 PM')}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                          data-export-ignore="true"
                        >
                          + Insert Midday Slot
                        </button>
                      </div>
                    )}

                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `140px repeat(${config.days.length}, minmax(130px, 1fr))`,
                      }}
                    >
                    {/* Time Slot Column Header */}
                    <div
                      onClick={() => handleOpenEditSlot(slot)}
                      className="p-3 bg-stone-900/95 border-r border-stone-800 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-stone-850 transition-colors relative group"
                      title="Click to edit time range or change assigned mat row"
                    >
                      <span className="font-mono-digits font-extrabold text-xs text-white leading-tight">
                        {slot.timeRange}
                      </span>
                      {rowMat && (
                        <span
                          className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white shadow-xs"
                          style={{ backgroundColor: rowMat.bgColor }}
                        >
                          {rowMat.name}
                        </span>
                      )}

                      {/* Quick slot reorder/edit actions on hover */}
                      <div
                        className="absolute right-1 top-1 bottom-1 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity"
                        data-export-ignore="true"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSlot(slotIdx, 'up');
                          }}
                          disabled={slotIdx === 0}
                          className="p-0.5 text-stone-400 hover:text-white disabled:opacity-20"
                          title="Move row up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSlot(slotIdx, 'down');
                          }}
                          disabled={slotIdx === config.slots.length - 1}
                          className="p-0.5 text-stone-400 hover:text-white disabled:opacity-20"
                          title="Move row down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Day Cells in this time slot */}
                    {config.days.map((day) => {
                      const cell = getCell(slot.id, day);
                      const cellMat = cell?.matId ? getMat(cell.matId) : rowMat;
                      const hasClass = cell && cell.title.trim().length > 0;

                      // Elegant color background for class cells
                      const bgStyle = hasClass
                        ? cellMat?.bgColor || '#242838'
                        : undefined;

                      return (
                        <div
                          key={`${slot.id}-${day}`}
                          onClick={() => handleOpenAssignDropdown(slot.id, day)}
                          className={`min-h-[92px] p-2.5 border-r border-stone-800/80 flex flex-col justify-between transition-all cursor-pointer relative group ${
                            hasClass
                              ? 'text-white hover:brightness-110 shadow-inner'
                              : 'bg-stone-900/40 hover:bg-stone-800/50'
                          }`}
                          style={{
                            backgroundColor: bgStyle,
                          }}
                        >
                          {hasClass ? (
                            <div className="flex flex-col h-full justify-between">
                              {/* Title & Category Badge */}
                              <div>
                                <div className="flex items-start justify-between gap-1">
                                  <h4 className="text-xs sm:text-[13px] font-extrabold leading-snug tracking-tight text-white drop-shadow-xs">
                                    {cell.title}
                                  </h4>
                                </div>
                                {cell.subtitle && (
                                  <p className="text-[10px] text-white/90 font-medium leading-tight mt-0.5">
                                    {cell.subtitle}
                                  </p>
                                )}
                              </div>

                              {/* Footer: Instructor & Category Tag */}
                              <div className="mt-1.5 pt-1 border-t border-white/20 flex items-center justify-between gap-1 text-[10px] text-white/95">
                                <span className="font-semibold truncate">
                                  {cell.instructor || gymSettings.defaultCoach || 'Coach'}
                                </span>
                                {cell.category && (
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">
                                    {cell.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-400 bg-stone-950/80 px-2 py-1 rounded-md border border-amber-500/30">
                                <Plus className="w-3 h-3" />
                                <span>Assign</span>
                              </span>
                            </div>
                          )}

                          {/* Quick pencil affordance on hover */}
                          <div
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1 rounded text-white"
                            data-export-ignore="true"
                          >
                            <Edit3 className="w-3 h-3 text-amber-300" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
            </div>
          </div>
        </div>
      )}

      {/* DROPDOWN / ASSIGN CLASS POPUP MODAL */}
      {/* DROPDOWN / ASSIGN CLASS POPUP MODAL - STRICTLY ASSIGN FROM REGISTERED CLASSES ONLY */}
      {assignDropdownCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Assign Class to Timeslot</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Official Gym Classes Only
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    {DAY_LABELS[assignDropdownCell.day].full} •{' '}
                    {getSlot(assignDropdownCell.slotId)?.timeRange || 'Selected Slot'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAssignDropdown}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filter & Manage Bar */}
            <div className="p-4 border-b border-stone-800 bg-stone-900 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search registered classes by title, coach, or style..."
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-400 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs shrink-0 flex-wrap">
                {(['ALL', 'Adults', 'Kids', 'Teens'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAssignCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs ${
                      assignCategoryFilter === cat
                        ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                {onSaveClass && (
                  <button
                    type="button"
                    onClick={() => setIsManageClassesOpen(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 hover:border-amber-400/50 inline-flex items-center gap-1 transition-colors"
                    title="Open classes directory to edit classes or add a new class"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Manage Classes</span>
                  </button>
                )}

                {getCell(assignDropdownCell.slotId, assignDropdownCell.day) && (
                  <button
                    type="button"
                    onClick={handleClearCell}
                    className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 rounded-xl text-xs font-bold transition-colors"
                    title="Remove class from this slot"
                  >
                    Clear Slot
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: ONLY Registered Gym Classes */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Academy Classes Registry ({filteredLiveClasses.length})</span>
                </span>
                <span className="text-[11px] text-stone-400">Click any class to assign to this timeslot</span>
              </div>

              {filteredLiveClasses.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-xl bg-stone-950/60 border border-dashed border-stone-800 space-y-2">
                  <BookOpen className="w-8 h-8 text-stone-600 mx-auto" />
                  <h4 className="text-xs font-bold text-white">No matching classes found</h4>
                  <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                    {assignSearchQuery
                      ? 'No registered academy classes match your search query.'
                      : 'No classes found in the registry. Use the Manage Classes button to add new classes.'}
                  </p>
                  {onSaveClass && (
                    <button
                      type="button"
                      onClick={() => setIsManageClassesOpen(true)}
                      className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Class</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredLiveClasses.map((cls) => {
                    const daysStr = cls.daysOfWeek ? cls.daysOfWeek.join(', ') : '';

                    return (
                      <div
                        key={cls.id}
                        onClick={() =>
                          handleAssignDirect({
                            title: cls.title,
                            subtitle: `${cls.type || 'Gi'}${cls.room ? ` • ${cls.room}` : ''}`,
                            instructor: cls.headCoachName || cls.coach.replace(' (Head Coach)', '') || gymSettings.defaultCoach,
                            category: cls.category,
                          })
                        }
                        className="p-3.5 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-750 hover:border-amber-400/60 cursor-pointer transition-all group shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5 mb-1.5">
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                              {cls.title}
                            </h4>
                            {renderCategoryBadge(cls.category)}
                          </div>

                          <div className="space-y-0.5 text-[11px] text-stone-400">
                            <p>
                              Coach: <strong className="text-stone-300">{cls.headCoachName || cls.coach.replace(' (Head Coach)', '')}</strong>
                            </p>
                            <p>
                              Style: <span className="text-amber-400/90 font-medium">{cls.type}</span>
                              {cls.room && <span> • {cls.room}</span>}
                            </p>
                            {daysStr && (
                              <p className="text-[10px] text-stone-500 font-mono-digits">
                                Scheduled: {daysStr}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-stone-500 text-[10px]">
                            {cls.durationMinutes || 75} min session
                          </span>
                          <span className="font-extrabold text-amber-400 group-hover:text-amber-300 inline-flex items-center gap-1 text-[11px]">
                            <span>Select & Assign</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-stone-800 bg-stone-950 flex items-center justify-between text-xs">
              <span className="text-stone-400 text-[11px]">
                Only official registered gym classes are assignable to Matboard slots.
              </span>
              <button
                type="button"
                onClick={handleCloseAssignDropdown}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Academy Classes Modal from Matboard */}
      {isManageClassesOpen && onSaveClass && (
        <EditClassModal
          isOpen={isManageClassesOpen}
          onClose={() => setIsManageClassesOpen(false)}
          classes={classes}
          classSession={null}
          coaches={coaches}
          onSaveClass={(saved) => {
            onSaveClass(saved);
            showToast(`Saved "${saved.title}" to gym registry!`);
          }}
          onDeleteClass={onDeleteClass}
        />
      )}

      {/* EDIT TIME SLOT MODAL (Row Time Range & Mat) */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingSlot ? 'Edit Time Slot Row' : 'Add Time Slot Row'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Select start and end time with mouse clicks
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4">
              {/* Mouse-Only Time Range Picker */}
              <div className="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800">
                <MouseTimeRangePicker
                  value={slotTimeRange || '04:00 PM - 05:15 PM'}
                  onChange={(newRange) => setSlotTimeRange(newRange)}
                  label="Matboard Time Range (Mouse Select)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Assigned Mat Area
                </label>
                <select
                  value={slotMatId}
                  onChange={(e) => setSlotMatId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-400 cursor-pointer"
                >
                  {config.mats.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                {editingSlot ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteSlot(editingSlot.id);
                      setIsSlotModalOpen(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Row</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSlotModalOpen(false)}
                    className="px-3 py-1.5 bg-stone-800 text-stone-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs shadow-md cursor-pointer"
                  >
                    {editingSlot ? 'Save Time Slot' : 'Add Time Slot'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRESETS & FLEXIBLE SCHEDULE LAYOUTS MODAL */}
      {isPresetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Matboard Schedule Layouts & Operating Hours
                  </h3>
                  <p className="text-xs text-stone-400">
                    Quickly adapt your timetable to your academy's real operating schedule
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPresetsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets List */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                {ACADEMY_TIMETABLE_PRESETS.map((preset) => {
                  const isCurrentSplit = preset.id === 'split-morning-evening';
                  return (
                    <div
                      key={preset.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrentSplit
                          ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400'
                          : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                            <span>{preset.name}</span>
                            {isCurrentSplit && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Recommended
                              </span>
                            )}
                          </h4>
                        </div>
                        <p className="text-xs text-stone-400">{preset.description}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {preset.slots.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-900 border border-stone-700/80 text-amber-300"
                            >
                              {s.timeRange}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyTimetablePreset(preset.id)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs shrink-0 self-start sm:self-center shadow-md cursor-pointer transition-transform active:scale-95"
                      >
                        Apply Layout
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Maintenance / Clean Actions */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-stone-400">
                  Clean up table by removing empty unoccupied rows:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleClearEmptySlots();
                    setIsPresetsModalOpen(false);
                  }}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white rounded-xl text-xs font-bold border border-stone-700 cursor-pointer"
                >
                  Remove Unoccupied Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAT CONFIGURATION MODAL */}
      {isMatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <h3 className="text-base font-black text-white">Configure Mat Rooms</h3>
              <button
                type="button"
                onClick={() => setIsMatModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {matsList.map((m, idx) => (
                <div key={m.id} className="p-3 bg-stone-800/80 rounded-xl border border-stone-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Mat #{idx + 1}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-xs"
                      style={{ backgroundColor: m.bgColor }}
                    >
                      {m.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Name</label>
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => {
                          const updated = [...matsList];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setMatsList(updated);
                        }}
                        className="w-full px-2 py-1 bg-stone-700 border border-stone-600 rounded text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400 mb-0.5">Theme Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={m.bgColor}
                          onChange={(e) => {
                            const updated = [...matsList];
                            updated[idx] = { ...updated[idx], bgColor: e.target.value };
                            setMatsList(updated);
                          }}
                          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono text-stone-300">{m.bgColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMatModalOpen(false)}
                  className="px-3 py-1.5 bg-stone-800 text-stone-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMats}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Save Mat Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP TIME SLOT DELETE CONFIRMATION MODAL */}
      {slotToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-red-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Time Slot Row?</h3>
                <p className="text-xs text-stone-400">This will remove this time slot from the matboard.</p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950/90 rounded-xl border border-stone-800 space-y-1 text-xs">
              <p className="font-mono-digits font-bold text-white text-sm">{slotToDelete.timeRange}</p>
              <p className="text-stone-400">
                All classes assigned to this time row across all days will be unassigned.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSlotToDelete(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSlot}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP RESET TO DEFAULTS CONFIRMATION MODAL */}
      {isConfirmingReset && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Reset Matboard to Defaults?</h3>
                <p className="text-xs text-stone-400">Restore factory time slots and demo timetable.</p>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              This will reset all matboard rows, assigned slots, and mat definitions back to the original standard template. Custom changes to this timetable will be replaced.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmingReset(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetDefaults}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
