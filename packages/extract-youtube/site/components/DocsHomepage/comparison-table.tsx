/**
 * @file comparison-table.tsx
 * @description extract-youtube next to the two most-used alternatives.
 */
import { AlertCircle, Check, X } from 'lucide-react';

const libraries = ['extract-youtube', 'youtube-transcript (npm)', 'youtube-transcript-api (Python)'];

type Cell = boolean | 'partial' | string;

const features: { name: string; values: Cell[] }[] = [
  { name: 'Language', values: ['TypeScript', 'JavaScript', 'Python'] },
  { name: 'No browser / no API key', values: [true, true, true] },
  { name: 'Serverless (Lambda, Vercel)', values: [true, 'partial', false] },
  { name: 'Edge runtimes (Cloudflare Workers)', values: [true, false, false] },
  { name: 'Full TypeScript types', values: [true, 'partial', false] },
  { name: 'Auto-generated captions', values: [true, true, true] },
  { name: 'Translation', values: [true, 'partial', true] },
  { name: 'Proxy support', values: [true, 'partial', true] },
  { name: 'CLI', values: [true, false, true] },
  { name: 'Output formats', values: ['6', '1–2', '5'] },
  { name: 'React player & transcript UI', values: [true, false, false] },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-primary" aria-label="Yes" />;
  if (value === false) return <X className="mx-auto h-5 w-5 text-muted-foreground/50" aria-label="No" />;
  if (value === 'partial') return <AlertCircle className="mx-auto h-5 w-5 text-yellow-500" aria-label="Partial" />;
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

export function ComparisonTable() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            How it <span className="text-primary">compares</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            The same caption-fetching approach as the popular Python library, packaged for the JavaScript runtimes
            people actually deploy to.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-4 text-left font-semibold">Feature</th>
                {libraries.map((lib, index) => (
                  <th key={lib} className={`px-4 py-4 text-center font-semibold ${index === 0 ? 'text-primary' : ''}`}>
                    {lib}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, rowIndex) => (
                <tr key={feature.name} className={`border-b border-border ${rowIndex % 2 === 0 ? 'bg-card/50' : ''}`}>
                  <td className="px-4 py-3 text-muted-foreground">{feature.name}</td>
                  {feature.values.map((value, colIndex) => (
                    <td key={colIndex} className={`px-4 py-3 text-center ${colIndex === 0 ? 'bg-primary/5' : ''}`}>
                      <CellValue value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <AlertCircle className="mr-1 inline h-4 w-4 text-yellow-500" />
          Partial support, or needs extra configuration.
        </p>
      </div>
    </section>
  );
}
