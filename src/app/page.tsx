'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HomeIcon,
  CalculatorIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ArrowsPointingOutIcon,
  QuestionMarkCircleIcon,
  ArrowTrendingUpIcon,
  Square3Stack3DIcon,
  ClockIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Compensation Analysis',
    description: 'Calculate and analyze provider compensation percentiles',
    items: [
      {
        name: 'Percentile Calculator',
        description: 'Calculate compensation percentiles based on market data',
        href: '/percentile-calculator',
        icon: CalculatorIcon,
        color: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
      {
        name: 'Survey Aggregation',
        description: 'View and manage combined data from multiple survey sources',
        href: '/survey-analytics',
        icon: Square3Stack3DIcon,
        color: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
      {
        name: 'Compare Specialties',
        description: 'Compare compensation across different specialties',
        href: '/compare',
        icon: ArrowsPointingOutIcon,
        color: 'bg-blue-50',
        iconColor: 'text-blue-600',
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
        href: '/survey-management',
        icon: ArrowUpTrayIcon,
        color: 'bg-purple-50',
        iconColor: 'text-purple-600',
      },
      {
        name: 'View Surveys',
        description: 'Browse and manage uploaded surveys',
        href: '/survey-management/view-surveys',
        icon: DocumentTextIcon,
        color: 'bg-purple-50',
        iconColor: 'text-purple-600',
      },
      {
        name: 'Recent Uploads',
        description: 'View recently uploaded survey data',
        href: '/survey-management/recent',
        icon: ClockIcon,
        color: 'bg-purple-50',
        iconColor: 'text-purple-600',
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
        href: '/help',
        icon: BookOpenIcon,
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
      },
      {
        name: 'Support',
        description: 'Get help and answers to common questions',
        href: '/help#faq',
        icon: QuestionMarkCircleIcon,
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
      }
    ]
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-blue-50 rounded-2xl shadow-sm p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-white rounded-lg p-2">
                <HomeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Market Intelligence Dashboard</h1>
                <p className="mt-2 text-gray-600 max-w-2xl">
                  Access your compensation analytics tools and manage survey data
                </p>
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
                        <span className={`inline-flex p-3 rounded-lg ${feature.color} ring-4 ring-white`}>
                          <feature.icon className={`h-6 w-6 ${feature.iconColor}`} aria-hidden="true" />
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
