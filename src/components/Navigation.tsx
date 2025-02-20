import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartBarIcon,
  DocumentDuplicateIcon,
  ArrowsRightLeftIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';

const Navigation = () => {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: ChartPieIcon,
      current: pathname === '/'
    },
    {
      name: 'View Market Data',
      href: '/market-data',
      icon: ChartBarIcon,
      current: pathname === '/market-data'
    },
    {
      name: 'Upload Guide',
      href: '/upload-guide',
      icon: DocumentTextIcon,
      current: pathname === '/upload-guide'
    },
    {
      name: 'Survey Management',
      href: '/survey-management',
      icon: DocumentDuplicateIcon,
      current: pathname === '/survey-management'
    },
    {
      name: 'Survey Analytics',
      href: '/survey-analytics',
      icon: ChartBarIcon,
      current: pathname === '/survey-analytics'
    },
    {
      name: 'Compare Specialties',
      href: '/compare-specialties',
      icon: ArrowsRightLeftIcon,
      current: pathname === '/compare-specialties'
    },
    {
      name: 'Documentation',
      href: '/documentation',
      icon: DocumentTextIcon,
      current: pathname === '/documentation'
    },
    {
      name: 'About Me',
      href: '/about',
      icon: UserCircleIcon,
      current: pathname === '/about'
    }
  ];

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={`
            group flex items-center px-2 py-2 text-sm font-medium rounded-md
            ${item.current
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
          `}
        >
          <item.icon
            className={`
              mr-3 h-6 w-6
              ${item.current
                ? 'text-gray-500'
                : 'text-gray-400 group-hover:text-gray-500'
              }
            `}
            aria-hidden="true"
          />
          {item.name}
        </Link>
      ))}
    </nav>
  );
};

export default Navigation; 