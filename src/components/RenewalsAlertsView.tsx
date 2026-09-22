import React from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  CreditCard, 
  Clock, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  Phone,
  UserCheck
} from 'lucide-react';
import { Member } from '../types';
import { BeltBadge } from '../utils/bjjBelts';

interface RenewalsAlertsViewProps {
  members: Member[];
  onOpenPaymentForMember: (memberId: string) => void;
  onSelectMember: (member: Member) => void;
}

export const RenewalsAlertsView: React.FC<RenewalsAlertsViewProps> = ({
  members,
  onOpenPaymentForMember,
  onSelectMember,
}) => {
  // Categorize members
  const zeroClassMembers = members.filter(
    (m) => m.membershipType === 'class_pack' && m.classesRemaining <= 0
  );

  const lowClassMembers = members.filter(
    (m) => m.membershipType === 'class_pack' && m.classesRemaining > 0 && m.classesRemaining <= 2
  );

  const today = new Date();
  const expiringUnlimitedMembers = members.filter((m) => {
    if (m.membershipType !== 'monthly_unlimited') return false;
    const end = new Date(m.membershipEndDate);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  const totalAlerts = zeroClassMembers.length + lowClassMembers.length + expiringUnlimitedMembers.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Membership Balance & Renewal Center</h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Real-time tracking of exhausted punch-cards, low class balances, and expiring passes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
            {totalAlerts} Students Need Attention
          </span>
        </div>
      </div>

      {/* Section 1: Depleted / 0 Classes Remaining (High Priority) */}
      <div className="bg-stone-900 rounded-xl border border-red-900/60 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-red-950 text-red-400 border border-red-800">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                0 Classes Remaining & Attendance Debt ({zeroClassMembers.length})
              </h3>
              <p className="text-[11px] text-stone-400">
                Students with zero balance or attendance debt. Outstanding debt is automatically deducted upon re-registration.
              </p>
            </div>
          </div>
        </div>

        {zeroClassMembers.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
            No students currently have zero class balances or debt.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {zeroClassMembers.map((member) => (
              <div
                key={member.id}
                className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{member.fullName}</h4>
                      <div className="mt-1">
                        <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                      </div>
                    </div>
                    {member.classesRemaining < 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-900 text-white animate-pulse">
                        Debt: {Math.abs(member.classesRemaining)} Class{Math.abs(member.classesRemaining) > 1 ? 'es' : ''}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-stone-800 text-stone-300 border border-stone-700">
                        0 Classes Left
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-xs space-y-1 text-stone-300">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Total trained:</span>
                      <span className="font-semibold">{member.totalClassesAttended} classes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Last attended:</span>
                      <span className="font-semibold">{member.lastAttendedDate || 'None'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Contact:</span>
                      <span className="font-mono text-[11px] text-stone-300">{member.phone}</span>
                    </div>
                    {member.classesRemaining < 0 && (
                      <div className="p-2 mt-2 bg-red-950/60 rounded-lg border border-red-800/80 text-[11px] text-red-300 font-semibold">
                        ⚠️ Student has {Math.abs(member.classesRemaining)} attendance debt class(es). Renewing subscription will automatically deduct this debt.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-red-900/40 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPaymentForMember(member.id)}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Renew / Re-Register (JOD)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectMember(member)}
                    className="py-1.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold border border-stone-700 transition-colors"
                  >
                    Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Low Balance (1 - 2 Classes Remaining) */}
      <div className="bg-stone-900 rounded-xl border border-amber-900/60 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Low Balance Warning — 1 to 2 Classes Left ({lowClassMembers.length})
              </h3>
              <p className="text-[11px] text-stone-400">
                Remind these students to renew before their credits run out!
              </p>
            </div>
          </div>
        </div>

        {lowClassMembers.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
            All active students have healthy class balances.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lowClassMembers.map((member) => (
              <div
                key={member.id}
                className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{member.fullName}</h4>
                      <div className="mt-1">
                        <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/80 text-amber-200">
                      {member.classesRemaining} Class{member.classesRemaining === 1 ? '' : 'es'} Left
                    </span>
                  </div>

                  <div className="mt-3 text-xs space-y-1 text-stone-300">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Pack progress:</span>
                      <span className="font-semibold">
                        {member.classesTotal - member.classesRemaining} used / {member.classesTotal} total
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Phone:</span>
                      <span className="font-mono text-[11px] text-stone-300">{member.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-900/40 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPaymentForMember(member.id)}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Top Up Classes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectMember(member)}
                    className="py-1.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold border border-stone-700 transition-colors"
                  >
                    Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Expiring Monthly Unlimited Passes */}
      {expiringUnlimitedMembers.length > 0 && (
        <div className="bg-stone-900 rounded-xl border border-blue-900/60 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-950 text-blue-400 border border-blue-800">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Monthly Passes Expiring Within 7 Days ({expiringUnlimitedMembers.length})
                </h3>
                <p className="text-[11px] text-stone-400">
                  Monthly unlimited subscriptions due for billing cycle renewal.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expiringUnlimitedMembers.map((member) => (
              <div
                key={member.id}
                className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/60 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-white text-sm">{member.fullName}</h4>
                  <div className="mt-1">
                    <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                  </div>
                  <div className="text-[11px] text-stone-400 mt-2">
                    Expires on <strong className="text-white">{member.membershipEndDate}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenPaymentForMember(member.id)}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Renew Month</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
