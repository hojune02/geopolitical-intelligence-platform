import { create } from 'zustand';

export const REGION_IDS = [
  'global',
  'europe',
  'middle-east',
  'east-asia',
  'north-america',
] as const;

export type RegionId = (typeof REGION_IDS)[number];

interface DateRange {
  startDate: string | null;

  endDate: string | null;
}

interface ConflictIntensity {
  minGoldstein: number;

  maxGoldstein: number;
}

interface FilterState {
  activeRegion: RegionId;

  dateRange: DateRange;

  conflictIntensity: ConflictIntensity;

  rootEventsOnly: boolean;
}

interface FilterActions {
  setActiveRegion: (region: RegionId) => void;

  setDateRange: (startDate: string | null, endDate: string | null) => void;

  setConflictIntensity: (minGoldstein: number, maxGoldstein: number) => void;

  setRootEventsOnly: (value: boolean) => void;

  resetFilters: () => void;
}

type FilterStore = FilterState & FilterActions;

const initialFilterState: FilterState = {
  activeRegion: 'global',

  dateRange: {
    startDate: null,
    endDate: null,
  },

  conflictIntensity: {
    minGoldstein: -10,
    maxGoldstein: 10,
  },

  rootEventsOnly: true,
};

function clampGoldstein(value: number): number {
  return Math.min(10, Math.max(-10, value));
}

export const useFilterStore = create<FilterStore>()((set) => ({
  ...initialFilterState,

  setActiveRegion: (activeRegion) => {
    set({
      activeRegion,
    });
  },

  setDateRange: (startDate, endDate) => {
    set({
      dateRange: {
        startDate,
        endDate,
      },
    });
  },

  setConflictIntensity: (minGoldstein, maxGoldstein) => {
    const normalizedMin = clampGoldstein(Math.min(minGoldstein, maxGoldstein));

    const normalizedMax = clampGoldstein(Math.max(minGoldstein, maxGoldstein));

    set({
      conflictIntensity: {
        minGoldstein: normalizedMin,

        maxGoldstein: normalizedMax,
      },
    });
  },

  setRootEventsOnly: (rootEventsOnly) => {
    set({
      rootEventsOnly,
    });
  },

  resetFilters: () => {
    set({
      activeRegion: 'global',

      dateRange: {
        startDate: null,
        endDate: null,
      },

      conflictIntensity: {
        minGoldstein: -10,
        maxGoldstein: 10,
      },

      rootEventsOnly: false,
    });
  },
}));
