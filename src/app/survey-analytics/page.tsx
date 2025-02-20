'use client';

import React from 'react';
import { SurveyProvider } from '@/context/SurveyContext';
import { default as SurveyAnalytics } from '@/components/SurveyAnalytics';

export default function SurveyAnalyticsPage() {
  return (
    <SurveyProvider>
      <SurveyAnalytics />
    </SurveyProvider>
  );
}
 