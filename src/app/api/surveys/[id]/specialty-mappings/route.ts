import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const mappings = await prisma.specialtyMapping.findMany({
      where: {
        surveyId: params.id
      }
    });

    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error fetching specialty mappings:', error);
    return NextResponse.json({ error: 'Failed to fetch specialty mappings' }, { status: 500 });
  }
} 