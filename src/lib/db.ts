import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createSurvey(data: {
  vendor: string;
  year: string;
  columnMappings: any;
}) {
  console.log('Creating survey with mappings:', JSON.stringify(data.columnMappings, null, 2));
  return prisma.survey.create({
    data: {
      vendor: data.vendor,
      year: data.year,
      columnMappings: data.columnMappings,
    },
  });
}

export async function addSurveyData(surveyId: string, data: any[]) {
  // Log first row as sample
  console.log('Sample row before processing:', JSON.stringify(data[0], null, 2));
  
  // Process data in chunks to avoid memory issues
  const chunkSize = 100;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const processedChunk = chunk.map(row => {
      // Log raw values for TCC and CF fields
      console.log('Raw TCC values:', {
        tccP25: row.tccP25,
        tccP50: row.tccP50,
        tccP75: row.tccP75,
        tccP90: row.tccP90
      });
      console.log('Raw CF values:', {
        cfP25: row.cfP25,
        cfP50: row.cfP50,
        cfP75: row.cfP75,
        cfP90: row.cfP90
      });

      const processed = {
        surveyId,
        specialty: row.specialty,
        providerType: row.providerType,
        region: row.region,
        nOrgs: row.nOrgs ? parseInt(row.nOrgs) : null,
        nIncumbents: row.nIncumbents ? parseInt(row.nIncumbents) : null,
        tccP25: row.tccP25 ? parseFloat(row.tccP25.replace(/[$,]/g, '')) : null,
        tccP50: row.tccP50 ? parseFloat(row.tccP50.replace(/[$,]/g, '')) : null,
        tccP75: row.tccP75 ? parseFloat(row.tccP75.replace(/[$,]/g, '')) : null,
        tccP90: row.tccP90 ? parseFloat(row.tccP90.replace(/[$,]/g, '')) : null,
        wrvuP25: row.wrvuP25 ? parseFloat(row.wrvuP25.replace(/,/g, '')) : null,
        wrvuP50: row.wrvuP50 ? parseFloat(row.wrvuP50.replace(/,/g, '')) : null,
        wrvuP75: row.wrvuP75 ? parseFloat(row.wrvuP75.replace(/,/g, '')) : null,
        wrvuP90: row.wrvuP90 ? parseFloat(row.wrvuP90.replace(/,/g, '')) : null,
        cfP25: row.cfP25 ? parseFloat(row.cfP25.replace(/[$,]/g, '')) : null,
        cfP50: row.cfP50 ? parseFloat(row.cfP50.replace(/[$,]/g, '')) : null,
        cfP75: row.cfP75 ? parseFloat(row.cfP75.replace(/[$,]/g, '')) : null,
        cfP90: row.cfP90 ? parseFloat(row.cfP90.replace(/[$,]/g, '')) : null,
      };

      // Log processed values
      console.log('Processed TCC values:', {
        tccP25: processed.tccP25,
        tccP50: processed.tccP50,
        tccP75: processed.tccP75,
        tccP90: processed.tccP90
      });
      console.log('Processed CF values:', {
        cfP25: processed.cfP25,
        cfP50: processed.cfP50,
        cfP75: processed.cfP75,
        cfP90: processed.cfP90
      });

      return processed;
    });

    // Log first processed row
    if (i === 0) {
      console.log('First processed row:', JSON.stringify(processedChunk[0], null, 2));
    }

    await prisma.surveyData.createMany({
      data: processedChunk,
    });
  }
}

export async function getSurveys() {
  try {
    const surveys = await prisma.survey.findMany({
      include: {
        data: true,
        specialtyMappings: true,
      },
    });
    return surveys;
  } catch (error) {
    console.error('Error fetching surveys from database:', error);
    throw new Error('Failed to fetch surveys from database');
  }
}

export async function getSurveyById(id: string) {
  return prisma.survey.findUnique({
    where: { id },
    include: {
      data: true,
      specialtyMappings: true,
    },
  });
}

export async function updateSurveyStatus(id: string, status: 'PROCESSING' | 'READY' | 'ERROR') {
  return prisma.survey.update({
    where: { id },
    data: { status },
  });
}

export async function addSpecialtyMapping(data: {
  surveyId: string;
  sourceSpecialty: string;
  mappedSpecialty: string;
  confidence: number;
  notes?: string;
}) {
  return prisma.specialtyMapping.create({
    data,
  });
}

export async function getSpecialtyMappings(surveyId: string) {
  return prisma.specialtyMapping.findMany({
    where: { surveyId },
  });
}

export async function deleteSurvey(surveyId: string) {
  try {
    // First delete all related survey data
    await prisma.surveyData.deleteMany({
      where: { surveyId }
    });

    // Delete specialty mappings
    await prisma.specialtyMapping.deleteMany({
      where: { surveyId }
    });

    // Finally delete the survey itself
    await prisma.survey.delete({
      where: { id: surveyId }
    });
  } catch (error) {
    console.error('Error deleting survey:', error);
    throw error;
  }
} 