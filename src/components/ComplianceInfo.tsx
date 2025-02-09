import { ComplianceCheck, FairMarketValue } from '@/types/logs';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { getComplianceMethodologyLink } from '@/utils/compliance';

interface ComplianceInfoProps {
  complianceChecks: ComplianceCheck[];
  fairMarketValue?: FairMarketValue;
  metric: 'total' | 'wrvu' | 'cf';
}

export function ComplianceInfo({ complianceChecks, fairMarketValue, metric }: ComplianceInfoProps) {
  const methodologyLink = getComplianceMethodologyLink(metric);

  return (
    <div className="mt-6 space-y-4">
      {/* Compliance Checks */}
      {complianceChecks.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Compliance Checks</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {complianceChecks.map((check) => (
              <div
                key={check.id}
                className={`p-4 flex items-start space-x-3 ${
                  check.type === 'flag'
                    ? 'bg-red-50'
                    : check.type === 'warning'
                    ? 'bg-yellow-50'
                    : 'bg-blue-50'
                }`}
              >
                {check.type === 'flag' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
                ) : check.type === 'warning' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                ) : (
                  <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      check.type === 'flag'
                        ? 'text-red-800'
                        : check.type === 'warning'
                        ? 'text-yellow-800'
                        : 'text-blue-800'
                    }`}
                  >
                    {check.type === 'flag'
                      ? 'Compliance Flag'
                      : check.type === 'warning'
                      ? 'Warning'
                      : 'Information'}
                  </p>
                  <p
                    className={`mt-1 text-sm ${
                      check.type === 'flag'
                        ? 'text-red-700'
                        : check.type === 'warning'
                        ? 'text-yellow-700'
                        : 'text-blue-700'
                    }`}
                  >
                    {check.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fair Market Value Information */}
      {fairMarketValue && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Fair Market Value Range</h3>
          </div>
          <div className="p-4">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Minimum</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {fairMarketValue.min.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Maximum</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {fairMarketValue.max.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  })}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Source</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {fairMarketValue.source} (Updated: {new Date(fairMarketValue.lastUpdated).toLocaleDateString()})
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Methodology Link */}
      <div className="text-sm">
        <Link
          href="/docs/methodology"
          className="text-blue-600 hover:text-blue-500 font-medium inline-flex items-center"
        >
          <InformationCircleIcon className="h-4 w-4 mr-1" />
          View Compliance Methodology
        </Link>
      </div>
    </div>
  );
} 