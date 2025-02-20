'use client';

import React from 'react';
import { SurveyProvider } from '@/context/SurveyContext';
import { default as SurveyAnalytics } from '@/components/SurveyAnalytics';

export default function SurveyAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <SurveyProvider>
          <SurveyAnalytics />
        </SurveyProvider>
      </div>
    </div>
  );
}
 