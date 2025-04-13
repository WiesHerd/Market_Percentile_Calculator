import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const survey = await prisma.survey.findUnique({
      where: {
        id: params.id
      },
      include: {
        specialtyMappings: true,
        data: true,
      }
    });

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the frontend's expected structure
    const transformedSurvey = {
      id: survey.id,
      vendor: survey.vendor,
      year: survey.year,
      data: survey.data || [],
      columnMappings: survey.columnMappings,
      specialtyMappings: survey.specialtyMappings.reduce(
        (acc: any, mapping: any) => {
          if (!acc[mapping.sourceSpecialty]) {
            acc[mapping.sourceSpecialty] = {
              mappedSpecialties: [],
              notes: mapping.notes || "",
              resolved: mapping.isVerified || false,
              confidence: mapping.confidence || 0,
            };
          }
          acc[mapping.sourceSpecialty].mappedSpecialties.push(
            mapping.mappedSpecialty
          );
          return acc;
        },
        {}
      ),
      mappingProgress: survey.mappingProgress || 0,
      columns: Object.keys(survey.data[0] || {})
    };

    return NextResponse.json(transformedSurvey);
  } catch (error) {
    console.error('Error fetching survey:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Delete in a transaction to ensure all related data is deleted
    await prisma.$transaction(async (tx) => {
      // Delete survey data first
      await tx.surveyData.deleteMany({
        where: { surveyId: id }
      });

      // Delete specialty mappings
      await tx.specialtyMapping.deleteMany({
        where: { surveyId: id }
      });

      // Finally delete the survey
      await tx.survey.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting survey:', error);
    return NextResponse.json(
      { error: 'Failed to delete survey' },
      { status: 500 }
    );
  }
} 