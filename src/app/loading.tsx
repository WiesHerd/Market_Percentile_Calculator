import { LoadingScreen } from '@/components/ui/loading-screen';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <LoadingScreen message="Loading..." />
    </div>
  );
} 