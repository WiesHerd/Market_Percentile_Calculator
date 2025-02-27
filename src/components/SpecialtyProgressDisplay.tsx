import { useEffect, useState } from 'react';

interface SpecialtyProgressDisplayProps {}

export function SpecialtyProgressDisplay({}: SpecialtyProgressDisplayProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Get progress from localStorage
    const getProgress = () => {
      try {
        const uploadedSurveys = JSON.parse(localStorage.getItem('uploadedSurveys') || '[]');
        const mappedSpecialties = JSON.parse(localStorage.getItem('mappedSpecialties') || '[]');
        
        if (uploadedSurveys.length === 0) return 0;
        
        // Calculate progress based on mapped specialties vs total specialties
        const totalSpecialties = new Set(uploadedSurveys.flatMap((survey: any) => 
          survey.data.map((row: any) => row.specialty)
        )).size;
        
        const mappedCount = mappedSpecialties.length;
        return Math.round((mappedCount / totalSpecialties) * 100);
      } catch (error) {
        console.error('Error calculating specialty mapping progress:', error);
        return 0;
      }
    };

    setProgress(getProgress());

    // Set up storage event listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mappedSpecialties' || e.key === 'uploadedSurveys') {
        setProgress(getProgress());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (progress === 0) return null;

  return (
    <div className="mt-2 flex items-center justify-center">
      <div className="text-xs font-medium text-gray-500">
        {progress}% mapped
      </div>
    </div>
  );
} 