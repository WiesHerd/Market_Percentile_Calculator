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
        status: 'PROCESSING',
      },
    });

    // Create specialty mappings
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
          nOrgs: parseInt(row.n_orgs) || null,
          nIncumbents: parseInt(row.n_incumbents) || null,
          tccP25: parseFloat(row.tcc?.p25) || null,
          tccP50: parseFloat(row.tcc?.p50) || null,
          tccP75: parseFloat(row.tcc?.p75) || null,
          tccP90: parseFloat(row.tcc?.p90) || null,
          wrvuP25: parseFloat(row.wrvu?.p25) || null,
          wrvuP50: parseFloat(row.wrvu?.p50) || null,
          wrvuP75: parseFloat(row.wrvu?.p75) || null,
          wrvuP90: parseFloat(row.wrvu?.p90) || null,
          cfP25: parseFloat(row.cf?.p25) || null,
          cfP50: parseFloat(row.cf?.p50) || null,
          cfP75: parseFloat(row.cf?.p75) || null,
          cfP90: parseFloat(row.cf?.p90) || null,
        })),
      });
    }

    // Update survey status to READY
    await prisma.survey.update({
      where: { id: survey.id },
      data: { status: 'READY' },
    });

    return NextResponse.json({ surveyId: survey.id });
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Survey ID is required' }, { status: 400 });
    }

    await prisma.survey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting survey:', error);
    return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 });
  }
} 