import React from 'react';
import { BeltRank, StripeCount, ClassCategory, Member, ClassSession } from '../types';

// IBJJF Youth Belts for Kids (Ages 4 - 15)
export const KIDS_BELT_RANKS: BeltRank[] = [
  'White',
  'Grey-White',
  'Grey',
  'Grey-Black',
  'Yellow-White',
  'Yellow',
  'Yellow-Black',
  'Orange-White',
  'Orange',
  'Orange-Black',
  'Green-White',
  'Green',
  'Green-Black',
];

// Juvenile Belts for Teens (Ages 16 - 17)
export const TEENS_BELT_RANKS: BeltRank[] = [
  'White',
  'Blue',
  'Purple',
];

// Adult Belts (Ages 18+)
export const ADULT_BELT_RANKS: BeltRank[] = [
  'White',
  'Blue',
  'Purple',
  'Brown',
  'Black',
];

// Full Master List of All Belts
export const ALL_BELT_RANKS: BeltRank[] = [
  'White',
  'Grey-White',
  'Grey',
  'Grey-Black',
  'Yellow-White',
  'Yellow',
  'Yellow-Black',
  'Orange-White',
  'Orange',
  'Orange-Black',
  'Green-White',
  'Green',
  'Green-Black',
  'Blue',
  'Purple',
  'Brown',
  'Black',
];

// Default fallback export
export const BELT_RANKS: BeltRank[] = ALL_BELT_RANKS;

export interface BeltStyleConfig {
  name: BeltRank;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  sleeveBg: string;
  sleeveBorder: string;
  stripeColor: string;
  centerStripe?: 'white' | 'black' | null;
}

