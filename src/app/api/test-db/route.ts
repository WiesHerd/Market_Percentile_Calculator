import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Try to connect to the database
    await prisma.$connect();
    console.log('Successfully connected to the database');
    
    // Try to query the database
    const surveyCount = await prisma.survey.count();
    console.log(`Found ${surveyCount} surveys in the database`);
    
    // Try to create a test survey
    const testSurvey = await prisma.survey.create({
      data: {
        vendor: 'Test Vendor',
        year: '2023',
        columnMappings: {},
        status: 'PROCESSING',
      },
    });
    console.log('Successfully created a test survey:', testSurvey.id);
    
    // Clean up the test survey
    await prisma.survey.delete({
      where: { id: testSurvey.id },
    });
    console.log('Successfully deleted the test survey');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test completed successfully',
      surveyCount,
    });
  } catch (error) {
    console.error('Error testing database connection:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect to the database',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 