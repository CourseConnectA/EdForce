import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ReportHome from '@/pages/reports/components/ReportHome';
import NewReportWizard from '@/pages/reports/components/NewReportWizard';
import ReportBuilder from '@/pages/reports/components/ReportBuilder';
import ReportView from '@/pages/reports/components/ReportView';

const ReportsPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ReportHome />} />
      <Route path="/new" element={<NewReportWizard />} />
      <Route path="/builder/:id" element={<ReportBuilder />} />
      <Route path="/view/:id" element={<ReportView />} />
      <Route path="*" element={<Navigate to="/reports" replace />} />
    </Routes>
  );
};

export default ReportsPage;