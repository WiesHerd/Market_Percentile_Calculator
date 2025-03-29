'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowUpTrayIcon,
  EyeIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ArrowsRightLeftIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface SurveyUpload {
  id: string;
  vendor: string;
  uploadTime: string;
  fileName: string;
  fileSize: number;
  uploadStatus: 'success' | 'error' | 'processing';
}

interface SurveyMappings {
  specialty: string;
  tcc: {
    p25: string;
    p50: string;
    p75: string;
    p90: string;
  };
  wrvu: {
    p25: string;
    p50: string;
    p75: string;
    p90: string;
  };
  cf: {
    p25: string;
    p50: string;
    p75: string;
    p90: string;
  };
}

interface SurveyRow {
  [key: string]: string | number;
}

export default function UploadHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof SurveyUpload>('uploadTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [uploadedSurveys, setUploadedSurveys] = useState<SurveyUpload[]>([]);

  useEffect(() => {
    const loadSurveys = async () => {
      try {
        // Fetch surveys from the API
        const response = await fetch('/api/surveys');
        if (!response.ok) {
          throw new Error('Failed to fetch surveys');
        }
        const dbSurveys = await response.json();
        setUploadedSurveys(dbSurveys);
      } catch (error) {
        console.error('Error loading surveys:', error);
      }
    };

    loadSurveys();
  }, []);

  const formatVendorName = (vendor: string): string => {
    const vendorMap: Record<string, string> = {
      'mgma': 'MGMA',
      'MGMA': 'MGMA',
      'sullivan': 'SullivanCotter',
      'sullivancotter': 'SullivanCotter',
      'SULLIVANCOTTER': 'SullivanCotter',
      'SULLIVAN': 'SullivanCotter',
      'SULLIVAN COTTER': 'SullivanCotter',
      'SULLIVAN-COTTER': 'SullivanCotter',
      'gallagher': 'Gallagher',
      'GALLAGHER': 'Gallagher'
    };
    return vendorMap[vendor.toLowerCase()] || vendor;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const handleSort = (field: keyof SurveyUpload) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (window.confirm('Are you sure you want to delete this survey?')) {
      try {
        // Delete from database
        const response = await fetch(`/api/surveys?id=${surveyId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete survey from database');
        }

        // Update the UI
        setUploadedSurveys(prev => prev.filter(survey => survey.id !== surveyId));
        toast.success('Survey deleted successfully');
      } catch (error) {
        console.error('Error deleting survey:', error);
        toast.error('Failed to delete survey. Please try again.');
      }
    }
  };

  const handleExport = (surveyId: string) => {
    try {
      const survey = uploadedSurveys.find(s => s.id === surveyId);
      if (!survey) return;

      // Create CSV content
      const headers = [
        'Specialty',
        'TCC P25', 'TCC P50', 'TCC P75', 'TCC P90',
        'WRVU P25', 'WRVU P50', 'WRVU P75', 'WRVU P90',
        'CF P25', 'CF P50', 'CF P75', 'CF P90'
      ];

      const rows = survey.data.map((row: any) => [
        row.specialty,
        row.tccP25,
        row.tccP50,
        row.tccP75,
        row.tccP90,
        row.wrvuP25,
        row.wrvuP50,
        row.wrvuP75,
        row.wrvuP90,
        row.cfP25,
        row.cfP50,
        row.cfP75,
        row.cfP90
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${formatVendorName(survey.vendor)}_${survey.year || 'export'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting survey:', error);
      toast.error('Failed to export survey');
    }
  };

  let surveys = uploadedSurveys;

  // Apply search filter
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    surveys = surveys.filter(survey => 
      formatVendorName(survey.vendor).toLowerCase().includes(searchLower)
    );
  }

  // Sort surveys
  const sortedSurveys = [...surveys].sort((a: SurveyUpload, b: SurveyUpload) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mt-8 mb-6 overflow-hidden">
          <div className="bg-blue-50 px-6 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Upload History</h1>
                  <p className="mt-2 text-gray-600 max-w-2xl">
                    View and manage your uploaded survey files
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search vendors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <Link
                  href="/survey-management"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Upload New Survey
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th scope="col" className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('vendor')}
                      className="group inline-flex items-center space-x-2 text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      <span>Vendor</span>
                      <span className="flex-none rounded text-gray-400 group-hover:text-blue-600">
                        {sortField === 'vendor' ? (
                          sortDirection === 'desc' ? (
                            <ChevronDownIcon className="h-5 w-5" />
                          ) : (
                            <ChevronUpIcon className="h-5 w-5" />
                          )
                        ) : (
                          <ChevronUpIcon className="h-5 w-5 invisible group-hover:visible" />
                        )}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('fileName')}
                      className="group inline-flex items-center space-x-2 text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      <span>File Name</span>
                      <span className="flex-none rounded text-gray-400 group-hover:text-blue-600">
                        {sortField === 'fileName' ? (
                          sortDirection === 'desc' ? (
                            <ChevronDownIcon className="h-5 w-5" />
                          ) : (
                            <ChevronUpIcon className="h-5 w-5" />
                          )
                        ) : (
                          <ChevronUpIcon className="h-5 w-5 invisible group-hover:visible" />
                        )}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('uploadTime')}
                      className="group inline-flex items-center space-x-2 text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      <span>Upload Date</span>
                      <span className="flex-none rounded text-gray-400 group-hover:text-blue-600">
                        {sortField === 'uploadTime' ? (
                          sortDirection === 'desc' ? (
                            <ChevronDownIcon className="h-5 w-5" />
                          ) : (
                            <ChevronUpIcon className="h-5 w-5" />
                          )
                        ) : (
                          <ChevronUpIcon className="h-5 w-5 invisible group-hover:visible" />
                        )}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('fileSize')}
                      className="group inline-flex items-center space-x-2 text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      <span>File Size</span>
                      <span className="flex-none rounded text-gray-400 group-hover:text-blue-600">
                        {sortField === 'fileSize' ? (
                          sortDirection === 'desc' ? (
                            <ChevronDownIcon className="h-5 w-5" />
                          ) : (
                            <ChevronUpIcon className="h-5 w-5" />
                          )
                        ) : (
                          <ChevronUpIcon className="h-5 w-5 invisible group-hover:visible" />
                        )}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-gray-900">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedSurveys.map((survey, index) => (
                  <tr 
                    key={survey.id} 
                    className={`
                      ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      hover:bg-blue-50 transition-colors duration-150 ease-in-out
                    `}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatVendorName(survey.vendor)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{survey.fileName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(survey.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(survey.uploadTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <Link
                          href={`/survey-management/view-surveys?surveyId=${survey.id}`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                          title="View Survey"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleExport(survey.id)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                          title="Export Survey"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(survey.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                          title="Delete Survey"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedSurveys.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12">
                      <div className="text-center">
                        <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No uploads found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {searchTerm 
                            ? 'Try adjusting your search terms or clear the search'
                            : 'Get started by uploading your first survey'}
                        </p>
                        {!searchTerm && (
                          <div className="mt-6">
                            <Link
                              href="/survey-management"
                              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                              Upload New Survey
                            </Link>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 