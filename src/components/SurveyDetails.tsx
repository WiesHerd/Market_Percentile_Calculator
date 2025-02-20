import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SurveyData {
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
}

interface SurveyDetailsProps {
  vendor: string;
  year: string;
  data: SurveyData[];
}

const formatValue = (value: number | undefined, type: 'tcc' | 'wrvu' | 'cf'): string => {
  if (value === undefined) return 'N/A';
  
  if (type === 'tcc') {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  } else if (type === 'wrvu') {
    return value.toLocaleString('en-US', {
      maximumFractionDigits: 2
    });
  } else {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
};

export const SurveyDetails: React.FC<SurveyDetailsProps> = ({
  vendor,
  year,
  data
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'tcc' | 'wrvu' | 'cf'>('tcc');

  const filteredData = data.filter(item =>
    item.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'tcc', name: 'Total Cash Compensation', available: data.some(d => d.tcc) },
    { id: 'wrvu', name: 'Work RVUs', available: data.some(d => d.wrvu) },
    { id: 'cf', name: 'Conversion Factor', available: data.some(d => d.cf) }
  ] as const;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {vendor} {year} Survey Data
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {data.length} specialties available
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="max-w-xs w-full">
            <label htmlFor="specialty-search" className="sr-only">Search specialties</label>
            <div className="relative">
              <input
                type="text"
                id="specialty-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search specialties..."
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map(tab => 
              tab.available && (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.name}
                </button>
              )
            )}
          </nav>
        </div>

        {/* Data Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                  Specialty
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  25th
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  50th
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  75th
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  90th
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item, index) => {
                const metrics = item[activeTab];
                return (
                  <tr key={item.specialty} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit">
                      {item.specialty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {metrics ? formatValue(metrics.p25, activeTab) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {metrics ? formatValue(metrics.p50, activeTab) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {metrics ? formatValue(metrics.p75, activeTab) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {metrics ? formatValue(metrics.p90, activeTab) : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-sm font-medium text-gray-900">No specialties found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms' : 'No specialties available in this survey'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 