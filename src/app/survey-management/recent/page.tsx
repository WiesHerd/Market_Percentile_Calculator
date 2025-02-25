'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpTrayIcon,
  EyeIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface SurveyUpload {
  id: string;
  vendor: string;
  uploadTime: string;
  specialties: number;
  mappedFields: number;
  dataPoints: number;
}

export default function UploadHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof SurveyUpload>('uploadTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load surveys from localStorage
  const loadSurveys = (): SurveyUpload[] => {
    try {
      const storedSurveys = localStorage.getItem('uploadedSurveys');
      if (storedSurveys) {
        const parsedSurveys = JSON.parse(storedSurveys);
        return parsedSurveys.map((survey: any) => {
          const specialties = new Set(
            survey.data.map((row: any) => String(row[survey.mappings.specialty] || '')).filter(Boolean)
          );
          
          return {
            id: survey.id,
            vendor: survey.vendor,
            uploadTime: survey.uploadTime || 'Unknown',
            specialties: specialties.size,
            mappedFields: Object.keys(survey.mappings).length,
            dataPoints: survey.data.length,
          };
        });
      }
    } catch (error) {
      console.error('Error loading surveys:', error);
    }
    return [];
  };

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

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this survey?')) return;
    
    try {
      const storedSurveys = localStorage.getItem('uploadedSurveys');
      if (storedSurveys) {
        const surveys = JSON.parse(storedSurveys);
        const updatedSurveys = surveys.filter((s: any) => s.id !== id);
        localStorage.setItem('uploadedSurveys', JSON.stringify(updatedSurveys));
        // Force re-render
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      }
    } catch (error) {
      console.error('Error deleting survey:', error);
    }
  };

  let surveys = loadSurveys();

  // Apply search filter
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    surveys = surveys.filter(survey => 
      formatVendorName(survey.vendor).toLowerCase().includes(searchLower)
    );
  }

  // Apply sorting
  surveys.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'uploadTime') {
      comparison = new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime();
    } else {
      comparison = String(a[sortField]).localeCompare(String(b[sortField]));
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Upload History</h1>
                <p className="mt-1 text-sm text-gray-500">
                  View and manage your uploaded survey data
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search vendors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <Link
                  href="/survey-management"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Upload New Survey
                </Link>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('vendor')}
                      className="group inline-flex items-center space-x-1"
                    >
                      <span>Vendor</span>
                      <span className="flex-none rounded text-gray-400 group-hover:visible group-focus:visible">
                        {sortField === 'vendor' ? (
                          sortDirection === 'desc' ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronUpIcon className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronUpIcon className="h-4 w-4 invisible group-hover:visible" />
                        )}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('uploadTime')}
                      className="group inline-flex items-center space-x-1"
                    >
                      <span>Upload Date</span>
                      <span className="flex-none rounded text-gray-400 group-hover:visible group-focus:visible">
                        {sortField === 'uploadTime' ? (
                          sortDirection === 'desc' ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronUpIcon className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronUpIcon className="h-4 w-4 invisible group-hover:visible" />
                        )}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('specialties')}
                      className="group inline-flex items-center space-x-1"
                    >
                      <span>Specialties</span>
                      <span className="flex-none rounded text-gray-400 group-hover:visible group-focus:visible">
                        {sortField === 'specialties' ? (
                          sortDirection === 'desc' ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronUpIcon className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronUpIcon className="h-4 w-4 invisible group-hover:visible" />
                        )}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('mappedFields')}
                      className="group inline-flex items-center space-x-1"
                    >
                      <span>Mapped Fields</span>
                      <span className="flex-none rounded text-gray-400 group-hover:visible group-focus:visible">
                        {sortField === 'mappedFields' ? (
                          sortDirection === 'desc' ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronUpIcon className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronUpIcon className="h-4 w-4 invisible group-hover:visible" />
                        )}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('dataPoints')}
                      className="group inline-flex items-center space-x-1"
                    >
                      <span>Data Points</span>
                      <span className="flex-none rounded text-gray-400 group-hover:visible group-focus:visible">
                        {sortField === 'dataPoints' ? (
                          sortDirection === 'desc' ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronUpIcon className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronUpIcon className="h-4 w-4 invisible group-hover:visible" />
                        )}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatVendorName(survey.vendor)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(survey.uploadTime)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{survey.specialties}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{survey.mappedFields}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{survey.dataPoints}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <Link
                          href={`/survey-management/view-surveys?surveyId=${survey.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(survey.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {surveys.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <p className="text-sm font-medium">No uploads found</p>
                        <p className="text-xs mt-1">
                          {searchTerm ? 'Try adjusting your search' : 'Upload a survey to get started'}
                        </p>
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