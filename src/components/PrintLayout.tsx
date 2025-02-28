import { PrintLayoutProps } from '@/types/survey';
import { cn } from '@/lib/utils';

export function PrintLayout({ title, subtitle, sections }: PrintLayoutProps) {
  return (
    <div className="hidden print:block print:m-0 print:p-0 print:bg-white">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <header className="text-center mb-6 pb-3 border-b-2 border-primary">
          <h1 className="text-2xl font-semibold text-primary m-0 mb-2">{title}</h1>
          <p className="text-base text-gray-600 m-0">{subtitle}</p>
        </header>

        {/* Sections */}
        {sections.map((section, index) => (
          <section 
            key={index} 
            className={cn(
              "mb-6 break-inside-avoid",
              index === sections.length - 1 && "mb-0"
            )}
          >
            <h2 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider pl-2 border-l-3 border-primary">
              {section.title}
            </h2>
            
            <div className="overflow-hidden border border-gray-200 rounded-sm">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="w-[28%] p-2 font-semibold text-left text-gray-600 border border-gray-200">
                      SOURCE
                    </th>
                    {['25TH', '50TH', '75TH', '90TH'].map((header) => (
                      <th 
                        key={header}
                        className="p-2 font-semibold text-right text-gray-600 border border-gray-200"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="p-2 border border-gray-200 text-left">
                        {row.source}
                      </td>
                      <td className="p-2 border border-gray-200 text-right">{row.values.p25}</td>
                      <td className="p-2 border border-gray-200 text-right">{row.values.p50}</td>
                      <td className="p-2 border border-gray-200 text-right">{row.values.p75}</td>
                      <td className="p-2 border border-gray-200 text-right">{row.values.p90}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50">
                    <td className="p-2 border border-gray-200 text-left font-semibold text-primary">
                      Average
                    </td>
                    <td className="p-2 border border-gray-200 text-right font-semibold text-primary">
                      {section.averages.p25}
                    </td>
                    <td className="p-2 border border-gray-200 text-right font-semibold text-primary">
                      {section.averages.p50}
                    </td>
                    <td className="p-2 border border-gray-200 text-right font-semibold text-primary">
                      {section.averages.p75}
                    </td>
                    <td className="p-2 border border-gray-200 text-right font-semibold text-primary">
                      {section.averages.p90}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {/* Footer */}
        <footer className="mt-4 pt-2 border-t border-gray-200 text-[0.65rem] text-gray-500 flex justify-between">
          <span>Generated on {new Date().toLocaleDateString()}</span>
          <span>Market Intelligence Suite - Confidential</span>
        </footer>
      </div>
    </div>
  );
} 