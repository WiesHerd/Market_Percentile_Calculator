'use client';

import { BookOpenIcon } from '@heroicons/react/24/outline';

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-5">
            <div className="flex items-center mb-2">
              <BookOpenIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-semibold text-gray-900">Documentation</h1>
            </div>
            <p className="text-gray-600">
              Guide to using the Market Intelligence Suite's features and screens
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Calculator Screen */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Main Calculator Screen</h2>
              <div className="prose prose-blue max-w-none">
                <p className="text-gray-600 mb-4">
                  The main calculator screen is your primary tool for analyzing individual provider compensation. Here's what you can do:
                </p>
                <ul className="space-y-3 text-gray-600">
                  <li>Enter provider details including name and specialty</li>
                  <li>Input compensation values and select metrics (Total Cash Compensation, Work RVUs, or Conversion Factor)</li>
                  <li>View percentile results with automatic FTE normalization</li>
                  <li>Save calculations to history for later reference</li>
                  <li>Compare results against market benchmarks</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Market Data Screen */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Market Data Screen</h2>
              <div className="prose prose-blue max-w-none">
                <p className="text-gray-600 mb-4">
                  The market data screen provides comprehensive benchmark data across specialties:
                </p>
                <ul className="space-y-3 text-gray-600">
                  <li>View complete percentile data (25th, 50th, 75th, 90th) for all specialties</li>
                  <li>Search and filter specialties easily</li>
                  <li>Upload custom market data via CSV</li>
                  <li>Access detailed breakdowns of TCC, Work RVUs, and Conversion Factors</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Specialty Comparison Screens */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Specialty Comparison Tools</h2>
              
              <div className="prose prose-blue max-w-none space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Single Specialty Analysis</h3>
                  <p className="text-gray-600 mb-3">
                    Use this when you need deep insights into a single specialty's compensation patterns:
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li>Comprehensive market position analysis</li>
                    <li>Detailed percentile breakdowns across all metrics</li>
                    <li>Statistical analysis including variation and trends</li>
                    <li>Visual representations of compensation patterns</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Specialty Comparison Analysis</h3>
                  <p className="text-gray-600 mb-3">
                    Perfect for when you need to compare two specialties side by side:
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li>Direct percentile-to-percentile comparisons</li>
                    <li>Compensation differential analysis</li>
                    <li>Productivity and conversion factor comparisons</li>
                    <li>Market positioning insights between specialties</li>
                  </ul>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">When to Use Each View</h3>
                  <ul className="space-y-2 text-blue-800">
                    <li><strong>Single Specialty:</strong> When you need detailed insights into market patterns, compensation structures, and statistical analysis for one specialty.</li>
                    <li><strong>Specialty Comparison:</strong> When evaluating compensation differences between specialties, analyzing market position disparities, or making strategic decisions about different specialty lines.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Data Management Tips */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Working with Data</h2>
              <div className="prose prose-blue max-w-none">
                <p className="text-gray-600 mb-4">
                  Tips for getting the most accurate results:
                </p>
                <ul className="space-y-3 text-gray-600">
                  <li>Always ensure compensation values are annualized</li>
                  <li>Use FTE-adjusted values for part-time providers</li>
                  <li>Consider market data age when analyzing results</li>
                  <li>Review all percentile results for comprehensive analysis</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 