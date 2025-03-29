import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const dbMappings = await prisma.specialtyMapping.findMany({
      select: {
        sourceSpecialty: true,
        mappedSpecialty: true,
        notes: true
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