import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import Layout from '@components/layout/MainLayout';
import Login from '@modules/auth/Login';
import Dashboard from '@modules/dashboard/Dashboard';
import Contacts from '@modules/contacts/Contacts';
import Organizations from '@modules/organizations/Organizations';
import Leads from '@modules/leads/Leads';
import Deals from '@modules/deals/Deals';
import Activities from '@modules/activities/Activities';
import Email from '@modules/email/Email';
import Providers from '@modules/providers/Providers';
import Tasks from '@modules/tasks/Tasks';
import Calls from '@modules/calls/Calls';
import Settings from '@modules/settings/Settings';
import PublicDirectory from '@modules/public-directory/PublicDirectory';
import { useAuthStore } from '@stores/authStore';

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/public" element={<PublicDirectory />} />
        
        {/* Protected Routes */}
        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="leads" element={<Leads />} />
          <Route path="deals" element={<Deals />} />
          <Route path="activities" element={<Activities />} />
          <Route path="email" element={<Email />} />
          <Route path="providers" element={<Providers />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calls" element={<Calls />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </ConfigProvider>
  );
};

export default App;
