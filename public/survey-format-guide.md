## File Format Requirements

### Accepted File Types
- CSV (Comma Separated Values) - Recommended
- Excel (.xlsx, .xls)

### Required Columns
1. **Specialty** - The medical specialty name
   - Must be text format
   - Example: "Family Medicine", "Internal Medicine", "Cardiology"

2. **Geographic Region** - The geographic area for the data
   - Must be text format
   - Standard values: "National", "Northeast", "North Central", "South", "West"
   - Example: "National", "Northeast"

3. **Number of Organizations (N Orgs)**
   - Column: `n_orgs`
   - Must be numeric value
   - Example: 150

4. **Number of Incumbents (N Incumbents)**
   - Column: `n_incumbents`
   - Must be numeric value
   - Example: 1250

5. **Total Cash Compensation (TCC) Percentiles**
   - Required columns: `tcc_p25`, `tcc_p50`, `tcc_p75`, `tcc_p90`
   - Must be numeric values
   - Do not include currency symbols or commas
   - Example: 250000 (not $250,000)

### Optional Metrics
1. **Work RVUs Percentiles**
   - Columns: `wrvu_p25`, `wrvu_p50`, `wrvu_p75`, `wrvu_p90`
   - Must be numeric values
   - No commas or special formatting
   - Example: 4800

2. **Conversion Factors Percentiles**
   - Columns: `cf_p25`, `cf_p50`, `cf_p75`, `cf_p90`
   - Must be numeric values
   - Use decimal points as needed
   - Example: 50.25

## Column Naming Variations
The system recognizes several common variations of column names:

### Geographic Region Variations
- `geographic_region`, `region`, `geography`, `location`
- Standard values: "National", "Northeast", "North Central", "South", "West"

### N Orgs Variations
- `n_orgs`, `num_orgs`, `org_count`, `organizations`, `number_of_organizations`
- Must be numeric values

### N Incumbents Variations
- `n_incumbents`, `num_incumbents`, `incumbent_count`, `incumbents`, `number_of_incumbents`
- Must be numeric values

### TCC Variations
- `tcc_p25`, `tcc_25`, `tcc25`, `total_cash_p25`
- `tcc_p50`, `tcc_50`, `tcc50`, `total_cash_p50`
- `tcc_p75`, `tcc_75`, `tcc75`, `total_cash_p75`
- `tcc_p90`, `tcc_90`, `tcc90`, `total_cash_p90`

### Work RVU Variations
- `wrvu_p25`, `wRVU_25`, `work_rvu_p25`
- `wrvu_p50`, `wRVU_50`, `work_rvu_p50`
- `wrvu_p75`, `wRVU_75`, `work_rvu_p75`
- `wrvu_p90`, `wRVU_90`, `work_rvu_p90`

### Conversion Factor Variations
- `cf_p25`, `conversion_factor_p25`, `cf25`
- `cf_p50`, `conversion_factor_p50`, `cf50`
- `cf_p75`, `conversion_factor_p75`, `cf75`
- `cf_p90`, `conversion_factor_p90`, `cf90`

## Data Format Guidelines

### Specialty Names
- Use standard specialty names
- Be consistent with spelling and formatting
- Avoid abbreviations when possible

### Geographic Regions
- Use standard region names
- Be consistent across all entries
- Avoid custom region names unless necessary

### Numeric Values
- Use plain numbers without formatting
- No currency symbols ($)
- No commas in numbers
- Use periods for decimal points
- Remove any special characters

### Missing Data
- Leave cells empty for missing data
- Do not use text like "N/A" or "NULL"
- Zero (0) should only be used for actual zero values

## Sample Data
```csv
specialty,geographic_region,n_orgs,n_incumbents,tcc_p25,tcc_p50,tcc_p75,tcc_p90,wrvu_p25,wrvu_p50,wrvu_p75,wrvu_p90,cf_p25,cf_p50,cf_p75,cf_p90
Family Medicine,National,150,1250,220000,250000,280000,310000,4500,5000,5500,6000,48.89,50.00,50.91,51.67
Internal Medicine,Northeast,125,980,240000,270000,300000,330000,4800,5300,5800,6300,50.00,50.94,51.72,52.38
```

## Tips for Success
1. **Clean Your Data**
   - Remove any formatting from Excel files
   - Ensure numbers are plain text without special formatting
   - Check for and remove any hidden characters

2. **Validate Before Upload**
   - Verify all required columns are present
   - Check that numeric fields contain only numbers
   - Ensure specialty names are consistent
   - Verify geographic regions match standard values

3. **Common Issues to Avoid**
   - Currency formatting in TCC columns
   - Commas in large numbers
   - Special characters in specialty names
   - Merged cells in Excel files
   - Hidden rows or columns
   - Non-standard geographic regions
   - Missing n_orgs or n_incumbents values

4. **File Size Considerations**
   - Keep files under 10MB for best performance
   - If you have a large dataset, consider splitting it into multiple files

## Need Help?
If you encounter any issues with your data format, please refer to our sample template or contact support for assistance. 