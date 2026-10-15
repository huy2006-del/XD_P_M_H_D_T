import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import FleetDashboard from '../features/fleet/pages/FleetDashboard';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/admin/machines" element={<FleetDashboard />} />
      <Route path="*" element={<Navigate to="/admin/machines" replace />} />
    </Routes>
  );
};

Huy 
import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { RequireAuth, RequireRole } from './guards';
import AdminLayout from '@/layouts/AdminLayout';

const ProductListPage = lazy(() =>
  import('@/features/products/pages/ProductListPage').then((m) => ({ default: m.ProductListPage }))
);

export const router = createBrowserRouter([
  {
    path: ROUTES.ADMIN.ROOT,
    element: (
      <RequireAuth>
        <RequireRole roles={['ADMIN']}>
          <AdminLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <div>Dashboard</div> },
      { path: 'products', element: <ProductListPage /> }, // ← FE 2 route
      { path: 'machines', element: <div>Machines (FE 3)</div> },
    ],
  },
]);
