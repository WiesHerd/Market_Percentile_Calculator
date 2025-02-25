'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalculatorIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  ArrowsRightLeftIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  DocumentTextIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';

interface RecentActivity {
  id: string;
  type: 'upload' | 'calculation' | 'analysis';
  description: string;
  timestamp: string;
  specialty?: string;
}

const features = [
  {
    name: 'Compensation Analysis',
    description: 'Calculate and analyze provider compensation percentiles',
    items: [
      {
        name: 'Percentile Calculator',
        description: 'Calculate compensation percentiles based on market data',
        href: '/',
        icon: CalculatorIcon,
        color: 'bg-blue-500',
      },
      {
        name: 'Survey Aggregation',
        description: 'View and manage combined data from multiple survey sources',
        href: './survey-analytics',
        icon: ChartBarIcon,
        color: 'bg-green-500',
      },
      {
        name: 'Compare Specialties',
        description: 'Compare compensation across different specialties',
        href: './compare',
        icon: ArrowsRightLeftIcon,
        color: 'bg-orange-500',
      }
    ]
  },
  {
    name: 'Survey Management',
    description: 'Upload and manage compensation survey data',
    items: [
      {
        name: 'Upload Survey',
        description: 'Upload new compensation survey data',
        href: './survey-management',
        icon: TableCellsIcon,
        color: 'bg-purple-500',
      },
      {
        name: 'View Surveys',
        description: 'Browse and manage uploaded surveys',
        href: './survey-management/view-surveys',
        icon: DocumentTextIcon,
        color: 'bg-indigo-500',
      },
      {
        name: 'Recent Uploads',
        description: 'View recently uploaded survey data',
        href: './survey-management/recent',
        icon: ClockIcon,
        color: 'bg-pink-500',
      }
    ]
  },
  {
    name: 'Help & Resources',
    description: 'Access documentation and support resources',
    items: [
      {
        name: 'Documentation',
        description: 'Learn how to use the Market Intelligence Suite',
        href: './help',
        icon: BookOpenIcon,
        color: 'bg-teal-500',
      },
      {
        name: 'Support',
        description: 'Get help and answers to common questions',
        href: './help#faq',
        icon: QuestionMarkCircleIcon,
        color: 'bg-cyan-500',
      }
    ]
  }
];

export default function DashboardPage() {
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-4 md:mb-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent">
                  Welcome to Market Intelligence Suite
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  Access your compensation analytics tools and manage survey data
                </p>
              </div>
              <div className="flex gap-4">
                <Link
                  href="/survey-management"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Upload Survey
                </Link>
                <Link
                  href="/help"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Documentation
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Sections */}
        <div className="space-y-8">
          {features.map((section) => (
            <div key={section.name} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900">{section.name}</h2>
                <p className="mt-1 text-sm text-gray-500">{section.description}</p>
                
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((feature) => (
                    <Link
                      key={feature.name}
                      href={feature.href}
                      className="relative group rounded-lg p-6 bg-white ring-1 ring-gray-200 hover:ring-blue-500 transition-all duration-200 hover:shadow-md"
                    >
                      <div>
                        <span className={`inline-flex p-3 rounded-lg ${feature.color} text-white ring-4 ring-white`}>
                          <feature.icon className="h-6 w-6" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {feature.name}
                        </h3>
                        <p className="mt-2 text-sm text-gray-500 group-hover:text-gray-600 transition-colors">
                          {feature.description}
                        </p>
                      </div>
                      <span
                        className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-blue-500 transition-colors"
                        aria-hidden="true"
                      >
                        <ArrowTrendingUpIcon className="h-6 w-6" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 