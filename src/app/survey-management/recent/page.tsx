'use client';

import { useState, useEffect } from 'react';
import { DocumentChartBarIcon, TrashIcon, ArrowTopRightOnSquareIcon, ArrowUpTrayIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';

interface RecentSurvey {
  id: string;
  vendor: string;
  uploadTime: string;
  specialtyCount: number;
  mappedFields: number;
  totalDataPoints: number;
}

const formatVendorName = (vendor: string): string => {
  const vendorMap: Record<string, string> = {
    'MGMA': 'MGMA',
    'GALLAGHER': 'Gallagher',
    'SULLIVANCOTTER': 'SullivanCotter',
    'SULLIVAN': 'SullivanCotter',
    'SULLIVAN COTTER': 'SullivanCotter',
    'SULLIVAN-COTTER': 'SullivanCotter',
    'ECG': 'ECG Management',
    'AAMGA': 'AAMGA',
    'MERRIT_HAWKINS': 'Merrit Hawkins'
  };
  
  if (vendor.startsWith('CUSTOM:')) {
    return vendor.replace('CUSTOM:', '');
  }
  return vendorMap[vendor.toUpperCase()] || vendor;
};

export default function RecentUploadsPage() {
  const [recentSurveys, setRecentSurveys] = useState<RecentSurvey[]>([]);

  useEffect(() => {
    // Load surveys from localStorage
    const loadSurveys = () => {
      const storedSurveys = localStorage.getItem('uploadedSurveys');
      if (storedSurveys) {
        const surveys = JSON.parse(storedSurveys);
        const processedSurveys = surveys.map((survey: any) => ({
          id: survey.id,
          vendor: survey.vendor,
          uploadTime: survey.uploadTime || new Date().toISOString(),
          specialtyCount: survey.data?.length || 0,
          mappedFields: Object.keys(survey.mappings || {}).length,
          totalDataPoints: survey.data?.reduce((acc: number, row: any) => acc + Object.keys(row).length, 0) || 0
        }));
        setRecentSurveys(processedSurveys);
      }
    };

    loadSurveys();
  }, []);

  const handleDelete = (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this survey?');
    if (!confirmed) return;

    const storedSurveys = localStorage.getItem('uploadedSurveys');
    if (storedSurveys) {
      const surveys = JSON.parse(storedSurveys);
      const updatedSurveys = surveys.filter((survey: any) => survey.id !== id);
      localStorage.setItem('uploadedSurveys', JSON.stringify(updatedSurveys));
      setRecentSurveys(prev => prev.filter(survey => survey.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1920px] mx-auto px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DocumentChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Recent Uploads</h1>
                  <p className="mt-2 text-gray-600">
                    View and manage your recently uploaded survey data
                  </p>
                </div>
              </div>
              <Link
                href="/survey-management/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                Upload New Survey
              </Link>
            </div>
          </div>
        </div>

        {/* Survey Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentSurveys.map((survey) => (
            <div
              key={survey.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-all duration-200"
            >
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      <ChartBarIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        {formatVendorName(survey.vendor)}
                      </h2>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-500">
                          Uploaded {format(new Date(survey.uploadTime), 'MMM d, yyyy')} at {format(new Date(survey.uploadTime), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(survey.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete survey"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Specialties</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">
                      {survey.specialtyCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Fields</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">
                      {survey.mappedFields}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Data Points</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">
                      {survey.totalDataPoints}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/survey-management/view-surveys?surveyId=${survey.id}`}
                    className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {recentSurveys.length === 0 && (
            <div className="col-span-full">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-12 text-center">
                <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No surveys uploaded yet</h3>
                <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                  Get started by uploading your first survey data. You can upload market data from various vendors.
                </p>
                <div className="mt-6">
                  <Link
                    href="/survey-management/upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                    Upload First Survey
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 