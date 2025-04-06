import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // First check if the table exists by trying to count records
    const count = await prisma.surveyTemplate.count();
    console.log(`Found ${count} templates`);
    
    const templates = await prisma.surveyTemplate.findMany({
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    // Return an empty array instead of an error to prevent UI from breaking
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const { name, vendor, year, mapping } = await request.json();

    if (!name || !mapping) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const template = await prisma.surveyTemplate.create({
      data: {
        name,
        vendor: vendor || 'Unknown',
        year: year || new Date().getFullYear().toString(),
        mapping
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
} 