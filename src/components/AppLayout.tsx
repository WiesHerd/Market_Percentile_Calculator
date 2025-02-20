'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  ChartBarIcon, 
  DocumentChartBarIcon, 
  ArrowsRightLeftIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const downloadSampleCSV = () => {
    const headers = 'specialty,p25_TCC,p50_TCC,p75_TCC,p90_TCC,p25_wrvu,p50_wrvu,p75_wrvu,p90_wrvu,p25_cf,p50_cf,p75_cf,p90_cf\n';
    const sampleData = 'Family Medicine,220000,250000,280000,320000,4200,4800,5400,6200,45.50,48.75,52.00,56.25\n';
    const blob = new Blob([headers + sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market_data_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'View Market Data', href: '/market-data', icon: DocumentChartBarIcon },
    { 
      name: 'Survey Management', 
      href: '/survey-management', 
      icon: ({ className }: { className?: string }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
      )
    },
    { 
      name: 'Survey Analytics', 
      href: '/survey-analytics', 
      icon: ChartBarIcon 
    },
    { name: 'Compare Specialties', href: '/compare', icon: ArrowsRightLeftIcon },
    { name: 'Documentation', href: '/docs', icon: DocumentTextIcon },
    { 
      name: 'About Me', 
      href: '/help', 
      icon: ({ className }: { className?: string }) => (
        <div className={`relative w-5 h-5 rounded-full overflow-hidden ${className}`}>
          <Image
            src={`${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/WH.jpg`}
            alt="Wieslaw Herdzik"
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
      ),
      tooltip: (
        <div className="absolute left-full ml-2 -mt-8 bg-white rounded-lg shadow-lg border border-gray-200 p-2 hidden group-hover:block">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-100">
            <Image
              src={`${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/WH.jpg`}
              alt="Wieslaw Herdzik"
              fill
              style={{ objectFit: 'cover' }}
              className="hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - Always visible on larger screens */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4">
            <Link href="/" className={`block ${isCollapsed ? 'mx-auto' : ''}`}>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm relative group hover:from-indigo-400 hover:to-blue-500 transition-all duration-200">
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors"></div>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-8 h-8"
                    fill="none"
                  >
                    {/* W */}
                    <path
                      d="M3 7l3 10l3-10l3 10l3-10"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* H */}
                    <path
                      d="M15 7v10M21 7v10M15 12h6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1">
            {navigationItems.map((item) => (
              <div key={item.name} className="relative group">
                <Link
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    pathname === item.href
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } ${isCollapsed ? 'justify-center lg:px-2' : ''}`}
                  title={isCollapsed ? item.name : ''}
                >
                  <item.icon className={`h-5 w-5 ${
                    pathname === item.href ? 'text-indigo-700' : 'text-gray-500 group-hover:text-gray-700'
                  } ${isCollapsed ? '' : 'mr-3'}`} />
                  {!isCollapsed && <span>{item.name}</span>}
                  {isCollapsed && item.tooltip}
                </Link>
                
                {/* Sub-items for Market Data */}
                {!isCollapsed && item.href === '/market-data' && (
                  <Link
                    href="/market-data/upload-guide"
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ml-8 mt-1 ${
                      pathname === '/market-data/upload-guide'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-3 text-gray-400" />
                    <span>Upload Guide</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 mt-auto border-t border-gray-200">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              {!isCollapsed && (
                <>
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                        {/* W */}
                        <path d="M3 7l3 10l3-10l3 10l3-10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {/* H */}
                        <path d="M15 7v10M21 7v10M15 12h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Market Intelligence</p>
                    <p className="text-xs text-gray-500">Version 1.0.0</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute right-0 top-20 -mr-3 hidden lg:flex items-center justify-center h-6 w-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-blue-600 focus:outline-none"
          >
            {isCollapsed ? (
              <ChevronDoubleRightIcon className="h-4 w-4" />
            ) : (
              <ChevronDoubleLeftIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {isLoaded && (
          <>
            {/* Page Content */}
            <main className="bg-gray-50">
              {children}
            </main>
          </>
        )}
      </div>

      {/* Overlay - Only shown on mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 transition-opacity lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
} 