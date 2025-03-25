# Provider Percentile Calculator

A modern web application that helps healthcare providers analyze compensation data across different specialties. Calculate where your compensation falls within industry percentiles for Total Cash Compensation, Work RVUs, and Conversion Factors.

## Features

- **Percentile Calculator**: Instantly calculate your percentile ranking for:
  - Total Cash Compensation (TCC)
  - Work Relative Value Units (wRVU)
  - Conversion Factor (CF)

- **Interactive Visualization**: 
  - Beautiful line graph showing the distribution curve
  - Clear markers for 25th, 50th, 75th, and 90th percentiles
  - Visual indicator of where your value falls
  - Hover tooltips for detailed information

- **Market Data Management**:
  - View comprehensive market data across specialties
  - Upload custom market data via CSV
  - Search and filter specialties
  - Persistent storage of uploaded data

- **Specialty Mapping Studio**:
  - Map specialties across different survey vendors
  - Auto-mapping based on synonym relationships
  - Custom synonym management
  - Interactive mapping interface

- **User-Friendly Interface**:
  - Clean, modern design
  - Responsive layout
  - Clear data presentation
  - Intuitive navigation

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/physician-compensation-calculator.git
   cd physician-compensation-calculator
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### CSV Upload Format

To upload custom market data, your CSV file should follow this format:

```csv
specialty,p25_TCC,p50_TCC,p75_TCC,p90_TCC,p25_wrvu,p50_wrvu,p75_wrvu,p90_wrvu,p25_cf,p50_cf,p75_cf,p90_cf
"Family Medicine",220000,250000,280000,320000,4200,4800,5400,6200,45.50,48.75,52.00,56.25
```

Required columns:
- `specialty`: Specialty name
- `p25_TCC`, `p50_TCC`, `p75_TCC`, `p90_TCC`: Total Cash Compensation percentiles
- `p25_wrvu`, `p50_wrvu`, `p75_wrvu`, `p90_wrvu`: Work RVU percentiles
- `p25_cf`, `p50_cf`, `p75_cf`, `p90_cf`: Conversion Factor percentiles

## Documentation

Detailed documentation for various components and fixes can be found in the `docs` directory:

- [Specialty Mapping System Fix](docs/specialty-mapping-fix.md) - Documentation of the fix for the auto-mapping system's synonym recognition
- [CSV Upload Format](#csv-upload-format) - Information about the required format for CSV uploads

## Built With

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Recharts](https://recharts.org/) - Composable charting library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
