'use client';

import React from 'react';
import Link from 'next/link';
import {
  CalculatorIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  ArrowsRightLeftIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Percentile Calculator',
    description: 'Calculate compensation percentiles and analyze market data',
    href: '/',
    icon: CalculatorIcon,
    color: 'bg-blue-500'
  },
  {
    name: 'Survey Management',
    description: 'Upload and manage compensation survey data',
    href: '/survey-management',
    icon: DocumentChartBarIcon,
    color: 'bg-purple-500'
  },
  {
    name: 'Specialty Review',
    description: 'Analyze compensation data by specialty',
    href: '/survey-analytics',
    icon: ChartBarIcon,
    color: 'bg-green-500'
  },
  {
    name: 'Compare Specialties',
    description: 'Compare compensation data across different specialties',
    href: '/compare-specialties',
    icon: ArrowsRightLeftIcon,
    color: 'bg-orange-500'
  }
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Market Intelligence Suite</h1>
          <p className="mt-2 text-lg text-gray-600">
            Access your compensation analytics tools and manage survey data
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 mb-8">
          {features.map((feature) => (
            <Link
              key={feature.name}
              href={feature.href}
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 transition-colors"
            >
              <div>
                <span className={`inline-flex p-3 rounded-lg ${feature.color} text-white ring-4 ring-white`}>
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {feature.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {feature.description}
                </p>
              </div>
              <span
                className="absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
                aria-hidden="true"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        {/* Quick Tips Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Tips</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <ArrowUpTrayIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">Upload New Survey</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start by uploading your survey data in the Survey Management section
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">Analyze Data</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Review specialty-specific data in the Specialty Review section
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 