import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const surveyIds = searchParams.get('surveyIds')?.split(',') || [];

  try {
    const dbMappings = await prisma.specialtyMapping.findMany({
      where: {
        surveyId: {
          in: surveyIds
        }
      }
    });

    return NextResponse.json({ mappings: dbMappings });
  } catch (error) {
    console.error('Error fetching specialty mappings:', error);
    return NextResponse.json({ error: 'Failed to fetch specialty mappings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { surveyId, sourceSpecialty, mappedSpecialties, notes } = await request.json();

    // Delete existing mappings for this source specialty
    await prisma.specialtyMapping.deleteMany({
      where: {
        surveyId: surveyId,
        sourceSpecialty: sourceSpecialty
      }
    });

    // Create new mappings
    const newMappings = await Promise.all(mappedSpecialties.map(mappedSpecialty =>
      prisma.specialtyMapping.create({
        data: {
          sourceSpecialty,
          mappedSpecialty,
          notes: notes,
          confidence: 1.0, // Default confidence for manual mappings
          survey: {
            connect: {
              id: surveyId
            }
          }
        }
      })
    ));

    return NextResponse.json(newMappings);
  } catch (error) {
    console.error('Error updating specialty mappings:', error);
    return NextResponse.json({ error: 'Failed to update specialty mappings' }, { status: 500 });
  }
} 