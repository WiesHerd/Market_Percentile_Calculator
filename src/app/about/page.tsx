'use client';

import { UserIcon, ChartBarIcon, BeakerIcon, CodeBracketIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  const skills = {
    analytics: [
      'Advanced Data Analytics',
      'Predictive Modeling',
      'Statistical Analysis',
      'Interactive Visualizations',
      'Real-time Analytics',
      'Performance Benchmarking'
    ],
    technical: [
      'AI Implementation',
      'Custom Application Design',
      'Modern Web Applications',
      'Automated Data Processing',
      'Business Intelligence Tools',
      'AI-Powered Analytics',
      'Machine Learning Integration'
    ],
    domain: [
      'Healthcare Market Intelligence',
      'Fair Market Value Analysis',
      'Regulatory Compliance',
      'Compensation Strategy',
      'Survey Data Analytics',
      'Industry Benchmarking'
    ]
  };

  const projects = [
    {
      name: 'Market Intelligence Suite',
      description: 'AI-powered analytics platform revolutionizing healthcare compensation analysis',
      features: [
        'AI-driven data processing',
        'Intelligent market analysis',
        'Automated insights generation'
      ]
    },
    {
      name: 'Compensation Analytics Engine',
      description: 'Smart compensation modeling system with AI-powered decision support',
      features: [
        'Intelligent FMV analysis',
        'AI compliance validation',
        'Automated benchmarking'
      ]
    },
    {
      name: 'Survey Processing Pipeline',
      description: 'Advanced AI system for automated survey data processing and analysis',
      features: [
        'Smart data validation',
        'AI-powered mapping',
        'Intelligent QA process'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1920px] mx-auto px-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
          <div className="px-8 py-6">
            <div className="flex items-center">
              <UserIcon className="h-6 w-6 text-blue-600 mr-3" />
              <h1 className="text-2xl font-semibold text-gray-900">About the Developer</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 h-full">
              <div className="flex flex-col items-center text-center justify-between h-full">
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-blue-100">
                    <Image
                      src={`${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/WH.jpg`}
                      alt="Wieslaw Herdzik"
                      fill
                      style={{ objectFit: 'cover' }}
                      priority
                      className="hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Wieslaw Herdzik</h2>
                  <p className="text-blue-600 font-medium mb-4">AI & Healthcare Analytics Innovator</p>
                  <p className="text-gray-600 mb-6">
                    Pioneering the integration of artificial intelligence in healthcare analytics, 
                    specializing in developing sophisticated market intelligence solutions that transform 
                    complex healthcare data into actionable insights.
                  </p>
                </div>
                <a
                  href="https://www.linkedin.com/in/wieslaw-herdzik-214593a1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  Connect on LinkedIn
                </a>
              </div>
            </div>
          </div>

          {/* Main Content Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Technical Expertise</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <div className="flex items-center mb-4">
                    <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="font-medium text-gray-900">Analytics</h4>
                  </div>
                  <ul className="space-y-2">
                    {skills.analytics.map((skill) => (
                      <li key={skill} className="flex items-center text-gray-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></span>
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center mb-4">
                    <CpuChipIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="font-medium text-gray-900">AI & Development</h4>
                  </div>
                  <ul className="space-y-2">
                    {skills.technical.map((skill) => (
                      <li key={skill} className="flex items-center text-gray-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></span>
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center mb-4">
                    <BeakerIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="font-medium text-gray-900">Domain</h4>
                  </div>
                  <ul className="space-y-2">
                    {skills.domain.map((skill) => (
                      <li key={skill} className="flex items-center text-gray-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-2"></span>
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Projects Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Featured Projects</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <div key={project.name} className="border border-gray-200 rounded-xl p-6 hover:border-blue-200 transition-colors">
                    <h4 className="font-medium text-gray-900 mb-2">{project.name}</h4>
                    <p className="text-gray-600 text-sm mb-4">{project.description}</p>
                    <ul className="space-y-2">
                      {project.features.map((feature) => (
                        <li key={feature} className="flex items-center text-sm text-gray-600">
                          <span className="h-1 w-1 rounded-full bg-blue-600 mr-2"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 