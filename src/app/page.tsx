import { ClientWrapper } from '@/components/ClientWrapper';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="flex justify-between items-start mb-6 px-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Provider Percentile Calculator</h1>
            <p className="text-base text-gray-600 mt-1">Calculate and analyze provider compensation percentiles</p>
          </div>
          <img 
            src="/WH Logo.webp"
            alt="WH Logo"
            className="h-16 w-auto"
          />
        </header>
        <main>
          <ClientWrapper />
        </main>
      </div>
    </div>
  );
}
