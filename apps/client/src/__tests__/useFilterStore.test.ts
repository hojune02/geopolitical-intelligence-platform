import { beforeEach, describe, expect, it } from 'vitest';

import { useFilterStore } from '../stores/useFilterStore';

describe('useFilterStore', () => {
  beforeEach(() => {
    useFilterStore.getState().resetFilters();
  });

  it('updates active region', () => {
    useFilterStore.getState().setActiveRegion('europe');

    expect(useFilterStore.getState().activeRegion).toBe('europe');
  });

  it('updates the root-events filter', () => {
    useFilterStore.getState().setRootEventsOnly(true);

    expect(useFilterStore.getState().rootEventsOnly).toBe(true);
  });

  it('restores defaults', () => {
    useFilterStore.getState().setActiveRegion('east-asia');

    useFilterStore.getState().setRootEventsOnly(true);

    useFilterStore.getState().resetFilters();

    const state = useFilterStore.getState();

    expect(state.activeRegion).toBe('global');

    expect(state.rootEventsOnly).toBe(false);
  });
});
