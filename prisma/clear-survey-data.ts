import { PrismaClient } from '@prisma/client';

async function clearSurveyData() {
  const prisma = new PrismaClient();
  
  try {
    await prisma.surveyData.deleteMany({});
    console.log('Successfully cleared SurveyData table');
  } catch (error) {
    console.error('Error clearing SurveyData table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearSurveyData(); 