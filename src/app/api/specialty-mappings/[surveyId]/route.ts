import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { surveyId: string } }
) {
  try {
    const dbMappings = await prisma.specialtyMapping.findMany({
      where: {
        surveyId: params.surveyId
      },
      select: {
        id: true,
        surveyId: true,
        sourceSpecialty: true,
        mappedSpecialty: true,
        confidence: true,
        notes: true,
        isVerified: true
      }
    });

    return NextResponse.json(dbMappings);
  } catch (error) {
    console.error('Error fetching specialty mappings:', error);
    return NextResponse.json({ error: 'Failed to fetch specialty mappings' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { surveyId: string } }
) {
  try {
    const { mappings } = await request.json();

    // Delete existing mappings for this survey
    await prisma.specialtyMapping.deleteMany({
      where: {
        surveyId: params.surveyId
      }
    });

    // Create new mappings
    const newMappings = await Promise.all(
      mappings.map((mapping: any) =>
        prisma.specialtyMapping.create({
          data: {
            surveyId: params.surveyId,
            sourceSpecialty: mapping.sourceSpecialty,
            mappedSpecialty: mapping.mappedSpecialty,
            confidence: mapping.confidence || 1.0,
            notes: mapping.notes || '',
            isVerified: mapping.isVerified || false
          }
        })
      )
    );

    return NextResponse.json(newMappings);
  } catch (error) {
    console.error('Error updating specialty mappings:', error);
    return NextResponse.json({ error: 'Failed to update specialty mappings' }, { status: 500 });
  }
} 