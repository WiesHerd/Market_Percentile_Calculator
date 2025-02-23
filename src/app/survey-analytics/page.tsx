'use client';

import React from 'react';
import { SurveyProvider } from '@/context/SurveyContext';
import { default as SurveyAnalytics } from '@/components/SurveyAnalytics';

export default function SurveyAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-8 sm:px-12 lg:px-8">
        <SurveyProvider>
          <SurveyAnalytics />
        </SurveyProvider>
      </div>
    </div>
  );
}
 