import { NextResponse } from 'next/server';

export async function GET() {
  // Create CSV header
  const headers = [
    'specialty',
    'provider_type',
    'geographic_region',
    'n_orgs',
    'n_incumbents',
    'tcc_p25',
    'tcc_p50',
    'tcc_p75',
    'tcc_p90',
    'wrvu_p25',
    'wrvu_p50',
    'wrvu_p75',
    'wrvu_p90',
    'cf_p25',
    'cf_p50',
    'cf_p75',
    'cf_p90'
  ].join(',');

  // Create sample data rows
  const sampleData = [
    'Pediatrics General,Staff Physician,National,90,944,480611,534013,587414,640815,6733,7482,8230,8978,70,78,85,93',
    'Pediatrics General,Staff Physician,Northeast,88,1277,514253,571383,628532,685672,6733,7482,8230,8978,70,78,85,93',
    'Pediatrics General,Program Director,National,58,74,567120,630135,693148,756161,4349,4833,5316,5800,93,103,113,123'
  ];

  // Combine header and data
  const csvContent = [headers, ...sampleData].join('\n');

  // Create response with CSV content
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=sample-survey-template.csv'
    }
  });
} 