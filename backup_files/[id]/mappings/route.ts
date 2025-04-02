import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { columnMappings, specialtyMappings } = body;

    const survey = await prisma.survey.update({
      where: { id: params.id },
      data: {
        columnMappings: {
          upsert: {
            where: { surveyId: params.id },
            create: columnMappings,
            update: columnMappings,
          },
        },
        ...(specialtyMappings && {
          specialtyMappings: {
            deleteMany: { surveyId: params.id },
            createMany: {
              data: specialtyMappings.map((mapping: any) => ({
                ...mapping,
                surveyId: params.id,
              })),
            },
          },
        }),
      },
      include: {
        columnMappings: true,
        specialtyMappings: true,
      },
    });

    return NextResponse.json(survey);
  } catch (error) {
    console.error('Error updating survey mappings:', error);
    return NextResponse.json(
      { error: 'Failed to update survey mappings' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      include: {
        columnMappings: true,
        specialtyMappings: true,
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    return NextResponse.json(survey);
  } catch (error) {
    console.error('Error fetching survey mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey mappings' },
      { status: 500 }
    );
  }
} 