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
  UserIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  PresentationChartBarIcon,
  ChartPieIcon,
  BookOpenIcon,
  TableCellsIcon
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
      icon: ChartPieIcon
    },
    { 
      name: 'Survey Management', 
      href: '#',
      icon: DocumentChartBarIcon,
      subItems: [
        { 
          name: 'Survey Processing', 
          href: '/survey-management', 
          icon: ArrowUpTrayIcon 
        },
        { 
          name: 'View Surveys', 
          href: '/survey-management/view-surveys', 
          icon: DocumentTextIcon 
        },
        { 
          name: 'Manual Upload', 
          href: '/market-data', 
          icon: TableCellsIcon 
        },
        { 
          name: 'Recent Uploads', 
          href: '/survey-management/recent', 
          icon: ClockIcon 
        }
      ]
    },
    { 
      name: 'Market Analysis', 
      href: '#',
      icon: ChartBarIcon,
      subItems: [
        {
          name: 'Specialty Review',
          href: '/survey-analytics',
          icon: PresentationChartBarIcon
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
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4">
            <Link href="/" className={`block ${isCollapsed ? 'mx-auto' : ''}`}>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">WH</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4">
            {navigationItems.map((item) => (
              <div key={item.name} className="mb-4">
                {item.href === '#' ? (
                  <div className={`flex items-center px-3 py-2 text-sm font-medium text-gray-600 ${isCollapsed ? 'justify-center' : ''}`}>
                    <item.icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} text-gray-400`} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    title={isCollapsed ? item.name : ''}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isCollapsed ? 'justify-center' : ''}
                      ${pathname === item.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className={`
                      h-5 w-5
                      ${isCollapsed ? '' : 'mr-3'}
                      ${pathname === item.href
                        ? 'text-blue-600'
                        : 'text-gray-400 group-hover:text-gray-500'
                      }
                    `} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                )}

                {/* Sub-items */}
                {item.subItems && (
                  <div className={`mt-2 space-y-1 ${isCollapsed ? 'px-0' : 'ml-6'}`}>
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        title={isCollapsed ? subItem.name : ''}
                        className={`
                          group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                          ${isCollapsed ? 'justify-center' : ''}
                          ${pathname === subItem.href
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          }
                        `}
                      >
                        <subItem.icon className={`
                          h-4 w-4
                          ${isCollapsed ? '' : 'mr-3'}
                          ${pathname === subItem.href
                            ? 'text-blue-600'
                            : 'text-gray-400 group-hover:text-gray-500'
                          }
                        `} />
                        {!isCollapsed && <span className="truncate">{subItem.name}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
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