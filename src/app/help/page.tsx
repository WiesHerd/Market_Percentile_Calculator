'use client';

import { UserIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-semibold text-gray-900">About the Developer</h1>
            </div>
            <p className="mt-2 text-gray-600">
              Meet the professional behind the Market Intelligence Suite
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-blue-100">
                <Image
                  src="/WH.jpg"
                  alt="Wieslaw Herdzik"
                  fill
                  style={{ objectFit: 'cover' }}
                  priority
                  className="hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Wieslaw Herdzik</h2>
              <p className="text-gray-600 mb-6 max-w-lg">
                Creator of the Market Intelligence Suite, specializing in healthcare compensation analytics and market data analysis. With extensive experience in physician compensation modeling and market intelligence tools.
              </p>
              
              {/* LinkedIn Button */}
              <a
                href="https://www.linkedin.com/in/wieslaw-herdzik-214593a1/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors group"
              >
                <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                Connect on LinkedIn
              </a>

              {/* Professional Background */}
              <div className="mt-8 w-full max-w-2xl">
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Background</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2 mt-2"></div>
                      <span>Healthcare compensation analytics specialist</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2 mt-2"></div>
                      <span>Market data analysis and modeling expert</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2 mt-2"></div>
                      <span>Developer of physician compensation tools</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2 mt-2"></div>
                      <span>Healthcare market intelligence solutions architect</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 