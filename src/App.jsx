import React from 'react';
import FormadorView from './components/FormadorView';
import DashboardView from './components/DashboardView';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isDashboard = urlParams.get('view') === 'dashboard';

  return isDashboard ? <DashboardView /> : <FormadorView />;
}