import React, { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, ArrowUpTrayIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';

interface UploadedSurvey {
  id: string;
  vendor: string;
  year: string;
  data: Array<{
    specialty: string;
    tcc?: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
    wrvu?: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
    cf?: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
  }>;
}

interface UploadedSurveysViewProps {
  surveys: UploadedSurvey[];
  onSurveySelect: (surveyId: string) => void;
  selectedSurveyId?: string;
}

const formatVendorName = (vendor: string): string => {
  const vendorMap: Record<string, string> = {
    'MGMA': 'MGMA',
    'GALLAGHER': 'Gallagher',
    'SULLIVANCOTTER': 'SullivanCotter',
    'SULLIVAN': 'SullivanCotter',
    'SULLIVAN COTTER': 'SullivanCotter',
    'SULLIVAN-COTTER': 'SullivanCotter'
  };
  return vendorMap[vendor.toUpperCase()] || vendor;
};

export const UploadedSurveysView: React.FC<UploadedSurveysViewProps> = ({
  surveys,
  onSurveySelect,
  selectedSurveyId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: 'vendor' | 'year' | 'specialties';
    direction: 'asc' | 'desc';
  }>({ key: 'year', direction: 'desc' });

  const filteredAndSortedSurveys = useMemo(() => {
    let filtered = surveys;
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(survey => 
        survey.vendor.toLowerCase().includes(searchLower) ||
        survey.year.toLowerCase().includes(searchLower) ||
        survey.data.some(d => d.specialty.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.key) {
        case 'vendor':
          comparison = formatVendorName(a.vendor).localeCompare(formatVendorName(b.vendor));
          break;
        case 'year':
          comparison = a.year.localeCompare(b.year);
          break;
        case 'specialties':
          comparison = a.data.length - b.data.length;
          break;
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [surveys, searchTerm, sortConfig]);

  const handleSort = (key: 'vendor' | 'year' | 'specialties') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: 'vendor' | 'year' | 'specialties') => {
    if (sortConfig.key !== key) return null;
    return (
      <span className="ml-1">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="max-w-xs w-full">
            <label htmlFor="search" className="sr-only">Search surveys</label>
            <div className="relative">
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search surveys..."
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Surveys Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('vendor')}
                >
                  Vendor {getSortIcon('vendor')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('year')}
                >
                  Year {getSortIcon('year')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('specialties')}
                >
                  Specialties {getSortIcon('specialties')}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedSurveys.map((survey) => (
                <tr
                  key={survey.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    selectedSurveyId === survey.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onSurveySelect(survey.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatVendorName(survey.vendor)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{survey.year}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {survey.data.length} specialties
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSurveySelect(survey.id);
                      }}
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md ${
                        selectedSurveyId === survey.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <DocumentChartBarIcon className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedSurveys.length === 0 && (
          <div className="text-center py-12">
            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Upload a survey to get started'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 