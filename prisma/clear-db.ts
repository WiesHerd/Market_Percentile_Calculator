import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('Starting database cleanup...');

    // Delete all records from each table in the correct order to respect foreign key constraints
    const tables = [
      'surveyData',
      'specialtyMapping',
      'learningEvent',
      'matchingRule',
      'mappedGroup',
      'unmappedSpecialty',
      'survey'
    ];

    for (const table of tables) {
      const result = await prisma[table].deleteMany();
      console.log(`Cleared ${table} table - ${result.count} records deleted`);
    }

    console.log('Successfully cleared all tables');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
clearDatabase()
  .catch((error) => {
    console.error('Failed to clear database:', error);
    process.exit(1);
  }); 