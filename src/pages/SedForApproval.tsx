import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import MultiSelect from '../components/MultiSelect';
import ConfirmModal from '../components/ConfirmModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const componentFields = [
  'formulation_reference',
  'material_type_id',
  'components_reference',
  'component_code',
  'component_description',
  'component_valid_from',
  'component_valid_to',
  'component_material_group',
  'component_quantity',
  'component_uom_id',
  'component_base_quantity',
  'component_base_uom_id',
  'percent_w_w',
  'evidence',
  'component_packaging_type_id',
  'component_packaging_material',
  'helper_column',
  'component_unit_weight',
  'weight_unit_measure_id',
  'percent_mechanical_pcr_content',
  'percent_mechanical_pir_content',
  'percent_chemical_recycled_content',
  'percent_bio_sourced',
  'material_structure_multimaterials',
  'component_packaging_color_opacity',
  'component_packaging_level_id',
  'component_dimensions',
  'packaging_specification_evidence',
  'evidence_of_recycled_or_bio_source',
  'last_update_date',
  'category_entry_id',
  'data_verification_entry_id',
  'user_id',
  'signed_off_by',
  'signed_off_date',
  'mandatory_fields_completion_status',
  'evidence_provided',
  'document_status',
  'is_active',
  'created_by',
  'created_date',
  'year',
  'component_unit_weight_id',
  'cm_code'
];

// User-friendly labels for the component fields
const componentFieldLabels: { [key: string]: string } = {
  'formulation_reference': 'Formulation Reference',
  'material_type_id': 'Material Type',
  'components_reference': 'Components Reference',
  'component_code': 'Component Code',
  'component_description': 'Component Description',
  'component_valid_from': 'Component Valid From',
  'component_valid_to': 'Component Valid To',
  'component_material_group': 'Component Material Group',
  'component_quantity': 'Component Quantity',
  'component_uom_id': 'Component UOM',
  'component_base_quantity': 'Component Base Quantity',
  'component_base_uom_id': 'Component Base UOM',
  'percent_w_w': '% w/w',
  'evidence': 'Evidence',
  'component_packaging_type_id': 'Component Packaging Type',
  'component_packaging_material': 'Component Packaging Material',
  'helper_column': 'Helper Column',
  'component_unit_weight': 'Component Unit Weight',
  'weight_unit_measure_id': 'Weight Unit Measure',
  'percent_mechanical_pcr_content': '% Mechanical PCR Content',
  'percent_mechanical_pir_content': '% Mechanical PIR Content',
  'percent_chemical_recycled_content': '% Chemical Recycled Content',
  'percent_bio_sourced': '% Bio-sourced',
  'material_structure_multimaterials': 'Material Structure (Multimaterials)',
  'component_packaging_color_opacity': 'Component Packaging Color/Opacity',
  'component_packaging_level_id': 'Component Packaging Level',
  'component_dimensions': 'Component Dimensions',
  'packaging_specification_evidence': 'Packaging Specification Evidence',
  'evidence_of_recycled_or_bio_source': 'Evidence of Recycled/Bio Source',
  'last_update_date': 'Last Update Date',
  'category_entry_id': 'Category Entry',
  'data_verification_entry_id': 'Data Verification Entry',
  'user_id': 'User ID',
  'signed_off_by': 'Signed Off By',
  'signed_off_date': 'Signed Off Date',
  'mandatory_fields_completion_status': 'Mandatory Fields Completion Status',
  'evidence_provided': 'Evidence Provided',
  'document_status': 'Document Status',
  'is_active': 'Is Active',
  'created_by': 'Created By',
  'created_date': 'Created Date',
  'year': 'Year',
  'component_unit_weight_id': 'Component Unit Weight ID',
  'CM Code': 'cm_code'
};

