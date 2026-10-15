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
