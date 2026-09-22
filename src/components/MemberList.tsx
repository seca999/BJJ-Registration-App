import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  UserPlus, 
  CreditCard, 
  UserCheck, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowUpDown,
  MoreVertical,
  Calendar,
  Eye,
  Edit3,
  Camera
} from 'lucide-react';
import { Member, BeltRank, MembershipType } from '../types';
import { BeltBadge, BELT_RANKS } from '../utils/bjjBelts';
import { StudentPhotoModal } from './StudentPhotoModal';

interface MemberListProps {
  members: Member[];
  onSelectMember: (member: Member) => void;
  onOpenPaymentForMember: (memberId: string) => void;
  onOpenNewMember: () => void;
  onUpdateMember?: (member: Member) => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  onSelectMember,
  onOpenPaymentForMember,
  onOpenNewMember,
  onUpdateMember,
}) => {
  const [photoModalMember, setPhotoModalMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBelt, setSelectedBelt] = useState<string>('ALL');
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WARNING' | 'EXPIRED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'classes' | 'attendance' | 'recent'>('name');

  // Counts for tabs
  const countAll = members.length;
  const countActive = members.filter((m) => m.status === 'active').length;
  const countWarning = members.filter(
    (m) => m.membershipType === 'class_pack' && m.classesRemaining > 0 && m.classesRemaining <= 2
  ).length;
  const countExpired = members.filter(
    (m) => m.membershipType === 'class_pack' && m.classesRemaining <= 0
  ).length;

  const filteredMembers = members.filter((m) => {
    // Search filter
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      m.fullName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.includes(q);

    // Belt filter
    const matchesBelt = selectedBelt === 'ALL' || m.beltRank === selectedBelt;

    // Age Group Program filter
    const matchesAgeGroup =
      ageGroupFilter === 'ALL' || (m.ageGroup ? m.ageGroup === ageGroupFilter : ageGroupFilter === 'Adults');

    // Type filter
    const matchesType = typeFilter === 'ALL' || m.membershipType === typeFilter;

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = m.status === 'active' && (m.membershipType === 'monthly_unlimited' || m.classesRemaining > 2);
    } else if (statusFilter === 'WARNING') {
      matchesStatus = m.membershipType === 'class_pack' && m.classesRemaining > 0 && m.classesRemaining <= 2;
    } else if (statusFilter === 'EXPIRED') {
      matchesStatus = m.membershipType === 'class_pack' && m.classesRemaining <= 0;
    }

    return matchesSearch && matchesBelt && matchesAgeGroup && matchesType && matchesStatus;
  });

  // Sorting
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (sortBy === 'name') {
      return a.fullName.localeCompare(b.fullName);
    } else if (sortBy === 'classes') {
      // Put unlimited (-1) at the end or handle numbers
      const valA = a.classesRemaining === -1 ? 999 : a.classesRemaining;
      const valB = b.classesRemaining === -1 ? 999 : b.classesRemaining;
      return valA - valB;
    } else if (sortBy === 'attendance') {
      return b.totalClassesAttended - a.totalClassesAttended;
    } else if (sortBy === 'recent') {
      return (b.lastAttendedDate || '').localeCompare(a.lastAttendedDate || '');
    }
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-xl border border-stone-800">
        <div>
          <h2 className="text-lg font-bold text-white">Student Directory & Rosters</h2>
          <p className="text-xs text-stone-400">
            View student belt ranks, remaining membership classes, and payment standings.
          </p>
        </div>

        <button
          onClick={onOpenNewMember}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold tracking-wide transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Register New Student</span>
        </button>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'ALL'
              ? 'bg-stone-700 text-white font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
          }`}
        >
          All Students ({countAll})
        </button>
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'ACTIVE'
              ? 'bg-emerald-700 text-white font-bold'
              : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
          }`}
        >
          Active Balance ({countActive})
        </button>
        <button
          onClick={() => setStatusFilter('WARNING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            statusFilter === 'WARNING'
              ? 'bg-amber-600 text-stone-950 font-bold'
              : 'bg-stone-900 text-amber-400 hover:text-amber-300 border border-stone-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low Classes (≤2) ({countWarning})</span>
        </button>
        <button
          onClick={() => setStatusFilter('EXPIRED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            statusFilter === 'EXPIRED'
              ? 'bg-red-700 text-white font-bold'
              : 'bg-stone-900 text-red-400 hover:text-red-300 border border-stone-800'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>0 Classes / Renewal Needed ({countExpired})</span>
        </button>
      </div>

      {/* Search, Belt Filter, and Sort Controls */}
      <div className="bg-stone-900 p-3.5 rounded-xl border border-stone-800 flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by student name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Program Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-[11px] text-stone-400 whitespace-nowrap">IBJJF Division:</span>
          <select
            value={ageGroupFilter}
            onChange={(e) => setAgeGroupFilter(e.target.value)}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 w-full md:w-auto font-medium"
          >
            <option value="ALL">All Divisions</option>
            <option value="Kids">Kids (Ages 4-15 • Under 16)</option>
            <option value="Teens">Teens (Ages 16-17 • Juvenile)</option>
            <option value="Adults">Adults (Ages 18+)</option>
          </select>
        </div>

        {/* Belt Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-[11px] text-stone-400 whitespace-nowrap">Belt:</span>
          <select
            value={selectedBelt}
            onChange={(e) => setSelectedBelt(e.target.value)}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 w-full md:w-auto"
          >
            <option value="ALL">All Belts</option>
            {BELT_RANKS.map((b) => (
              <option key={b} value={b}>
                {b} Belt
              </option>
            ))}
          </select>
        </div>

        {/* Membership Type Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-[11px] text-stone-400 whitespace-nowrap">Plan:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 w-full md:w-auto"
          >
            <option value="ALL">All Plans</option>
            <option value="class_pack">Punch Cards (Pack)</option>
            <option value="monthly_unlimited">Monthly Unlimited</option>
            <option value="single_dropin">Single Drop-in</option>
          </select>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 w-full md:w-auto"
          >
            <option value="name">Sort: Name (A-Z)</option>
            <option value="classes">Sort: Classes Remaining (Lowest First)</option>
            <option value="attendance">Sort: Most Classes Attended</option>
            <option value="recent">Sort: Most Recently Attended</option>
          </select>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-3 px-4">Student & Belt Rank</th>
                <th className="py-3 px-3">Classes Remaining</th>
                <th className="py-3 px-3">Membership Plan</th>
                <th className="py-3 px-3">Total Attended</th>
                <th className="py-3 px-3">Last Mat Date</th>
                <th className="py-3 px-3">Phone & Contact</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {sortedMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    No students found matching your filters.
                  </td>
                </tr>
              ) : (
                sortedMembers.map((member) => {
                  const isZeroClasses =
                    member.membershipType === 'class_pack' && member.classesRemaining <= 0;
                  const isLowClasses =
                    member.membershipType === 'class_pack' &&
                    member.classesRemaining > 0 &&
                    member.classesRemaining <= 2;
                  const isUnlimited = member.membershipType === 'monthly_unlimited';

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-stone-800/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectMember(member)}
                    >
                      {/* Name & Belt */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* Student Picture with quick camera trigger */}
                          <div
                            className="relative group/avatar cursor-pointer shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoModalMember(member);
                            }}
                            title="Click to add or change student picture"
                          >
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.fullName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-stone-700 group-hover/avatar:border-red-500 shadow-xs transition-all"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-stone-800 text-amber-400 font-bold text-xs flex items-center justify-center border-2 border-stone-700 group-hover/avatar:border-red-500 transition-all shadow-xs shrink-0">
                                {member.fullName.charAt(0)}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-stone-900 border border-stone-700 p-0.5 rounded-full text-stone-400 group-hover/avatar:text-amber-400 group-hover/avatar:border-amber-400/80 shadow transition-all">
                              <Camera className="w-2.5 h-2.5" />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">
                                {member.fullName}
                              </span>
                              {member.ageGroup && member.ageGroup !== 'Adults' && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    member.ageGroup === 'Kids'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                                      : 'bg-blue-950 text-blue-300 border border-blue-800/80'
                                  }`}
                                >
                                  {member.ageGroup} {member.age ? `(${member.age}y)` : ''}
                                </span>
                              )}
                              {member.ageGroup === 'Adults' && member.age && member.age < 21 && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                                  {member.age} yrs
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                              {member.lastPromotionDate && (
                                <span className="text-[10px] text-stone-400 hidden sm:inline">
                                  Promoted: {member.lastPromotionDate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Classes Remaining Badge */}
                      <td className="py-3.5 px-3">
                        {isUnlimited ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/60">
                            <span>Unlimited Passes</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col">
                            {member.classesRemaining < 0 ? (
                              <span className="px-2.5 py-1 rounded-md text-xs font-extrabold inline-flex items-center gap-1.5 w-fit bg-red-950 text-red-300 border border-red-700 animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                Debt: {Math.abs(member.classesRemaining)} class{Math.abs(member.classesRemaining) > 1 ? 'es' : ''}
                              </span>
                            ) : (
                              <span
                                className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 w-fit ${
                                  isZeroClasses
                                    ? 'bg-red-950 text-red-300 border border-red-800'
                                    : isLowClasses
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                }`}
                              >
                                {isZeroClasses && <AlertCircle className="w-3.5 h-3.5" />}
                                {isLowClasses && <AlertTriangle className="w-3.5 h-3.5" />}
                                {member.classesRemaining} of {member.classesTotal} classes left
                              </span>
                            )}
                            {member.classesRemaining < 0 ? (
                              <span className="text-[10px] text-red-400 mt-0.5 font-bold">
                                Class debt to be deducted on renewal
                              </span>
                            ) : isZeroClasses ? (
                              <span className="text-[10px] text-red-400 mt-0.5 font-semibold">
                                Renewal Required
                              </span>
                            ) : isLowClasses ? (
                              <span className="text-[10px] text-amber-400 mt-0.5">
                                Expiring soon
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Membership Plan */}
                      <td className="py-3.5 px-3 text-stone-300">
                        <div className="font-medium">
                          {member.membershipType === 'class_pack'
                            ? `${member.classesTotal} Class Punch Card`
                            : member.membershipType === 'monthly_unlimited'
                            ? 'Monthly Unlimited'
                            : 'Single Drop-in'}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          Expires: {member.membershipEndDate}
                        </div>
                      </td>

                      {/* Total Attended */}
                      <td className="py-3.5 px-3 text-stone-300">
                        <div className="font-semibold text-white">
                          {member.totalClassesAttended} classes
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Joined {member.joinDate}
                        </div>
                      </td>

                      {/* Last Mat Date */}
                      <td className="py-3.5 px-3 text-stone-300">
                        {member.lastAttendedDate ? (
                          <span className="text-stone-200">{member.lastAttendedDate}</span>
                        ) : (
                          <span className="text-stone-500 italic">No attendance yet</span>
                        )}
                      </td>

                      {/* Phone & Emergency */}
                      <td className="py-3.5 px-3 text-stone-300">
                        <div className="font-mono text-[11px] text-stone-300">{member.phone}</div>
                        <div className="text-[10px] text-stone-400 truncate max-w-[140px]">
                          {member.email}
                        </div>
                        {member.emergencyContact?.name && (
                          <div
                            className="mt-1 text-[10px] text-stone-300 bg-stone-950/80 px-1.5 py-0.5 rounded border border-stone-800 flex items-center gap-1 w-fit"
                            title={`Emergency Contact: ${member.emergencyContact.name} (${member.emergencyContact.phone}) - ${member.emergencyContact.relation || 'Emergency Contact'}`}
                          >
                            <span className="text-amber-400 font-semibold">ICE:</span>
                            <span className="truncate max-w-[90px]">{member.emergencyContact.name}</span>
                            <span className="text-amber-300/80 font-medium">({member.emergencyContact.relation || 'Contact'})</span>
                          </div>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td
                        className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectMember(member)}
                          className="px-2 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-stone-700 transition-colors"
                          title="Edit Student Name, Emergency Contact & Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                          <span className="hidden xl:inline">Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenPaymentForMember(member.id)}
                          className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors shadow-xs"
                          title="Record payment or renew punch-card"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Renew / Pay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPhotoModalMember(member)}
                          className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors"
                          title="Add or update student photo"
                        >
                          <Camera className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectMember(member)}
                          className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors"
                          title="View student profile & histories"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Photo Studio Modal */}
      <StudentPhotoModal
        isOpen={photoModalMember !== null}
        onClose={() => setPhotoModalMember(null)}
        member={photoModalMember}
        onSavePhoto={(memberId, newPhoto) => {
          if (onUpdateMember && photoModalMember) {
            const updated: Member = { ...photoModalMember, avatar: newPhoto };
            onUpdateMember(updated);
          }
        }}
      />
    </div>
  );
};
