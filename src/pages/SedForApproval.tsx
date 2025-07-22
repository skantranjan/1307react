import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import MultiSelect from '../components/MultiSelect';
import ConfirmModal from '../components/ConfirmModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const componentFields = [
  'component_code',
  'component_description',
  'component_valid_from',
  'component_valid_to',
  'component_quantity',
  'component_uom_id',
  'component_base_quantity',
  'component_base_uom_id',
  'component_packaging_type_id',
  'component_packaging_material',
  'component_unit_weight',
  'weight_unit_measure_id',
  'percent_mechanical_pcr_content',
  'components_reference',
  'component_material_group',
  'percent_w_w',
  'percent_mechanical_pir_content',
  'percent_chemical_recycled_content',
  'percent_bio_sourced',
  'material_structure_multimaterials',
  'component_packaging_level_id',
  'component_dimensions'
];

// User-friendly labels for the component fields
const componentFieldLabels: { [key: string]: string } = {
  'component_code': 'Component Code',
  'component_description': 'Component Description',
  'component_valid_from': 'Component validity date - From',
  'component_valid_to': 'Component validity date - To',
  'component_quantity': 'Component Qty',
  'component_uom_id': 'Component UoM',
  'component_base_quantity': 'Component Base Qty',
  'component_base_uom_id': 'Component Base UoM',
  'component_packaging_type_id': 'Component Packaging Type',
  'component_packaging_material': 'Component Packaging Material',
  'component_unit_weight': 'Component Unit Weight',
  'weight_unit_measure_id': 'Weight Unit of Measure',
  'percent_mechanical_pcr_content': '% Mechanical Post-Consumer Recycled Content (inc. Chemical)',
  'components_reference': 'Component reference',
  'component_material_group': 'Component Material Group (Category)',
  'percent_w_w': '%w/w',
  'percent_mechanical_pir_content': '% Mechanical Post-Industrial Recycled Content',
  'percent_chemical_recycled_content': '% Chemical Recycled Content',
  'percent_bio_sourced': '% Bio-sourced?',
  'material_structure_multimaterials': 'Material structure - multimaterials only (with % wt)',
  'component_packaging_level_id': 'Component packaging level',
  'component_dimensions': 'Component dimensions (3D - LxWxH, 2D - LxW)'
};

// Reverse mapping from user-friendly labels to database field names
const componentFieldValues: { [key: string]: string } = {
  'Component Code': 'component_code',
  'Component Description': 'component_description',
  'Component validity date - From': 'component_valid_from',
  'Component validity date - To': 'component_valid_to',
  'Component Qty': 'component_quantity',
  'Component UoM': 'component_uom_id',
  'Component Base Qty': 'component_base_quantity',
  'Component Base UoM': 'component_base_uom_id',
  'Component Packaging Type': 'component_packaging_type_id',
  'Component Packaging Material': 'component_packaging_material',
  'Component Unit Weight': 'component_unit_weight',
  'Weight Unit of Measure': 'weight_unit_measure_id',
  '% Mechanical Post-Consumer Recycled Content (inc. Chemical)': 'percent_mechanical_pcr_content',
  'Component reference': 'components_reference',
  'Component Material Group (Category)': 'component_material_group',
  '%w/w': 'percent_w_w',
  '% Mechanical Post-Industrial Recycled Content': 'percent_mechanical_pir_content',
  '% Chemical Recycled Content': 'percent_chemical_recycled_content',
  '% Bio-sourced?': 'percent_bio_sourced',
  'Material structure - multimaterials only (with % wt)': 'material_structure_multimaterials',
  'Component packaging level': 'component_packaging_level_id',
  'Component dimensions (3D - LxWxH, 2D - LxW)': 'component_dimensions'
};

