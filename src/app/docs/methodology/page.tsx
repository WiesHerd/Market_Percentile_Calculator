'use client';

import { DocumentTextIcon, ShieldCheckIcon, ChartBarIcon, ScaleIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-semibold text-gray-900">Compliance Methodology</h1>
            </div>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Calculator
            </Link>
          </div>
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <p className="text-blue-800">
              Our compliance methodology ensures physician compensation arrangements align with fair market value
              and commercial reasonableness standards through multiple layers of checks and balances.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Compliance Thresholds Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Compliance Thresholds</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Warning Threshold Card */}
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <h3 className="text-lg font-medium text-yellow-900 mb-2">Warning Threshold (75th Percentile)</h3>
                <p className="text-yellow-800">
                  Compensation arrangements exceeding the 75th percentile trigger a warning notification.
                  While not necessarily problematic, these arrangements warrant additional review and documentation.
                </p>
              </div>

              {/* Flag Threshold Card */}
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <h3 className="text-lg font-medium text-red-900 mb-2">Flag Threshold (90th Percentile)</h3>
                <p className="text-red-800 mb-3">
                  Arrangements exceeding the 90th percentile trigger a compliance flag. These arrangements
                  require thorough documentation, including:
                </p>
                <ul className="list-disc list-inside text-red-800 space-y-1">
                  <li>Detailed justification for the compensation level</li>
                  <li>Market conditions supporting the arrangement</li>
                  <li>Special circumstances or unique qualifications</li>
                  <li>Documentation of commercial reasonableness</li>
                </ul>
              </div>
            </div>
          </div>

          {/* FMV Assessment Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <ScaleIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Fair Market Value (FMV) Assessment</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Our FMV ranges are derived from multiple market surveys and updated annually. The ranges consider:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Location & Setting</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></div>
                      Geographic location
                    </li>
                    <li className="flex items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></div>
                      Practice setting
                    </li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Provider Factors</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></div>
                      Specialty-specific factors
                    </li>
                    <li className="flex items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></div>
                      Experience and qualifications
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                The system maintains a comprehensive audit trail of all calculations, including:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600">
                  <li className="flex items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></div>
                    Timestamp of calculations
                  </li>
                  <li className="flex items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></div>
                    User identification
                  </li>
                  <li className="flex items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></div>
                    Input values and results
                  </li>
                  <li className="flex items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></div>
                    Compliance flags triggered
                  </li>
                  <li className="flex items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></div>
                    FMV assessments
                  </li>
                  <li className="flex items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></div>
                    Documentation references
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 