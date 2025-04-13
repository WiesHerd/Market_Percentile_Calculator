import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type DBSpecialtyMapping = {
  id: string;
  surveyId: string;
  sourceSpecialty: string;
  mappedSpecialty: string;
  confidence: number;
  isVerified: boolean;
  notes: string | null;
  survey: {
    vendor: string;
    year: string;
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const surveyIds = searchParams.get("surveyIds")?.split(",");

  try {
    const mappings = await prisma.specialtyMapping.findMany({
      include: {
        survey: {
          select: {
            vendor: true,
            year: true,
          },
        },
      },
    });

    // Transform mappings to include vendor and year directly
    const transformedMappings = mappings.map((mapping) => ({
      ...mapping,
      surveyId: mapping.surveyId,
      surveyVendor: mapping.survey.vendor,
      surveyYear: mapping.survey.year
    }));

    return NextResponse.json(transformedMappings);
  } catch (error) {
    console.error("Error fetching specialty mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch specialty mappings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { surveyId, sourceSpecialty, mappedSpecialties, notes } =
      await request.json() as {
        surveyId: string;
        sourceSpecialty: string;
        mappedSpecialties: string[];
        notes?: string;
      };

    // Delete existing mappings for this source specialty
    await prisma.specialtyMapping.deleteMany({
      where: {
        surveyId: surveyId,
        sourceSpecialty: sourceSpecialty,
      },
    });

    // Create new mappings
    const newMappings = await Promise.all(
      mappedSpecialties.map((mappedSpecialty: string) =>
        prisma.specialtyMapping.create({
          data: {
            sourceSpecialty,
            mappedSpecialty,
            notes: notes || null,
            confidence: 1.0, // Default confidence for manual mappings
            survey: {
              connect: {
                id: surveyId,
              },
            },
          },
        })
      )
    );

    return NextResponse.json(newMappings);
  } catch (error) {
    console.error("Error updating specialty mappings:", error);
    return NextResponse.json(
      { error: "Failed to update specialty mappings" },
      { status: 500 }
    );
  }
}
