import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const surveys = await prisma.survey.findMany({
      include: {
        specialtyMappings: true,
        data: true
      },
      orderBy: {
        uploadDate: 'desc'
      }
    });

    // Transform the data to match the frontend's expected structure
    const transformedSurveys = surveys.map(survey => ({
      id: survey.id,
      vendor: survey.vendor,
      year: survey.year,
      data: survey.data || [],
      columnMappings: survey.columnMappings,
      specialtyMappings: survey.specialtyMappings.reduce((acc: any, mapping: any) => {
        if (!acc[mapping.sourceSpecialty]) {
          acc[mapping.sourceSpecialty] = {
            mappedSpecialties: [],
            notes: mapping.notes || '',
            resolved: mapping.isVerified || false,
            confidence: mapping.confidence || 0
          };
        }
        acc[mapping.sourceSpecialty].mappedSpecialties.push(mapping.mappedSpecialty);
        return acc;
      }, {}),
      mappingProgress: survey.mappingProgress || 0
    }));

    return NextResponse.json(transformedSurveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { vendor, year, data, specialtyMappings, columnMappings } = await request.json();

    if (!vendor || !year || !data || !columnMappings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Transform and validate the data
    const transformedData = data.map((row: any) => {
      // Convert numeric strings to numbers and handle empty values
      const transformValue = (value: any) => {
        if (value === undefined || value === null || value === '') return null;
        // Remove any commas and dollar signs from the string
        if (typeof value === 'string') {
          value = value.replace(/[$,]/g, '');
        }
        const num = Number(value);
        return isNaN(num) ? null : num;
      };

      // Create the transformed row with default field mappings
      const transformedRow = {
        specialty: row.specialty || '',
        providerType: row.provider_type || null,
        region: row.geographic_region || null,
        nOrgs: transformValue(row.n_orgs),
        nIncumbents: transformValue(row.n_incumbents),
        tccP25: transformValue(row.tccP25),
        tccP50: transformValue(row.tccP50),
        tccP75: transformValue(row.tccP75),
        tccP90: transformValue(row.tccP90),
        wrvuP25: transformValue(row.wrvuP25),
        wrvuP50: transformValue(row.wrvuP50),
        wrvuP75: transformValue(row.wrvuP75),
        wrvuP90: transformValue(row.wrvuP90),
        cfP25: transformValue(row.cfP25),
        cfP50: transformValue(row.cfP50),
        cfP75: transformValue(row.cfP75),
        cfP90: transformValue(row.cfP90)
      };

      // Log for debugging
      console.log('Original row:', row);
      console.log('Transformed row:', transformedRow);

      return transformedRow;
    });

    // Create the survey with its data and mappings
    const survey = await prisma.survey.create({
      data: {
        vendor,
        year,
        columnMappings,
        status: 'READY',
        mappingProgress: 0,
        data: {
          create: transformedData
        },
        specialtyMappings: {
          create: specialtyMappings?.map((mapping: { sourceSpecialty: string; mappedSpecialty: string }) => ({
            sourceSpecialty: mapping.sourceSpecialty,
            mappedSpecialty: mapping.mappedSpecialty,
            isVerified: false,
            confidence: 0,
            notes: ''
          })) || []
        }
      },
      include: {
        specialtyMappings: true,
        data: true
      }
    });

    return NextResponse.json(survey);
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, vendor, year, data, specialtyMappings, columnMappings } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Survey ID is required' }, { status: 400 });
    }

    const updateData: any = {
      ...(vendor && { vendor }),
      ...(year && { year }),
      ...(columnMappings && { columnMappings }),
      ...(data && {
        data: {
          deleteMany: {},
          create: data.map((row: any) => ({
            specialty: row.specialty,
            providerType: row.providerType,
            region: row.region,
            nOrgs: row.nOrgs,
            nIncumbents: row.nIncumbents,
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
            cfP90: row.cfP90
          }))
        }
      }),
      ...(specialtyMappings && {
        specialtyMappings: {
          deleteMany: {},
          create: specialtyMappings.map((mapping: { sourceSpecialty: string; mappedSpecialty: string }) => ({
            sourceSpecialty: mapping.sourceSpecialty,
            mappedSpecialty: mapping.mappedSpecialty,
            isVerified: false,
            confidence: 0,
            notes: ''
          }))
        }
      })
    };

    const survey = await prisma.survey.update({
      where: { id },
      data: updateData,
      include: {
        specialtyMappings: true,
        data: true
      }
    });

    return NextResponse.json(survey);
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

    // Delete related specialty mappings first
    await prisma.specialtyMapping.deleteMany({
      where: { surveyId: id }
    });

    // Then delete the survey (this will cascade delete survey data)
    const deletedSurvey = await prisma.survey.delete({
      where: { id }
    });

    return NextResponse.json(deletedSurvey);
  } catch (error) {
    console.error('Error deleting survey:', error);
    return NextResponse.json({ error: 'Failed to delete survey' }, { status: 500 });
  }
} 