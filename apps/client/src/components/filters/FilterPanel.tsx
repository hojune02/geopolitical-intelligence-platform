import { REGION_IDS, type RegionId, useFilterStore } from '../../stores/useFilterStore';

const REGION_LABELS: Record<RegionId, string> = {
  global: 'Global',

  europe: 'Europe',

  'middle-east': 'Middle East',

  'east-asia': 'East Asia',

  'north-america': 'North America',
};

function isRegionId(value: string): value is RegionId {
  return REGION_IDS.some((region) => region === value);
}

export function FilterPanel() {
  const activeRegion = useFilterStore((state) => state.activeRegion);

  const dateRange = useFilterStore((state) => state.dateRange);

  const conflictIntensity = useFilterStore((state) => state.conflictIntensity);

  const rootEventsOnly = useFilterStore((state) => state.rootEventsOnly);

  const setActiveRegion = useFilterStore((state) => state.setActiveRegion);

  const setDateRange = useFilterStore((state) => state.setDateRange);

  const setConflictIntensity = useFilterStore((state) => state.setConflictIntensity);

  const setRootEventsOnly = useFilterStore((state) => state.setRootEventsOnly);

  const resetFilters = useFilterStore((state) => state.resetFilters);

  return (
    <section>
      <div className="filter-header">
        <h2>Filters</h2>

        <button onClick={resetFilters} type="button">
          Reset
        </button>
      </div>

      <label className="filter-field">
        <span>Region</span>

        <select
          onChange={(event) => {
            const value = event.currentTarget.value;

            if (isRegionId(value)) {
              setActiveRegion(value);
            }
          }}
          value={activeRegion}
        >
          {REGION_IDS.map((region) => (
            <option key={region} value={region}>
              {REGION_LABELS[region]}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-field">
        <span>Start date</span>

        <input
          max={dateRange.endDate ?? undefined}
          onChange={(event) => {
            const value = event.currentTarget.value;

            setDateRange(
              value === '' ? null : value,

              dateRange.endDate,
            );
          }}
          type="date"
          value={dateRange.startDate ?? ''}
        />
      </label>

      <label className="filter-field">
        <span>End date</span>

        <input
          min={dateRange.startDate ?? undefined}
          onChange={(event) => {
            const value = event.currentTarget.value;

            setDateRange(
              dateRange.startDate,

              value === '' ? null : value,
            );
          }}
          type="date"
          value={dateRange.endDate ?? ''}
        />
      </label>

      <label className="filter-field">
        <span>Minimum Goldstein</span>

        <input
          max="10"
          min="-10"
          onChange={(event) => {
            const value = Number(event.currentTarget.value);

            setConflictIntensity(
              value,

              conflictIntensity.maxGoldstein,
            );
          }}
          step="0.1"
          type="number"
          value={conflictIntensity.minGoldstein}
        />
      </label>

      <label className="filter-field">
        <span>Maximum Goldstein</span>

        <input
          max="10"
          min="-10"
          onChange={(event) => {
            const value = Number(event.currentTarget.value);

            setConflictIntensity(
              conflictIntensity.minGoldstein,

              value,
            );
          }}
          step="0.1"
          type="number"
          value={conflictIntensity.maxGoldstein}
        />
      </label>

      <label className="checkbox-field">
        <input
          checked={rootEventsOnly}
          onChange={(event) => {
            setRootEventsOnly(event.currentTarget.checked);
          }}
          type="checkbox"
        />

        <span>Root events only</span>
      </label>
    </section>
  );
}
