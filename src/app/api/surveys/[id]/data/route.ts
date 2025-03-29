import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const surveyData = await prisma.surveyData.findMany({
      where: {
        surveyId: params.id
      }
    });

    return NextResponse.json({ surveyData });
  } catch (error) {
    console.error('Error fetching survey data:', error);
    return NextResponse.json({ error: 'Failed to fetch survey data' }, { status: 500 });
  }
} 