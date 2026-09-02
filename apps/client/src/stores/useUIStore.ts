import { create } from 'zustand';

export type DashboardPanel = 'events' | 'analytics';

export type MapMode = 'markers' | 'heatmap';

interface EventModal {
  type: 'event-preview';

  eventId: string;
}

type ModalState = EventModal | null;

interface UIState {
  sidebarOpen: boolean;

  filterPanelOpen: boolean;

  activePanel: DashboardPanel;

  mapMode: MapMode;

  modal: ModalState;
}

interface UIActions {
  toggleSidebar: () => void;

  toggleFilterPanel: () => void;

  setActivePanel: (panel: DashboardPanel) => void;

  setMapMode: (mode: MapMode) => void;

  openEventModal: (eventId: string) => void;

  closeModal: () => void;

  resetUI: () => void;
}

type UIStore = UIState & UIActions;

const initialUIState: UIState = {
  sidebarOpen: true,

  filterPanelOpen: true,

  activePanel: 'events',

  mapMode: 'markers',

  modal: null,
};

export const useUIStore = create<UIStore>()((set) => ({
  ...initialUIState,

  toggleSidebar: () => {
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    }));
  },

  toggleFilterPanel: () => {
    set((state) => ({
      filterPanelOpen: !state.filterPanelOpen,
    }));
  },

  setActivePanel: (activePanel) => {
    set({
      activePanel,
    });
  },

  setMapMode: (mapMode) => {
    set({
      mapMode,
    });
  },

  openEventModal: (eventId) => {
    set({
      modal: {
        type: 'event-preview',

        eventId,
      },
    });
  },

  closeModal: () => {
    set({
      modal: null,
    });
  },

  resetUI: () => {
    set({
      ...initialUIState,
    });
  },
}));
