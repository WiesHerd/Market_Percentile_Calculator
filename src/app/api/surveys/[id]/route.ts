import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { validateColumnMappings } from "@/app/survey-management/utils/validation";

interface SpecialtyMapping {
  mappedSpecialties: string[];
  notes?: string;
  resolved?: boolean;
  isSingleSource?: boolean;
  confidence?: number;
}

interface RequestBody {
  columnMappings: Record<string, any>;
  specialtyMappings: Record<string, SpecialtyMapping>;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('API Route: Starting GET request for survey:', params.id);
  
  try {
    // Verify Prisma client is available
    if (!prisma) {
      console.error('Prisma client is not initialized');
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    console.log('API Route: Attempting to find survey with ID:', params.id);
    
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        vendor: true,
        year: true,
        columnMappings: true,
        specialtyMappings: {
          select: {
            sourceSpecialty: true,
            mappedSpecialty: true,
            notes: true,
            isVerified: true,
            confidence: true
          }
        },
        mappingProgress: true,
        data: true
      }
    });

    console.log('API Route: Database query completed');
    console.log('API Route: Survey found:', survey ? 'yes' : 'no');
    
    if (survey) {
      console.log('API Route: Survey details:', {
        id: survey.id,
        vendor: survey.vendor,
        year: survey.year,
        hasData: survey.data?.length > 0,
        hasSpecialtyMappings: survey.specialtyMappings?.length > 0,
        hasColumnMappings: !!survey.columnMappings
      });
    }

    if (!survey) {
      console.error('API Route: Survey not found:', params.id);
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the frontend's expected structure
    // and minimize payload size
    const transformedSurvey = {
      id: survey.id,
      vendor: survey.vendor,
      year: survey.year,
      columnMappings: survey.columnMappings,
      specialtyMappings: survey.specialtyMappings.reduce((acc: Record<string, any>, mapping) => {
        const sourceSpecialty = mapping.sourceSpecialty;
        if (!acc[sourceSpecialty]) {
          acc[sourceSpecialty] = {
            mappedSpecialties: [],
            notes: mapping.notes || undefined,
            resolved: mapping.isVerified,
            confidence: mapping.confidence,
          };
        }
        acc[sourceSpecialty].mappedSpecialties.push(mapping.mappedSpecialty);
        return acc;
      }, {}),
      mappingProgress: survey.mappingProgress,
      // Only send necessary data fields
      data: survey.data?.map(row => ({
        specialty: row.specialty,
        providerType: row.providerType,
        region: row.region,
        nOrgs: row.nOrgs,
        nIncumbents: row.nIncumbents,
        tcc: {
          p25: row.tccP25,
          p50: row.tccP50,
          p75: row.tccP75,
          p90: row.tccP90
        },
        wrvu: {
          p25: row.wrvuP25,
          p50: row.wrvuP50,
          p75: row.wrvuP75,
          p90: row.wrvuP90
        },
        cf: {
          p25: row.cfP25,
          p50: row.cfP50,
          p75: row.cfP75,
          p90: row.cfP90
        }
      }))
    };

    console.log('API Route: Successfully transformed survey data');
    return NextResponse.json(transformedSurvey);
  } catch (error) {
    console.error('API Route: Error in GET request:', error);
    
    // Handle Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('API Route: Prisma known error:', {
        code: error.code,
        message: error.message,
        meta: error.meta
      });
      return NextResponse.json(
        { error: `Database error: ${error.code}` },
        { status: 500 }
      );
    }
    
    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('API Route: Prisma validation error:', error.message);
      return NextResponse.json(
        { error: 'Invalid database query' },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      console.error('API Route: General error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.error('API Route: Unknown error type:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { columnMappings, mappingProgress } = body;

    // Validate the request body
    const validation = validateColumnMappings(columnMappings);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid column mappings",
          details: validation,
        },
        { status: 400 }
      );
    }

    // Use a transaction to ensure atomicity
    const updatedSurvey = await prisma.$transaction(async (tx) => {
      // Lock the survey record for update
      const currentSurvey = await tx.survey.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!currentSurvey) {
        throw new Error("Survey not found");
      }

      // Update the survey with new mappings
      return tx.survey.update({
        where: { id },
        data: {
          columnMappings: columnMappings as Prisma.JsonObject,
          mappingProgress,
          updatedAt: new Date(),
        },
        include: {
          specialtyMappings: true,
        },
      });
    });

    return NextResponse.json(updatedSurvey);
  } catch (error) {
    console.error("Error updating survey:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors
      switch (error.code) {
        case "P2025":
          return NextResponse.json(
            { error: "Survey not found" },
            { status: 404 }
          );
        case "P2002":
          return NextResponse.json(
            { error: "Unique constraint violation" },
            { status: 409 }
          );
        default:
          return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
          );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 