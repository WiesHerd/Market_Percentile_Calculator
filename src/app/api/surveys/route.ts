import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const vendor = formData.get('vendor') as string;
    const year = formData.get('year') as string;

    if (!file || !vendor || !year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const { data, errors } = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Error parsing CSV file', details: errors },
        { status: 400 }
      );
    }

    // Auto-detect column mappings
    const columns = Object.keys(data[0] || {});
    const patterns = {
      specialty: [/specialty/i, /provider.*type/i, /physician.*type/i],
      providerType: [/provider.*type/i, /physician.*type/i, /role/i],
      region: [/region/i, /geographic/i, /location/i],
      nOrgs: [/n.*orgs/i, /num.*org/i, /organizations/i],
      nIncumbents: [/n.*incumbents/i, /num.*incumbents/i, /incumbents/i],
      tcc: {
        p25: [/25.*(?:tcc|total.*cash|comp)/i, /tcc.*25/i],
        p50: [/50.*(?:tcc|total.*cash|comp)/i, /tcc.*50/i],
        p75: [/75.*(?:tcc|total.*cash|comp)/i, /tcc.*75/i],
        p90: [/90.*(?:tcc|total.*cash|comp)/i, /tcc.*90/i]
      },
      wrvu: {
        p25: [/25.*(?:wrvu|rvu)/i, /wrvu.*25/i],
        p50: [/50.*(?:wrvu|rvu)/i, /wrvu.*50/i],
        p75: [/75.*(?:wrvu|rvu)/i, /wrvu.*75/i],
        p90: [/90.*(?:wrvu|rvu)/i, /wrvu.*90/i]
      },
      cf: {
        p25: [/25.*(?:cf|conversion)/i, /cf.*25/i],
        p50: [/50.*(?:cf|conversion)/i, /cf.*50/i],
        p75: [/75.*(?:cf|conversion)/i, /cf.*75/i],
        p90: [/90.*(?:cf|conversion)/i, /cf.*90/i]
      }
    };

    const findMatchingColumn = (patterns: RegExp[], columns: string[]): string | null => {
      for (const pattern of patterns) {
        const match = columns.find(col => pattern.test(col));
        if (match) return match;
      }
      return null;
    };

    const columnMappings = {
      specialty: findMatchingColumn(patterns.specialty, columns) || '',
      providerType: findMatchingColumn(patterns.providerType, columns),
      region: findMatchingColumn(patterns.region, columns),
      nOrgs: findMatchingColumn(patterns.nOrgs, columns),
      nIncumbents: findMatchingColumn(patterns.nIncumbents, columns),
      tcc: {
        p25: findMatchingColumn(patterns.tcc.p25, columns),
        p50: findMatchingColumn(patterns.tcc.p50, columns),
        p75: findMatchingColumn(patterns.tcc.p75, columns),
        p90: findMatchingColumn(patterns.tcc.p90, columns)
      },
      wrvu: {
        p25: findMatchingColumn(patterns.wrvu.p25, columns),
        p50: findMatchingColumn(patterns.wrvu.p50, columns),
        p75: findMatchingColumn(patterns.wrvu.p75, columns),
        p90: findMatchingColumn(patterns.wrvu.p90, columns)
      },
      cf: {
        p25: findMatchingColumn(patterns.cf.p25, columns),
        p50: findMatchingColumn(patterns.cf.p50, columns),
        p75: findMatchingColumn(patterns.cf.p75, columns),
        p90: findMatchingColumn(patterns.cf.p90, columns)
      }
    };

    // Create survey record with column mappings
    const survey = await prisma.survey.create({
      data: {
        vendor,
        year,
        status: 'PROCESSING',
        columnMappings,
        mappingProgress: 0,
      },
    });

    // Process and save survey data using the detected mappings
    const surveyData = data.map((row: any) => {
      const getValue = (mapping: string | null) => mapping ? row[mapping] : null;
      const parseNumber = (value: string | null) => {
        if (!value) return null;
        const cleaned = value.replace(/[$,]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };

      return {
        surveyId: survey.id,
        specialty: getValue(columnMappings.specialty) || '',
        providerType: getValue(columnMappings.providerType),
        region: getValue(columnMappings.region),
        nOrgs: parseNumber(getValue(columnMappings.nOrgs)),
        nIncumbents: parseNumber(getValue(columnMappings.nIncumbents)),
        tccP25: parseNumber(getValue(columnMappings.tcc.p25)),
        tccP50: parseNumber(getValue(columnMappings.tcc.p50)),
        tccP75: parseNumber(getValue(columnMappings.tcc.p75)),
        tccP90: parseNumber(getValue(columnMappings.tcc.p90)),
        wrvuP25: parseNumber(getValue(columnMappings.wrvu.p25)),
        wrvuP50: parseNumber(getValue(columnMappings.wrvu.p50)),
        wrvuP75: parseNumber(getValue(columnMappings.wrvu.p75)),
        wrvuP90: parseNumber(getValue(columnMappings.wrvu.p90)),
        cfP25: parseNumber(getValue(columnMappings.cf.p25)),
        cfP50: parseNumber(getValue(columnMappings.cf.p50)),
        cfP75: parseNumber(getValue(columnMappings.cf.p75)),
        cfP90: parseNumber(getValue(columnMappings.cf.p90)),
      };
    });

    await prisma.surveyData.createMany({
      data: surveyData,
    });

    // Update survey status to READY
    await prisma.survey.update({
      where: { id: survey.id },
      data: { status: 'READY' },
    });

    return NextResponse.json({ 
      success: true, 
      surveyId: survey.id,
      columnMappings,
      message: 'Survey data uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading survey:', error);
    return NextResponse.json(
      { error: 'Error uploading survey data' },
      { status: 500 }
    );
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