const SedForApproval: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'Component Code',
    'Component Description',
    'Component validity date - From',
    'Component validity date - To',
    'Component Qty',
    'Component UoM',
    'Component Base Qty',
    'Component Base UoM',
    'Component Packaging Type',
    'Component Packaging Material',
    'Component Unit Weight',
    'Weight Unit of Measure',
    '% Mechanical Post-Consumer Recycled Content (inc. Chemical)'
  ]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [years, setYears] = useState<Array<{id: string, period: string}>>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNoDataModal, setShowNoDataModal] = useState(false);
  const [showMaxSelectionModal, setShowMaxSelectionModal] = useState(false);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('1'); // Default to Raw Material (ID: 1) since data has material_type_id = 1
  const [materialTypes, setMaterialTypes] = useState<Array<{id: number, item_name: string}>>([]);
  const [isFilterApplied, setIsFilterApplied] = useState<boolean>(true); // Auto-apply filter on page load to show default material type
  
  // Get 3PM Code and Description from URL parameters
  const cmCode = searchParams.get('cmCode') || '';
  const cmDescription = searchParams.get('cmDescription') || '';

  // Fetch material types from API
  const fetchMaterialTypes = async () => {
    try {
      console.log('Fetching material types from API...');
      const response = await fetch('http://localhost:3000/material-type-master');
      
      if (!response.ok) {
        throw new Error('Failed to fetch material types');
      }
      
      const result = await response.json();
      console.log('Material types API response:', result);
      
      if (result.success && result.data) {
        setMaterialTypes(result.data);
        console.log('Material types loaded:', result.data);
      }
    } catch (error) {
      console.error('Error fetching material types:', error);
    }
  };

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
            return { id: item, period: item };
          } else if (item && typeof item === 'object') {
            // Handle object format with period field
            if (item.period && item.id) {
              return { id: item.id.toString(), period: item.period };
            } else if (item.year && item.id) {
              return { id: item.id.toString(), period: item.year };
            } else if (item.id) {
              return { id: item.id.toString(), period: item.id.toString() };
            } else if (item.period) {
              return { id: item.period, period: item.period };
            }
          }
          return null;
        }).filter((y: any) => y && y.id && y.period);
        
        // Sort years (assuming they contain year information)
        const cleanedYears = extractedYears
          .sort((a: any, b: any) => {
            // Extract year numbers for proper sorting
            const yearA = a.period.match(/\d{4}/);
            const yearB = b.period.match(/\d{4}/);
            if (yearA && yearB) {
              return parseInt(yearB[0]) - parseInt(yearA[0]); // Descending order
            }
            return b.period.localeCompare(a.period); // Fallback to string comparison
          });
        
        console.log('Cleaned years with id/period structure:', cleanedYears);
        setYears(cleanedYears);
        
        if (cleanedYears.length === 0) {
          console.warn('No years found in API response');
          setError('No years available in the system.');
        } else {
          // Auto-select the current period
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
          
          // Find the current period based on current date
          let currentPeriodOption = null;
          
          for (const yearOption of cleanedYears) {
            const periodText = yearOption.period;
            
            // Try to match period format like "July 2025 to June 2026"
            const periodMatch = periodText.match(/(\w+)\s+(\d{4})\s+to\s+(\w+)\s+(\d{4})/i);
            if (periodMatch) {
              const startMonth = periodMatch[1];
              const startYear = parseInt(periodMatch[2]);
              const endMonth = periodMatch[3];
              const endYear = parseInt(periodMatch[4]);
              
              // Convert month names to numbers
              const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                                'july', 'august', 'september', 'october', 'november', 'december'];
              const startMonthNum = monthNames.indexOf(startMonth.toLowerCase()) + 1;
              const endMonthNum = monthNames.indexOf(endMonth.toLowerCase()) + 1;
              
              // Check if current date falls within this period
              const currentDate = new Date(currentYear, currentMonth - 1, 1);
              const periodStart = new Date(startYear, startMonthNum - 1, 1);
              const periodEnd = new Date(endYear, endMonthNum, 0); // Last day of end month
              
              if (currentDate >= periodStart && currentDate <= periodEnd) {
                currentPeriodOption = yearOption;
                break;
              }
            } else {
              // Fallback: check if period contains current year
              if (periodText.includes(currentYear.toString())) {
                currentPeriodOption = yearOption;
                break;
              }
            }
          }
          
          // If no specific period found, try to find by current year
          if (!currentPeriodOption) {
            currentPeriodOption = cleanedYears.find((year: any) => 
              year.period === currentYear.toString() || year.id === currentYear.toString()
            );
          }
          
          // Auto-select the current period or the first available period
          if (currentPeriodOption) {
            setSelectedYears([currentPeriodOption.id]);
            console.log('Auto-selected current period:', currentPeriodOption.period);
          } else if (cleanedYears.length > 0) {
            // Fallback to first available period
            setSelectedYears([cleanedYears[0].id]);
            console.log('Auto-selected first available period:', cleanedYears[0].period);
          }
        }
      } catch (err) {
        console.error('Error fetching years:', err);
        setYears([]);
        setError('Failed to load years. Please check your connection and try again.');
      }
    };
    fetchYears();
    fetchMaterialTypes(); // Also fetch material types
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
        const selectedPeriod = years.find(year => year.id === selectedYear)?.period || selectedYear;
        
        console.log('Fetching component details for year:', selectedYear, 'period:', selectedPeriod, 'and cm_code:', cmCode);
        
        // Try different API endpoints for component details with fallback logic
        let response;
        let data;
        
        // First try the new API endpoint
        try {
          response = await fetch(`http://localhost:3000/sku-components-summary?period=${encodeURIComponent(selectedYear)}&cm_code=${encodeURIComponent(cmCode)}`);
          if (response.ok) {
            data = await response.json();
            console.log('Using new API endpoint - sku-components-summary');
          }
        } catch (err) {
          console.log('New API endpoint failed, trying fallback endpoints...');
        }
        
        // Fallback to existing endpoints if new API fails
        if (!response || !response.ok) {
          try {
            response = await fetch(`http://localhost:3000/component-details-by-year-cm?year=${encodeURIComponent(selectedYear)}&cm_code=${encodeURIComponent(cmCode)}`);
            if (response.ok) {
              data = await response.json();
              console.log('Using fallback API endpoint - component-details-by-year-cm');
            }
          } catch (err) {
            console.log('First fallback failed, trying second fallback...');
          }
        }
        
        // Second fallback
        if (!response || !response.ok) {
          try {
            response = await fetch(`http://localhost:3000/component-details?period=${encodeURIComponent(selectedYear)}&cm_code=${encodeURIComponent(cmCode)}`);
            if (response.ok) {
              data = await response.json();
              console.log('Using second fallback API endpoint - component-details');
            }
          } catch (err) {
            console.log('Second fallback failed');
          }
        }
        
        if (!response || !response.ok) {
          throw new Error(`Failed to fetch data from all endpoints: ${response?.status || 'Network error'}`);
        }

        console.log('API Response Data:', data);
        console.log('Response success:', data.success);
        
        // Handle different response formats
        if (data.success && data.data) {
          let componentData = [];
          
          // Check if it's the new API format
          if (data.data.skus_with_components) {
            console.log('Processing new API format');
            componentData = data.data.skus_with_components.flatMap((skuGroup: any) => {
              // If SKU has components, create a row for each component
              if (skuGroup.active_components && skuGroup.active_components.length > 0) {
                return skuGroup.active_components.map((component: any) => ({
                  ...component,
                  sku_code: skuGroup.sku_info.sku_code,
                  sku_description: skuGroup.sku_info.sku_description,
                  cm_code: skuGroup.sku_info.cm_code,
                  cm_description: skuGroup.sku_info.cm_description,
                  period: skuGroup.sku_info.period,
                  year: skuGroup.sku_info.year
                }));
              } else {
                // If SKU has no components, create a single row with SKU info only
                return [{
                  component_id: null,
                  component_code: '-',
                  component_description: '-',
                  component_valid_from: '-',
                  component_valid_to: '-',
                  component_quantity: '-',
                  component_uom_id: '-',
                  component_base_quantity: '-',
                  component_base_uom_id: '-',
                  component_packaging_type_id: '-',
                  component_packaging_material: '-',
                  component_unit_weight: '-',
                  weight_unit_measure_id: '-',
                  percent_mechanical_pcr_content: '-',
                  sku_code: skuGroup.sku_info.sku_code,
                  sku_description: skuGroup.sku_info.sku_description,
                  cm_code: skuGroup.sku_info.cm_code,
                  cm_description: skuGroup.sku_info.cm_description,
                  period: skuGroup.sku_info.period,
                  year: skuGroup.sku_info.year
                }];
              }
            });
          } else if (Array.isArray(data.data)) {
            console.log('Processing existing API format');
            componentData = data.data;
          }
          
          setTableData(componentData);
          console.log('Table data set successfully:', componentData.length, 'rows');
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
  }, [selectedYears, cmCode, years]);

  // Filtered data based on selected fields and material type
  const filteredData = tableData.filter(row => {
    // Apply material type filter ONLY if filter button was clicked and material type is selected
    if (isFilterApplied && selectedMaterialType) {
      // Compare with material_type_id field specifically
      const rowMaterialTypeId = row.material_type_id;
      
      // Convert both to strings for comparison
      const selectedTypeStr = selectedMaterialType.toString();
      const rowTypeStr = rowMaterialTypeId ? rowMaterialTypeId.toString() : '';
      
      // Debug: Log filtering details
      console.log('Filtering row:', {
        sku_code: row.sku_code,
        component_code: row.component_code,
        selectedMaterialType,
        rowMaterialTypeId,
        selectedTypeStr,
        rowTypeStr,
        matches: rowTypeStr === selectedTypeStr
      });
      
      if (rowTypeStr !== selectedTypeStr) {
        return false;
      }
    }
    
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

  // Debug effect to log data changes
  useEffect(() => {
    console.log('Table data changed:', {
      tableDataLength: tableData.length,
      filteredDataLength: filteredData.length,
      isFilterApplied,
      selectedMaterialType,
      selectedYears,
      selectedFieldsLength: selectedFields.length
    });
  }, [tableData, filteredData, isFilterApplied, selectedMaterialType, selectedYears, selectedFields]);

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

    const doc = new jsPDF('landscape'); // Use landscape orientation for wide table
    
    // Define all headers matching the table structure
    const headers = [
      'SKU Code',
      'Component Code',
      'Component Description',
      'Component validity date - From',
      'Component validity date - To',
      'Component Qty',
      'Component UoM',
      'Component Base Qty',
      'Component Base UoM',
      'Component Packaging Type',
      'Component Packaging Material',
      'Component Unit Weight',
      'Weight Unit of Measure',
      '% Mechanical Post-Consumer Recycled Content (inc. Chemical)',
      ...selectedFields
    ];

    // Define column widths for better layout
    const columnWidths = [
      30, // SKU Code
      35, // Component Code
      40, // Component Description
      35, // Component validity date - From
      35, // Component validity date - To
      25, // Component Qty
      25, // Component UoM
      30, // Component Base Qty
      35, // Component Base UoM
      35, // Component Packaging Type
      35, // Component Packaging Material
      30, // Component Unit Weight
      35, // Weight Unit of Measure
      50, // % Mechanical Post-Consumer Recycled Content
      ...selectedFields.map(() => 30) // Default width for dynamic fields
    ];

    // Table rows with all the data
    const rows = selectedData.map(row => [
      row.sku_code || '-',
      row.component_code || '-',
      row.component_description || '-',
      row.component_valid_from ? new Date(row.component_valid_from).toLocaleDateString() : '-',
      row.component_valid_to ? new Date(row.component_valid_to).toLocaleDateString() : '-',
      row.component_quantity || '-',
      row.component_uom_display || row.component_uom_id || '-',
      row.component_base_quantity || '-',
      row.component_base_uom_display || row.component_base_uom_id || '-',
      row.component_packaging_type_display || row.component_packaging_type_id || '-',
      row.component_packaging_material || '-',
      row.component_unit_weight || '-',
      row.weight_unit_measure_display || row.weight_unit_measure_id || '-',
      row.percent_mechanical_pcr_content ? `${row.percent_mechanical_pcr_content}%` : '-',
      ...selectedFields.map(fieldLabel => {
        const fieldName = componentFieldValues[fieldLabel];
        const value = row[fieldName];
        // Format percentage fields
        if (fieldLabel.includes('%') && value && !isNaN(value)) {
          return `${value}%`;
        }
        return value || '-';
      })
    ]);

    // Generate the table in the PDF with proper styling
    autoTable(doc, {
      head: [headers],
      body: rows,
      styles: { 
        fontSize: 7,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [40, 167, 69], // Green color matching the table
        textColor: [255, 255, 255], // White text
        fontStyle: 'bold',
        fontSize: 8
      },
      margin: { top: 20, left: 10, right: 10 },
      startY: 30,
      didDrawPage: function (data) {
        // Add title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Component Data Report', data.settings.margin.left, 20);
        
        // Add subtitle with filter info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${selectedYears[0] || 'All'} | 3PM Code: ${cmCode}`, data.settings.margin.left, 30);
      }
    });

    doc.save('component-details.pdf');
  };

  // Handle field selection with max 15 limit
  const handleFieldSelection = (newSelectedFields: string[]) => {
    if (newSelectedFields.length > 15) {
      setShowMaxSelectionModal(true);
    } else {
      setSelectedFields(newSelectedFields);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowNoDataModal(false);
  };

  const handleCloseMaxSelectionModal = () => {
    setShowMaxSelectionModal(false);
  };

  // Handle apply filters button click
  const handleApplyFilters = () => {
    if (selectedMaterialType) {
      setIsFilterApplied(true);
      console.log('Applying material type filter:', selectedMaterialType);
      console.log('Current table data length:', tableData.length);
      console.log('Current filtered data length:', filteredData.length);
      
      // Debug: Log sample data to see available fields
      if (tableData.length > 0) {
        console.log('Sample row data:', tableData[0]);
        console.log('Available fields in sample row:', Object.keys(tableData[0]));
        console.log('material_type_id value in sample:', tableData[0].material_type_id);
        
        // Log all material_type_id values in the data
        const materialTypeIds = tableData.map(row => row.material_type_id).filter(id => id !== undefined);
        const uniqueMaterialTypeIds = Array.from(new Set(materialTypeIds));
        console.log('All material_type_id values in data:', uniqueMaterialTypeIds);
        console.log('Selected material type:', selectedMaterialType);
      }
    } else {
      setIsFilterApplied(false);
      console.log('Clearing material type filter');
    }
  };

  return (
    <Layout>
      <div className="mainInternalPages">
        <div style={{ marginBottom: 8 }}>
        </div>
        {/* Dashboard Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px'
            }}>
              <i className="ri-file-list-3-line"></i>
            </div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#2c3e50' }}>Component Data Dashboard</h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: 16 }}></i>
            Back
          </button>
        </div>

        {/* 3PM Info Section */}
        <div style={{ 
          padding: '16px 20px',
          marginBottom: '24px',
          borderBottom: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ color: '#495057', fontSize: '14px' }}>3PM Code:</strong>
              <span style={{ 
                color: '#495057', 
                padding: '4px 12px', 
                fontSize: '14px', 
                fontWeight: '600' 
              }}>{cmCode}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ color: '#495057', fontSize: '14px' }}>3PM Description:</strong>
              <span style={{ color: '#6c757d', fontSize: '14px' }}>{cmDescription}</span>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div style={{ 
          padding: '24px', 
          marginBottom: '24px',
          borderBottom: '1px solid #e9ecef'
        }}>
          <h5 style={{ marginBottom: '20px', color: '#2c3e50', fontWeight: '600' }}>Filters</h5>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <div className="filter-group">
                <label style={{ 
                  fontWeight: '600', 
                  color: '#495057', 
                  marginBottom: '8px', 
                  fontSize: '14px' 
                }}>Period</label>
                <select
                  value={selectedYears.length > 0 ? selectedYears[0] : ''}
                  onChange={(e) => {
                    setSelectedYears(e.target.value ? [e.target.value] : []);
                  }}
                  className="form-control"
                  disabled={years.length === 0}
                  style={{ 
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid #ced4da',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Period</option>
                  {years.length === 0 ? (
                    <option value="" disabled>Loading periods...</option>
                  ) : (
                    years.map((year, index) => (
                      <option key={index} value={year.id}>
                        {year.period}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <div className="col-md-3">
              <div className="filter-group">
                <label style={{ 
                  fontWeight: '600', 
                  color: '#495057', 
                  marginBottom: '8px', 
                  fontSize: '14px' 
                }}>Material Type</label>
                <select
                  value={selectedMaterialType}
                  onChange={(e) => setSelectedMaterialType(e.target.value)}
                  className="form-control"
                  style={{ 
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid #ced4da',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Material Type</option>
                  {materialTypes.map((materialType) => (
                    <option key={materialType.id} value={materialType.id.toString()}>
                      {materialType.item_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-4">
              <div className="filter-group">
                <label style={{ 
                  fontWeight: '600', 
                  color: '#495057', 
                  marginBottom: '8px', 
                  fontSize: '14px' 
                }}>Component Fields</label>
                <div style={{ minHeight: '42px' }}>
                  <MultiSelect
                    options={Object.values(componentFieldLabels).map(label => ({ value: label, label: label }))}
                    selectedValues={selectedFields}
                    onSelectionChange={handleFieldSelection}
                    placeholder="Select Component Fields..."
                    disabled={componentFields.length === 0}
                    loading={false}
                  />
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="filter-group">
                <label style={{ visibility: 'hidden' }}>&nbsp;</label>
                <button 
                  className="btn btn-success w-100" 
                  style={{ 
                    height: '42px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px'
                  }} 
                  onClick={handleApplyFilters} 
                  disabled={loading}
                >
                  {isFilterApplied ? 'Filter' : 'Apply Filters'}
                </button>
              </div>
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
          <div className="row">
            <div className="col-12">
              <div style={{ 
                border: '1px solid #e9ecef',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: '#f8f9fa', 
                  color: '#495057', 
                  padding: '16px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #e9ecef'
                }}>
                  <h6 style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>
                    Component Data ({filteredData.length} records)
                  </h6>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ 
                      color: '#495057', 
                      padding: '6px 12px', 
                      fontSize: '14px', 
                      fontWeight: '600' 
                    }}>
                      {selectedRows.length} Selected
                    </span>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    margin: 0
                  }}>
                    <thead>
                      <tr style={{ 
                        borderBottom: '1px solid #000'
                      }}>
                        <th style={{ 
                          width: '60px', 
                          textAlign: 'center', 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          background: '#495057',
                          color: 'white',
                          border: '1px solid #000'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={e => handleSelectAll(e.target.checked)}
                              aria-label="Select All"
                              style={{ 
                                transform: 'scale(1.2)',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#495057',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '120px',
                          whiteSpace: 'nowrap'
                        }}>
                          SKU Code
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '140px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Code
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '160px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Description
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '180px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component validity date - From
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '180px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component validity date - To
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '120px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Qty
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '120px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component UoM
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '140px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Base Qty
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '140px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Base UoM
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '160px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Packaging Type
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '160px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Packaging Material
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '150px',
                          whiteSpace: 'nowrap'
                        }}>
                          Component Unit Weight
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '150px',
                          whiteSpace: 'nowrap'
                        }}>
                          Weight Unit of Measure
                        </th>
                        <th style={{ 
                          padding: '8px 12px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          textAlign: 'left',
                          background: '#28a745',
                          color: 'white',
                          border: '1px solid #000',
                          minWidth: '220px',
                          whiteSpace: 'nowrap'
                        }}>
                          % Mechanical Post-Consumer Recycled Content (inc. Chemical)
                        </th>
                        {selectedFields.map(fieldLabel => (
                          <th key={fieldLabel} style={{ 
                            padding: '8px 12px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            textAlign: 'left',
                            background: '#28a745',
                            color: 'white',
                            border: '1px solid #000',
                            minWidth: '140px',
                            whiteSpace: 'nowrap'
                          }}>
                            {fieldLabel}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.length === 0 ? (
                        <tr>
                          <td colSpan={selectedFields.length + 15} style={{ 
                            textAlign: 'center', 
                            padding: '40px 20px',
                            color: '#6c757d'
                          }}>
                            <div>No data matches the selected component fields</div>
                          </td>
                        </tr>
                      ) : (
                        filteredData.map((row, index) => (
                          <tr key={row.id || row.component_id || row.componentId || index} 
                              style={{ 
                                borderBottom: '1px solid #f1f3f4',
                                transition: 'all 0.2s ease',
                                background: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                              }}>
                            <td style={{ 
                              textAlign: 'center', 
                              padding: '16px 12px',
                              verticalAlign: 'middle'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedRows.includes(row.id || row.component_id || row.componentId)}
                                  onChange={e => handleRowSelect(row.id || row.component_id || row.componentId, e.target.checked)}
                                  aria-label={`Select row ${row.id || row.component_id || row.componentId}`}
                                  style={{ 
                                    transform: 'scale(1.1)',
                                    cursor: 'pointer'
                                  }}
                                />
                              </div>
                            </td>

                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              fontWeight: '500',
                              color: '#2c3e50'
                            }}>
                              {row.sku_code || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_code || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_description || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_valid_from ? new Date(row.component_valid_from).toLocaleDateString() : '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_valid_to ? new Date(row.component_valid_to).toLocaleDateString() : '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_quantity || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_uom_display || row.component_uom_id || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_base_quantity || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_base_uom_display || row.component_base_uom_id || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_packaging_type_display || row.component_packaging_type_id || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_packaging_material || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.component_unit_weight || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.weight_unit_measure_display || row.weight_unit_measure_id || '-'}
                            </td>
                            <td style={{ 
                              padding: '16px 12px',
                              verticalAlign: 'middle',
                              color: '#6c757d'
                            }}>
                              {row.percent_mechanical_pcr_content ? `${row.percent_mechanical_pcr_content}%` : '-'}
                            </td>
                            {selectedFields.map(fieldLabel => {
                              const fieldName = componentFieldValues[fieldLabel];
                              const value = row[fieldName] || '-';
                              return (
                                <td key={fieldLabel} style={{ 
                                  padding: '16px 12px',
                                  verticalAlign: 'middle',
                                  color: '#6c757d'
                                }}>
                                  {value}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredData.length > 0 && (
                  <div style={{ 
                    padding: '16px 24px',
                    borderTop: '1px solid #e9ecef',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <small style={{ color: '#6c757d', fontSize: '14px' }}>
                        Showing {filteredData.length} of {tableData.length} records
                      </small>
                    </div>
                    <div>
                                              <button
                          style={{ 
                            background: 'transparent', 
                            color: '#28a745', 
                            border: '1px solid #28a745',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: selectedRows.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: selectedRows.length === 0 ? 0.6 : 1
                          }}
                          onClick={handleGeneratePDF}
                          disabled={selectedRows.length === 0}
                        >
                          Generate PDF ({selectedRows.length})
                        </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : selectedYears.length === 0 && selectedFields.length === 0 ? (
          <div className="row">
            <div className="col-12">
              <div className="text-center py-5">
                <h5 className="text-muted">Select Filters</h5>
                <p className="text-muted">Please select a period and component fields to view data</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="row">
            <div className="col-12">
              <div className="text-center py-5">
                <h5 className="text-muted">No Data Found</h5>
                <p className="text-muted">No component data available for the selected criteria</p>
              </div>
            </div>
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

      {/* Max Selection Modal */}
      <ConfirmModal
        show={showMaxSelectionModal}
        message="You can select a maximum of 15 component fields. Please unselect some fields before adding new ones."
        onConfirm={handleCloseMaxSelectionModal}
        onCancel={handleCloseMaxSelectionModal}
      />

      {/* Enhanced table styles */}
      <style>{`
        .hover-row:hover {
          background-color: #f8f9fa !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .table th {
          font-weight: 600 !important;
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 0.5px;
          background-color: #f8f9fa !important;
          border-bottom: 2px solid #dee2e6 !important;
          color: #495057 !important;
          padding: 16px 12px !important;
        }
        
        .table td {
          vertical-align: middle !important;
          padding: 16px 12px !important;
          border-bottom: 1px solid #f1f3f4 !important;
          color: #495057 !important;
        }
        
        .table tbody tr {
          transition: all 0.2s ease !important;
        }
        
        .table tbody tr:hover {
          background-color: #f8f9fa !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        }
        
        .badge {
          font-weight: 500 !important;
          font-size: 0.75rem !important;
          padding: 6px 12px !important;
        }
        
        .card {
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        
        .card-header {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
          border-bottom: 2px solid #dee2e6 !important;
        }
        
        .form-check-input {
          border: 2px solid #dee2e6 !important;
          border-radius: 4px !important;
        }
        
        .form-check-input:checked {
          background-color: #28a745 !important;
          border-color: #28a745 !important;
        }
        
        .btn-outline-success {
          border-color: #28a745 !important;
          color: #28a745 !important;
          font-weight: 500 !important;
          padding: 8px 16px !important;
          border-radius: 6px !important;
        }
        
        .btn-outline-success:hover {
          background-color: #28a745 !important;
          color: white !important;
        }
        
        .btn-outline-success:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
        }
        
        .card-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
        }
        
        .card-header h6 {
          color: white !important;
        }
        
        .table-responsive {
          border-radius: 0 0 12px 12px;
        }
        
        .form-check-input:checked {
          background-color: #30ea03 !important;
          border-color: #30ea03 !important;
        }
        
        .btn-outline-success:hover {
          background-color: #30ea03 !important;
          border-color: #30ea03 !important;
        }
        
        .filter-control, .multi-select-container, .multi-select-trigger {
          min-height: 38px !important;
          height: 38px !important;
        }
        

        .multi-select-container {
          width: 100%;
        }
        .multi-select-trigger {
          width: 100%;
        }
        .filter-group label.fBold {
          margin-bottom: 4px;
        }
        .filters .row.g-3.align-items-end > [class^='col-'] {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        
        @media (max-width: 900px) {
          .mainInternalPages { padding: 16px !important; }
          .table { font-size: 0.9rem !important; }
          .table th, .table td { padding: 8px 6px !important; }
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