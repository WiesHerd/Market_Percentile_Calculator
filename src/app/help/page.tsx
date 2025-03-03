'use client';

import { QuestionMarkCircleIcon, BookOpenIcon, CalculatorIcon, ChartBarIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mt-8 mb-6">
          <div className="px-6 py-8">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-50 rounded-lg p-2">
                <QuestionMarkCircleIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Help & Documentation</h1>
                <p className="mt-2 text-gray-600 max-w-2xl">
                  Learn how to use the Market Intelligence Suite effectively
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            {/* Introduction */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About the Application</h2>
              <p className="text-gray-600 mb-4">
                The Market Intelligence Suite is a comprehensive tool designed to help healthcare organizations analyze and manage physician compensation data. It provides powerful features for data analysis, survey management, and market comparisons. With support for multiple data sources and advanced specialty mapping capabilities, the suite helps standardize and analyze compensation data efficiently.
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
                  <p className="text-gray-600">Calculate compensation percentiles and analyze market data for different specialties. Features include:</p>
                  <ul className="mt-2 list-disc pl-5 text-gray-600">
                    <li>Total Cash Compensation (TCC) analysis</li>
                    <li>Work RVU calculations</li>
                    <li>Compensation Factor (CF) computations</li>
                    <li>Multiple percentile points (25th, 50th, 75th, 90th)</li>
                  </ul>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <DocumentChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Survey Management</h3>
                  </div>
                  <p className="text-gray-600">Comprehensive survey data management system with:</p>
                  <ul className="mt-2 list-disc pl-5 text-gray-600">
                    <li>CSV and Excel file support</li>
                    <li>Intelligent specialty mapping</li>
                    <li>Synonym management for specialties</li>
                    <li>Historical data tracking</li>
                  </ul>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Market Analysis</h3>
                  </div>
                  <p className="text-gray-600">Advanced market analysis tools including:</p>
                  <ul className="mt-2 list-disc pl-5 text-gray-600">
                    <li>Survey aggregation across multiple sources</li>
                    <li>Specialty comparison tools</li>
                    <li>Trend analysis capabilities</li>
                    <li>Custom report generation</li>
                  </ul>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <BookOpenIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Documentation</h3>
                  </div>
                  <p className="text-gray-600">Complete documentation covering:</p>
                  <ul className="mt-2 list-disc pl-5 text-gray-600">
                    <li>Step-by-step user guides</li>
                    <li>Data format specifications</li>
                    <li>Best practices and tips</li>
                    <li>Troubleshooting guides</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Getting Started */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
              <ol className="list-decimal pl-6 space-y-4 text-gray-600">
                <li>
                  <strong className="text-gray-900">Upload Survey Data:</strong>
                  <p>Start by uploading your survey data in the Survey Management section. The system supports CSV files with standard headers including specialty names, compensation metrics (TCC, WRVU, CF), and percentile data. Ensure your data follows the required format - you can download a template from the upload page.</p>
                </li>
                <li>
                  <strong className="text-gray-900">Map Specialties:</strong>
                  <p>Use the specialty mapping tool to ensure consistent specialty names across different surveys. The system provides intelligent mapping suggestions and allows you to manage specialty synonyms. This step is crucial for accurate data aggregation and comparison.</p>
                </li>
                <li>
                  <strong className="text-gray-900">Analyze Data:</strong>
                  <p>Navigate to the Market Analysis section to view comprehensive data analysis and comparisons. You can aggregate data across multiple surveys, compare specialties, and analyze trends. The system automatically calculates key metrics and presents them in an easy-to-understand format.</p>
                </li>
                <li>
                  <strong className="text-gray-900">Export Results:</strong>
                  <p>Export your analysis results in various formats for reporting and presentation. The system generates detailed reports including percentile calculations, comparative analyses, and trend data. You can customize the export format to match your reporting needs.</p>
                </li>
              </ol>
            </div>

            {/* Support */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help?</h2>
              <p className="text-gray-600 mb-4">
                For additional support or questions, please reach out through the contact information provided in the About Me section. Common support topics include:
              </p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>Data format requirements and troubleshooting</li>
                <li>Specialty mapping assistance</li>
                <li>Analysis methodology questions</li>
                <li>Feature requests and feedback</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 