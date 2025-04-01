import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Get surveyId from query params
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get('surveyId');

    const dbMappings = await prisma.specialtyMapping.findMany({
      where: surveyId ? { surveyId } : undefined,
      select: {
        id: true,
        surveyId: true,
        sourceSpecialty: true,
        mappedSpecialty: true,
        notes: true,
        confidence: true,
        isVerified: true
      }
    });

    return NextResponse.json(dbMappings);
  } catch (error) {
    console.error('Error fetching specialty mappings:', error);
    return NextResponse.json({ error: 'Failed to fetch specialty mappings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { surveyId, sourceSpecialty, mappedSpecialties, notes } = await request.json();

    if (!surveyId || !sourceSpecialty || !Array.isArray(mappedSpecialties)) {
      return NextResponse.json({ 
        error: 'Missing required fields: surveyId, sourceSpecialty, or mappedSpecialties' 
      }, { status: 400 });
    }

    // Delete existing mappings for this source specialty in this survey
    await prisma.specialtyMapping.deleteMany({
      where: {
        surveyId,
        sourceSpecialty
      }
    });

    // Create new mappings
    const newMappings = await Promise.all(mappedSpecialties.map(mappedSpecialty =>
      prisma.specialtyMapping.create({
        data: {
          surveyId,
          sourceSpecialty,
          mappedSpecialty,
          notes: notes || '',
          confidence: 1.0, // Default confidence for manual mappings
          isVerified: true // Manual mappings are considered verified
        }
      })
    ));

    return NextResponse.json(newMappings);
  } catch (error) {
    console.error('Error updating specialty mappings:', error);
    return NextResponse.json({ error: 'Failed to update specialty mappings' }, { status: 500 });
  }
} 