export const BELT_CONFIGS: Record<BeltRank, BeltStyleConfig> = {
  // Adult & Universal White
  White: {
    name: 'White',
    bgGradient: 'bg-stone-100',
    borderColor: 'border-stone-300',
    textColor: 'text-stone-800',
    sleeveBg: 'bg-stone-900',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },

  // IBJJF Youth Grey Group (Ages 4 - 15)
  'Grey-White': {
    name: 'Grey-White',
    bgGradient: 'bg-stone-400',
    borderColor: 'border-stone-500',
    textColor: 'text-stone-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'white',
  },
  Grey: {
    name: 'Grey',
    bgGradient: 'bg-stone-500',
    borderColor: 'border-stone-600',
    textColor: 'text-white',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  'Grey-Black': {
    name: 'Grey-Black',
    bgGradient: 'bg-stone-500',
    borderColor: 'border-stone-600',
    textColor: 'text-white',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'black',
  },

  // IBJJF Youth Yellow Group (Ages 7 - 15)
  'Yellow-White': {
    name: 'Yellow-White',
    bgGradient: 'bg-amber-300',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'white',
  },
  Yellow: {
    name: 'Yellow',
    bgGradient: 'bg-amber-400',
    borderColor: 'border-amber-500',
    textColor: 'text-stone-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  'Yellow-Black': {
    name: 'Yellow-Black',
    bgGradient: 'bg-amber-400',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'black',
  },

  // IBJJF Youth Orange Group (Ages 10 - 15)
  'Orange-White': {
    name: 'Orange-White',
    bgGradient: 'bg-orange-400',
    borderColor: 'border-orange-500',
    textColor: 'text-stone-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'white',
  },
  Orange: {
    name: 'Orange',
    bgGradient: 'bg-orange-500',
    borderColor: 'border-orange-600',
    textColor: 'text-white',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  'Orange-Black': {
    name: 'Orange-Black',
    bgGradient: 'bg-orange-500',
    borderColor: 'border-orange-600',
    textColor: 'text-white',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'black',
  },

  // IBJJF Youth Green Group (Ages 13 - 15)
  'Green-White': {
    name: 'Green-White',
    bgGradient: 'bg-emerald-600',
    borderColor: 'border-emerald-700',
    textColor: 'text-white',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'white',
  },
  Green: {
    name: 'Green',
    bgGradient: 'bg-emerald-600',
    borderColor: 'border-emerald-700',
    textColor: 'text-white',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  'Green-Black': {
    name: 'Green-Black',
    bgGradient: 'bg-emerald-600',
    borderColor: 'border-emerald-700',
    textColor: 'text-white',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'black',
  },

  // Adult & Juvenile Belts
  Blue: {
    name: 'Blue',
    bgGradient: 'bg-blue-600',
    borderColor: 'border-blue-700',
    textColor: 'text-white',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-black',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  Purple: {
    name: 'Purple',
    bgGradient: 'bg-purple-700',
    borderColor: 'border-purple-800',
    textColor: 'text-white',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-black',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  Brown: {
    name: 'Brown',
    bgGradient: 'bg-amber-900',
    borderColor: 'border-amber-950',
    textColor: 'text-white',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-black',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  Black: {
    name: 'Black',
    bgGradient: 'bg-stone-950',
    borderColor: 'border-black',
    textColor: 'text-red-400 font-bold',
    sleeveBg: 'bg-red-700',
    sleeveBorder: 'border-red-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
};

export function getBeltsForAgeGroup(ageGroup?: ClassCategory | string): BeltRank[] {
  if (ageGroup === 'Kids') return KIDS_BELT_RANKS;
  if (ageGroup === 'Teens') return TEENS_BELT_RANKS;
  return ADULT_BELT_RANKS;
}

export function isBeltAllowedForAgeGroup(belt: BeltRank, ageGroup?: ClassCategory | string): boolean {
  if (ageGroup === 'Kids') {
    return KIDS_BELT_RANKS.includes(belt);
  }
  if (ageGroup === 'Teens') {
    return TEENS_BELT_RANKS.includes(belt);
  }
  return ADULT_BELT_RANKS.includes(belt);
}

export interface ClassEligibilityCheck {
  isEligible: boolean;
  reason?: string;
  badgeText?: string;
  severity?: 'error' | 'warning';
}

/**
 * Strict IBJJF age and belt division validation logic.
 * Ensures adults and teens cannot be checked into kids classes,
 * kids cannot be checked into adults/teens sparring,
 * and adult ranks (Blue, Purple, Brown, Black) are never admitted to kids classes.
 */
export function checkStudentClassEligibility(student: Member, session: ClassSession): ClassEligibilityCheck {
  // --- KIDS CLASS VALIDATION ---
  if (session.category === 'Kids') {
    // 1. Must be categorized as a Kid
    if (student.ageGroup && student.ageGroup !== 'Kids') {
      return {
        isEligible: false,
        reason: `${student.fullName} is an ${student.ageGroup} student. Adults and Teens are strictly prohibited from Kids classes under IBJJF safety guidelines.`,
        badgeText: `Ineligible: ${student.ageGroup} in Kids Class`,
        severity: 'error',
      };
    }

    // 2. Belts in Kids Class: STRICTLY YOUTH BELTS ONLY
    // Adult ranks (Blue, Purple, Brown, Black) are NEVER allowed
    if (student.beltRank === 'Brown') {
      return {
        isEligible: false,
        reason: `${student.fullName} holds a Brown Belt (Adult Rank, min age 18). Kids classes only use the Youth Belt system (White, Grey, Yellow, Orange, Green).`,
        badgeText: 'Ineligible: Brown Belt (Adult Rank)',
        severity: 'error',
      };
    }

    if (['Blue', 'Purple', 'Black'].includes(student.beltRank)) {
      return {
        isEligible: false,
        reason: `${student.fullName} holds a ${student.beltRank} Belt (Adult/Juvenile Rank). Kids classes only admit Youth Belt holders.`,
        badgeText: `Ineligible: ${student.beltRank} Belt`,
        severity: 'error',
      };
    }

    if (!KIDS_BELT_RANKS.includes(student.beltRank)) {
      return {
        isEligible: false,
        reason: `${student.beltRank} Belt is not recognized in the IBJJF Youth division.`,
        badgeText: 'Ineligible Belt',
        severity: 'error',
      };
    }

    return { isEligible: true };
  }

  // --- TEENS CLASS VALIDATION ---
  if (session.category === 'Teens') {
    if (student.ageGroup === 'Kids') {
      return {
        isEligible: false,
        reason: `${student.fullName} is registered in the Kids division. Teens classes have higher sparring intensity.`,
        badgeText: 'Ineligible: Kids in Teens Class',
        severity: 'error',
      };
    }

    if (student.ageGroup === 'Adults') {
      return {
        isEligible: false,
        reason: `${student.fullName} is an Adult. Adults cannot attend Teens youth sessions.`,
        badgeText: 'Ineligible: Adult in Teens Class',
        severity: 'error',
      };
    }

    if (student.beltRank === 'Brown' || student.beltRank === 'Black') {
      return {
        isEligible: false,
        reason: `Teens/Juveniles under 18 cannot hold ${student.beltRank} belt under IBJJF rules (minimum age for Brown is 18, Black is 19).`,
        badgeText: `Ineligible: ${student.beltRank} Belt in Teens`,
        severity: 'error',
      };
    }

    return { isEligible: true };
  }

  // --- ADULTS CLASS VALIDATION ---
  if (session.category === 'Adults') {
    if (student.ageGroup === 'Kids') {
      return {
        isEligible: false,
        reason: `${student.fullName} is a child student and cannot join Adult full-contact sparring sessions.`,
        badgeText: 'Ineligible: Kids in Adult Class',
        severity: 'error',
      };
    }

    if (student.ageGroup === 'Teens') {
      return {
        isEligible: false,
        reason: `${student.fullName} is in the Teens youth program. Adults classes are reserved for members 18+.`,
        badgeText: 'Ineligible: Teen in Adult Class',
        severity: 'error',
      };
    }

    // Youth belts (Grey, Yellow, Orange, Green) are not adult ranks
    const isYouthSpecificBelt = [
      'Grey-White', 'Grey', 'Grey-Black',
      'Yellow-White', 'Yellow', 'Yellow-Black',
      'Orange-White', 'Orange', 'Orange-Black',
      'Green-White', 'Green', 'Green-Black',
    ].includes(student.beltRank);

    if (isYouthSpecificBelt) {
      return {
        isEligible: false,
        reason: `${student.fullName} holds a youth belt (${student.beltRank}). Adults must be evaluated under the Adult belt system (White, Blue, Purple, Brown, Black).`,
        badgeText: 'Ineligible: Youth Belt in Adult Class',
        severity: 'error',
      };
    }

    return { isEligible: true };
  }

  return { isEligible: true };
}

interface BeltBadgeProps {
  belt: BeltRank;
  stripes: StripeCount;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const BeltBadge: React.FC<BeltBadgeProps> = ({
  belt,
  stripes,
  size = 'md',
  showLabel = true,
}) => {
  const config = BELT_CONFIGS[belt] || BELT_CONFIGS.White;

  const heightClass = size === 'sm' ? 'h-4 text-[10px]' : size === 'lg' ? 'h-7 text-xs' : 'h-5 text-xs';
  const widthClass = size === 'sm' ? 'w-24' : size === 'lg' ? 'w-44' : 'w-34';
  const sleeveWidthClass = size === 'sm' ? 'w-6' : size === 'lg' ? 'w-10' : 'w-8';
  const stripeWidth = size === 'sm' ? 'w-[2px]' : size === 'lg' ? 'w-[3px]' : 'w-[2.5px]';

  return (
    <div className="inline-flex items-center gap-2">
      {/* Belt representation */}
      <div
        className={`relative inline-flex items-center justify-between rounded-sm border shadow-xs overflow-hidden select-none ${config.bgGradient} ${config.borderColor} ${heightClass} ${widthClass}`}
        title={`${belt} Belt, ${stripes} Stripe${stripes === 1 ? '' : 's'}`}
      >
        {/* Youth center longitudinal stripe for White/Black youth varieties */}
        {config.centerStripe && (
          <div
            className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-[30%] ${
              config.centerStripe === 'white' ? 'bg-white' : 'bg-black'
            } pointer-events-none opacity-90`}
          />
        )}

        {/* Belt rank text */}
        <span
          className={`relative z-10 pl-1.5 font-bold tracking-wider uppercase truncate ${config.textColor}`}
          style={{ fontSize: size === 'sm' ? '8.5px' : size === 'lg' ? '11px' : '9.5px' }}
        >
          {belt}
        </span>

        {/* Rank bar (sleeve) */}
        <div
          className={`relative z-10 h-full flex items-center justify-evenly px-0.5 ${config.sleeveBg} ${config.sleeveBorder} ${sleeveWidthClass}`}
        >
          {Array.from({ length: 4 }).map((_, index) => {
            const hasStripe = index < stripes;
            return (
              <div
                key={index}
                className={`h-[80%] rounded-[0.5px] transition-colors ${stripeWidth} ${
                  hasStripe ? config.stripeColor : 'bg-transparent'
                }`}
              />
            );
          })}
        </div>
      </div>

      {showLabel && (
        <span className="text-xs font-medium text-stone-400">
          {stripes > 0 ? `${stripes} stripe${stripes > 1 ? 's' : ''}` : 'No stripes'}
        </span>
      )}
    </div>
  );
};

