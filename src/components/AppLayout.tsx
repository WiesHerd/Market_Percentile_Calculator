'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Transition } from '@headlessui/react';
import { 
  ChartBarIcon, 
  DocumentChartBarIcon,
  ChartPieIcon,
  Square3Stack3DIcon,
  ArrowsPointingOutIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  UserIcon,
  ClockIcon,
  FolderIcon,
  CalculatorIcon,
  BookOpenIcon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface SubNavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubNavigationItem[];
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

  const navigationItems: NavigationItem[] = [
    { 
      name: 'Dashboard', 
      href: '/dashboard',
      icon: HomeIcon 
    },
    {
      name: 'Percentile Calculator',
      href: '/',
      icon: CalculatorIcon
    },
    { 
      name: 'Survey Management',
      href: '#',
      icon: FolderIcon,
      subItems: [
        { 
          name: 'Survey Processing', 
          href: '/survey-management', 
          icon: TableCellsIcon 
        },
        { 
          name: 'View Surveys', 
          href: '/survey-management/view-surveys', 
          icon: DocumentTextIcon 
        },
        { 
          name: 'Upload History', 
          href: '/survey-management/recent', 
          icon: ClockIcon 
        }
      ]
    },
    { 
      name: 'Survey Comparison', 
      href: '#', 
      icon: ChartBarIcon,
      subItems: [
        {
          name: 'Survey Aggregation',
          href: '/survey-analytics',
          icon: Square3Stack3DIcon
        },
        { 
          name: 'Compare Specialties', 
          href: '/compare', 
          icon: ArrowsPointingOutIcon 
        }
      ]
    },
    { 
      name: 'Help & Resources', 
      href: './help',
      icon: QuestionMarkCircleIcon,
      subItems: [
        { 
          name: 'Documentation', 
          href: './help',
          icon: BookOpenIcon 
        },
        { 
          name: 'About Me', 
          href: '/about',
          icon: UserIcon 
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}`}
        >
          <div className="h-full flex flex-col">
            {/* Logo */}
            <div className={`p-4 ${isCollapsed ? 'px-3' : ''}`}>
              <Link href="/" className={`block ${isCollapsed ? 'mx-auto w-10' : ''}`}>
                <div className="flex items-center">
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tl from-blue-700 via-blue-600 to-blue-500 flex items-center justify-center overflow-hidden group shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/20 transition-transform duration-300 hover:scale-110">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center justify-center">
                      <svg className="w-6 h-6 text-white transform transition-transform duration-300 group-hover:rotate-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 13.5L7 9.5M7 9.5L11 13.5M7 9.5V20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 10.5L17 14.5M17 14.5L13 10.5M17 14.5V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path className="opacity-50" d="M12 4L14 6L12 8L10 6L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path className="opacity-75" d="M12 16L14 18L12 20L10 18L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="ml-3">
                      <style jsx global>{`
                        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500&display=swap');
                      `}</style>
                      <div className="flex flex-col">
                        <div className="flex flex-col">
                          <p className="font-['Space_Grotesk'] text-[20px] font-semibold leading-tight tracking-tight text-gray-900">Market</p>
                          <p className="font-['Space_Grotesk'] text-[20px] font-semibold leading-tight tracking-tight text-gray-900">Intelligence</p>
                        </div>
                        <div className="mt-1.5 flex flex-col">
                          <div className="h-[2px] w-14 bg-gradient-to-r from-blue-600 to-blue-500"></div>
                          <p className="mt-1 text-[10px] font-['Inter'] font-medium tracking-[0.15em] text-blue-600">ANALYTICS SUITE</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-4 space-y-1`}>
              {navigationItems.map((item) => (
                <div key={item.name}>
                  {item.href === '#' ? (
                    <div className="relative group">
                      {!isCollapsed ? (
                        // Section Header - Show only in expanded state
                        <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-600">
                          <item.icon className="h-5 w-5 flex-shrink-0 text-gray-400 mr-3" />
                          <span className="truncate">{item.name}</span>
                        </div>
                      ) : (
                        // Show icon with submenu in collapsed state
                        <>
                          <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-600">
                            <item.icon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                          </div>
                          <div className="absolute left-full top-0 ml-2 invisible group-hover:visible">
                            <div className="bg-white rounded-md shadow-lg border border-gray-100 py-1.5 w-48">
                              <div className="px-4 py-2 text-sm font-medium text-gray-600 border-b border-gray-100">
                                {item.name}
                              </div>
                              {item.subItems?.map((subItem) => (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  className={`
                                    flex items-center px-4 py-2 text-sm transition-colors
                                    ${pathname === subItem.href
                                      ? 'text-blue-600 bg-blue-50'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                  `}
                                >
                                  <subItem.icon className={`
                                    h-4 w-4 flex-shrink-0
                                    ${pathname === subItem.href
                                      ? 'text-blue-600'
                                      : 'text-gray-400 group-hover:text-gray-500'
                                    }
                                  `} />
                                  <span className="ml-3">{subItem.name}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="relative group">
                      <Link
                        href={item.href}
                        className={`
                          group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors w-full
                          ${pathname === item.href
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                      >
                        <item.icon className={`
                          h-5 w-5 flex-shrink-0
                          ${pathname === item.href
                            ? 'text-blue-600'
                            : 'text-gray-400 group-hover:text-gray-500'
                          }
                        `} />
                        {!isCollapsed && (
                          <span className="ml-3 truncate">{item.name}</span>
                        )}
                      </Link>
                      {isCollapsed && item.subItems && (
                        <div className="absolute left-full top-0 ml-2 invisible group-hover:visible">
                          <div className="bg-white rounded-md shadow-lg border border-gray-100 py-1.5 w-48">
                            <div className="px-4 py-2 text-sm font-medium text-gray-600 border-b border-gray-100">
                              {item.name}
                            </div>
                            {item.subItems.map((subItem) => (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className={`
                                  flex items-center px-4 py-2 text-sm transition-colors
                                  ${pathname === subItem.href
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  }
                                `}
                              >
                                <subItem.icon className={`
                                  h-4 w-4 flex-shrink-0
                                  ${pathname === subItem.href
                                    ? 'text-blue-600'
                                    : 'text-gray-400 group-hover:text-gray-500'
                                  }
                                `} />
                                <span className="ml-3">{subItem.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-items for expanded state */}
                  {(!isCollapsed && item.subItems && item.subItems.length > 0) && (
                    <div className="mt-1 ml-6 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`
                            group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                            ${pathname === subItem.href
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }
                          `}
                        >
                          <subItem.icon className={`
                            h-4 w-4 flex-shrink-0
                            ${pathname === subItem.href
                              ? 'text-blue-600'
                              : 'text-gray-400 group-hover:text-gray-500'
                            }
                          `} />
                          <span className="ml-3 truncate">{subItem.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div className={`p-4 border-t border-gray-200 ${isCollapsed ? 'px-3' : ''}`}>
              <div className="flex items-center justify-between">
                {!isCollapsed && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 tracking-wider">v1.0.0</p>
                  </div>
                )}
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className={`p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200 ease-in-out ${
                    isCollapsed ? 'w-full flex justify-center' : ''
                  }`}
                  title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isCollapsed ? (
                    <ChevronDoubleRightIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDoubleLeftIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sidebar toggle */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg bg-white shadow-md hover:bg-gray-50"
          >
            {isSidebarOpen ? (
              <XMarkIcon className="h-6 w-6 text-gray-600" />
            ) : (
              <Bars3Icon className="h-6 w-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-300 w-full ${isCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
          {isLoaded && (
            <main className="bg-gray-50">
              {children}
            </main>
          )}
        </div>

        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 transition-opacity lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
} 