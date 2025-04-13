import { PrismaClient } from '@prisma/client';

async function testDatabaseConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

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
    
    console.log('Database connection test completed successfully');
  } catch (error) {
    console.error('Error testing database connection:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDatabaseConnection()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 