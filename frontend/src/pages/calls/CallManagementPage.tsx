import React from 'react';
import CallAnalyticsWidget from '@/components/analytics/CallAnalyticsWidget';

const CallManagementPage: React.FC = () => {
  return (
    <CallAnalyticsWidget 
      useChartTypeIcons={true}
      showPageHeader={true}
      pageTitle="Call Management"
    />
  );
};

export default CallManagementPage;
