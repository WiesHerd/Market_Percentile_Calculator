'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  ArrowDownTrayIcon,
  ChevronRightIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';

const scrollToSection = (sectionId: string) => {
  // First try to find the exact section
  let element = document.querySelector(`h2[id="${sectionId}"]`);
  // If not found, try to find it as a subsection (h3)
  if (!element) {
    element = document.querySelector(`h3[id="${sectionId}"]`);
  }
  if (element) {
    const yOffset = -100;
    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
};

export default function FormatGuidePage() {
  const [guideContent, setGuideContent] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    fetch('/survey-format-guide.md')
      .then((response) => response.text())
      .then((text) => setGuideContent(text))
      .catch((error) => console.error('Error loading format guide:', error));

    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-4 md:mb-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent">
                  Survey Format Guide
                </h1>
                <div className="h-1 w-24 bg-blue-600 mt-2" />
                <p className="mt-4 text-lg text-gray-600">
                  Learn how to format your compensation survey data for upload
                </p>
              </div>
              <div className="flex gap-4">
                <Link
                  href="/survey-management"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to Survey Management
                </Link>
                <a
                  href="/sample-survey-template.csv"
                  download
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Download Template
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Quick Links Bar */}
          <div className="border-b border-gray-200">
            <div className="px-6 py-4">
              <nav className="flex items-center space-x-6 overflow-x-auto">
                <span className="text-sm font-medium text-gray-500">Quick Links:</span>
                <button 
                  onClick={() => scrollToSection('file-format-requirements')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap flex items-center cursor-pointer"
                >
                  File Format
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
                <button 
                  onClick={() => scrollToSection('required-columns')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap flex items-center cursor-pointer"
                >
                  Required Columns
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
                <button 
                  onClick={() => scrollToSection('data-format-guidelines')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap flex items-center cursor-pointer"
                >
                  Data Guidelines
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
                <button 
                  onClick={() => scrollToSection('tips-for-success')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap flex items-center cursor-pointer"
                >
                  Tips for Success
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <article className="prose prose-blue max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600 prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-[''] prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-headings:scroll-mt-32">
              <ReactMarkdown
                components={{
                  h2: ({ children, ...props }) => {
                    const id = children?.toString().toLowerCase().replace(/\s+/g, '-');
                    return <h2 id={id} {...props}>{children}</h2>;
                  },
                  h3: ({ children, ...props }) => {
                    const id = children?.toString().toLowerCase().replace(/\s+/g, '-');
                    return <h3 id={id} {...props}>{children}</h3>;
                  }
                }}
              >
                {guideContent}
              </ReactMarkdown>
            </article>
          </div>
        </div>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-12 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 group"
            aria-label="Scroll to top"
          >
            <ArrowUpIcon className="h-5 w-5 transform group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
} 