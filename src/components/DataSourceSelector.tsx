import { useState } from 'react';
import { DataSourceType } from '@/types/market-data';
import { ArrowPathIcon, ChartBarIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';

interface DataSourceSelectorProps {
  onSourceChange: (source: DataSourceType) => void;
  currentSource: DataSourceType;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function DataSourceSelector({ 
  onSourceChange, 
  currentSource, 
  isLoading = false,
  onRefresh 
}: DataSourceSelectorProps) {
  const sources = [
    {
      id: 'market_intelligence',
      name: 'Market Intelligence',
      description: 'Comprehensive market data from our intelligence system',
      icon: ChartBarIcon
    },
    {
      id: 'aggregated_survey',
      name: 'Aggregated Surveys',
      description: 'Combined data from all uploaded surveys',
      icon: DocumentChartBarIcon
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Data Source</h2>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => onSourceChange(source.id as DataSourceType)}
              className={`flex items-start p-4 rounded-lg border-2 transition-colors ${
                currentSource === source.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <source.icon className={`h-6 w-6 mr-3 ${
                currentSource === source.id ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <div className="flex-1 text-left">
                <h3 className={`font-medium ${
                  currentSource === source.id ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {source.name}
                </h3>
                <p className={`text-sm mt-1 ${
                  currentSource === source.id ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  {source.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 