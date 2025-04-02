import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const surveys = await prisma.survey.findMany({
      include: {
        surveyData: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surveys' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vendor, year, data, surveyData } = body;

    // Create the survey first
    const survey = await prisma.survey.create({
      data: {
        vendor,
        year,
        data: data || {},
        surveyData: {
          create: surveyData.map((row: any) => ({
            specialty: row.specialty,
            tcc_p25: row.tcc?.p25 || null,
            tcc_p50: row.tcc?.p50 || null,
            tcc_p75: row.tcc?.p75 || null,
            tcc_p90: row.tcc?.p90 || null,
            wrvu_p25: row.wrvu?.p25 || null,
            wrvu_p50: row.wrvu?.p50 || null,
            wrvu_p75: row.wrvu?.p75 || null,
            wrvu_p90: row.wrvu?.p90 || null,
            cf_p25: row.cf?.p25 || null,
            cf_p50: row.cf?.p50 || null,
            cf_p75: row.cf?.p75 || null,
            cf_p90: row.cf?.p90 || null
          }))
        }
      },
      include: {
        surveyData: true
      }
    });

    return NextResponse.json(survey);
  } catch (error) {
    console.error('Error creating survey:', error);
    return NextResponse.json(
      { error: 'Failed to create survey' },
      { status: 500 }
    );
  }
} 