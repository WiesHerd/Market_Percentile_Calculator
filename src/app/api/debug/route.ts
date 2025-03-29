import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get basic stats about the database
    const stats = {
      surveys: await prisma.survey.count(),
      surveyData: await prisma.surveyData.count(),
      specialtyMappings: await prisma.specialtyMapping.count(),
      recentSurveys: await prisma.survey.findMany({
        take: 5,
        orderBy: { uploadDate: 'desc' },
        select: {
          id: true,
          vendor: true,
          year: true,
          status: true,
          uploadDate: true,
          _count: {
            select: {
              data: true,
              specialtyMappings: true
            }
          }
        }
      })
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching debug stats:', error);
    return NextResponse.json({ error: 'Failed to fetch debug stats' }, { status: 500 });
  }
} 