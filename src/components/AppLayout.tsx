'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Transition } from '@headlessui/react';
import { 
  ChartBarIcon, 
  DocumentChartBarIcon,
  PresentationChartBarIcon,
  ArrowsRightLeftIcon,
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
      icon: PresentationChartBarIcon,
      subItems: [
        {
          name: 'Survey Aggregation',
          href: '/survey-analytics',
          icon: MagnifyingGlassIcon
        },
        { 
          name: 'Compare Specialties', 
          href: '/compare', 
          icon: ArrowsRightLeftIcon 
        }
      ]
    },
    { 
      name: 'Help & Resources', 
      href: '/help',
      icon: QuestionMarkCircleIcon,
      subItems: [
        { 
          name: 'Documentation', 
          href: '/help',
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
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">WH</span>
                  </div>
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
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">WH</span>
                  </div>
                  {!isCollapsed && (
                    <div>
                      <p className="text-sm font-medium text-gray-900">Market Intelligence</p>
                      <p className="text-xs text-gray-500">Version 1.0.0</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200 ease-in-out"
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