'use client';

import { DocumentTextIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function UploadGuidePage() {
  const downloadSampleCSV = () => {
    const headers = 'specialty,geographic_region,n_orgs,n_incumbents,tcc_p25,tcc_p50,tcc_p75,tcc_p90,wrvu_p25,wrvu_p50,wrvu_p75,wrvu_p90,cf_p25,cf_p50,cf_p75,cf_p90\n';
    const sampleData = 'Family Medicine,National,150,1250,220000,250000,280000,320000,4200,4800,5400,6200,45.50,48.75,52.00,56.25\nInternal Medicine,Northeast,125,980,240000,270000,300000,330000,4500,5000,5500,6000,46.50,49.75,53.00,57.25\n';
    const blob = new Blob([headers + sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'survey_data_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto px-8">
        <div className="pt-8 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Upload Specifications</h1>
            <p className="mt-2 text-lg text-gray-600">CSV format requirements and guidelines for survey data uploads</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/survey-management"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Survey Management
            </Link>
            <button
              onClick={downloadSampleCSV}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Download Template
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Format Requirements */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">CSV Format Requirements</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Required Columns</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <span className="font-medium">specialty</span>
                        <p className="text-sm text-gray-600 mt-0.5">Text value (e.g., "Family Medicine")</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <span className="font-medium">geographic_region</span>
                        <p className="text-sm text-gray-600 mt-0.5">Text value (e.g., "National")</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <span className="font-medium">n_orgs</span>
                        <p className="text-sm text-gray-600 mt-0.5">Whole numbers (e.g., 150)</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <span className="font-medium">n_incumbents</span>
                        <p className="text-sm text-gray-600 mt-0.5">Whole numbers (e.g., 1250)</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <span className="font-medium">tcc_p25, tcc_p50, tcc_p75, tcc_p90</span>
                        <p className="text-sm text-gray-600 mt-0.5">Whole numbers representing annual compensation in USD</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <span className="font-medium">wrvu_p25, wrvu_p50, wrvu_p75, wrvu_p90</span>
                        <p className="text-sm text-gray-600 mt-0.5">Whole numbers representing annual work relative value units</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <span className="font-medium">cf_p25, cf_p50, cf_p75, cf_p90</span>
                        <p className="text-sm text-gray-600 mt-0.5">Decimal numbers representing dollars per RVU</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Data Types</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Total Cash Compensation (TCC)</div>
                      <p className="text-sm text-gray-600">Whole numbers representing annual compensation in USD</p>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Work RVUs</div>
                      <p className="text-sm text-gray-600">Whole numbers representing annual work relative value units</p>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Conversion Factor (CF)</div>
                      <p className="text-sm text-gray-600">Decimal numbers representing dollars per RVU</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Example Data</h2>
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-100 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-900">Sample Row</div>
                </div>
                <div className="p-4">
                  <code className="text-sm text-gray-600 break-all font-mono">
                    Family Medicine,National,150,1250,220000,250000,280000,320000,4200,4800,5400,6200,45.50,48.75,52.00,56.25
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tips for Success</h2>
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <ul className="space-y-3 text-sm text-blue-900">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Ensure your CSV file has a header row matching the required column names exactly
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Use the provided template as a starting point for your data
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Verify that numeric values don't include currency symbols or commas
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Double-check that your specialty names are consistent and correctly spelled
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