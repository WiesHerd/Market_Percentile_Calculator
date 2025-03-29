import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PercentileCalculator from './PercentileCalculator';
import { MarketData } from '@/types/market-data';

// Mock the fetch function
global.fetch = jest.fn();

describe('PercentileCalculator', () => {
  const mockMarketData: MarketData[] = [
    {
      id: '1',
      specialty: 'Cardiology',
      p25_total: 400000,
      p50_total: 500000,
      p75_total: 600000,
      p90_total: 700000,
      p25_wrvu: 6000,
      p50_wrvu: 7500,
      p75_wrvu: 9000,
      p90_wrvu: 10500,
      p25_cf: 60,
      p50_cf: 65,
      p75_cf: 70,
      p90_cf: 75,
      source: {
        type: 'survey',
        name: 'Test Survey 2024',
        timestamp: '2024-01-01'
      }
    }
  ];

  beforeEach(() => {
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{
        id: '1',
        status: 'READY',
        data: mockMarketData
      }])
    });
  });

  it('should load market data on mount', async () => {
    render(<PercentileCalculator />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading Market Data...')).not.toBeInTheDocument();
    });

    // Verify data is loaded
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
  });

  it('should show error when no survey data is available', async () => {
    // Mock API response with no data
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'No survey data available' })
    });

    render(<PercentileCalculator />);
    
    await waitFor(() => {
      expect(screen.getByText('No survey data available. Please upload survey data first.')).toBeInTheDocument();
    });
  });

  it('should calculate percentile correctly', async () => {
    render(<PercentileCalculator />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading Market Data...')).not.toBeInTheDocument();
    });

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/Physician Name/i), {
      target: { value: 'Dr. Test' }
    });
    
    fireEvent.change(screen.getByLabelText(/Specialty/i), {
      target: { value: 'Cardiology' }
    });
    
    fireEvent.change(screen.getByLabelText(/Total Cash Compensation/i), {
      target: { value: '550000' }
    });

    // Click calculate button
    fireEvent.click(screen.getByText(/Calculate Percentile/i));

    // Verify result
    await waitFor(() => {
      expect(screen.getByText(/ranks in the/i)).toBeInTheDocument();
      expect(screen.getByText(/th percentile/i)).toBeInTheDocument();
    });
  });

  it('should handle FTE normalization', async () => {
    render(<PercentileCalculator />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading Market Data...')).not.toBeInTheDocument();
    });

    // Fill in the form with 0.5 FTE
    fireEvent.change(screen.getByLabelText(/Physician Name/i), {
      target: { value: 'Dr. Test' }
    });
    
    fireEvent.change(screen.getByLabelText(/Specialty/i), {
      target: { value: 'Cardiology' }
    });
    
    fireEvent.change(screen.getByLabelText(/FTE/i), {
      target: { value: '0.5' }
    });
    
    fireEvent.change(screen.getByLabelText(/Total Cash Compensation/i), {
      target: { value: '275000' }
    });

    // Click calculate button
    fireEvent.click(screen.getByText(/Calculate Percentile/i));

    // Verify normalization message
    await waitFor(() => {
      expect(screen.getByText(/Normalized to 1.0 FTE/i)).toBeInTheDocument();
    });
  });

  it('should show error for invalid inputs', async () => {
    render(<PercentileCalculator />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading Market Data...')).not.toBeInTheDocument();
    });

    // Try to calculate without filling required fields
    fireEvent.click(screen.getByText(/Calculate Percentile/i));

    // Verify error message
    expect(screen.getByText('Please fill in all required fields')).toBeInTheDocument();
  });
}); 