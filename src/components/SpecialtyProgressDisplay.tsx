import { useEffect, useState } from 'react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SpecialtyProgressDisplayProps {
  surveyId: string;
}

export function SpecialtyProgressDisplay({ surveyId }: SpecialtyProgressDisplayProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const getProgress = async () => {
      try {
        // Get total unique specialties for this survey
        const totalSpecialties = await prisma.surveyData.findMany({
          where: {
            surveyId: surveyId
          },
          select: {
            specialty: true
          },
          distinct: ['specialty']
        });

        // Get mapped specialties for this survey
        const mappedSpecialties = await prisma.specialtyMapping.findMany({
          where: {
            surveyId: surveyId
          },
          select: {
            sourceSpecialty: true
          },
          distinct: ['sourceSpecialty']
        });

        if (totalSpecialties.length === 0) return 0;
        
        const progress = Math.round((mappedSpecialties.length / totalSpecialties.length) * 100);
        setProgress(progress);
      } catch (error) {
        console.error('Error calculating specialty mapping progress:', error);
        setProgress(0);
      }
    };

    getProgress();

    // Set up an interval to check progress periodically
    const interval = setInterval(getProgress, 5000);
    return () => clearInterval(interval);
  }, [surveyId]);

  if (progress === 0) return null;

  return (
    <div className="mt-2 flex items-center justify-center">
      <div className="text-xs font-medium text-gray-500">
        {progress}% mapped
      </div>
    </div>
  );
} 