// Reverse mapping from user-friendly labels to database field names
const componentFieldValues: { [key: string]: string } = {
  'Formulation Reference': 'formulation_reference',
  'Material Type': 'material_type_id',
  'Components Reference': 'components_reference',
  'Component Code': 'component_code',
  'Component Description': 'component_description',
  'Component Valid From': 'component_valid_from',
  'Component Valid To': 'component_valid_to',
  'Component Material Group': 'component_material_group',
  'Component Quantity': 'component_quantity',
  'Component UOM': 'component_uom_id',
  'Component Base Quantity': 'component_base_quantity',
  'Component Base UOM': 'component_base_uom_id',
  '% w/w': 'percent_w_w',
  'Evidence': 'evidence',
  'Component Packaging Type': 'component_packaging_type_id',
  'Component Packaging Material': 'component_packaging_material',
  'Helper Column': 'helper_column',
  'Component Unit Weight': 'component_unit_weight',
  'Weight Unit Measure': 'weight_unit_measure_id',
  '% Mechanical PCR Content': 'percent_mechanical_pcr_content',
  '% Mechanical PIR Content': 'percent_mechanical_pir_content',
  '% Chemical Recycled Content': 'percent_chemical_recycled_content',
  '% Bio-sourced': 'percent_bio_sourced',
  'Material Structure (Multimaterials)': 'material_structure_multimaterials',
  'Component Packaging Color/Opacity': 'component_packaging_color_opacity',
  'Component Packaging Level': 'component_packaging_level_id',
  'Component Dimensions': 'component_dimensions',
  'Packaging Specification Evidence': 'packaging_specification_evidence',
  'Evidence of Recycled/Bio Source': 'evidence_of_recycled_or_bio_source',
  'Last Update Date': 'last_update_date',
  'Category Entry': 'category_entry_id',
  'Data Verification Entry': 'data_verification_entry_id',
  'User ID': 'user_id',
  'Signed Off By': 'signed_off_by',
  'Signed Off Date': 'signed_off_date',
  'Mandatory Fields Completion Status': 'mandatory_fields_completion_status',
  'Evidence Provided': 'evidence_provided',
  'Document Status': 'document_status',
  'Is Active': 'is_active',
  'Created By': 'created_by',
  'Created Date': 'created_date',
  'Year': 'year',
  'Component Unit Weight ID': 'component_unit_weight_id',
  'CM Code': 'cm_code'
};

