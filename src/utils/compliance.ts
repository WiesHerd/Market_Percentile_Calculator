import { ComplianceCheck, FairMarketValue, MarketData, MetricType, AuditLog } from '@/types/logs';

// Compliance thresholds
const COMPLIANCE_THRESHOLDS = {
  total: {
    warning: 75, // 75th percentile
    flag: 90,    // 90th percentile
  },
  wrvu: {
    warning: 75,
    flag: 90,
  },
  cf: {
    warning: 75,
    flag: 90,
  },
};

// Fair Market Value ranges by specialty (example data - should be replaced with actual FMV data)
const FMV_RANGES: Record<string, FairMarketValue> = {
  'Family Medicine': {
    min: 180000,
    max: 350000,
    metricType: 'total',
    specialty: 'Family Medicine',
    source: 'MGMA 2023',
    lastUpdated: '2023-12-31',
  },
  // Add more specialties as needed
};

export function performComplianceChecks(
  specialty: string,
  metric: MetricType,
  value: number,
  percentile: number,
  marketData: MarketData[]
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const thresholds = COMPLIANCE_THRESHOLDS[metric];
  
  // Check percentile thresholds
  if (percentile >= thresholds.flag) {
    checks.push({
      id: `${Date.now()}-flag`,
      type: 'flag',
      message: `Value exceeds ${thresholds.flag}th percentile threshold for ${metric}`,
      threshold: thresholds.flag,
      metricType: metric,
    });
  } else if (percentile >= thresholds.warning) {
    checks.push({
      id: `${Date.now()}-warning`,
      type: 'warning',
      message: `Value exceeds ${thresholds.warning}th percentile threshold for ${metric}`,
      threshold: thresholds.warning,
      metricType: metric,
    });
  }

  // Check Fair Market Value if available
  const fmvRange = FMV_RANGES[specialty];
  if (fmvRange && metric === 'total') {
    if (value > fmvRange.max) {
      checks.push({
        id: `${Date.now()}-fmv-high`,
        type: 'flag',
        message: `Value exceeds Fair Market Value maximum for ${specialty}`,
        threshold: fmvRange.max,
        metricType: metric,
      });
    } else if (value < fmvRange.min) {
      checks.push({
        id: `${Date.now()}-fmv-low`,
        type: 'info',
        message: `Value is below Fair Market Value minimum for ${specialty}`,
        threshold: fmvRange.min,
        metricType: metric,
      });
    }
  }

  return checks;
}

export function getFairMarketValue(specialty: string): FairMarketValue | undefined {
  return FMV_RANGES[specialty];
}

export function createAuditLog(
  action: AuditLog['action'],
  details: AuditLog['details']
): AuditLog {
  return {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action,
    details,
    userId: 'system', // Replace with actual user ID when authentication is implemented
  };
}

export function getComplianceMethodologyLink(metric: MetricType): string {
  const methodologyLinks = {
    total: '/docs/methodology/total-cash-compensation.pdf',
    wrvu: '/docs/methodology/work-rvus.pdf',
    cf: '/docs/methodology/conversion-factor.pdf',
  };
  return methodologyLinks[metric];
}

// Helper function to format compliance messages for display
export function formatComplianceMessage(check: ComplianceCheck): {
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
} {
  const severity = check.type === 'flag' ? 'error' : check.type === 'warning' ? 'warning' : 'info';
  
  return {
    title: check.type === 'flag' ? 'Compliance Flag' : check.type === 'warning' ? 'Warning' : 'Information',
    description: check.message,
    severity,
  };
} 