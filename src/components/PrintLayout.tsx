import { PrintLayoutProps } from '@/types/survey';

export function PrintLayout({ title, subtitle, sections }: PrintLayoutProps) {
  return (
    <div className="hidden print:block">
      <div className="max-w-4xl mx-auto">
        <div>
          <h2 className="text-base mb-1">Market Report</h2>
          <p className="text-sm mb-4">Specialty Analysis: {subtitle}</p>

          {sections.map((section, index) => (
            <div key={index} className="mb-6">
              <h3 className="text-sm font-medium mb-2">{section.title}</h3>
              <table className="w-full border-t border-b border-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="text-left py-2 pr-4 text-sm">SOURCE</th>
                    <th scope="col" className="text-right py-2 px-4 text-sm">25TH</th>
                    <th scope="col" className="text-right py-2 px-4 text-sm">50TH</th>
                    <th scope="col" className="text-right py-2 px-4 text-sm">75TH</th>
                    <th scope="col" className="text-right py-2 px-4 text-sm">90TH</th>
                  </tr>
                </thead>
                <tbody className="border-t border-gray-300">
                  {section.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-gray-200">
                      <td className="py-2 pr-4">{row.source}</td>
                      <td className="text-right py-2 px-4">{row.values.p25}</td>
                      <td className="text-right py-2 px-4">{row.values.p50}</td>
                      <td className="text-right py-2 px-4">{row.values.p75}</td>
                      <td className="text-right py-2 px-4">{row.values.p90}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 pr-4 font-medium">Average</td>
                    <td className="text-right py-2 px-4 font-medium">{section.averages.p25}</td>
                    <td className="text-right py-2 px-4 font-medium">{section.averages.p50}</td>
                    <td className="text-right py-2 px-4 font-medium">{section.averages.p75}</td>
                    <td className="text-right py-2 px-4 font-medium">{section.averages.p90}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5in;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 12px;
            line-height: 1.4;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          td, th {
            padding: 8px;
          }

          /* Print-specific styles */
          @media print {
            .screen-only {
              display: none !important;
            }
          }
        }
      `}</style>
    </div>
  );
} 