const SedForApproval: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNoDataModal, setShowNoDataModal] = useState(false);
  
  // Get 3PM Code and Description from URL parameters
  const cmCode = searchParams.get('cmCode') || '';
  const cmDescription = searchParams.get('cmDescription') || '';

  // Fetch years from API
  useEffect(() => {
    const fetchYears = async () => {
      try {
        console.log('Fetching years for SendForApproval...');
        
        // Try the primary endpoint first
        let response = await fetch('http://localhost:3000/sku-details-active-years');
        console.log('Primary Years API response status:', response.status);
        
        if (!response.ok) {
          // Try alternative endpoint
          console.log('Primary endpoint failed, trying alternative...');
          response = await fetch('http://localhost:3000/component-years');
          console.log('Alternative Years API response status:', response.status);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch years from both endpoints: ${response.status}`);
          }
        }
        
        const result = await response.json();
        console.log('Years API result:', result);
        
        // Handle different response formats
        let yearsData = [];
        if (Array.isArray(result)) {
          yearsData = result;
        } else if (result && Array.isArray(result.years)) {
          yearsData = result.years;
        } else if (result && result.data && Array.isArray(result.data)) {
          yearsData = result.data;
        } else if (result && result.success && result.data) {
          yearsData = Array.isArray(result.data) ? result.data : [];
        }
        
        // Extract years from the data - handle both string and object formats
        const extractedYears = yearsData.map((item: any) => {
          if (typeof item === 'string') {
            return item;
          } else if (item && typeof item === 'object') {
            // Handle object format with period field
            if (item.period) {
              return item.period;
            } else if (item.year) {
              return item.year;
            } else if (item.id) {
              return item.id.toString();
            }
          }
          return null;
        }).filter((y: any) => y && typeof y === 'string' && y.trim() !== '');
        
        // Sort years (assuming they contain year information)
        const cleanedYears = extractedYears
          .map((y: any) => y.toString().trim())
          .sort((a: string, b: string) => {
            // Extract year numbers for proper sorting
            const yearA = a.match(/\d{4}/);
            const yearB = b.match(/\d{4}/);
            if (yearA && yearB) {
              return parseInt(yearB[0]) - parseInt(yearA[0]); // Descending order
            }
            return b.localeCompare(a); // Fallback to string comparison
          });
        
        console.log('Cleaned years:', cleanedYears);
        setYears(cleanedYears);
        
        if (cleanedYears.length === 0) {
          console.warn('No years found in API response');
          setError('No years available in the system.');
        }
      } catch (err) {
        console.error('Error fetching years:', err);
        setYears([]);
        setError('Failed to load years. Please check your connection and try again.');
      }
    };
    fetchYears();
  }, []);

  // Fetch component details when year is selected
  useEffect(() => {
    const fetchComponentDetails = async () => {
      if (selectedYears.length === 0 || !cmCode) {
        setTableData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use the first selected year for the API call
        const selectedYear = selectedYears[0];
        console.log('Fetching component details for year:', selectedYear, 'and cm_code:', cmCode);
        
        // Try different API endpoints for component details
        let response = await fetch(`http://localhost:3000/component-details-by-year-cm?year=${encodeURIComponent(selectedYear)}&cm_code=${encodeURIComponent(cmCode)}`);
        
        if (!response.ok) {
          // Try alternative endpoint format
          response = await fetch(`http://localhost:3000/component-details?period=${encodeURIComponent(selectedYear)}&cm_code=${encodeURIComponent(cmCode)}`);
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response Data:', data);
        console.log('Response success:', data.success);
        console.log('Response count:', data.count);
        console.log('Response data length:', data.data ? data.data.length : 0);
        console.log('First row fields:', data.data && data.data.length > 0 ? Object.keys(data.data[0]) : 'No data');
        
        if (data.success && data.data && Array.isArray(data.data)) {
          setTableData(data.data);
          console.log('Table data set successfully:', data.data.length, 'rows');
        } else {
          console.warn('No valid data in response');
          setTableData([]);
        }
      } catch (err) {
        console.error('Error fetching component details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        setTableData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComponentDetails();
  }, [selectedYears, cmCode]);

  // Filtered data based on selected fields
  const filteredData = tableData.filter(row => {
    // If no fields selected, show all data
    if (selectedFields.length === 0) return true;
    
    // Filter based on selected component fields
    return selectedFields.some(fieldLabel => {
      // Convert user-friendly label to database field name
      const fieldName = componentFieldValues[fieldLabel];
      // Check if the row has data for this field
      return row[fieldName] !== undefined && row[fieldName] !== null && row[fieldName] !== '';
    });
  });

  // Select all logic
  const allSelected = filteredData.length > 0 && filteredData.every(row => selectedRows.includes(row.id || row.component_id || row.componentId));
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredData.map(row => row.id || row.component_id || row.componentId));
    } else {
      setSelectedRows(selectedRows.filter(id => !filteredData.some(row => (row.id || row.component_id || row.componentId) === id)));
    }
  };

  const handleRowSelect = (id: number, checked: boolean) => {
    setSelectedRows(checked ? [...selectedRows, id] : selectedRows.filter(rowId => rowId !== id));
  };

  // Get available columns from the data
  const getAvailableColumns = () => {
    if (tableData.length === 0) return [];
    
    const allColumns = new Set<string>();
    tableData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key !== 'id' && key !== 'component_id' && key !== 'componentId') {
          allColumns.add(key);
        }
      });
    });
    
    return Array.from(allColumns);
  };

  const availableColumns = getAvailableColumns();

  // PDF generation handler
  const handleGeneratePDF = () => {
    // Check if any rows are selected
    if (selectedRows.length === 0) {
      setShowNoDataModal(true);
      return;
    }

    // Filter data to only include selected rows
    const selectedData = filteredData.filter(row => 
      selectedRows.includes(row.id || row.component_id || row.componentId)
    );

    const doc = new jsPDF();
    // Table headers: 3PM Code, 3PM Description, ...selected fields
    const headers = [
      '3PM Code',
      '3PM Description',
      ...selectedFields
    ];
    // Table rows: for each selected row, get [cmCode, cmDescription, ...selected fields]
    const rows = selectedData.map(row => [
      cmCode,
      cmDescription,
      ...selectedFields.map(fieldLabel => {
        const fieldName = componentFieldValues[fieldLabel];
        return row[fieldName] || '-';
      })
    ]);
    // Generate the table in the PDF
    autoTable(doc, {
      head: [headers],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 234, 3] },
      margin: { top: 20 },
    });
    doc.save('component-details.pdf');
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowNoDataModal(false);
  };

  return (
    <Layout>
      <div className="mainInternalPages">
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: '#000',
              fontSize: 22,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              marginRight: 12
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: 24, marginRight: 4 }} />
            Back
          </button>
        </div>
        <div className="commonTitle">
          <div className="icon">
            <i className="ri-send-plane-2-fill"></i>
          </div>
          <h1>Generate PDF</h1>
        </div>
        
        <div className="filters CMDetails">
          <div className="row">
            <div className="col-sm-12 ">
              <ul style={{ display: 'flex', alignItems: 'center' }}>
                <li><strong>3PM Code: </strong> {cmCode}</li>
                <li> | </li>
                <li><strong>3PM Description: </strong> {cmDescription}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-sm-12">
            <div className="filters">
              <ul>
                <li>
                  <div className="fBold">Years</div>
                  <select
                    value={selectedYears.length > 0 ? selectedYears[0] : ''}
                    onChange={(e) => {
                      console.log('Year selected:', e.target.value);
                      console.log('Available years:', years);
                      setSelectedYears(e.target.value ? [e.target.value] : []);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: '#fff'
                    }}
                    disabled={years.length === 0}
                  >
                    <option value="">Select Year</option>
                    {years.length === 0 ? (
                      <option value="" disabled>Loading years...</option>
                    ) : (
                      years.filter(y => y && typeof y === 'string' && y.trim() !== '').map((year, index) => (
                        <option key={index} value={year}>
                          {year}
                        </option>
                      ))
                    )}
                  </select>
                  {years.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      No years available. Please check the API connection.
                    </div>
                  )}
                  {years.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#30ea03', marginTop: '4px' }}>
                      {years.length} years loaded successfully
                    </div>
                  )}
                </li>
                <li>
                  <div className="fBold">Component Fields</div>
                  <MultiSelect
                    options={Object.values(componentFieldLabels).map(label => ({ value: label, label: label }))}
                    selectedValues={selectedFields}
                    onSelectionChange={setSelectedFields}
                    placeholder="Select Component Fields..."
                    disabled={componentFields.length === 0}
                    loading={false}
                  />
                </li>
                <li>
                  <button className="btnCommon btnGreen filterButtons" onClick={() => {}} disabled={loading}>
                    <span>Search</span>
                    <i className="ri-search-line"></i>
                  </button>
                </li>
                <li>
                  <button className="btnCommon btnBlack filterButtons" onClick={() => {setSelectedYears([]); setSelectedFields([]);}} disabled={loading}>
                    <span>Reset</span>
                    <i className="ri-refresh-line"></i>
                  </button>
                </li>
                <li style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    className="btnCommon btnGreen"
                    style={{ minWidth: 120 }}
                    onClick={handleGeneratePDF}
                    disabled={selectedRows.length === 0}
                  >
                    Generate PDF <i className="ri-file-pdf-2-line"></i>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <i className="ri-loader-4-line spinning" style={{ fontSize: '24px', color: '#666' }}></i>
            <p>Loading component details...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
            <p>Error loading component details: {error}</p>
          </div>
        )}

        {selectedYears.length > 0 && selectedFields.length > 0 && tableData.length > 0 ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ minWidth: 600, width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', fontSize: '0.95rem' }}>
              <thead style={{ background: '#30ea03' }}>
                <tr>
                  <th style={{ padding: 8, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={e => handleSelectAll(e.target.checked)}
                      aria-label="Select All"
                    />
                  </th>
                  <th style={{ padding: 8 }}>3PM Code</th>
                  <th style={{ padding: 8 }}>3PM Description</th>
                  {selectedFields.map(fieldLabel => (
                    <th key={fieldLabel} style={{ padding: 8 }}>{fieldLabel}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={selectedFields.length + 3} style={{ textAlign: 'center', padding: 24 }}>
                      {'No data matches the selected component fields'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, index) => (
                    <tr key={row.id || row.component_id || row.componentId || index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id || row.component_id || row.componentId)}
                          onChange={e => handleRowSelect(row.id || row.component_id || row.componentId, e.target.checked)}
                          aria-label={`Select row ${row.id || row.component_id || row.componentId}`}
                        />
                      </td>
                      <td style={{ padding: 8 }}>{cmCode}</td>
                      <td style={{ padding: 8 }}>{cmDescription}</td>
                      {selectedFields.map(fieldLabel => {
                        const fieldName = componentFieldValues[fieldLabel];
                        return (
                          <td key={fieldLabel} style={{ padding: 8 }}>{row[fieldName] || '-'}</td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : selectedYears.length === 0 && selectedFields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Please select a year and component fields to view data</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>No component data available for the selected criteria</p>
          </div>
        )}
      </div>

      {/* No Data Selected Modal */}
      <ConfirmModal
        show={showNoDataModal}
        message="No data is selected. Please select at least one row before generating the PDF."
        onConfirm={handleCloseModal}
        onCancel={handleCloseModal}
      />

      {/* Add responsive styles */}
      <style>{`
      @media (max-width: 900px) {
        .mainInternalPages { padding: 16px !important; }
        table { font-size: 0.9rem !important; }
        th, td { padding: 6px !important; }
      }
      @media (max-width: 600px) {
        .mainInternalPages { padding: 4px !important; }
        h1 { font-size: 1.2rem !important; }
        .mainInternalPages > div, .mainInternalPages > table { width: 100% !important; }
        .mainInternalPages label { font-size: 0.95rem !important; }
        .mainInternalPages select, .mainInternalPages input, .mainInternalPages .multi-select-container { font-size: 0.95rem !important; min-width: 0 !important; }
        .mainInternalPages .multi-select-container { width: 100% !important; }
        .mainInternalPages .multi-select-dropdown { min-width: 180px !important; }
        .mainInternalPages .multi-select-text { font-size: 0.95rem !important; }
        .mainInternalPages .multi-select-search input { font-size: 0.95rem !important; }
        .mainInternalPages .multi-select-options { font-size: 0.95rem !important; }
        .mainInternalPages .multi-select-option { font-size: 0.95rem !important; }
        .mainInternalPages .multi-select-trigger { font-size: 0.95rem !important; }
        .mainInternalPages .multi-select-dropdown { font-size: 0.95rem !important; }
        .mainInternalPages .multi-select-search { font-size: 0.95rem !important; }
        .mainInternalPages .multi-select-option .option-label { font-size: 0.95rem !important; }
        .mainInternalPages .multi-select-option .checkmark { width: 16px !important; height: 16px !important; }
        .mainInternalPages .multi-select-option input[type='checkbox'] { width: 16px !important; height: 16px !important; }
        .mainInternalPages .multi-select-dropdown { left: 0 !important; right: 0 !important; min-width: 0 !important; }
      }
      `}</style>
    </Layout>
  );
};

export default SedForApproval; 