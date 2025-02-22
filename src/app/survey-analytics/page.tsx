'use client';

import SurveyAnalytics from '@/components/SurveyAnalytics';
import { SurveyProvider } from '@/context/SurveyContext';

export default function SurveyAnalyticsPage() {
  return (
    <SurveyProvider>
      <div className="container mx-auto px-4 py-8">
        <SurveyAnalytics />
      </div>
    </SurveyProvider>
  );
}
 