import { NextResponse } from 'next/server';
import { GET, POST } from './route';
import { createSurvey, addSurveyData, updateSurveyStatus, getSurveys } from '@/lib/db';

// Mock the database functions
jest.mock('@/lib/db', () => ({
  createSurvey: jest.fn(),
  addSurveyData: jest.fn(),
  updateSurveyStatus: jest.fn(),
  getSurveys: jest.fn(),
}));

describe('Surveys API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/surveys', () => {
    it('should return ready surveys', async () => {
      const mockSurveys = [
        { id: '1', status: 'READY', data: [{ specialty: 'Cardiology', tccP25: 400000 }] },
        { id: '2', status: 'PROCESSING', data: [] },
        { id: '3', status: 'ERROR', data: [] },
      ];

      (getSurveys as jest.Mock).mockResolvedValue(mockSurveys);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([mockSurveys[0]]);
    });

    it('should return 404 when no ready surveys exist', async () => {
      const mockSurveys = [
        { id: '1', status: 'PROCESSING', data: [] },
        { id: '2', status: 'ERROR', data: [] },
      ];

      (getSurveys as jest.Mock).mockResolvedValue(mockSurveys);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No survey data available');
    });

    it('should handle database errors', async () => {
      (getSurveys as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch survey data');
    });
  });

  describe('POST /api/surveys', () => {
    it('should create a new survey and start processing', async () => {
      const mockSurvey = { id: '1', status: 'PROCESSING' };
      const requestData = {
        vendor: 'Test Vendor',
        year: 2024,
        mappings: {},
        data: [{ specialty: 'Cardiology', tccP25: 400000 }],
      };

      (createSurvey as jest.Mock).mockResolvedValue(mockSurvey);
      (addSurveyData as jest.Mock).mockResolvedValue(undefined);
      (updateSurveyStatus as jest.Mock).mockResolvedValue(undefined);

      const request = new Request('http://localhost:3000/api/surveys', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.surveyId).toBe(mockSurvey.id);
      expect(createSurvey).toHaveBeenCalledWith({
        vendor: requestData.vendor,
        year: requestData.year,
        columnMappings: requestData.mappings,
      });
    });

    it('should handle errors during survey creation', async () => {
      (createSurvey as jest.Mock).mockRejectedValue(new Error('Creation failed'));

      const request = new Request('http://localhost:3000/api/surveys', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to upload survey');
    });
  });
}); 