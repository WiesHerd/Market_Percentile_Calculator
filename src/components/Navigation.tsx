import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  UserCircleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

const Navigation = () => {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: HomeIcon,
      current: pathname === '/'
    },
    {
      name: 'Survey Management',
      href: '/survey-management',
      icon: ChartBarIcon,
      current: pathname === '/survey-management',
      isGroupHeader: true
    },
    {
      name: 'View Surveys',
      href: '/survey-management/view-surveys',
      icon: DocumentTextIcon,
      current: pathname === '/survey-management/view-surveys',
      indent: true
    },
    {
      name: 'Upload Guide',
      href: '/market-data/upload-guide',
      icon: ArrowUpTrayIcon,
      current: pathname === '/market-data/upload-guide',
      indent: true
    },
    {
      name: 'Market Data',
      href: '/market-data',
      icon: ChartBarIcon,
      current: pathname === '/market-data',
      isGroupHeader: true
    },
    {
      name: 'Analytics',
      href: '/survey-analytics',
      icon: ChartBarIcon,
      current: pathname === '/survey-analytics',
      isGroupHeader: true
    },
    {
      name: 'Compare Specialties',
      href: '/compare-specialties',
      icon: ArrowsRightLeftIcon,
      current: pathname === '/compare-specialties',
      indent: true
    },
    {
      name: 'Help & Resources',
      href: '/documentation',
      icon: QuestionMarkCircleIcon,
      current: pathname === '/documentation',
      isGroupHeader: true
    },
    {
      name: 'About Me',
      href: '/about',
      icon: UserCircleIcon,
      current: pathname === '/about',
      indent: true
    }
  ];

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={`
            group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
            ${item.isGroupHeader ? 'mt-6 first:mt-0' : ''}
            ${item.indent ? 'ml-4' : ''}
            ${item.current
              ? 'bg-blue-50 text-blue-600'
              : item.indent
                ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <item.icon
            className={`
              mr-3 h-5 w-5 flex-shrink-0
              ${item.current
                ? 'text-blue-600'
                : item.indent
                  ? 'text-gray-400'
                  : 'text-gray-500'
              }
            `}
            aria-hidden="true"
          />
          <span className="truncate">{item.name}</span>
          {item.current && (
            <div className="ml-auto w-1 h-4 rounded-full bg-blue-600" />
          )}
        </Link>
      ))}
    </nav>
  );
};

export default Navigation; 