'use client';

import { QuestionMarkCircleIcon, BookOpenIcon, CalculatorIcon, ChartBarIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1920px] mx-auto px-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center">
              <QuestionMarkCircleIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-semibold text-gray-900">Help & Documentation</h1>
            </div>
            <p className="mt-2 text-gray-600">
              Learn how to use the Market Intelligence Suite effectively
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {/* Introduction */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About the Application</h2>
              <p className="text-gray-600 mb-4">
                The Market Intelligence Suite is a comprehensive tool designed to help healthcare organizations analyze and manage physician compensation data. It provides powerful features for data analysis, survey management, and market comparisons.
              </p>
            </div>

            {/* Key Features */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Features</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CalculatorIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Percentile Calculator</h3>
                  </div>
                  <p className="text-gray-600">Calculate compensation percentiles and analyze market data for different specialties.</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <DocumentChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Survey Management</h3>
                  </div>
                  <p className="text-gray-600">Upload and manage compensation survey data from multiple sources.</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Market Analysis</h3>
                  </div>
                  <p className="text-gray-600">Analyze compensation trends and compare data across different specialties.</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <BookOpenIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Documentation</h3>
                  </div>
                  <p className="text-gray-600">Comprehensive guides and documentation to help you make the most of the suite.</p>
                </div>
              </div>
            </div>

            {/* Getting Started */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
              <ol className="list-decimal pl-6 space-y-4 text-gray-600">
                <li>
                  <strong className="text-gray-900">Upload Survey Data:</strong>
                  <p>Start by uploading your survey data in the Survey Management section. The system supports various survey formats and vendors.</p>
                </li>
                <li>
                  <strong className="text-gray-900">Map Specialties:</strong>
                  <p>Use the specialty mapping tool to ensure consistent specialty names across different surveys.</p>
                </li>
                <li>
                  <strong className="text-gray-900">Analyze Data:</strong>
                  <p>Navigate to the Market Analysis section to view comprehensive data analysis and comparisons.</p>
                </li>
                <li>
                  <strong className="text-gray-900">Export Results:</strong>
                  <p>Export your analysis results in various formats for reporting and presentation.</p>
                </li>
              </ol>
            </div>

            {/* Support */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help?</h2>
              <p className="text-gray-600">
                For additional support or questions, please reach out through the contact information provided in the About Me section.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 