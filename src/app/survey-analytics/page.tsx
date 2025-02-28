'use client';

import React, { useRef } from 'react';
import { SurveyProvider } from '@/context/SurveyContext';
import { default as SurveyAnalytics } from '@/components/SurveyAnalytics';
import { ChartBarIcon, PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function SurveyAnalyticsPage() {
  const analyticsRef = useRef<{ handlePrint: () => void; handleExcelExport: () => void; } | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mt-8 mb-6 overflow-hidden">
          <div className="bg-blue-50 px-6 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <ChartBarIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Survey Analytics</h1>
                  <p className="mt-2 text-gray-600 max-w-2xl">
                    Analyze and compare compensation data across different specialties and surveys
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => analyticsRef.current?.handlePrint()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print
                </button>
                <button
                  onClick={() => analyticsRef.current?.handleExcelExport()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <SurveyProvider>
              <SurveyAnalytics ref={analyticsRef} />
            </SurveyProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
 