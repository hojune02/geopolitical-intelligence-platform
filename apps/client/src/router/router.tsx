import { createBrowserRouter, redirect } from 'react-router';

import { AppLayout } from '../layouts/AppLayout';

import { DashboardLayout } from '../layouts/DashboardLayout';

import { DashboardPage } from '../pages/DashboardPage';

import { EventDetailPage } from '../pages/EventDetailPage';

import { HeatmapPage } from '../pages/HeatmapPage';

import { NotFoundPage } from '../pages/NotFoundPage';

import { RouteErrorPage } from '../pages/RouteErrorPage';

import { dashboardLoader } from './loaders/dashboard.loader';

import { eventDetailLoader } from './loaders/event-detail.loader';

import { heatmapLoader } from './loaders/heatmap.loader';

export const router = createBrowserRouter([
  {
    path: '/',

    Component: AppLayout,

    ErrorBoundary: RouteErrorPage,

    children: [
      {
        index: true,

        loader: () => redirect('/dashboard'),
      },

      {
        path: 'dashboard',

        Component: DashboardLayout,

        ErrorBoundary: RouteErrorPage,

        children: [
          {
            index: true,

            loader: dashboardLoader,

            Component: DashboardPage,
          },

          {
            path: 'heatmap',

            loader: heatmapLoader,

            Component: HeatmapPage,
          },
        ],
      },

      {
        path: 'events/:eventId',

        loader: eventDetailLoader,

        Component: EventDetailPage,

        ErrorBoundary: RouteErrorPage,
      },

      {
        path: '*',

        Component: NotFoundPage,
      },
    ],
  },
]);
