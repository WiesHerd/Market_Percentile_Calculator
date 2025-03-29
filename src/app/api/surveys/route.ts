import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const surveys = await prisma.survey.findMany({
      include: {
        data: true,
        specialtyMappings: true,
      },
      orderBy: {
        uploadDate: 'desc'
      }
    });
    return NextResponse.json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vendor, year, columnMappings, data, specialtyMappings } = body;

    // Create the survey
    const survey = await prisma.survey.create({
      data: {
        vendor,
        year,
        columnMappings,
        status: 'READY',
        uploadDate: new Date(),
      },
    });

    // Create specialty mappings if they exist
    if (specialtyMappings && specialtyMappings.length > 0) {
      await prisma.specialtyMapping.createMany({
        data: specialtyMappings.map((mapping: any) => ({
          surveyId: survey.id,
          sourceSpecialty: mapping.sourceSpecialty,
          mappedSpecialty: mapping.mappedSpecialty,
          confidence: mapping.confidence || 0,
          notes: mapping.notes,
          isVerified: mapping.isVerified || false,
        })),
      });
    }

    // Create survey data
    if (data && data.length > 0) {
      await prisma.surveyData.createMany({
        data: data.map((row: any) => ({
          surveyId: survey.id,
          specialty: row.specialty,
          providerType: row.provider_type,
          region: row.geographic_region,
          nOrgs: row.n_orgs,
          nIncumbents: row.n_incumbents,
          tccP25: row.tccP25,
          tccP50: row.tccP50,
          tccP75: row.tccP75,
          tccP90: row.tccP90,
          wrvuP25: row.wrvuP25,
          wrvuP50: row.wrvuP50,
          wrvuP75: row.wrvuP75,
          wrvuP90: row.wrvuP90,
          cfP25: row.cfP25,
          cfP50: row.cfP50,
          cfP75: row.cfP75,
          cfP90: row.cfP90,
        })),
      });
    }

    return NextResponse.json({ surveyId: survey.id });
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Survey ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { specialtyMappings, mappingProgress } = body;

    // Update specialty mappings
    if (specialtyMappings && specialtyMappings.length > 0) {
      // First delete existing mappings
      await prisma.specialtyMapping.deleteMany({
        where: { surveyId: id }
      });

      // Then create new ones
      await prisma.specialtyMapping.createMany({
        data: specialtyMappings.map((mapping: any) => ({
          surveyId: id,
          sourceSpecialty: mapping.sourceSpecialty,
          mappedSpecialty: mapping.mappedSpecialty,
          confidence: mapping.confidence || 0,
          notes: mapping.notes,
          isVerified: mapping.isVerified || false,
        })),
      });
    }

    // Update survey progress
    await prisma.survey.update({
      where: { id },
      data: {
        mappingProgress,
        status: mappingProgress === 100 ? 'READY' : 'PROCESSING'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating survey:', error);
    return NextResponse.json({ error: 'Failed to update survey' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Survey ID is required' }, { status: 400 });
    }

    // Delete all related data first
    await prisma.specialtyMapping.deleteMany({
      where: { surveyId: id }
    });

    await prisma.surveyData.deleteMany({
      where: { surveyId: id }
    });

    // Then delete the survey
    await prisma.survey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting survey:', error);
    return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 });
  }
} 