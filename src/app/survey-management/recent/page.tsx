'use client';

import { useState, useEffect } from 'react';
import { DocumentChartBarIcon, TrashIcon, ArrowTopRightOnSquareIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface RecentSurvey {
  id: string;
  vendor: string;
  uploadTime: string;
  specialtyCount: number;
  mappedFields: number;
  totalDataPoints: number;
}

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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DocumentChartBarIcon className="h-5 w-5 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Recent Uploads</h1>
                <p className="text-sm text-gray-500">View and manage your recently uploaded survey data</p>
              </div>
            </div>
            <Link
              href="/survey-management/upload"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Upload New Survey
            </Link>
          </div>
        </div>

        {/* Survey List */}
        {recentSurveys.length > 0 ? (
          <div className="space-y-4">
            {recentSurveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-gray-300 transition-colors duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">{survey.vendor}</h2>
                    <span className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-full">
                      {formatDistanceToNow(new Date(survey.uploadTime))} ago
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-12">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Specialties</div>
                      <div className="mt-1 text-2xl font-semibold text-gray-900">
                        {survey.specialtyCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Mapped Fields</div>
                      <div className="mt-1 text-2xl font-semibold text-gray-900">
                        {survey.mappedFields}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Data Points</div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">
                          {survey.totalDataPoints}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/survey-management/view-surveys?surveyId=${survey.id}`}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                        <button
                          onClick={() => handleDelete(survey.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg focus:outline-none transition-colors"
                          title="Delete survey"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="px-6 py-12 text-center">
              <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No recent uploads</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                Get started by uploading your first survey data. You can upload market data from various vendors.
              </p>
              <div className="mt-6">
                <Link
                  href="/survey-management/upload"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Upload Survey
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 