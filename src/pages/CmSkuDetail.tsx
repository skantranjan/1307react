import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import ConfirmModal from '../components/ConfirmModal';
import MultiSelect from '../components/MultiSelect';
import { Collapse } from 'react-collapse';
import * as XLSX from 'xlsx';

// Interface for SKU data structure
interface SkuData {
  id: number;
  sku_code: string;
  sku_description: string;
  cm_code: string;
  cm_description: string;
  sku_reference: string;
  is_active: boolean;
  created_by: string;
  created_date: string;
  period: string; // Added period field
  purchased_quantity?: string | number | null;
  dual_source?: string;
  formulation_reference?: string;
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  count: number;
  cm_code: string;
  data: SkuData[];
}

// Add mock component data for table rows (replace with real API data as needed)
const initialComponentRows = [
  {
    id: 1,
    is_active: true,
    material_type: 'Plastic',
    component_reference: 'CR-001',
    component_code: 'C-1001',
    component_description: 'Bottle Cap',
    valid_from: '2023',
    valid_to: '2024',
    material_group: 'Bg-001',
    qtv: 10,
    uom: 'PCS',
    basic_uom: 'PCS',
    packaging_type: 'Primary',
    weight_type: 'Net',
    unit_measure: 'g',
    post_customer: 20,
    post_industrial: 10,
    text1: 'Text 1',
    text2: 'Text 2',
    text3: 'Text 3',
    text4: 'Text 4',
  },
  // Add more rows as needed
];

type AddComponentData = {
  componentType: string;
  componentCode: string;
  componentDescription: string;
  validityFrom: string;
  validityTo: string;
  componentCategory: string;
  componentQuantity: string;
  componentUnitOfMeasure: string;
  componentBaseQuantity: string;
  componentBaseUnitOfMeasure: string;
  wW: string;
  componentPackagingType: string;
  componentPackagingMaterial: string;
  componentUnitWeight: string;
  componentWeightUnitOfMeasure: string;
  percentPostConsumer: string;
  percentPostIndustrial: string;
  percentChemical: string;
  percentBioSourced: string;
  materialStructure: string;
  packagingColour: string;
  packagingLevel: string;
  componentDimensions: string;
  packagingEvidence: File[];
  period: string;
};

// Add this helper for info icon
const InfoIcon = ({ info }: { info: string }) => (
  <span style={{ marginLeft: 6, cursor: 'pointer', color: '#888' }} title={info}>
    <i className="ri-information-line" style={{ fontSize: 16, verticalAlign: 'middle' }} />
  </span>
);

const CmSkuDetail: React.FC = () => {
  const { cmCode } = useParams();
  const location = useLocation();
  const cmDescription = location.state?.cmDescription || '';
  const status = location.state?.status || '';
  const navigate = useNavigate();

  // State for SKU data
  const [skuData, setSkuData] = useState<SkuData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pageLoadStartTime, setPageLoadStartTime] = useState<number>(Date.now());
  const [minimumLoaderComplete, setMinimumLoaderComplete] = useState<boolean>(false);

  // Modal state
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showSkuModal, setShowSkuModal] = useState(false);

  // Copy Data modal state
  const [showCopyDataModal, setShowCopyDataModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [copyFromPeriod, setCopyFromPeriod] = useState<string>('');
  const [copyToPeriod, setCopyToPeriod] = useState<string>('');

  // New state for open index
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First panel open by default

  // Add mock component data for table rows (replace with real API data as needed)
  const [componentRows, setComponentRows] = useState(initialComponentRows);

  // New state for confirm modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSkuId, setPendingSkuId] = useState<number | null>(null);
  const [pendingSkuStatus, setPendingSkuStatus] = useState<boolean>(false);
  
  // State for inactive SKU modal
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  
  // State for error modals
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // State for component confirmation modal
  const [showComponentConfirm, setShowComponentConfirm] = useState(false);
  const [pendingComponentId, setPendingComponentId] = useState<number | null>(null);
  const [pendingComponentStatus, setPendingComponentStatus] = useState<boolean>(false);
  const [pendingComponentSkuCode, setPendingComponentSkuCode] = useState<string>('');

  // State for material type filtering
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('packaging'); // Default to packaging (ID 1)

  // State for SKU tabs (Active/Inactive)
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  // State for component editing modal
  const [showEditComponentModal, setShowEditComponentModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  const [editComponentData, setEditComponentData] = useState<AddComponentData>({
    componentType: '',
    componentCode: '',
    componentDescription: '',
    validityFrom: '',
    validityTo: '',
    componentCategory: '',
    componentQuantity: '',
    componentUnitOfMeasure: '',
    componentBaseQuantity: '',
    componentBaseUnitOfMeasure: '',
    wW: '',
    componentPackagingType: '',
    componentPackagingMaterial: '',
    componentUnitWeight: '',
    componentWeightUnitOfMeasure: '',
    percentPostConsumer: '',
    percentPostIndustrial: '',
    percentChemical: '',
    percentBioSourced: '',
    materialStructure: '',
    packagingColour: '',
    packagingLevel: '',
    componentDimensions: '',
    packagingEvidence: [],
    period: ''
  });
  const [editComponentErrors, setEditComponentErrors] = useState<Record<string, string>>({});
  const [editComponentSuccess, setEditComponentSuccess] = useState('');

  // State for applied filters
  const [appliedFilters, setAppliedFilters] = useState<{ years: string[]; skuDescriptions: string[]; componentCodes: string[] }>({ years: [], skuDescriptions: [], componentCodes: [] });

  // Filtered SKUs based on applied filters
  const filteredSkuData = skuData.filter(sku => {
    // Filter by period (years)
    const yearMatch =
      appliedFilters.years.length === 0 ||
      appliedFilters.years.includes(sku.period);

    // Filter by SKU Description
    const descMatch =
      appliedFilters.skuDescriptions.length === 0 ||
      appliedFilters.skuDescriptions.includes(sku.sku_description);

    // Filter by Component Code (check if any component in this SKU matches the selected component codes)
    const componentMatch =
      appliedFilters.componentCodes.length === 0 ||
      (componentDetails[sku.sku_code] && 
       componentDetails[sku.sku_code].some((component: any) => 
         appliedFilters.componentCodes.includes(component.component_code)
       ));

    return yearMatch && descMatch && componentMatch;
  });

  // Search button handler
  const handleSearch = () => {
    setAppliedFilters({ years: selectedYears, skuDescriptions: selectedSkuDescriptions, componentCodes: selectedComponentCodes });
    setOpenIndex(0); // Optionally reset to first panel
  };

  // Reset button handler
  const handleReset = () => {
    // Reset to current period instead of clearing
    const getCurrentPeriod = () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();
      
      // Find the period that contains the current date
      for (const yearOption of years) {
        const periodText = yearOption.period;
        
        // Try to parse period text like "July 2025 to June 2026"
        const periodMatch = periodText.match(/(\w+)\s+(\d{4})\s+to\s+(\w+)\s+(\d{4})/i);
        if (periodMatch) {
          const startMonth = periodMatch[1];
          const startYear = parseInt(periodMatch[2]);
          const endMonth = periodMatch[3];
          const endYear = parseInt(periodMatch[4]);
          
          // Convert month names to numbers
          const monthNames: { [key: string]: number } = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
          };
          
          const startMonthNum = monthNames[startMonth.toLowerCase()];
          const endMonthNum = monthNames[endMonth.toLowerCase()];
          
          if (startMonthNum && endMonthNum) {
            // Check if current date falls within this period
            const currentDate = new Date(currentYear, currentMonth - 1, 1);
            const periodStart = new Date(startYear, startMonthNum - 1, 1);
            const periodEnd = new Date(endYear, endMonthNum, 0); // Last day of end month
            
            if (currentDate >= periodStart && currentDate <= periodEnd) {
              return yearOption;
            }
          }
        }
        
        // Fallback: check if period contains current year
        if (periodText.includes(currentYear.toString())) {
          return yearOption;
        }
      }
      
      // If no specific period found, try to find by current year
      return years.find(year => year.period === currentYear.toString() || year.id === currentYear.toString());
    };
    
    const currentPeriodOption = getCurrentPeriod();
    if (currentPeriodOption) {
      setSelectedYears([currentPeriodOption.id]);
              setAppliedFilters({ years: [currentPeriodOption.id], skuDescriptions: [], componentCodes: [] });
    } else {
      setSelectedYears([]);
              setAppliedFilters({ years: [], skuDescriptions: [], componentCodes: [] });
    }
    setSelectedSkuDescriptions([]);
    setSelectedComponentCodes([]);
    setOpenIndex(0);
  };

  // Expose fetchSkuDetails for use after add/edit
  const fetchSkuDetails = async () => {
    if (!cmCode) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`http://localhost:3000/sku-details/${cmCode}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ApiResponse = await response.json();
      if (result.success) {
        setSkuData(result.data);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SKU details');
      console.error('Error fetching SKU details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch SKU details from API
  useEffect(() => {
    setPageLoadStartTime(Date.now());
    setMinimumLoaderComplete(false);
    fetchSkuDetails();
    // eslint-disable-next-line
  }, [cmCode]);

  // Minimum 2 second loader
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumLoaderComplete(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [pageLoadStartTime]);

  // Fetch years from API
  const [years, setYears] = useState<Array<{id: string, period: string}>>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  // Update editComponentData period when selectedYears changes
  useEffect(() => {
    setEditComponentData(prev => ({
      ...prev,
      period: selectedYears.length > 0 ? getPeriodTextFromId(selectedYears[0]) : ''
    }));
  }, [selectedYears, years]);

  // Helper function to get period text from selected year ID
  const getPeriodTextFromId = (yearId: string) => {
    const yearOption = years.find(year => year.id === yearId);
    return yearOption ? yearOption.period : '';
  };

  // Update addComponentData period when selectedYears changes
  useEffect(() => {
    setAddComponentData(prev => ({
      ...prev,
      period: selectedYears.length > 0 ? getPeriodTextFromId(selectedYears[0]) : ''
    }));
  }, [selectedYears, years]);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const response = await fetch('http://localhost:3000/sku-details-active-years');
        if (!response.ok) throw new Error('Failed to fetch years');
        const result = await response.json();
        console.log('Years API response:', result); // Debug log
        
        // Handle different response formats
        let yearsData: any[] = [];
        if (Array.isArray(result)) {
          yearsData = result;
        } else if (result.years && Array.isArray(result.years)) {
          yearsData = result.years;
        } else if (result.data && Array.isArray(result.data)) {
          yearsData = result.data;
        }
        
        // Process years with id and period
        const processedYears = yearsData
          .map((year: any) => {
            if (typeof year === 'string' || typeof year === 'number') {
              return { id: String(year), period: String(year) };
            } else if (year && typeof year === 'object' && year.period) {
              return { id: String(year.id || year.period), period: String(year.period) };
            } else if (year && typeof year === 'object' && year.id) {
              return { id: String(year.id), period: String(year.period || year.id) };
            } else {
              return null;
            }
          })
          .filter((year: any) => year && year.id && year.period) as Array<{id: string, period: string}>;
        
        console.log('Processed years:', processedYears); // Debug log
        setYears(processedYears);
        
        // Set current period as default if available
        const getCurrentPeriod = () => {
          const now = new Date();
          const currentMonth = now.getMonth() + 1; // 1-12
          const currentYear = now.getFullYear();
          
          // Find the period that contains the current date
          // For periods like "July 2025 to June 2026", we need to check if current date falls within
          for (const yearOption of processedYears) {
            const periodText = yearOption.period;
            
            // Try to parse period text like "July 2025 to June 2026"
            const periodMatch = periodText.match(/(\w+)\s+(\d{4})\s+to\s+(\w+)\s+(\d{4})/i);
            if (periodMatch) {
              const startMonth = periodMatch[1];
              const startYear = parseInt(periodMatch[2]);
              const endMonth = periodMatch[3];
              const endYear = parseInt(periodMatch[4]);
              
              // Convert month names to numbers
              const monthNames: { [key: string]: number } = {
                'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
                'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
              };
              
              const startMonthNum = monthNames[startMonth.toLowerCase()];
              const endMonthNum = monthNames[endMonth.toLowerCase()];
              
              if (startMonthNum && endMonthNum) {
                // Check if current date falls within this period
                const currentDate = new Date(currentYear, currentMonth - 1, 1);
                const periodStart = new Date(startYear, startMonthNum - 1, 1);
                const periodEnd = new Date(endYear, endMonthNum, 0); // Last day of end month
                
                if (currentDate >= periodStart && currentDate <= periodEnd) {
                  return yearOption;
                }
              }
            }
            
            // Fallback: check if period contains current year
            if (periodText.includes(currentYear.toString())) {
              return yearOption;
            }
          }
          
          // If no specific period found, try to find by current year
          return processedYears.find(year => year.period === currentYear.toString() || year.id === currentYear.toString());
        };
        
        const currentPeriodOption = getCurrentPeriod();
        if (currentPeriodOption) {
          setSelectedYears([currentPeriodOption.id]);
          // Apply filter automatically for current period
          setAppliedFilters(prev => ({ ...prev, years: [currentPeriodOption.id] }));
        }
      } catch (err) {
        console.error('Error fetching years:', err);
        setYears([]);
      }
    };
    fetchYears();
  }, []);

  // Additional useEffect to handle current period selection when years are loaded
  useEffect(() => {
    if (years.length > 0 && selectedYears.length === 0) {
      const getCurrentPeriod = () => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentYear = now.getFullYear();
        
        // Find the period that contains the current date
        for (const yearOption of years) {
          const periodText = yearOption.period;
          
          // Try to parse period text like "July 2025 to June 2026"
          const periodMatch = periodText.match(/(\w+)\s+(\d{4})\s+to\s+(\w+)\s+(\d{4})/i);
          if (periodMatch) {
            const startMonth = periodMatch[1];
            const startYear = parseInt(periodMatch[2]);
            const endMonth = periodMatch[3];
            const endYear = parseInt(periodMatch[4]);
            
            // Convert month names to numbers
            const monthNames: { [key: string]: number } = {
              'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
              'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
            };
            
            const startMonthNum = monthNames[startMonth.toLowerCase()];
            const endMonthNum = monthNames[endMonth.toLowerCase()];
            
            if (startMonthNum && endMonthNum) {
              // Check if current date falls within this period
              const currentDate = new Date(currentYear, currentMonth - 1, 1);
              const periodStart = new Date(startYear, startMonthNum - 1, 1);
              const periodEnd = new Date(endYear, endMonthNum, 0); // Last day of end month
              
              if (currentDate >= periodStart && currentDate <= periodEnd) {
                return yearOption;
              }
            }
          }
          
          // Fallback: check if period contains current year
          if (periodText.includes(currentYear.toString())) {
            return yearOption;
          }
        }
        
        // If no specific period found, try to find by current year
        return years.find(year => year.period === currentYear.toString() || year.id === currentYear.toString());
      };
      
      const currentPeriodOption = getCurrentPeriod();
      if (currentPeriodOption) {
        setSelectedYears([currentPeriodOption.id]);
        setAppliedFilters(prev => ({ ...prev, years: [currentPeriodOption.id] }));
      }
    }
  }, [years, selectedYears.length]);

  // Fetch SKU descriptions from API
  const [skuDescriptions, setSkuDescriptions] = useState<string[]>([]);
  const [selectedSkuDescriptions, setSelectedSkuDescriptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchDescriptions = async () => {
      try {
        const response = await fetch('http://localhost:3000/sku-descriptions');
        if (!response.ok) throw new Error('Failed to fetch descriptions');
        const result = await response.json();
        const descriptionsData = result.descriptions || [];
        // Convert all descriptions to strings to ensure compatibility
        const descriptionsAsStrings = descriptionsData.map((desc: any) => String(desc)).filter((desc: string) => desc && desc.trim() !== '');
        setSkuDescriptions(descriptionsAsStrings);
      } catch (err) {
        setSkuDescriptions([]);
      }
    };
    fetchDescriptions();
  }, []);

  // Component codes with dummy data
  const [componentCodes, setComponentCodes] = useState<string[]>([
    'COMP001',
    'COMP002', 
    'COMP003',
    'COMP004',
    'COMP005',
    'COMP006',
    'COMP007',
    'COMP008',
    'COMP009',
    'COMP010',
    'RAW001',
    'RAW002',
    'RAW003',
    'PACK001',
    'PACK002',
    'PACK003',
    'MAT001',
    'MAT002',
    'MAT003',
    'MAT004'
  ]);
  const [selectedComponentCodes, setSelectedComponentCodes] = useState<string[]>([]);

  // Add state for material types
  const [materialTypes, setMaterialTypes] = useState<Array<{id: number, item_name: string, item_order: number, is_active: boolean, created_by: string, created_date: string}>>([]);

  // Fetch material types from API
  useEffect(() => {
    const fetchMaterialTypes = async () => {
      try {
        console.log('Fetching material types from API...');
        const response = await fetch('http://localhost:3000/component-master-material-type');
        if (!response.ok) throw new Error('Failed to fetch material types');
        const result = await response.json();
        console.log('Material types API response:', result);
        if (result.success) {
          setMaterialTypes(result.data);
          console.log('Material types loaded:', result.data);
        }
      } catch (error) {
        console.error('Error fetching material types:', error);
      }
    };

    fetchMaterialTypes();
  }, []);

  // Add state for unitOfMeasureOptions
  const [unitOfMeasureOptions, setUnitOfMeasureOptions] = useState<{id: number, item_name: string}[]>([]);

  useEffect(() => {
    const fetchUnitOfMeasureOptions = async () => {
      try {
        console.log('Fetching UOM options from API...');
        const response = await fetch('http://localhost:3000/master-component-umo');
        const result = await response.json();
        console.log('UOM API response:', result);
        if (result.success && Array.isArray(result.data)) {
          setUnitOfMeasureOptions(result.data);
          console.log('UOM options loaded:', result.data);
        } else {
          setUnitOfMeasureOptions([]);
        }
      } catch (err) {
        console.error('Error fetching UOM options:', err);
        setUnitOfMeasureOptions([]);
      }
    };
    fetchUnitOfMeasureOptions();
  }, []);

  // Add state for packagingLevelOptions
  const [packagingLevelOptions, setPackagingLevelOptions] = useState<{id: number, item_name: string}[]>([]);

  useEffect(() => {
    const fetchPackagingLevelOptions = async () => {
      try {
        const response = await fetch('http://localhost:3000/master-component-packaging-level');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setPackagingLevelOptions(result.data);
        } else {
          setPackagingLevelOptions([]);
        }
      } catch (err) {
        setPackagingLevelOptions([]);
      }
    };
    fetchPackagingLevelOptions();
  }, []);

  // Add state for packagingMaterialOptions
  const [packagingMaterialOptions, setPackagingMaterialOptions] = useState<{id: number, item_name: string}[]>([]);

  useEffect(() => {
    const fetchPackagingMaterialOptions = async () => {
      try {
        const response = await fetch('http://localhost:3000/master-component-packaging-material');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setPackagingMaterialOptions(result.data);
        } else {
          setPackagingMaterialOptions([]);
        }
      } catch (err) {
        setPackagingMaterialOptions([]);
      }
    };
    fetchPackagingMaterialOptions();
  }, []);

  // Handler to update is_active status
  const handleIsActiveChange = async (skuId: number, currentStatus: boolean) => {
    try {
      // Optimistically update UI
      setSkuData(prev => prev.map(sku => sku.id === skuId ? { ...sku, is_active: !currentStatus } : sku));
      // Send PATCH request
      const response = await fetch(`http://localhost:3000/sku-details/${skuId}/is-active`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error('API returned unsuccessful response for status update');
      }
    } catch (err) {
      // If error, revert UI change
      setSkuData(prev => prev.map(sku => sku.id === skuId ? { ...sku, is_active: currentStatus } : sku));
      showError('Failed to update status. Please try again.');
    }
  };

  // Handler for table row/component is_active
  const handleComponentIsActiveChange = (rowId: number, currentStatus: boolean) => {
    setComponentRows(prev => prev.map(row => row.id === rowId ? { ...row, is_active: !currentStatus } : row));
    // Optionally, send PATCH to backend for component/row status here
  };

  // Handler for header button click (show modal)
  const handleHeaderStatusClick = (skuId: number, currentStatus: boolean) => {
    setPendingSkuId(skuId);
    setPendingSkuStatus(currentStatus);
    setShowConfirm(true);
  };

  // Handler for modal confirm
  const handleConfirmStatusChange = async () => {
    if (pendingSkuId !== null) {
      await handleIsActiveChange(pendingSkuId, pendingSkuStatus);
    }
    setShowConfirm(false);
    setPendingSkuId(null);
  };

  // Handler for modal cancel
  const handleCancelStatusChange = () => {
    setShowConfirm(false);
    setPendingSkuId(null);
  };

  // Handler for inactive SKU modal
  const handleInactiveModalClose = () => {
    setShowInactiveModal(false);
  };

  // Handler for error modal
  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  // Function to show error modal
  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  // Handler to show component confirmation modal
  const handleComponentStatusClick = (componentId: number, currentStatus: boolean, skuCode: string) => {
    console.log('🔍 handleComponentStatusClick called with:', { componentId, currentStatus, skuCode });
    console.log('🔄 Setting pending status to:', !currentStatus);
    
    setPendingComponentId(componentId);
    setPendingComponentStatus(!currentStatus);
    setPendingComponentSkuCode(skuCode);
    setShowComponentConfirm(true);
    
    console.log('✅ Component confirmation modal opened');
  };

  // Handler for component confirmation
  const handleComponentConfirmStatusChange = async () => {
    console.log('🔍 handleComponentConfirmStatusChange called with:', {
      pendingComponentId,
      pendingComponentStatus,
      pendingComponentSkuCode
    });
    
    if (pendingComponentId !== null) {
      console.log('✅ Calling handleComponentStatusChange...');
      await handleComponentStatusChange(pendingComponentId, pendingComponentStatus, pendingComponentSkuCode);
    } else {
      console.warn('⚠️ pendingComponentId is null, skipping status change');
    }
    
    setShowComponentConfirm(false);
    setPendingComponentId(null);
    setPendingComponentSkuCode('');
    console.log('✅ Component confirmation modal closed');
  };

  // Handler for component modal cancel
  const handleComponentCancelStatusChange = () => {
    setShowComponentConfirm(false);
    setPendingComponentId(null);
    setPendingComponentSkuCode('');
  };

  // Helper function to get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return 'add-circle-line';
      case 'UPDATE': return 'edit-line';
      case 'STATUS_CHANGE': return 'toggle-line';
      default: return 'file-list-line';
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Helper function to render field changes
  const renderFieldChanges = (log: any) => {
    if (log.action === 'STATUS_CHANGE') {
      return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#dc3545', fontWeight: '500' }}>
            Status: {log.old_value === 'true' ? 'Active' : 'Inactive'}
          </span>
          <i className="ri-arrow-right-line" style={{ margin: '0 8px' }}></i>
          <span style={{ color: '#28a745', fontWeight: '500' }}>
            Status: {log.new_value === 'true' ? 'Active' : 'Inactive'}
          </span>
        </div>
      );
    }
    
    if (log.action === 'CREATE') {
      return <div>Component created with all initial values</div>;
    }
    
    if (log.action === 'UPDATE') {
      return <div>Component details updated</div>;
    }
    
    return <div>Component modified</div>;
  };

  // Pagination helper functions
  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Handler for opening component edit modal
  const handleViewComponentHistory = async (component: any) => {
    setSelectedComponentForHistory(component);
    setLoadingHistory(true);
    setShowHistoryModal(true);
    setCurrentPage(1); // Reset to first page when opening modal
    
    try {
      console.log('🔍 Fetching audit logs for component:', component.id);
      
      const response = await fetch(`http://localhost:3000/component-audit-log/${component.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Audit logs received:', data);
        const auditData = data.data || data.history || [];
        setComponentHistory(auditData);
        setTotalItems(auditData.length);
      } else {
        console.error('❌ Failed to fetch component audit logs');
        setComponentHistory([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('❌ Error fetching component audit logs:', error);
      setComponentHistory([]);
      setTotalItems(0);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditComponent = (component: any) => {
    setEditingComponent(component);
    setEditComponentData({
      componentType: component.material_type_id?.toString() || '',
      componentCode: component.component_code || '',
      componentDescription: component.component_description || '',
      validityFrom: component.component_valid_from || '',
      validityTo: component.component_valid_to || '',
      componentCategory: component.component_material_group || '',
      componentQuantity: component.component_quantity || '',
      componentUnitOfMeasure: component.component_uom_id?.toString() || '',
      componentBaseQuantity: component.component_base_quantity || '',
      componentBaseUnitOfMeasure: component.component_base_uom_id?.toString() || '',
      wW: component.percent_w_w || '',
      componentPackagingType: component.component_packaging_type_id?.toString() || '',
      componentPackagingMaterial: component.component_packaging_material || '',
      componentUnitWeight: component.component_unit_weight || '',
      componentWeightUnitOfMeasure: component.weight_unit_measure_id?.toString() || '',
      percentPostConsumer: component.percent_mechanical_pcr_content || '',
      percentPostIndustrial: component.percent_mechanical_pir_content || '',
      percentChemical: component.percent_chemical_recycled_content || '',
      percentBioSourced: component.percent_bio_sourced || '',
      materialStructure: component.material_structure_multimaterials || '',
      packagingColour: component.component_packaging_color_opacity || '',
      packagingLevel: component.component_packaging_level_id?.toString() || '',
      componentDimensions: component.component_dimensions || '',
      packagingEvidence: [],
      period: selectedYears.length > 0 ? getPeriodTextFromId(selectedYears[0]) : ''
    });
    
    // Reset Packaging Specification Evidence states
    setEditSelectedCategories([]);
    setEditSelectedFiles([]);
    setEditUploadedFiles([]);
    setEditCategoryError('');
    
    setEditComponentErrors({});
    setEditComponentSuccess('');
    setShowEditComponentModal(true);
  };

  // Handler for saving edited component
  const handleEditComponentSave = async () => {
    if (!editingComponent) return;

    // Validation for required fields
    const errors: Record<string, string> = {};
    if (!editComponentData.componentCode) errors.componentCode = 'A value is required for Component Code';
    
    setEditComponentErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add all component data
      formData.append('component_code', editComponentData.componentCode);
      formData.append('component_description', editComponentData.componentDescription);
      formData.append('component_quantity', editComponentData.componentQuantity);
      formData.append('component_uom_id', editComponentData.componentUnitOfMeasure);
      formData.append('component_packaging_material', editComponentData.componentPackagingMaterial);
      formData.append('percent_w_w', editComponentData.wW);
      formData.append('material_type_id', editComponentData.componentType);
      formData.append('component_valid_from', editComponentData.validityFrom);
      formData.append('component_valid_to', editComponentData.validityTo);
      formData.append('component_material_group', editComponentData.componentCategory);
      formData.append('component_base_quantity', editComponentData.componentBaseQuantity);
      formData.append('component_base_uom_id', editComponentData.componentBaseUnitOfMeasure);
      formData.append('component_packaging_type_id', editComponentData.componentPackagingType);
      formData.append('component_unit_weight', editComponentData.componentUnitWeight);
      formData.append('weight_unit_measure_id', editComponentData.componentWeightUnitOfMeasure);
      formData.append('percent_mechanical_pcr_content', editComponentData.percentPostConsumer);
      formData.append('percent_mechanical_pir_content', editComponentData.percentPostIndustrial);
      formData.append('percent_chemical_recycled_content', editComponentData.percentChemical);
      formData.append('percent_bio_sourced', editComponentData.percentBioSourced);
      formData.append('material_structure_multimaterials', editComponentData.materialStructure);
      formData.append('component_packaging_color_opacity', editComponentData.packagingColour);
      formData.append('component_packaging_level_id', editComponentData.packagingLevel);
      formData.append('component_dimensions', editComponentData.componentDimensions);

      // Add packaging evidence files
      if (editComponentData.packagingEvidence.length > 0) {
        editComponentData.packagingEvidence.forEach(file => {
          formData.append('packaging_evidence', file);
        });
      }

      const response = await fetch(`http://localhost:3000/component-details/${editingComponent.id}`, {
        method: 'PUT',
        body: formData // Don't set Content-Type header for FormData
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        setEditComponentErrors({ server: result.message || 'Server validation failed' });
        return;
      }
      
              // Log audit trail for component update
        try {
          const auditData = {
            component_id: editingComponent.id, // ✅ Primary key of the component being edited
            sku_code: editingComponent.sku_code || selectedSkuCode,
            component_code: editComponentData.componentCode || editingComponent.component_code || '',
            component_description: editComponentData.componentDescription || editingComponent.component_description || '',
            year: editingComponent.year || '',
            cm_code: cmCode || '',
            periods: selectedYears.length > 0 ? selectedYears[0] : '',
            material_type_id: Number(editComponentData.componentType || editingComponent.material_type_id) || 0,
            component_quantity: Number(editComponentData.componentQuantity || editingComponent.component_quantity) || 0,
            component_uom_id: Number(editComponentData.componentUnitOfMeasure || editingComponent.component_uom_id) || 0,
            component_packaging_material: editComponentData.componentPackagingMaterial || editingComponent.component_packaging_material || '',
            component_unit_weight: Number(editComponentData.componentUnitWeight || editingComponent.component_unit_weight) || 0,
            weight_unit_measure_id: Number(editComponentData.componentWeightUnitOfMeasure || editingComponent.weight_unit_measure_id) || 0,
            percent_mechanical_pcr_content: Number(editComponentData.percentPostConsumer || editingComponent.percent_mechanical_pcr_content) || 0,
            percent_bio_sourced: Number(editComponentData.percentBioSourced || editingComponent.percent_bio_sourced) || 0,
            user_id: 1,
            created_by: 1,
            is_active: editingComponent.is_active || true
          };
        
        await fetch('http://localhost:3000/add-component-audit-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(auditData)
        });
        console.log('Audit log created for component update');
      } catch (auditError) {
        console.error('Failed to log audit trail:', auditError);
      }
      
      setEditComponentSuccess('Component updated successfully!');
      setEditComponentErrors({});
      
      // Refresh component details
      setTimeout(async () => {
        setShowEditComponentModal(false);
        setEditingComponent(null);
        setEditComponentData({
          componentType: '',
          componentCode: '',
          componentDescription: '',
          validityFrom: '',
          validityTo: '',
          componentCategory: '',
          componentQuantity: '',
          componentUnitOfMeasure: '',
          componentBaseQuantity: '',
          componentBaseUnitOfMeasure: '',
          wW: '',
          componentPackagingType: '',
          componentPackagingMaterial: '',
          componentUnitWeight: '',
          componentWeightUnitOfMeasure: '',
          percentPostConsumer: '',
          percentPostIndustrial: '',
          percentChemical: '',
          percentBioSourced: '',
          materialStructure: '',
          packagingColour: '',
          packagingLevel: '',
          componentDimensions: '',
          packagingEvidence: [],
          period: selectedYears.length > 0 ? getPeriodTextFromId(selectedYears[0]) : ''
        });
        setEditComponentSuccess('');
        // Refresh the component details for the current SKU
        if (editingComponent?.sku_code) {
          await fetchComponentDetails(editingComponent.sku_code);
        }
      }, 1200);
      
    } catch (err) {
      setEditComponentErrors({ server: 'Network or server error' });
    }
  };

  // Add state for Add SKU modal fields and validation
  const [addSkuPeriod, setAddSkuPeriod] = useState('');
  const [addSku, setAddSku] = useState('');
  const [addSkuDescription, setAddSkuDescription] = useState('');
  const [addSkuType, setAddSkuType] = useState('internal'); // Default to internal
  const [addSkuReference, setAddSkuReference] = useState('');
  // const [addSkuQty, setAddSkuQty] = useState(''); // Hidden for now, may be used later
  const [addSkuErrors, setAddSkuErrors] = useState({ sku: '', skuDescription: '', period: '', skuType: '', server: '' });
  const [addSkuSuccess, setAddSkuSuccess] = useState('');
  const [addSkuLoading, setAddSkuLoading] = useState(false);

  // Add SKU handler
  const handleAddSkuSave = async () => {
    // Client-side validation
    let errors = { sku: '', skuDescription: '', period: '', skuType: '', server: '' };
    if (!addSku.trim()) errors.sku = 'A value is required for SKU code';
    if (!addSkuDescription.trim()) errors.skuDescription = 'A value is required for SKU description';
    if (!addSkuPeriod) errors.period = 'A value is required for the Period';
    if (!addSkuType) errors.skuType = 'A value is required for SKU Type';
    setAddSkuErrors(errors);
    setAddSkuSuccess('');
    if (errors.sku || errors.skuDescription || errors.period || errors.skuType) return;

    // POST to API
    setAddSkuLoading(true);
    try {
      const response = await fetch('http://localhost:3000/sku-details/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sku_code: addSku,
          sku_description: addSkuDescription,
          period: addSkuPeriod,
          sku_type: addSkuType,
          sku_reference: addSkuReference,
          cm_code: cmCode,
          cm_description: cmDescription
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        // Server-side validation error
        setAddSkuErrors({ ...errors, server: result.message || 'Server validation failed' });
        setAddSkuLoading(false);
        return;
      }
      // Success
      setAddSkuSuccess('SKU added successfully!');
      setAddSkuErrors({ sku: '', skuDescription: '', period: '', skuType: '', server: '' });
      // Call audit log API
      const auditResponse = await fetch('http://localhost:3000/sku-auditlog/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sku_code: addSku,
          sku_description: addSkuDescription,
          cm_code: cmCode,
          cm_description: cmDescription,
          is_active: true, // assuming new SKUs are active
          created_by: 'system', // or use actual user if available
          created_date: new Date().toISOString()
        })
      });
      if (!auditResponse.ok) {
        throw new Error('Failed to add audit log');
      }
      const auditResult = await auditResponse.json();
      if (!auditResult.success) {
        throw new Error('API returned unsuccessful response for audit log');
      }
      setTimeout(async () => {
        setShowSkuModal(false);
        setAddSku('');
        setAddSkuDescription('');
        setAddSkuPeriod('');
        setAddSkuType('internal');
        setAddSkuReference('');
        // setAddSkuQty(''); // Hidden for now
        setAddSkuSuccess('');
        setLoading(true); // show full-page loader
        await fetchSkuDetails(); // refresh data
        // Refresh component details for all SKUs to ensure consistency
        const updatedSkuData = await fetch('http://localhost:3000/sku-details').then(res => res.json());
        if (updatedSkuData.success && updatedSkuData.data) {
          for (const sku of updatedSkuData.data) {
            await fetchComponentDetails(sku.sku_code);
          }
        }
        setLoading(false); // hide loader
      }, 1200);
    } catch (err) {
      setAddSkuErrors({ ...errors, server: 'Network or server error' });
    } finally {
      setAddSkuLoading(false);
    }
  };

  // Edit SKU modal state
  const [showEditSkuModal, setShowEditSkuModal] = useState(false);
  const [editSkuData, setEditSkuData] = useState({
    period: '',
    sku: '',
    skuDescription: '',
    qty: '',
    dualSource: '',
    skuReference: '',
  });
  const [editSkuErrors, setEditSkuErrors] = useState({ sku: '', skuDescription: '', period: '', qty: '', server: '' });
  const [editSkuSuccess, setEditSkuSuccess] = useState('');
  const [editSkuLoading, setEditSkuLoading] = useState(false);

  // Handler to open Edit SKU modal (to be called on Edit SKU button click)
  const handleEditSkuOpen = (sku: SkuData) => {
    // Convert period ID to period name
    const periodName = getPeriodTextFromId(sku.period);
    
    setEditSkuData({
      period: periodName || '',
      sku: sku.sku_code || '',
      skuDescription: sku.sku_description || '',
      qty: sku.purchased_quantity != null ? String(sku.purchased_quantity) : '',
      dualSource: sku.dual_source || '',
      skuReference: sku.sku_reference || '',
    });
    setEditSkuErrors({ sku: '', skuDescription: '', period: '', qty: '', server: '' });
    setEditSkuSuccess('');
    setShowEditSkuModal(true);
  };

  // Edit SKU handler
  const handleEditSkuUpdate = async () => {
    // Client-side validation
    let errors = { sku: '', skuDescription: '', period: '', qty: '', server: '' };
    if (!editSkuData.sku.trim()) errors.sku = 'A value is required for SKU code';
    if (!editSkuData.skuDescription.trim()) errors.skuDescription = 'A value is required for SKU description';
    if (!editSkuData.period) errors.period = 'A value is required for the Period';
    // if (!editSkuData.qty || isNaN(Number(editSkuData.qty)) || Number(editSkuData.qty) <= 0) errors.qty = 'A value is required for Purchased Quantity';
    setEditSkuErrors(errors);
    setEditSkuSuccess('');
    if (errors.sku || errors.skuDescription || errors.period) return;

    // PUT to API
    setEditSkuLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/sku-details/update/${encodeURIComponent(editSkuData.sku)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sku_code: editSkuData.sku,
          sku_description: editSkuData.skuDescription,
          period: editSkuData.period,
          dual_source: editSkuData.dualSource,
          sku_reference: editSkuData.skuReference
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setEditSkuErrors({ ...errors, server: result.message || 'Server validation failed' });
        setEditSkuLoading(false);
        return;
      }
      setEditSkuSuccess('SKU updated successfully!');
      setEditSkuErrors({ sku: '', skuDescription: '', period: '', qty: '', server: '' });
      // Call audit log API
      const auditResponse = await fetch('http://localhost:3000/sku-auditlog/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sku_code: editSkuData.sku,
          sku_description: editSkuData.skuDescription,
          cm_code: cmCode,
          cm_description: cmDescription,
          is_active: true, // or use actual value if available
          created_by: 'system', // or use actual user if available
          created_date: new Date().toISOString()
        })
      });
      if (!auditResponse.ok) {
        throw new Error('Failed to add audit log');
      }
      const auditResult = await auditResponse.json();
      if (!auditResult.success) {
        throw new Error('API returned unsuccessful response for audit log');
      }
      setTimeout(async () => {
        setShowEditSkuModal(false);
        setEditSkuSuccess('');
        setLoading(true); // show full-page loader
        await fetchSkuDetails(); // refresh data
        // Refresh component details for all SKUs to ensure consistency
        const updatedSkuData = await fetch('http://localhost:3000/sku-details').then(res => res.json());
        if (updatedSkuData.success && updatedSkuData.data) {
          for (const sku of updatedSkuData.data) {
            await fetchComponentDetails(sku.sku_code);
          }
        }
        setLoading(false); // hide loader
      }, 1200);
    } catch (err) {
      setEditSkuErrors({ ...errors, server: 'Network or server error' });
    } finally {
      setEditSkuLoading(false);
    }
  };

  // Add Component modal state
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [addComponentData, setAddComponentData] = useState<AddComponentData>({
    componentType: '',
    componentCode: '',
    componentDescription: '',
    validityFrom: '',
    validityTo: '',
    componentCategory: '',
    componentQuantity: '',
    componentUnitOfMeasure: '',
    componentBaseQuantity: '',
    componentBaseUnitOfMeasure: '',
    wW: '',
    componentPackagingType: '',
    componentPackagingMaterial: '',
    componentUnitWeight: '',
    componentWeightUnitOfMeasure: '',
    percentPostConsumer: '',
    percentPostIndustrial: '',
    percentChemical: '',
    percentBioSourced: '',
    materialStructure: '',
    packagingColour: '',
    packagingLevel: '',
    componentDimensions: '',
    packagingEvidence: [],
    period: ''
  });



  // Add state for Add Component modal fields and validation
  const [addComponentErrors, setAddComponentErrors] = useState<Record<string, string>>({});
  const [addComponentSuccess, setAddComponentSuccess] = useState("");

  // Add state for category selection and file upload
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, categories: string[], categoryName?: string, files: File[]}>>([]);
  const [categoryError, setCategoryError] = useState<string>('');
  
  // Add state for CH Pack field
  const [chPackValue, setChPackValue] = useState<string>('');
  
  // Edit Component Packaging Specification Evidence states
  const [editSelectedCategories, setEditSelectedCategories] = useState<string[]>([]);
  const [editSelectedFiles, setEditSelectedFiles] = useState<File[]>([]);
  const [editUploadedFiles, setEditUploadedFiles] = useState<Array<{id: string, categories: string[], categoryName?: string, files: File[]}>>([]);
  const [editCategoryError, setEditCategoryError] = useState<string>('');

  // History Log Modal states
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [selectedComponentForHistory, setSelectedComponentForHistory] = useState<any>(null);
  const [componentHistory, setComponentHistory] = useState<Array<{
    id: number;
    component_id: number;
    sku_code: string;
    formulation_reference: string;
    material_type_id: number;
    components_reference: string;
    component_code: string;
    component_description: string;
    component_valid_from: string;
    component_valid_to: string;
    component_material_group: string;
    component_quantity: number;
    component_uom_id: number;
    component_base_quantity: number;
    component_base_uom_id: number;
    percent_w_w: number;
    evidence: string;
    component_packaging_type_id: number;
    component_packaging_material: string;
    helper_column: string;
    component_unit_weight: number;
    weight_unit_measure_id: number;
    percent_mechanical_pcr_content: number;
    percent_mechanical_pir_content: number;
    percent_chemical_recycled_content: number;
    percent_bio_sourced: number;
    material_structure_multimaterials: string;
    component_packaging_color_opacity: string;
    component_packaging_level_id: number;
    component_dimensions: string;
    packaging_specification_evidence: string;
    evidence_of_recycled_or_bio_source: string;
    last_update_date: string;
    category_entry_id: number;
    data_verification_entry_id: number;
    user_id: number;
    signed_off_by: string;
    signed_off_date: string;
    mandatory_fields_completion_status: string;
    evidence_provided: string;
    document_status: string;
    is_active: boolean;
    created_by: string;
    created_date: string;
    year: string;
    component_unit_weight_id: number;
    cm_code: string;
    periods: string;
    action: string;
    field_name: string;
    old_value: string;
    new_value: string;
    changed_by: string;
    changed_date: string;
    [key: string]: any; // Allow additional fields from the database
  }>>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  
  // Pagination state for audit logs
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Add state for selectedSkuCode
  const [selectedSkuCode, setSelectedSkuCode] = useState<string>('');

  // Add state for component details per SKU
  const [componentDetails, setComponentDetails] = useState<{ [skuCode: string]: any[] }>({});
  const [componentDetailsLoading, setComponentDetailsLoading] = useState<{ [skuCode: string]: boolean }>({});

  // Helper functions to map IDs to display names
  const getMaterialTypeName = (id: any) => {
    if (!id) return 'N/A';
    // Convert to number for comparison
    const numericId = parseInt(id);
    console.log('Mapping material_type_id:', id, 'Converted to:', numericId, 'Available materialTypes:', materialTypes);
    const material = materialTypes.find(mt => mt.id === numericId);
    console.log('Found material:', material);
    return material ? material.item_name : 'N/A';
  };

  const getUomName = (id: any) => {
    if (!id) return 'N/A';
    const numericId = parseInt(id);
    console.log('Mapping UOM ID:', id, 'Converted to:', numericId, 'Available UOMs:', unitOfMeasureOptions);
    const uom = unitOfMeasureOptions.find(uom => uom.id === numericId);
    console.log('Found UOM:', uom);
    return uom ? uom.item_name : 'N/A';
  };

  const getPackagingLevelName = (id: any) => {
    if (!id) return 'N/A';
    const numericId = parseInt(id);
    const level = packagingLevelOptions.find(pl => pl.id === numericId);
    return level ? level.item_name : 'N/A';
  };

  const getPackagingMaterialName = (id: any) => {
    if (!id) return 'N/A';
    const numericId = parseInt(id);
    const material = packagingMaterialOptions.find(pm => pm.id === numericId);
    return material ? material.item_name : 'N/A';
  };

  // Filter components based on selected material type using material_type_id
  const getFilteredComponents = (skuCode: string) => {
    const components = componentDetails[skuCode] || [];
    
    console.log('Selected material type:', selectedMaterialType);
    console.log('Available components:', components);
    console.log('Component material_type_ids:', components.map(c => ({ id: c.material_type_id, type: typeof c.material_type_id })));
    
    if (selectedMaterialType === 'packaging') {
      const filtered = components.filter(component => {
        const materialTypeId = parseInt(component.material_type_id);
        console.log(`Component ${component.id}: material_type_id = ${component.material_type_id} (${typeof component.material_type_id}), parsed = ${materialTypeId}`);
        return materialTypeId === 1;
      });
      console.log('Filtered packaging components (ID 1):', filtered);
      return filtered;
    } else if (selectedMaterialType === 'raw_material') {
      const filtered = components.filter(component => {
        const materialTypeId = parseInt(component.material_type_id);
        console.log(`Component ${component.id}: material_type_id = ${component.material_type_id} (${typeof component.material_type_id}), parsed = ${materialTypeId}`);
        return materialTypeId === 2;
      });
      console.log('Filtered raw material components (ID 2):', filtered);
      return filtered;
    }
    console.log('Showing all components (no filter applied)');
    return components; // Show all if no specific filter
  };

  // Function to fetch component details for a SKU
  const fetchComponentDetails = async (skuCode: string) => {
    setComponentDetailsLoading(prev => ({ ...prev, [skuCode]: true }));
    try {
      const res = await fetch(`http://localhost:3000/component-details/${skuCode}`);
      const data = await res.json();
      
      // Map the component data to include display names
      console.log('Raw component data:', data.data);
      console.log('Available materialTypes for mapping:', materialTypes);
      
      const mappedData = (data.data || []).map((component: any) => {
        console.log('Processing component:', component);
        const mapped = {
          ...component,
          // Map IDs to display names
          material_type_display: getMaterialTypeName(component.material_type_id),
          component_uom_display: getUomName(component.component_uom_id),
          component_base_uom_display: getUomName(component.component_base_uom_id),
          component_packaging_type_display: getPackagingMaterialName(component.component_packaging_type_id),
          component_packaging_level_display: getPackagingLevelName(component.component_packaging_level_id),
          weight_unit_measure_display: getUomName(component.weight_unit_measure_id),
          component_unit_weight_display: getUomName(component.component_unit_weight_id)
        };
        console.log('Mapped component:', mapped);
        return mapped;
      });
      
      setComponentDetails(prev => ({ ...prev, [skuCode]: mappedData }));
    } catch (err) {
      setComponentDetails(prev => ({ ...prev, [skuCode]: [] }));
    } finally {
      setComponentDetailsLoading(prev => ({ ...prev, [skuCode]: false }));
    }
  };

  // Add Component handler
  const handleAddComponentSave = async () => {
    console.log('Save button clicked');
    console.log('Component Category value:', addComponentData.componentCategory);
    
    // Validation for required fields
    const errors: Record<string, string> = {};
    if (!selectedSkuCode) errors.skuCode = 'A value is required for SKU Code';
    if (!addComponentData.componentCode) errors.componentCode = 'A value is required for Component Code';
    if (selectedYears.length === 0) errors.year = 'A value is required for Year';
    
    setAddComponentErrors(errors);
    if (Object.keys(errors).length > 0) {
      console.log('Validation errors:', errors);
      return;
    }

    try {
      // This sends multipart/form-data
      const formData = new FormData();

      // ===== REQUIRED FIELDS =====
      formData.append('cm_code', cmCode || '');
      formData.append('year', selectedYears.length > 0 ? selectedYears[0] : '');
      formData.append('sku_code', selectedSkuCode || '');
      formData.append('component_code', addComponentData.componentCode || '');
      
      // Debug logging for year and periods
      console.log('Selected Years:', selectedYears);
      console.log('Year being sent:', selectedYears.length > 0 ? selectedYears[0] : '');
      
      // ===== OPTIONAL COMPONENT FIELDS =====
      formData.append('component_description', addComponentData.componentDescription || '');
      formData.append('formulation_reference', '');
      formData.append('material_type_id', addComponentData.componentType || '');
      formData.append('components_reference', '');
      formData.append('component_valid_from', addComponentData.validityFrom || '');
      formData.append('component_valid_to', addComponentData.validityTo || '');
      formData.append('component_material_group', addComponentData.componentCategory || '');
      formData.append('component_quantity', addComponentData.componentQuantity || '');
      formData.append('component_uom_id', addComponentData.componentUnitOfMeasure || '');
      formData.append('component_base_quantity', addComponentData.componentBaseQuantity || '');
      formData.append('component_base_uom_id', addComponentData.componentBaseUnitOfMeasure || '');
      formData.append('percent_w_w', addComponentData.wW || '');
      formData.append('evidence', '');
      formData.append('component_packaging_type_id', addComponentData.componentPackagingType || '');
      formData.append('component_packaging_material', addComponentData.componentPackagingMaterial || '');
      formData.append('helper_column', '');
      formData.append('component_unit_weight', addComponentData.componentUnitWeight || '');
      formData.append('weight_unit_measure_id', addComponentData.componentWeightUnitOfMeasure || '');
      formData.append('percent_mechanical_pcr_content', addComponentData.percentPostConsumer || '');
      formData.append('percent_mechanical_pir_content', addComponentData.percentPostIndustrial || '');
      formData.append('percent_chemical_recycled_content', addComponentData.percentChemical || '');
      formData.append('percent_bio_sourced', addComponentData.percentBioSourced || '');
      formData.append('material_structure_multimaterials', addComponentData.materialStructure || '');
      formData.append('component_packaging_color_opacity', addComponentData.packagingColour || '');
      formData.append('component_packaging_level_id', addComponentData.packagingLevel || '');
      formData.append('component_dimensions', addComponentData.componentDimensions || '');
      formData.append('packaging_specification_evidence', '');
      formData.append('evidence_of_recycled_or_bio_source', '');
      formData.append('category_entry_id', '');
      formData.append('data_verification_entry_id', '');
      formData.append('user_id', '1');
      formData.append('signed_off_by', '');
      formData.append('signed_off_date', '');
      formData.append('mandatory_fields_completion_status', '');
      formData.append('evidence_provided', '');
      formData.append('document_status', '');
      formData.append('is_active', 'true');
      formData.append('created_by', '1');
      formData.append('component_unit_weight_id', '');
      
      // ===== PACKAGING EVIDENCE FILES =====
      if (addComponentData.packagingEvidence.length > 0) {
        // Option 1: Direct field
        addComponentData.packagingEvidence.forEach(file => {
          formData.append('packaging_evidence', file);
          console.log('Added packaging evidence file (direct):', file.name);
        });
        
        // Option 2: Separate object structure (if needed)
        addComponentData.packagingEvidence.forEach(file => {
          formData.append('Packagingfile[files][]', file);
          console.log('Added packaging evidence file (object):', file.name);
        });
      }
      
      // Add other optional fields
      if (addComponentData.componentType) formData.append('material_type_id', addComponentData.componentType);
      if (addComponentData.validityFrom) formData.append('component_valid_from', addComponentData.validityFrom);
      if (addComponentData.validityTo) formData.append('component_valid_to', addComponentData.validityTo);
      if (addComponentData.componentCategory) formData.append('component_material_group', addComponentData.componentCategory);
      if (addComponentData.componentBaseQuantity) formData.append('component_base_quantity', addComponentData.componentBaseQuantity);
      if (addComponentData.componentBaseUnitOfMeasure) formData.append('component_base_uom_id', addComponentData.componentBaseUnitOfMeasure);
      if (addComponentData.componentPackagingType) formData.append('component_packaging_type_id', addComponentData.componentPackagingType);
      if (addComponentData.componentUnitWeight) formData.append('component_unit_weight', addComponentData.componentUnitWeight);
      if (addComponentData.componentWeightUnitOfMeasure) formData.append('weight_unit_measure_id', addComponentData.componentWeightUnitOfMeasure);
      if (addComponentData.percentPostConsumer) formData.append('percent_mechanical_pcr_content', addComponentData.percentPostConsumer);
      if (addComponentData.percentPostIndustrial) formData.append('percent_mechanical_pir_content', addComponentData.percentPostIndustrial);
      if (addComponentData.percentChemical) formData.append('percent_chemical_recycled_content', addComponentData.percentChemical);
      if (addComponentData.percentBioSourced) formData.append('percent_bio_sourced', addComponentData.percentBioSourced);
      if (addComponentData.materialStructure) formData.append('material_structure_multimaterials', addComponentData.materialStructure);
      if (addComponentData.packagingColour) formData.append('component_packaging_color_opacity', addComponentData.packagingColour);
      if (addComponentData.packagingLevel) formData.append('component_packaging_level_id', addComponentData.packagingLevel);
      if (addComponentData.componentDimensions) formData.append('component_dimensions', addComponentData.componentDimensions);

      // ===== FILE UPLOADS - KPI CATEGORIES =====
      const category1Files = uploadedFiles.filter(upload => upload.categories.includes('1')).flatMap(upload => upload.files);
      const category2Files = uploadedFiles.filter(upload => upload.categories.includes('2')).flatMap(upload => upload.files);
      const category3Files = uploadedFiles.filter(upload => upload.categories.includes('3')).flatMap(upload => upload.files);
      const category4Files = uploadedFiles.filter(upload => upload.categories.includes('4')).flatMap(upload => upload.files);

      // Debug logging
      console.log('Uploaded files state:', uploadedFiles);
      console.log('Category 1 files (Weight):', category1Files);
      console.log('Category 2 files (Weight UOM):', category2Files);
      console.log('Category 3 files (Packaging Type):', category3Files);
      console.log('Category 4 files (Material Type):', category4Files);

      // Weight files
      if (category1Files.length > 0) {
        category1Files.forEach(file => {
          formData.append('category1_files', file);
          console.log('Added Weight file:', file.name);
        });
      }

      // Weight UOM files
      if (category2Files.length > 0) {
        category2Files.forEach(file => {
          formData.append('category2_files', file);
          console.log('Added Weight UOM file:', file.name);
        });
      }

      // Packaging Type files
      if (category3Files.length > 0) {
        category3Files.forEach(file => {
          formData.append('category3_files', file);
          console.log('Added Packaging Type file:', file.name);
        });
      }

      // Material Type files
      if (category4Files.length > 0) {
        category4Files.forEach(file => {
          formData.append('category4_files', file);
          console.log('Added Material Type file:', file.name);
        });
      }

      // Debug: Log FormData contents
      console.log('FormData contents:');
      const formDataEntries: [string, FormDataEntryValue][] = [];
      formData.forEach((value, key) => {
        formDataEntries.push([key, value]);
        console.log(key, value);
      });

      // Make the API call
      const response = await fetch('http://localhost:3000/add-component', {
        method: 'POST',
        body: formData  // ✅ Don't set Content-Type header - browser will set it automatically
      });
      
      const result = await response.json();
      console.log('Result:', result);
      
      if (!response.ok || !result.success) {
        setAddComponentErrors({ ...errors, server: result.message || 'Server validation failed' });
        return;
      }
      
              // Log audit trail for component creation
        try {
          const auditData = {
            component_id: result.component_id || result.data?.id, // ✅ Primary key from API response
            sku_code: selectedSkuCode,
            component_code: addComponentData.componentCode || '',
            component_description: addComponentData.componentDescription || '',
            year: selectedYears.length > 0 ? getPeriodTextFromId(selectedYears[0]) : '',
            cm_code: cmCode || '',
            periods: selectedYears.length > 0 ? selectedYears[0] : '',
            material_type_id: Number(addComponentData.componentType) || 0,
            component_quantity: Number(addComponentData.componentQuantity) || 0,
            component_uom_id: Number(addComponentData.componentUnitOfMeasure) || 0,
            component_packaging_material: addComponentData.componentPackagingMaterial || '',
            component_unit_weight: Number(addComponentData.componentUnitWeight) || 0,
            weight_unit_measure_id: Number(addComponentData.componentWeightUnitOfMeasure) || 0,
            percent_mechanical_pcr_content: Number(addComponentData.percentPostConsumer) || 0,
            percent_bio_sourced: Number(addComponentData.percentBioSourced) || 0,
            user_id: 1,
            created_by: 1,
            is_active: true
          };
        
        await fetch('http://localhost:3000/add-component-audit-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(auditData)
        });
        console.log('Audit log created for component creation');
      } catch (auditError) {
        console.error('Failed to log audit trail:', auditError);
      }
      
      setAddComponentSuccess('Component added successfully!');
      setAddComponentErrors({});
      
      setTimeout(async () => {
        setShowAddComponentModal(false);
        setAddComponentData({
          componentType: '',
          componentCode: '',
          componentDescription: '',
          validityFrom: '',
          validityTo: '',
          componentCategory: '',
          componentQuantity: '',
          componentUnitOfMeasure: '',
          componentBaseQuantity: '',
          componentBaseUnitOfMeasure: '',
          wW: '',
          componentPackagingType: '',
          componentPackagingMaterial: '',
          componentUnitWeight: '',
          componentWeightUnitOfMeasure: '',
          percentPostConsumer: '',
          percentPostIndustrial: '',
          percentChemical: '',
          percentBioSourced: '',
          materialStructure: '',
          packagingColour: '',
          packagingLevel: '',
          componentDimensions: '',
          packagingEvidence: [],
          period: selectedYears.length > 0 ? getPeriodTextFromId(selectedYears[0]) : ''
        });
        setUploadedFiles([]);
        setSelectedCategories([]);
        setSelectedFiles([]);
        setAddComponentSuccess('');
        setLoading(true);
        await fetchSkuDetails();
        // Refresh component details for the specific SKU that was just updated
        if (selectedSkuCode) {
          await fetchComponentDetails(selectedSkuCode);
        }
        setLoading(false);
      }, 1200);
      
    } catch (err) {
      console.error('Error:', err);
      setAddComponentErrors({ ...errors, server: 'Network or server error' });
    }
  };

  // Export to Excel handler
  const handleExportToExcel = () => {
    // Prepare data for export with all SKU and component details
    const exportData: any[] = [];
    
    filteredSkuData.forEach(sku => {
      const components = componentDetails[sku.sku_code] || [];
      
      if (components.length === 0) {
        // If no components, still export SKU data
        exportData.push({
          // SKU Information
          'SKU Code': sku.sku_code,
          'SKU Description': sku.sku_description,
          'Reference SKU': sku.sku_reference,
          'Period': sku.period,
          'Purchased Quantity': sku.purchased_quantity,
          'Dual Source': sku.dual_source,
          'Formulation Reference': sku.formulation_reference,
          'SKU Created By': sku.created_by,
          'SKU Created Date': sku.created_date,
          
          // Component Information (empty for SKUs without components)
          'Component Type': '',
          'Component Code': '',
          'Component Description': '',
          'Component Validity From': '',
          'Component Validity To': '',
          'Component Category': '',
          'Component Quantity': '',
          'Component Unit of Measure': '',
          'Component Base Quantity': '',
          'Component Base Unit of Measure': '',
          'Component %w/w': '',
          'Component Packaging Type': '',
          'Component Packaging Material': '',
          'Component Unit Weight': '',
          'Component Weight Unit of Measure': '',
          'Component % Post Consumer': '',
          'Component % Post Industrial': '',
          'Component % Chemical': '',
          'Component % Bio Sourced': '',
          'Component Material Structure': '',
          'Component Packaging Colour': '',
          'Component Packaging Level': '',
          'Component Dimensions': ''
        });
      } else {
        // For each component, create a separate row with SKU and component data
        components.forEach(component => {
          exportData.push({
            // SKU Information
            'SKU Code': sku.sku_code,
            'SKU Description': sku.sku_description,
            'Reference SKU': sku.sku_reference,
            'Period': sku.period,
            'Purchased Quantity': sku.purchased_quantity,
            'Dual Source': sku.dual_source,
            'Formulation Reference': sku.formulation_reference,
            'SKU Created By': sku.created_by,
            'SKU Created Date': sku.created_date,
            
            // Component Information
            'Component Type': component.material_type_display || component.material_type_id || '',
            'Component Code': component.component_code || '',
            'Component Description': component.component_description || '',
            'Component Validity From': component.component_valid_from ? new Date(component.component_valid_from).toLocaleDateString() : '',
            'Component Validity To': component.component_valid_to ? new Date(component.component_valid_to).toLocaleDateString() : '',
            'Component Category': component.component_material_group || '',
            'Component Quantity': component.component_quantity || '',
            'Component Unit of Measure': component.component_uom_display || component.component_uom_id || '',
            'Component Base Quantity': component.component_base_quantity || '',
            'Component Base Unit of Measure': component.component_base_uom_display || component.component_base_uom_id || '',
            'Component %w/w': component.percent_w_w || '',
            'Component Packaging Type': component.component_packaging_type_display || component.component_packaging_type_id || '',
            'Component Packaging Material': component.component_packaging_material || '',
            'Component Unit Weight': component.component_unit_weight || '',
            'Component Weight Unit of Measure': component.weight_unit_measure_display || component.weight_unit_measure_id || '',
            'Component % Post Consumer': component.percent_mechanical_pcr_content || '',
            'Component % Post Industrial': component.percent_mechanical_pir_content || '',
            'Component % Chemical': component.percent_chemical_recycled_content || '',
            'Component % Bio Sourced': component.percent_bio_sourced || '',
            'Component Material Structure': component.material_structure_multimaterials || '',
            'Component Packaging Colour': component.component_packaging_color_opacity || '',
            'Component Packaging Level': component.component_packaging_level_display || component.component_packaging_level_id || '',
            'Component Dimensions': component.component_dimensions || ''
          });
        });

      }
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Style the headers with bold and green color
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: {
            bold: true,
            color: { rgb: '30EA03' } // Green color
          },
          fill: {
            fgColor: { rgb: 'E8F5E8' } // Light green background
          }
        };
      }
    }
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SKUs and Components');
    XLSX.writeFile(workbook, '3pm-detail-skus-components.xlsx');
  };

  // Copy Data modal handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setUploadError('');
      setUploadSuccess('');
    }
  };

  const handleCopyDataUpload = async () => {
    // Validate period selections
    if (!copyFromPeriod) {
      setUploadError('Please select a From Period');
      return;
    }
    
    if (!copyToPeriod) {
      setUploadError('Please select a To Period');
      return;
    }
    
    if (copyFromPeriod === copyToPeriod) {
      setUploadError('From Period and To Period cannot be the same');
      return;
    }

    if (!uploadedFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('cmCode', cmCode || '');
      formData.append('cmDescription', cmDescription);
      formData.append('fromPeriod', copyFromPeriod);
      formData.append('toPeriod', copyToPeriod);

      // Here you would make the API call to upload the file
      // For now, we'll simulate the upload process
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      setUploadSuccess('File uploaded successfully! Data has been copied.');
      setUploadedFile(null);
      
      // Close modal after success
      setTimeout(() => {
        setShowCopyDataModal(false);
        setUploadSuccess('');
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCopyDataModalClose = () => {
    setShowCopyDataModal(false);
    setUploadedFile(null);
    setUploadError('');
    setUploadSuccess('');
    setCopyFromPeriod('');
    setCopyToPeriod('');
  };

  const [materialTypeOptions, setMaterialTypeOptions] = useState<{id: number, item_name: string}[]>([]);

  useEffect(() => {
    const fetchMaterialTypeOptions = async () => {
      try {
        const response = await fetch('http://localhost:3000/component-master-material-type');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setMaterialTypeOptions(result.data);
        } else {
          setMaterialTypeOptions([]);
        }
      } catch (err) {
        setMaterialTypeOptions([]);
      }
    };
    fetchMaterialTypeOptions();
  }, []);



  useEffect(() => {
    if (filteredSkuData.length > 0 && openIndex === 0 && !componentDetails[filteredSkuData[0].sku_code]) {
      fetchComponentDetails(filteredSkuData[0].sku_code);
    }
    // eslint-disable-next-line
  }, [filteredSkuData]);

  // Add this function in your main component:
  // State for component suggestions
  const [componentSuggestions, setComponentSuggestions] = useState<Array<{
    id: number;
    component_code: string;
    periods: string;
    component_description: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Function to fetch component data by component code
  const fetchComponentDataByCode = async (componentCode: string) => {
    if (!componentCode || componentCode.trim() === '') {
      setComponentSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      console.log('Fetching component data for code:', componentCode);
      const response = await fetch(`http://localhost:3000/get-component-code-data?component_code=${encodeURIComponent(componentCode)}`);
      
      if (!response.ok) {
        console.log('No component found for code:', componentCode);
        setComponentSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      const result = await response.json();
      console.log('Component data API response:', result);
      
            if (result.success && result.data && result.data.components_with_evidence && result.data.components_with_evidence.length > 0) {
        const componentsWithEvidence = result.data.components_with_evidence;
        
        if (componentsWithEvidence.length === 1) {
          // Only one component found, auto-populate directly
          const componentData = componentsWithEvidence[0].component_details;
          const evidenceFiles = componentsWithEvidence[0].evidence_files || [];
          console.log('Found single component data:', componentData);
          console.log('Evidence files:', evidenceFiles);
          
          // Populate all fields with the fetched data
          setAddComponentData({
            ...addComponentData,
            componentType: componentData.material_type_id?.toString() || '',
            componentCode: componentData.component_code || '',
            componentDescription: componentData.component_description || '',
            validityFrom: componentData.component_valid_from ? componentData.component_valid_from.split('T')[0] : '',
            validityTo: componentData.component_valid_to ? componentData.component_valid_to.split('T')[0] : '',
            componentCategory: componentData.component_material_group || '',
            componentQuantity: componentData.component_quantity?.toString() || '',
            componentUnitOfMeasure: componentData.component_uom_id?.toString() || '',
            componentBaseQuantity: componentData.component_base_quantity?.toString() || '',
            componentBaseUnitOfMeasure: componentData.component_base_uom_id?.toString() || '',
            wW: componentData.percent_w_w?.toString() || '',
            componentPackagingType: componentData.component_packaging_type_id?.toString() || '',
            componentPackagingMaterial: componentData.component_packaging_material || '',
            componentUnitWeight: componentData.component_unit_weight?.toString() || '',
            componentWeightUnitOfMeasure: componentData.weight_unit_measure_id?.toString() || '',
            percentPostConsumer: componentData.percent_mechanical_pcr_content?.toString() || '',
            percentPostIndustrial: componentData.percent_mechanical_pir_content?.toString() || '',
            percentChemical: componentData.percent_chemical_recycled_content?.toString() || '',
            percentBioSourced: componentData.percent_bio_sourced?.toString() || '',
            materialStructure: componentData.material_structure_multimaterials || '',
            packagingColour: componentData.component_packaging_color_opacity || '',
            packagingLevel: componentData.component_packaging_level_id?.toString() || '',
            componentDimensions: componentData.component_dimensions || '',
            period: addComponentData.period // Keep existing period
          });
          
          // Populate evidence files
          if (evidenceFiles.length > 0) {
            console.log('Processing evidence files:', evidenceFiles);
            
            // Create separate rows for each file with its category
            const newUploadedFiles = evidenceFiles.map((file: any, index: number) => {
              // Get category from API response
              const categoryName = file.category || 'Unknown';
              
              // Map category name to category number for dropdown selection
              let categoryNumber = '1'; // Default
              if (categoryName === 'Weight') {
                categoryNumber = '1';
              } else if (categoryName === 'Packaging Type') {
                categoryNumber = '3';
              } else if (categoryName === 'Material') {
                categoryNumber = '4';
              } else if (categoryName === 'Evidence') {
                categoryNumber = '2';
              }
              
              return {
                id: `file-${file.id || index}`,
                categories: [categoryNumber],
                categoryName: categoryName,
                files: [{
                  name: file.evidence_file_name,
                  url: file.evidence_file_url,
                  size: 0, // We don't have file size in the API
                  type: 'application/octet-stream' // Default type
                }]
              };
            });
            
            setUploadedFiles(newUploadedFiles);
            
            // Pre-select categories in the dropdown
            const selectedCategoryNumbers = newUploadedFiles.map((upload: any) => upload.categories[0]);
            setSelectedCategories(selectedCategoryNumbers);
            
            console.log('Evidence files populated with individual rows:', newUploadedFiles);
            console.log('Pre-selected categories:', selectedCategoryNumbers);
            
            // Populate Packaging Evidence field with files that have "PackagingEvidence" category
            const packagingEvidenceFiles = evidenceFiles.filter((file: any) => 
              file.category === 'PackagingEvidence' || 
              file.category === 'Packaging Type' ||
              file.category === 'Packaging'
            );
            
            if (packagingEvidenceFiles.length > 0) {
              // Convert API files to File objects for the Packaging Evidence field
              const packagingFiles = packagingEvidenceFiles.map((file: any) => {
                // Create a File-like object for the Packaging Evidence field
                return {
                  name: file.evidence_file_name,
                  size: 0,
                  type: 'application/octet-stream',
                  lastModified: new Date().getTime()
                } as File;
              });
              
              setAddComponentData(prev => ({
                ...prev,
                packagingEvidence: packagingFiles
              }));
              
              console.log('Packaging Evidence field populated with files:', packagingFiles);
            }
          }
          
          setComponentSuggestions([]);
          setShowSuggestions(false);
          console.log('All fields populated with component data');
        } else {
          // Multiple components found, show suggestions
          const suggestions = componentsWithEvidence.map((compWithEvidence: any) => {
            const comp = compWithEvidence.component_details;
            // Get the actual period text from years data
            const periodId = comp.periods?.toString() || comp.year?.toString() || '';
            const periodText = years.find(year => year.id === periodId)?.period || periodId;
            
            return {
              id: comp.id,
              component_code: comp.component_code,
              periods: periodText,
              component_description: comp.component_description || ''
            };
          });
          
          setComponentSuggestions(suggestions);
          setShowSuggestions(true);
          console.log('Multiple components found, showing suggestions:', suggestions);
        }
      } else {
        console.log('No component found for code:', componentCode);
        setComponentSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching component data:', error);
      setComponentSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Function to select a component from suggestions
  const selectComponentFromSuggestions = async (componentId: number) => {
    try {
      const response = await fetch(`http://localhost:3000/get-component-code-data?component_code=${encodeURIComponent(addComponentData.componentCode)}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.components_with_evidence) {
          const selectedComponentWithEvidence = result.data.components_with_evidence.find((compWithEvidence: any) => compWithEvidence.component_details.id === componentId);
          
          if (selectedComponentWithEvidence) {
            const selectedComponent = selectedComponentWithEvidence.component_details;
            const evidenceFiles = selectedComponentWithEvidence.evidence_files || [];
            
            // Populate all fields with the selected component data
            setAddComponentData({
              ...addComponentData,
              componentType: selectedComponent.material_type_id?.toString() || '',
              componentCode: selectedComponent.component_code || '',
              componentDescription: selectedComponent.component_description || '',
              validityFrom: selectedComponent.component_valid_from ? selectedComponent.component_valid_from.split('T')[0] : '',
              validityTo: selectedComponent.component_valid_to ? selectedComponent.component_valid_to.split('T')[0] : '',
              componentCategory: selectedComponent.component_material_group || '',
              componentQuantity: selectedComponent.component_quantity?.toString() || '',
              componentUnitOfMeasure: selectedComponent.component_uom_id?.toString() || '',
              componentBaseQuantity: selectedComponent.component_base_quantity?.toString() || '',
              componentBaseUnitOfMeasure: selectedComponent.component_base_uom_id?.toString() || '',
              wW: selectedComponent.percent_w_w?.toString() || '',
              componentPackagingType: selectedComponent.component_packaging_type_id?.toString() || '',
              componentPackagingMaterial: selectedComponent.component_packaging_material || '',
              componentUnitWeight: selectedComponent.component_unit_weight?.toString() || '',
              componentWeightUnitOfMeasure: selectedComponent.weight_unit_measure_id?.toString() || '',
              percentPostConsumer: selectedComponent.percent_mechanical_pcr_content?.toString() || '',
              percentPostIndustrial: selectedComponent.percent_mechanical_pir_content?.toString() || '',
              percentChemical: selectedComponent.percent_chemical_recycled_content?.toString() || '',
              percentBioSourced: selectedComponent.percent_bio_sourced?.toString() || '',
              materialStructure: selectedComponent.material_structure_multimaterials || '',
              packagingColour: selectedComponent.component_packaging_color_opacity || '',
              packagingLevel: selectedComponent.component_packaging_level_id?.toString() || '',
              componentDimensions: selectedComponent.component_dimensions || '',
              period: addComponentData.period // Keep existing period
            });
            
            // Populate evidence files
            if (evidenceFiles.length > 0) {
              console.log('Processing evidence files from selection:', evidenceFiles);
              
              // Create separate rows for each file with its category
              const newUploadedFiles = evidenceFiles.map((file: any, index: number) => {
                // Get category from API response
                const categoryName = file.category || 'Unknown';
                
                // Map category name to category number for dropdown selection
                let categoryNumber = '1'; // Default
                if (categoryName === 'Weight') {
                  categoryNumber = '1';
                } else if (categoryName === 'Packaging Type') {
                  categoryNumber = '3';
                } else if (categoryName === 'Material') {
                  categoryNumber = '4';
                } else if (categoryName === 'Evidence') {
                  categoryNumber = '2';
                }
                
                return {
                  id: `file-${file.id || index}`,
                  categories: [categoryNumber],
                  categoryName: categoryName,
                  files: [{
                    name: file.evidence_file_name,
                    url: file.evidence_file_url,
                    size: 0, // We don't have file size in the API
                    type: 'application/octet-stream' // Default type
                  }]
                };
              });
              
              setUploadedFiles(newUploadedFiles);
              
              // Pre-select categories in the dropdown
              const selectedCategoryNumbers = newUploadedFiles.map((upload: any) => upload.categories[0]);
              setSelectedCategories(selectedCategoryNumbers);
              
              console.log('Evidence files populated with individual rows from selection:', newUploadedFiles);
              console.log('Pre-selected categories from selection:', selectedCategoryNumbers);
              
              // Populate Packaging Evidence field with files that have "PackagingEvidence" category
              const packagingEvidenceFiles = evidenceFiles.filter((file: any) => 
                file.category === 'PackagingEvidence' || 
                file.category === 'Packaging Type' ||
                file.category === 'Packaging'
              );
              
              if (packagingEvidenceFiles.length > 0) {
                // Convert API files to File objects for the Packaging Evidence field
                const packagingFiles = packagingEvidenceFiles.map((file: any) => {
                  // Create a File-like object for the Packaging Evidence field
                  return {
                    name: file.evidence_file_name,
                    size: 0,
                    type: 'application/octet-stream',
                    lastModified: new Date().getTime()
                  } as File;
                });
                
                setAddComponentData(prev => ({
                  ...prev,
                  packagingEvidence: packagingFiles
                }));
                
                console.log('Packaging Evidence field populated with files from selection:', packagingFiles);
              }
            }
            
            setComponentSuggestions([]);
            setShowSuggestions(false);
            console.log('Selected component data populated');
          }
        }
      }
    } catch (error) {
      console.error('Error selecting component:', error);
    }
  };

  const handleComponentStatusChange = async (componentId: number, newStatus: boolean, skuCode?: string) => {
    console.log('🔍 handleComponentStatusChange called with:', { componentId, newStatus, skuCode });
    
    try {
      console.log('📡 Making status change API call...');
      const response = await fetch(`http://localhost:3000/component-status-change/${componentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      });
      
      console.log('📡 Status change API response status:', response.status);
      console.log('📡 Status change API response ok:', response.ok);
      
      if (response.ok) {
        console.log('✅ Status change successful, now logging audit trail...');
        
        // Log audit trail for component status change
        try {
          // Get component data to extract component_code
          const componentData = skuCode && componentDetails[skuCode] 
            ? componentDetails[skuCode].find(comp => comp.id === componentId)
            : null;
          
          const auditData = {
            component_id: componentId, // ✅ Primary key of the component
            sku_code: skuCode || '',
            component_code: componentData?.component_code || '',
            component_description: componentData?.component_description || '',
            year: componentData?.year || '',
            cm_code: cmCode || '',
            periods: componentData?.periods || '',
            material_type_id: Number(componentData?.material_type_id) || 0,
            component_quantity: Number(componentData?.component_quantity) || 0,
            component_uom_id: Number(componentData?.component_uom_id) || 0,
            component_packaging_material: componentData?.component_packaging_material || '',
            component_unit_weight: Number(componentData?.component_unit_weight) || 0,
            weight_unit_measure_id: Number(componentData?.weight_unit_measure_id) || 0,
            percent_mechanical_pcr_content: Number(componentData?.percent_mechanical_pcr_content) || 0,
            percent_bio_sourced: Number(componentData?.percent_bio_sourced) || 0,
            user_id: 1,
            created_by: 1,
            is_active: newStatus
          };
          
          console.log('📝 Audit data being sent:', auditData);
          
          const auditResponse = await fetch('http://localhost:3000/add-component-audit-log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(auditData)
          });
          
          console.log('📝 Audit API response status:', auditResponse.status);
          console.log('📝 Audit API response ok:', auditResponse.ok);
          
          if (auditResponse.ok) {
            const auditResult = await auditResponse.json();
            console.log('✅ Audit log created successfully:', auditResult);
          } else {
            const auditErrorText = await auditResponse.text();
            console.error('❌ Audit API failed with status:', auditResponse.status);
            console.error('❌ Audit API error response:', auditErrorText);
          }
        } catch (auditError) {
          console.error('❌ Failed to log audit trail:', auditError);
          console.error('❌ Audit error details:', {
            message: auditError instanceof Error ? auditError.message : 'Unknown error',
            stack: auditError instanceof Error ? auditError.stack : 'No stack trace'
          });
        }
        
        // Update local state
        if (skuCode) {
          console.log('🔄 Updating local component state...');
          setComponentDetails(prev => ({
            ...prev,
            [skuCode]: prev[skuCode].map(row =>
              row.id === componentId ? { ...row, is_active: newStatus } : row
            )
          }));
          console.log('✅ Local state updated successfully');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Status change API failed with status:', response.status);
        console.error('❌ Status change API error response:', errorText);
        showError('Failed to update status');
      }
    } catch (err) {
      console.error('❌ Network error in handleComponentStatusChange:', err);
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      showError('Failed to update status');
    }
  };

  return (
    <Layout>
      {(loading || !minimumLoaderComplete) && <Loader />}
      <div className="mainInternalPages" style={{ display: (loading || !minimumLoaderComplete) ? 'none' : 'block' }}>
        <div style={{ 
          // marginBottom: 8, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 0'
        }}>
          <div className="commonTitle">
            <div className="icon">
              <i className="ri-file-list-3-fill"></i>
            </div>
            <h1>3PM Detail</h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
              border: 'none',
              color: '#000',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px 16px',
              borderRadius: '8px',
              // boxShadow: '0 2px 8px rgba(48, 234, 3, 0.3)',
              transition: 'all 0.3s ease',
              minWidth: '100px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              // e.currentTarget.style.boxShadow = '0 4px 12px rgba(48, 234, 3, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              // e.currentTarget.style.boxShadow = '0 2px 8px rgba(48, 234, 3, 0.3)';
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: 18, marginRight: 6 }} />
            Back
          </button>
        </div>

        <div className="filters CMDetails">
          <div className="row">
            <div className="col-sm-12 ">
              <ul style={{ display: 'flex', alignItems: 'center', padding: '6px 15px 8px' }}>
                <li><strong>3PM Code: </strong> {cmCode}</li>
                <li> | </li>
                <li><strong>3PM Description: </strong> {cmDescription}</li>
                <li> | </li>
                <li>
                  <strong>Status: </strong>
                  <span style={{
                    display: 'inline-block',
                    marginLeft: 8,
                    padding: '1px 14px',
                    borderRadius: 12,
                    background: status === 'approved' || status === 'Active' ? '#30ea03' : status === 'pending' ? 'purple' : status === 'rejected' || status === 'Deactive' ? '#ccc' : '#ccc',
                    color: status === 'approved' || status === 'Active' ? '#000' : '#fff',
                    fontWeight: 600
                  }}>
                    {status ? (status === 'approved' ? 'Signed' : status.charAt(0).toUpperCase() + status.slice(1)) : 'N/A'}
                  </span>
                </li>
                <li> | </li>
                <li>
                  <strong>Total SKUs: </strong> {skuData.length}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="row"> 
          <div className="col-sm-12">
            <div className="filters">
              <ul>
                <li>
                  <div className="fBold">Period</div>
                  <div className="form-control">
                    <select
                      value={selectedYears.length > 0 ? selectedYears[0] : ''}
                      onChange={(e) => setSelectedYears(e.target.value ? [e.target.value] : [])}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        border: 'none',
                        outline: 'none'
                      }}
                      disabled={years.length === 0}
                    >
                      <option value="">Select Period</option>
                      {years.map((year, index) => (
                        <option key={year.id} value={year.id}>
                          {year.period}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              <li>
  <div className="fBold">SKU Code-Description</div>
  <div className="form-control">
    <MultiSelect 
      options={skuDescriptions
        .filter(desc => desc && typeof desc === 'string' && desc.trim() !== '')
        .map(desc => ({ value: desc, label: desc }))}
      selectedValues={selectedSkuDescriptions}
      onSelectionChange={setSelectedSkuDescriptions}
      placeholder="Select SKU Code-Description..."
      disabled={skuDescriptions.length === 0}
      loading={skuDescriptions.length === 0}
    />
  </div>
</li>
              <li>
  <div className="fBold">Component Code</div>
  <div className="form-control">
    <MultiSelect 
      options={componentCodes
        .filter(code => code && typeof code === 'string' && code.trim() !== '')
        .map(code => ({ value: code, label: code }))}
      selectedValues={selectedComponentCodes}
      onSelectionChange={setSelectedComponentCodes}
      placeholder="Select Component Code..."
      disabled={componentCodes.length === 0}
      loading={componentCodes.length === 0}
    />
  </div>
</li>

                <li>
                  <button className="btnCommon btnGreen filterButtons" onClick={handleSearch} disabled={loading}>
                    <span>Search</span>
                    <i className="ri-search-line"></i>
                  </button>
                </li>
                <li>
                  <button className="btnCommon btnBlack filterButtons" onClick={handleReset} disabled={loading}>
                    <span>Reset</span>
                    <i className="ri-refresh-line"></i>
                  </button>
                </li></ul>
                <ul style={{ justifyContent: 'end', paddingTop: '0', display: 'flex', flexWrap: 'nowrap', gap: '8px' }}>
                  <li style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btnCommon btnGreen filterButtons"
                      style={{ minWidth: 110, fontWeight: 600, marginRight: 0, marginTop: 0, fontSize: '13px', padding: '8px 12px' }}
                      onClick={() => setShowSkuModal(true)}
                    >
                      <span>Add SKU</span> <i className="ri-add-circle-line"></i>
                    </button>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btnCommon btnGreen filterButtons"
                      style={{ minWidth: 110, fontWeight: 600, marginRight: 0, marginTop: 0, fontSize: '13px', padding: '8px 12px' }}
                      onClick={() => setShowCopyDataModal(true)}
                    >
                      <span>Copy Data</span> <i className="ri-file-copy-line"></i>
                    </button>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btnCommon btnGreen filterButtons"
                      style={{ minWidth: 110, fontWeight: 600, marginRight: 0, marginTop: 0, fontSize: '13px', padding: '8px 12px' }}
                      onClick={handleExportToExcel}
                    >
                     <span>Export to Excel</span> <i className="ri-file-excel-2-line"></i>
                    </button>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="btnCommon btnGreen filterButtons" 
                      style={{ 
                        minWidth: 110,
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 600, 
                        marginTop: 0,
                        fontSize: '13px',
                        padding: '8px 12px'
                      }}
                      onClick={() => {
                        navigate(`/sedforapproval?cmCode=${encodeURIComponent(cmCode || '')}&cmDescription=${encodeURIComponent(cmDescription)}`);
                      }}
                    >
                      <i className="ri-file-pdf-2-line" style={{ fontSize: 14, marginRight: '4px' }}></i>
                      <span>Generate PDF</span>
                    </button>
                  </li>
                </ul>
            </div>
          </div>
        </div>
        
        {error ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
            <p>Error loading SKU details: {error}</p>
          </div>
        ) : (
          <div className="panel-group" id="accordion">
            {filteredSkuData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>No SKU data available for this CM Code</p>
              </div>
            ) : (
              <>
                {/* SKU Tabs */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex',
                    borderBottom: '2px solid #e0e0e0',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <button
                      style={{
                        background: activeTab === 'active' ? '#30ea03' : 'transparent',
                        color: activeTab === 'active' ? '#000' : '#666',
                        border: 'none',
                        padding: '12px 24px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        cursor: 'pointer',
                        borderRadius: '4px 4px 0 0',
                        borderBottom: activeTab === 'active' ? '2px solid #30ea03' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => setActiveTab('active')}
                    >
                      Active SKU ({filteredSkuData.filter(sku => sku.is_active).length})
                    </button>
                    <button
                      style={{
                        background: activeTab === 'inactive' ? '#30ea03' : 'transparent',
                        color: activeTab === 'inactive' ? '#000' : '#666',
                        border: 'none',
                        padding: '12px 24px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        cursor: 'pointer',
                        borderRadius: '4px 4px 0 0',
                        borderBottom: activeTab === 'inactive' ? '2px solid #30ea03' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => setActiveTab('inactive')}
                    >
                      Inactive SKU ({filteredSkuData.filter(sku => !sku.is_active).length})
                    </button>
                  </div>
                </div>

                {/* No Data Message for Active Tab */}
                {activeTab === 'active' && filteredSkuData.filter(sku => sku.is_active).length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px', 
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    marginTop: '20px'
                  }}>
                    <i className="ri-inbox-line" style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}></i>
                    <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>No active SKUs available</p>
                  </div>
                )}

                {/* Active SKU Content */}
                {activeTab === 'active' && filteredSkuData.filter(sku => sku.is_active).length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    {filteredSkuData.filter(sku => sku.is_active).map((sku, index) => (
                <div key={sku.id} className="panel panel-default" style={{ marginBottom: 10, borderRadius: 6, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                  <div
                    className="panel-heading panel-title"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', background: '#000', color: '#fff', fontWeight: 600, paddingLeft: 10 }}
                    onClick={() => {
                      setOpenIndex(openIndex === index ? null : index);
                      if (openIndex !== index && !componentDetails[sku.sku_code]) {
                        fetchComponentDetails(sku.sku_code);
                      }
                    }}
                  >
                    <span style={{ marginRight: 12, fontSize: 28 }}>
                      {openIndex === index
                        ? <i className="ri-indeterminate-circle-line"></i>
                        : <i className="ri-add-circle-line"></i>
                      }
                    </span>
                    <span style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                      <strong>{sku.sku_code}</strong> || {sku.sku_description}
                    </span>
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      <button
                        style={{
                          background: sku.is_active ? '#30ea03' : '#ccc',
                          color: sku.is_active ? '#000' : '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontWeight: 'bold',
                          padding: '3px 18px',
                          cursor: 'pointer',
                          marginLeft: 8,
                          minWidth: 90,
                          height: 24,
                          margin: '5px 0',
                          fontSize: 12,
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          handleHeaderStatusClick(sku.id, sku.is_active);
                        }}
                      >
                                                        {sku.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </span>
                  </div>
                  <Collapse isOpened={openIndex === index}>
                    <div className="panel-body" style={{ minHeight: 80, padding: 24, position: 'relative' }}>
                      <div style={{ display: 'flex', marginBottom: 8, gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                        <p><strong>Reference SKU: </strong> {sku.sku_reference}</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button className="add-sku-btn btnCommon btnGreen filterButtons"
                            style={{
                              background: '#30ea03',
                              color: '#000',
                              border: 'none',
                              borderRadius: 6,
                              fontWeight: 'bold',
                              padding: '6px 12px',
                              fontSize: 13,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 110
                            }}
                            title="Edit SKU"
                            onClick={() => {
                              console.log('SKU passed to Edit:', sku);
                              handleEditSkuOpen(sku);
                            }}
                          >
                            <span>Edit SKU</span>
                            <i className="ri-pencil-line" style={{ marginLeft: 5 }}/>
                          </button>
                          <button className="add-sku-btn btnCommon btnGreen filterButtons"
                            style={{
                              background: '#30ea03',
                              color: '#000',
                              border: 'none',
                              borderRadius: 6,
                              fontWeight: 'bold',
                              padding: '6px 12px',
                              fontSize: 13,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 110
                            }}
                            title="Send for Approval"
                            onClick={() => {
                              navigate(`/sedforapproval?cmCode=${encodeURIComponent(cmCode || '')}&cmDescription=${encodeURIComponent(cmDescription)}`);
                            }}
                          >
                            <span>Send for Approval</span>
                            <i className="ri-send-plane-2-line" style={{ marginLeft: 5 }} />
                          </button>
                          <button
                            className="add-sku-btn btnCommon btnGreen filterButtons"
                            style={{ 
                              backgroundColor: '#30ea03', 
                              color: '#000', 
                              minWidth: 110, 
                              fontSize: 13,
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: 6,
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            onClick={e => { e.stopPropagation(); setSelectedSkuCode(sku.sku_code); setShowAddComponentModal(true); }}
                          >
                            <span>Add Component</span>
                            <i className="ri-add-circle-line" style={{ marginLeft: 5 }}></i>
                          </button>
                        </div>
                      </div>
                     
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 600, marginRight: 8 }}>Material Type:</span>
                        <label style={{ display: 'flex', alignItems: 'center', marginRight: 16, cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name={`material-type-${sku.id}`} 
                            value="packaging"
                            checked={selectedMaterialType === 'packaging'}
                            onChange={(e) => setSelectedMaterialType(e.target.value)}
                            style={{ marginRight: 6 }}
                          />
                          <span>Packaging </span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', marginRight: 16, cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name={`material-type-${sku.id}`} 
                            value="raw_material"
                            checked={selectedMaterialType === 'raw_material'}
                            onChange={(e) => setSelectedMaterialType(e.target.value)}
                            style={{ marginRight: 6 }}
                          />
                          <span>Raw Material</span>
                        </label>
                      </div>
                      
                      {/* Component Table Header */}
                      <div style={{ 
                        background: '#f8f9fa', 
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        marginTop: '16px'
                      }}>
                        <div style={{ 
                          padding: '8px 20px', 
                          borderBottom: '1px solid #e9ecef',
                          background: '#000',
                          color: '#fff'
                        }}>
                          <h6 style={{ 
                            fontWeight: '600', 
                            margin: '0',
                            fontSize: '16px'
                          }}>
                            Component Details
                          </h6>
                        </div>
                        
                        <div style={{ padding: '20px' }}>
                          <div className="table-responsive" style={{ overflowX: 'auto' }}>
                            <table style={{ 
                              width: '100%', 
                              borderCollapse: 'collapse',
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6'
                            }}>
                              <thead>
                                <tr style={{ backgroundColor: '#000' }}>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '80px'
                                  }}>
                                    Action
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '120px'
                                  }}>
                                    Active/Deactive
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '120px'
                                  }}>
                                    Component Type
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '120px'
                                  }}>
                                    Component Code
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    Component Description
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '140px'
                                  }}>
                                    Component validity date - From
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '140px'
                                  }}>
                                    Component validity date - To
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '130px'
                                  }}>
                                    Component Category
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '130px'
                                  }}>
                                    Component Quantity
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    Component Unit of Measure
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    Component Base Quantity
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '170px'
                                  }}>
                                    Component Base Unit of Measure
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '80px'
                                  }}>
                                    %w/w
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    Component Packaging Type
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '170px'
                                  }}>
                                    Component Packaging Material
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '130px'
                                  }}>
                                    Component Unit Weight
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '180px'
                                  }}>
                                    Component Weight Unit of Measure
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '200px'
                                  }}>
                                    % Mechanical Post-Consumer Recycled Content (inc. Chemical)
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '200px'
                                  }}>
                                    % Mechanical Post-Industrial Recycled Content
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    % Chemical Recycled Content
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '120px'
                                  }}>
                                    % Bio-sourced?
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '200px'
                                  }}>
                                    Material structure - multimaterials only (with % wt)
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '180px'
                                  }}>
                                    Component packaging colour / opacity
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '150px'
                                  }}>
                                    Component packaging level
                                  </th>
                                  <th style={{ 
                                    padding: '6px 16px', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff',
                                    minWidth: '180px'
                                  }}>
                                    Component dimensions (3D - LxWxH, 2D - LxW)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {componentDetailsLoading[sku.sku_code] ? (
                                  <tr>
                                    <td colSpan={25} style={{ 
                                      padding: '40px 20px', 
                                      textAlign: 'center', 
                                      color: '#666',
                                      fontSize: '14px'
                                    }}>
                                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                      </div>
                                      Loading component details...
                                    </td>
                                  </tr>
                                ) : getFilteredComponents(sku.sku_code) && getFilteredComponents(sku.sku_code).length > 0 ? (
                                  getFilteredComponents(sku.sku_code).map((component: any, compIndex: number) => (
                                    <tr key={component.id || compIndex} style={{ backgroundColor: compIndex % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <button
                                            style={{
                                              background: 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
                                              border: 'none',
                                              color: '#000',
                                              fontSize: '10px',
                                              fontWeight: '600',
                                              cursor: 'pointer',
                                              padding: '2px',
                                              borderRadius: '2px',
                                              width: '18px',
                                              height: '18px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center'
                                            }}
                                            onClick={() => handleEditComponent(component)}
                                            title="Edit Component"
                                          >
                                            <i className="ri-edit-line" />
                                          </button>
                                          <button
                                            style={{
                                              background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                                              border: 'none',
                                              color: '#fff',
                                              fontSize: '10px',
                                              fontWeight: '600',
                                              cursor: 'pointer',
                                              padding: '2px',
                                              borderRadius: '2px',
                                              width: '18px',
                                              height: '18px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center'
                                            }}
                                            onClick={() => handleViewComponentHistory(component)}
                                            title="View Component History"
                                          >
                                            <i className="ri-eye-line" />
                                          </button>
                                        </div>
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                        <input
                                          type="checkbox"
                                          checked={component.is_active || false}
                                                                                          onChange={() => handleComponentStatusClick(component.id, component.is_active, sku.sku_code)}
                                          style={{
                                            width: '18px',
                                            height: '18px',
                                            cursor: 'pointer',
                                            accentColor: '#30ea03'
                                          }}
                                          title={component.is_active ? 'Deactivate Component' : 'Activate Component'}
                                        />
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                        {component.material_type_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                        {component.component_code || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_description || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_valid_from ? new Date(component.component_valid_from).toLocaleDateString() : 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_valid_to ? new Date(component.component_valid_to).toLocaleDateString() : 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_material_group || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_quantity || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_uom_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_base_quantity || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_base_uom_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.percent_w_w || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_packaging_type_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_packaging_material || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_unit_weight || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.weight_unit_measure_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.percent_mechanical_pcr_content || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.percent_mechanical_pir_content || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.percent_chemical_recycled_content || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.percent_bio_sourced || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.material_structure_multimaterials || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_packaging_color_opacity || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                        {component.component_packaging_level_display || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                        {component.component_dimensions || 'N/A'}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={25} style={{ 
                                      padding: '40px 20px', 
                                      textAlign: 'center', 
                                      color: '#666',
                                      fontSize: '14px',
                                      fontStyle: 'italic'
                                    }}>
                                      No component data available
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Collapse>
                </div>
              ))}
                    </div>
                  )}

                  {/* No Data Message for Inactive Tab */}
                  {activeTab === 'inactive' && filteredSkuData.filter(sku => !sku.is_active).length === 0 && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px', 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      marginTop: '20px'
                    }}>
                      <i className="ri-inbox-line" style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }}></i>
                      <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>No inactive SKUs available</p>
                    </div>
                  )}

                  {/* Inactive SKU Content */}
                  {activeTab === 'inactive' && filteredSkuData.filter(sku => !sku.is_active).length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                      {filteredSkuData.filter(sku => !sku.is_active).map((sku, index) => (
                        <div key={sku.id} className="panel panel-default" style={{ marginBottom: 10, borderRadius: 6, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                          <div
                            className="panel-heading panel-title"
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', background: '#000', color: '#fff', fontWeight: 600, paddingLeft: 10 }}
                            onClick={() => {
                              setOpenIndex(openIndex === index ? null : index);
                              if (openIndex !== index && !componentDetails[sku.sku_code]) {
                                fetchComponentDetails(sku.sku_code);
                              }
                            }}
                          >
                            <span style={{ marginRight: 12, fontSize: 28 }}>
                              {openIndex === index
                                ? <i className="ri-indeterminate-circle-line"></i>
                                : <i className="ri-add-circle-line"></i>
                              }
                            </span>
                            <span style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                              <strong>{sku.sku_code}</strong> || {sku.sku_description}
                            </span>
                            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                              <button
                                style={{
                                  background: sku.is_active ? '#30ea03' : '#ccc',
                                  color: sku.is_active ? '#000' : '#666',
                                  border: 'none',
                                  borderRadius: 4,
                                  fontWeight: 'bold',
                                  padding: '3px 18px',
                                  cursor: 'pointer',
                                  marginLeft: 8,
                                  minWidth: 90,
                                  height: 24,
                                  margin: '5px 0px',
                                  fontSize: 12,
                                 
                                }}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!sku.is_active) {
                                    setPendingSkuId(sku.id);
                                    setPendingSkuStatus(sku.is_active);
                                    setShowConfirm(true);
                                  } else {
                                    handleHeaderStatusClick(sku.id, sku.is_active);
                                  }
                                }}
                              >
                                {sku.is_active ? 'Active' : 'Inactive'}
                              </button>
                            </span>
                          </div>
                          <Collapse isOpened={openIndex === index}>
                            <div className="panel-body" style={{ minHeight: 80, padding: 24, position: 'relative' }}>
                              <div style={{ display: 'flex', marginBottom: 8, gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                                <p><strong>Reference SKU: </strong> {sku.sku_reference}</p>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <button
                                    style={{
                                      background: '#30ea03',
                                      color: '#000',
                                      border: 'none',
                                      borderRadius: 6,
                                      fontWeight: 'bold',
                                      padding: '6px 12px',
                                      fontSize: 13,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      minWidth: 110
                                    }}
                                    title="Edit SKU"
                                    onClick={() => {
                                      if (!sku.is_active) {
                                        setShowInactiveModal(true);
                                      } else {
                                        console.log('SKU passed to Edit:', sku);
                                        handleEditSkuOpen(sku);
                                      }
                                    }}
                                  >
                                    <i className="ri-pencil-line" style={{ fontSize: 16, marginRight: 6 }} />
                                    <span>Edit SKU</span>
                                  </button>
                                  <button
                                    style={{
                                      background: '#30ea03',
                                      color: '#000',
                                      border: 'none',
                                      borderRadius: 6,
                                      fontWeight: 'bold',
                                      padding: '6px 12px',
                                      fontSize: 13,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      minWidth: 110
                                    }}
                                    title="Send for Approval"
                                    onClick={() => {
                                      if (!sku.is_active) {
                                        setShowInactiveModal(true);
                                      } else {
                                        navigate(`/sedforapproval?cmCode=${encodeURIComponent(cmCode || '')}&cmDescription=${encodeURIComponent(cmDescription)}`);
                                      }
                                    }}
                                  >
                                    <i className="ri-send-plane-2-line" style={{ fontSize: 16, marginRight: 6 }} />
                                    <span>Send for Approval</span>
                                  </button>
                                  <button
                                    className="add-sku-btn btnCommon btnGreen filterButtons"
                                    style={{ 
                                      backgroundColor: '#30ea03', 
                                      color: '#000', 
                                      minWidth: 110, 
                                      fontSize: 13,
                                      padding: '6px 12px',
                                      border: 'none',
                                      borderRadius: 6,
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    onClick={e => { 
                                      e.stopPropagation(); 
                                      if (!sku.is_active) {
                                        setShowInactiveModal(true);
                                      } else {
                                        setSelectedSkuCode(sku.sku_code); 
                                        setShowAddComponentModal(true);
                                      }
                                    }}
                                  >
                                    <span>Add Component</span>
                                    <i className="ri-add-circle-line" style={{ marginLeft: 5 }}></i>
                                  </button>
                                </div>
                              </div>
                             
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{ fontWeight: 600, marginRight: 8 }}>Material Type:</span>
                                <span style={{ marginRight: 8 }}>Packaging</span>
                                <input type="radio" name={`option-${sku.id}`} value="Option 1" style={{ marginRight: 8 }} />
                                <span style={{ marginRight: 8 }}>Raw Material</span>
                                <input type="radio" name={`option-${sku.id}`} value="Option 2" style={{ marginRight: 8 }} />
                              </div>
                              
                              {/* Component Table Header */}
                              <div style={{ 
                                background: '#f8f9fa', 
                                border: '1px solid #e9ecef',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                marginTop: '16px'
                              }}>
                                <div style={{ 
                                  padding: '8px 20px', 
                                  borderBottom: '1px solid #e9ecef',
                                  background: '#000',
                                  color: '#fff'
                                }}>
                                  <h6 style={{ 
                                    fontWeight: '600', 
                                    margin: '0',
                                    fontSize: '16px'
                                  }}>
                                    Component Details
                                  </h6>
                                </div>
                                
                                <div style={{ padding: '20px' }}>
                                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                                    <table style={{ 
                                      width: '100%', 
                                      borderCollapse: 'collapse',
                                      backgroundColor: '#fff',
                                      border: '1px solid #dee2e6'
                                    }}>
                                      <thead>
                                        <tr style={{ backgroundColor: '#000' }}>
                                          <th style={{ 
                                            padding: '8px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '80px'
                                          }}>
                                            Action
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '120px'
                                          }}>
                                            Active/Deactive
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '120px'
                                          }}>
                                            Component Type
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '120px'
                                          }}>
                                            Component Code
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            Component Description
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '140px'
                                          }}>
                                            Component validity date - From
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '140px'
                                          }}>
                                            Component validity date - To
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '130px'
                                          }}>
                                            Component Category
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '130px'
                                          }}>
                                            Component Quantity
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            Component Unit of Measure
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            Component Base Quantity
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '170px'
                                          }}>
                                            Component Base Unit of Measure
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '80px'
                                          }}>
                                            %w/w
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            Component Packaging Type
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '170px'
                                          }}>
                                            Component Packaging Material
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '130px'
                                          }}>
                                            Component Unit Weight
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '180px'
                                          }}>
                                            Component Weight Unit of Measure
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '200px'
                                          }}>
                                            % Mechanical Post-Consumer Recycled Content (inc. Chemical)
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '200px'
                                          }}>
                                            % Mechanical Post-Industrial Recycled Content
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            % Chemical Recycled Content
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '120px'
                                          }}>
                                            % Bio-sourced?
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '200px'
                                          }}>
                                            Material structure - multimaterials only (with % wt)
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '180px'
                                          }}>
                                            Component packaging colour / opacity
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '150px'
                                          }}>
                                            Component packaging level
                                          </th>
                                          <th style={{ 
                                            padding: '12px 16px', 
                                            fontSize: '13px', 
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e9ecef',
                                            color: '#fff',
                                            minWidth: '180px'
                                          }}>
                                            Component dimensions (3D - LxWxH, 2D - LxW)
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {!componentDetails[sku.sku_code] ? (
                                          <tr>
                                            <td colSpan={25} style={{ 
                                              padding: '40px 20px', 
                                              textAlign: 'center', 
                                              color: '#666',
                                              fontSize: '14px'
                                            }}>
                                              <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                              </div>
                                              Loading component details...
                                            </td>
                                          </tr>
                                        ) : getFilteredComponents(sku.sku_code) && getFilteredComponents(sku.sku_code).length > 0 ? (
                                          getFilteredComponents(sku.sku_code).map((component: any, compIndex: number) => (
                                            <tr key={component.id || compIndex} style={{ backgroundColor: compIndex % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                  <button
                                                    style={{
                                                      background: 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
                                                      border: 'none',
                                                      color: '#000',
                                                      fontSize: '10px',
                                                      fontWeight: '600',
                                                      cursor: 'pointer',
                                                      padding: '2px',
                                                      borderRadius: '2px',
                                                      width: '18px',
                                                      height: '18px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center'
                                                    }}
                                                    onClick={() => handleEditComponent(component)}
                                                    title="Edit Component"
                                                  >
                                                    <i className="ri-edit-line" />
                                                  </button>
                                                  <button
                                                    style={{
                                                      background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                                                      border: 'none',
                                                      color: '#fff',
                                                      fontSize: '10px',
                                                      fontWeight: '600',
                                                      cursor: 'pointer',
                                                      padding: '2px',
                                                      borderRadius: '2px',
                                                      width: '18px',
                                                      height: '18px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center'
                                                    }}
                                                    onClick={() => {/* Add view functionality */}}
                                                    title="View Component"
                                                  >
                                                    <i className="ri-eye-line" />
                                                  </button>
                                                </div>
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={component.is_active || false}
                                                  onChange={() => handleComponentStatusClick(component.id, component.is_active, sku.sku_code)}
                                                  style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer',
                                                    accentColor: '#30ea03'
                                                  }}
                                                  title={component.is_active ? 'Deactivate Component' : 'Activate Component'}
                                                />
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                                {component.material_type_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                                {component.component_code || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_description || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_valid_from ? new Date(component.component_valid_from).toLocaleDateString() : 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_valid_to ? new Date(component.component_valid_to).toLocaleDateString() : 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_material_group || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_quantity || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_uom_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_base_quantity || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_base_uom_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.percent_w_w || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_packaging_type_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_packaging_material || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_unit_weight || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.weight_unit_measure_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.percent_mechanical_pcr_content || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.percent_mechanical_pir_content || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.percent_chemical_recycled_content || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.percent_bio_sourced || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.material_structure_multimaterials || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_packaging_color_opacity || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef' }}>
                                                {component.component_packaging_level_display || 'N/A'}
                                              </td>
                                              <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef' }}>
                                                {component.component_dimensions || 'N/A'}
                                              </td>
                                            </tr>
                                          ))
                                        ) : (
                                          <tr>
                                            <td colSpan={25} style={{ 
                                              padding: '40px 20px', 
                                              textAlign: 'center', 
                                              color: '#666',
                                              fontSize: '14px',
                                              fontStyle: 'italic'
                                            }}>
                                              No component data available
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Collapse>
                        </div>
                      ))}
                    </div>
                  )}
                </>
            )}
          </div>
        )}
      </div>

      {/* SKU Modal */}
      {showSkuModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: 'rgb(48, 234, 3)', color: '#000', borderBottom: '2px solid #000', alignItems: 'center' }}>
                <h5 className="modal-title" style={{ color: '#000', fontWeight: 700, flex: 1 }}>Add SKU Details</h5>
                {/* Only one close button, styled black, large, right-aligned */}
                <button
                  type="button"
                  onClick={() => setShowSkuModal(false)}
                  aria-label="Close"
                  style={{
                    background: '#000',
                    border: 'none',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: 'pointer',
                    marginLeft: 8,
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    marginRight: 20,
                  }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body" style={{ background: '#fff' }}>
                <div className="container-fluid">
                  <div className="row g-3">
                    {/* Period dropdown */}
                    <div className="col-md-6">
                      <label>Period <span style={{ color: 'red' }}>*</span></label>
                      <select
                        className={`form-control${addSkuErrors.period ? ' is-invalid' : ''}`}
                        value={addSkuPeriod}
                        onChange={e => setAddSkuPeriod(e.target.value)}
                        disabled={addSkuLoading}
                      >
                        <option value="">Select Period</option>
                        {years.map(year => (
                          <option key={year.id} value={year.id}>{year.period}</option>
                        ))}
                      </select>
                      {addSkuErrors.period && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.period}</div>}
                    </div>
                    {/* SKU text field */}
                    <div className="col-md-6">
                      <label>SKU <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className={`form-control${addSkuErrors.sku ? ' is-invalid' : ''}`}
                        value={addSku}
                        onChange={e => setAddSku(e.target.value)}
                        disabled={addSkuLoading}
                      />
                      {addSkuErrors.sku && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.sku}</div>}
                    </div>
                    {/* SKU Description text field */}
                    <div className="col-md-6">
                      <label>SKU Description <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className={`form-control${addSkuErrors.skuDescription ? ' is-invalid' : ''}`}
                        value={addSkuDescription}
                        onChange={e => setAddSkuDescription(e.target.value)}
                        disabled={addSkuLoading}
                      />
                      {addSkuErrors.skuDescription && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.skuDescription}</div>}
                    </div>
                    {/* SKU Type radio buttons */}
                    <div className="col-md-6">
                      <label>SKU Type <span style={{ color: 'red' }}>*</span></label>
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 0 }}>
                            <input
                              type="radio"
                              name="skuType"
                              value="internal"
                              checked={addSkuType === 'internal'}
                              onChange={e => setAddSkuType(e.target.value)}
                              disabled={addSkuLoading}
                              style={{ marginRight: '8px' }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>Internal</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 0 }}>
                            <input
                              type="radio"
                              name="skuType"
                              value="external"
                              checked={addSkuType === 'external'}
                              onChange={e => setAddSkuType(e.target.value)}
                              disabled={addSkuLoading}
                              style={{ marginRight: '8px' }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>External</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    {/* SKU Reference text field */}
                    <div className="col-md-6">
                      <label>SKU Reference</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addSkuReference}
                        onChange={e => setAddSkuReference(e.target.value)}
                        placeholder="Enter SKU Reference"
                        disabled={addSkuLoading}
                      />
                    </div>
                    {/* Purchased Quantity text field - Hidden for now, may be used later */}
                    {/* <div className="col-md-6">
                      <label>Purchased Quantity <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className={`form-control${addSkuErrors.qty ? ' is-invalid' : ''}`}
                        value={addSkuQty}
                        onChange={e => setAddSkuQty(e.target.value)}
                        disabled={addSkuLoading}
                      />
                      {addSkuErrors.qty && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.qty}</div>}
                    </div> */}
                  </div>
                  {addSkuErrors.server && <div style={{ color: 'red', marginTop: 16, fontWeight: 600 }}>{addSkuErrors.server}</div>}
                  {addSkuSuccess && <div style={{ color: '#30ea03', marginTop: 16, fontWeight: 600 }}>{addSkuSuccess}</div>}
                </div>
              </div>
              {/* Professional footer, white bg, black top border, Save button right-aligned */}
              <div className="modal-footer" style={{ background: '#fff', borderTop: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                {/* Mandatory fields note - positioned as shown in image */}
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '12px 16px', 
                  borderRadius: '6px', 
                  border: '1px solid #e9ecef',
                  fontSize: '14px',
                  color: '#495057',
                  marginLeft: '0',
                  flex: '0 0 auto'
                }}>
                  <i className="ri-information-line" style={{ marginRight: 8, color: '#30ea03' }} />
                  <strong>Note:</strong> Fields marked with <span style={{ color: 'red', fontWeight: 'bold' }}>*</span> are mandatory.
                </div>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: 'rgb(48, 234, 3)', border: 'none', color: '#000', minWidth: 100, fontWeight: 600 }}
                  onClick={handleAddSkuSave}
                  disabled={addSkuLoading}
                  onMouseOver={e => e.currentTarget.style.color = '#fff'}
                  onMouseOut={e => e.currentTarget.style.color = '#000'}
                >
                  {addSkuLoading ? 'Saving...' : 'Save'}

                  
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditSkuModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: 'rgb(48, 234, 3)', color: '#000', borderBottom: '2px solid #000', alignItems: 'center' }}>
                <h5 className="modal-title" style={{ color: '#000', fontWeight: 700, flex: 1 }}>Edit SKU Details</h5>
                <button
                  type="button"
                  onClick={() => setShowEditSkuModal(false)}
                  aria-label="Close"
                  style={{
                    background: '#000',
                    border: 'none',
                    color: '#fff',
                    fontSize: 32,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: 'pointer',
                    marginLeft: 8,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body" style={{ background: '#fff' }}>
                <div className="container-fluid">
                  {/* Mandatory fields note */}
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '12px 16px', 
                    borderRadius: '6px', 
                    marginBottom: '20px',
                    border: '1px solid #e9ecef',
                    fontSize: '14px',
                    color: '#495057'
                  }}>
                    <i className="ri-information-line" style={{ marginRight: 8, color: '#30ea03' }} />
                    <strong>Note:</strong> Fields marked with <span style={{ color: 'red', fontWeight: 'bold' }}>*</span> are mandatory.
                  </div>
                  <div className="row g-3">
                    {/* Period */}
                    <div className="col-md-6">
                      <label>Period <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.period}
                        readOnly
                        style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                      />
                    </div>
                    {/* SKU */}
                    <div className="col-md-6">
                      <label>SKU <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.sku}
                        readOnly
                        style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                      />
                    </div>
                    {/* SKU Description */}
                    <div className="col-md-6">
                      <label>SKU Description <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.skuDescription}
                        readOnly
                        style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                      />
                    </div>
                    {/* Purchased Quantity text field - Hidden for now, may be used later */}
                    {/* <div className="col-md-6">
                      <label>Purchased Quantity <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className={`form-control${editSkuErrors.qty ? ' is-invalid' : ''}`}
                        value={editSkuData.qty}
                        onChange={e => setEditSkuData({ ...editSkuData, qty: e.target.value })}
                        placeholder="Enter Purchased Quantity"
                        disabled={editSkuLoading}
                      />
                      {editSkuErrors.qty && <div className="invalid-feedback" style={{ color: 'red' }}>{editSkuErrors.qty}</div>}
                    </div> */}
                    {/* Dual-source SKU text field (optional) */}
                    <div className="col-md-6">
                      <label>Dual-source SKU</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.dualSource}
                        onChange={e => setEditSkuData({ ...editSkuData, dualSource: e.target.value })}
                        placeholder="Enter Dual-source SKU"
                        disabled={editSkuLoading}
                      />
                    </div>
                    {/* SKU Reference searchable box (optional) */}
                    <div className="col-md-6">
                      <label>SKU Reference</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.skuReference}
                        onChange={e => setEditSkuData({ ...editSkuData, skuReference: e.target.value })}
                        placeholder="Enter SKU Reference"
                        disabled={editSkuLoading}
                      />
                    </div>

                  </div>
                  {editSkuErrors.server && <div style={{ color: 'red', marginTop: 16, fontWeight: 600 }}>{editSkuErrors.server}</div>}
                  {editSkuSuccess && <div style={{ color: '#30ea03', marginTop: 16, fontWeight: 600 }}>{editSkuSuccess}</div>}
                </div>
              </div>
              <div className="modal-footer" style={{ background: '#fff', borderTop: '2px solid #000', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: 'rgb(48, 234, 3)', border: 'none', color: '#000', minWidth: 100, fontWeight: 600 }}
                  onClick={handleEditSkuUpdate}
                  disabled={editSkuLoading}
                >
                  {editSkuLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddComponentModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content" style={{ 
              borderRadius: '12px', 
              border: 'none',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <div className="modal-header" style={{ 
                backgroundColor: '#30ea03', 
                color: '#000', 
                borderBottom: '2px solid #000', 
                alignItems: 'center',
                padding: '20px 30px',
                borderRadius: '12px 12px 0 0'
              }}>
                <h5 className="modal-title" style={{ 
                  color: '#000', 
                  fontWeight: 700, 
                  flex: 1,
                  fontSize: '20px',
                  margin: 0,
                marginLeft: '20px',
                }}>
                  <i className="ri-add-circle-line" style={{ marginRight: '10px', fontSize: '22px' }} />
                  Add Component
                </h5>
                                  <button
                    type="button"
                    onClick={() => setShowAddComponentModal(false)}
                    aria-label="Close"
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#000', 
                      fontSize: 28, 
                      fontWeight: 900, 
                      lineHeight: 1, 
                      cursor: 'pointer', 
                      marginLeft: 8,
                      padding: '0',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%'
                    }}
                  >
                    &times;
                  </button>
              </div>
              <div className="modal-body" style={{ 
                background: '#fff',
                padding: '30px'
              }}>
                <div className="container-fluid" style={{ padding: 0 }}>
                  {/* Mandatory fields note */}
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '12px 16px', 
                    borderRadius: '6px', 
                    marginBottom: '20px',
                    border: '1px solid #e9ecef',
                    fontSize: '14px',
                    color: '#495057'
                  }}>
                    <i className="ri-information-line" style={{ marginRight: 8, color: '#30ea03' }} />
                    <strong>Note:</strong> Fields marked with <span style={{ color: 'red', fontWeight: 'bold' }}>*</span> are mandatory.
                  </div>
                  <div className="row g-4">
                    {/* Component Type (Drop-down list) */}
                    <div className="col-md-6">
                      <label style={{ 
                        fontWeight: '600', 
                        color: '#333', 
                        marginBottom: '8px',
                        display: 'block',
                        fontSize: '14px'
                      }}>
                        Component Type <span style={{ color: 'red' }}>*</span> <InfoIcon info="Please select either Packaging or Raw Material for each SKU component" />
                      </label>
                      <select
                        className="form-control select-with-icon"
                        value={addComponentData.componentType}
                        onChange={e => setAddComponentData({ ...addComponentData, componentType: e.target.value })}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: '#fff',
                          transition: 'border-color 0.3s ease'
                        }}
                      >
                        <option value="">Select Type</option>
                        {materialTypeOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                        ))}
                      </select>
                      {addComponentErrors.componentType && <div style={{ color: 'red', fontSize: 13, marginTop: '4px' }}>{addComponentErrors.componentType}</div>}
                    </div>
                    {/* Component Code (Free text) */}
                    <div className="col-md-6" style={{ position: 'relative' }}>
                      <label>Component Code <span style={{ color: 'red' }}>*</span> <InfoIcon info="Enter the unique code for this component." /></label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={addComponentData.componentCode} 
                        onChange={e => {
                          setAddComponentData({ ...addComponentData, componentCode: e.target.value });
                          // Show suggestions while typing
                          if (e.target.value.trim() !== '') {
                            fetchComponentDataByCode(e.target.value);
                          } else {
                            setComponentSuggestions([]);
                            setShowSuggestions(false);
                          }
                        }}
                        placeholder="Enter component code to auto-fill fields"
                      />
                      {addComponentErrors.componentCode && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentCode}</div>}
                      
                      {/* Component Suggestions Dropdown */}
                      {showSuggestions && componentSuggestions.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {componentSuggestions.map((suggestion) => (
                            <div
                              key={suggestion.id}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f1f3f4',
                                fontSize: '14px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                              }}
                              onClick={() => selectComponentFromSuggestions(suggestion.id)}
                            >
                              <div style={{ fontWeight: '600', color: '#495057' }}>
                                {suggestion.component_code}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                Period: {suggestion.periods} | {suggestion.component_description}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Component Description (Free text) */}
                    <div className="col-md-6">
                      <label>Component Description <span style={{ color: 'red' }}>*</span> <InfoIcon info="Describe the component in detail." /></label>
                      <input type="text" className="form-control" value={addComponentData.componentDescription} onChange={e => setAddComponentData({ ...addComponentData, componentDescription: e.target.value })} />
                      {addComponentErrors.componentDescription && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentDescription}</div>}
                    </div>
                    {/* Component validity date - From (Date) */}
                    <div className="col-md-6">
                      <label>Component validity date - From <InfoIcon info="Select the start date for this component's validity." /></label>
                      <input type="date" className="form-control" value={addComponentData.validityFrom} onChange={e => setAddComponentData({ ...addComponentData, validityFrom: e.target.value })} />
                      {addComponentErrors.validityFrom && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.validityFrom}</div>}
                    </div>
                    {/* Component validity date - To (Date) */}
                    <div className="col-md-6">
                      <label>Component validity date - To <InfoIcon info="Select the end date for this component's validity." /></label>
                      <input type="date" className="form-control" value={addComponentData.validityTo} onChange={e => setAddComponentData({ ...addComponentData, validityTo: e.target.value })} />
                      {addComponentErrors.validityTo && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.validityTo}</div>}
                    </div>
                    {/* Component Category (Input field) */}
                    <div className="col-md-6">
                      <label>Component Category <InfoIcon info="Enter the category for this component." /></label>
                      <input
                        type="text"
                        className="form-control"
                        value={addComponentData.componentCategory}
                        onChange={e => setAddComponentData({ ...addComponentData, componentCategory: e.target.value })}
                        placeholder="Enter Component Category"
                      />
                      {addComponentErrors.componentCategory && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentCategory}</div>}
                    </div>
                    {/* Component Quantity (Numeric) */}
                    <div className="col-md-6">
                      <label>Component Quantity <span style={{ color: 'red' }}>*</span> <InfoIcon info="Enter the quantity of this component used." /></label>
                      <input type="number" className="form-control" value={addComponentData.componentQuantity} onChange={e => setAddComponentData({ ...addComponentData, componentQuantity: e.target.value })} />
                      {addComponentErrors.componentQuantity && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentQuantity}</div>}
                    </div>
                    {/* Component Unit of Measure (Drop-down list) */}
                    <div className="col-md-6">
                      <label>Component Unit of Measure <span style={{ color: 'red' }}>*</span> <InfoIcon info="Select the unit of measure for the component quantity (e.g., PCS, KG)." /></label>
                      <select
                        className="form-control select-with-icon"
                        value={addComponentData.componentUnitOfMeasure}
                        onChange={e => setAddComponentData({ ...addComponentData, componentUnitOfMeasure: e.target.value })}
                      >
                        <option value="">Select UoM</option>
                        {unitOfMeasureOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                        ))}
                      </select>
                      {addComponentErrors.componentUnitOfMeasure && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentUnitOfMeasure}</div>}
                    </div>
                    {/* Component Base Quantity (Numeric) */}
                    <div className="col-md-6">
                      <label>Component Base Quantity <InfoIcon info="Enter the base quantity for this component (reference amount)." /></label>
                      <input type="number" className="form-control" value={addComponentData.componentBaseQuantity} onChange={e => setAddComponentData({ ...addComponentData, componentBaseQuantity: e.target.value })} />
                      {addComponentErrors.componentBaseQuantity && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentBaseQuantity}</div>}
                    </div>
                    {/* Component Base Unit of Measure (Default to Each) */}
                    <div className="col-md-6">
                      <label>Component Base Unit of Measure <InfoIcon info="Specify the unit for the base quantity (e.g., Each, PCS)." /></label>
                      <input type="text" className="form-control" value={addComponentData.componentBaseUnitOfMeasure} onChange={e => setAddComponentData({ ...addComponentData, componentBaseUnitOfMeasure: e.target.value })} placeholder="Each" />
                      {addComponentErrors.componentBaseUnitOfMeasure && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentBaseUnitOfMeasure}</div>}
                    </div>
                    {/* %w/w (Percentage) */}
                    <div className="col-md-6">
                      <label>%w/w <InfoIcon info="Enter the percentage by weight/weight for this component." /></label>
                      <input type="number" className="form-control" value={addComponentData.wW} onChange={e => setAddComponentData({ ...addComponentData, wW: e.target.value })} placeholder="Percentage" />
                      {addComponentErrors.wW && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.wW}</div>}
                    </div>
                    {/* Component Packaging Type (Drop-down list) */}
                    <div className="col-md-6">
                      <label>Component Packaging Type <InfoIcon info="Select the type of packaging for this component." /></label>
                      <select 
                        className="form-control select-with-icon"
                        value={addComponentData.componentPackagingType}
                        onChange={e => setAddComponentData({ ...addComponentData, componentPackagingType: e.target.value })}
                      >
                        <option value="">Select Packaging Type</option>
                        {packagingMaterialOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.item_name}
                          </option>
                        ))}
                      </select>
                      {addComponentErrors.componentPackagingType && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentPackagingType}</div>}
                    </div>
                    {/* Component Packaging Material (Drop-down list) */}
                    <div className="col-md-6">
                      <label>Component Packaging Material <InfoIcon info="Select the material used for packaging this component." /></label>
                      <select
                        className="form-control select-with-icon"
                        value={addComponentData.componentPackagingMaterial}
                        onChange={e => setAddComponentData({ ...addComponentData, componentPackagingMaterial: e.target.value })}
                      >
                        <option value="">Select Packaging Material</option>
                        {packagingMaterialOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                        ))}
                      </select>
                      {addComponentErrors.componentPackagingMaterial && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentPackagingMaterial}</div>}
                    </div>
                    {/* Component Unit Weight (Numeric) */}
                    <div className="col-md-6">
                      <label>Component Unit Weight <InfoIcon info="Enter the weight of a single unit of this component." /></label>
                      <input type="number" className="form-control" value={addComponentData.componentUnitWeight} onChange={e => setAddComponentData({ ...addComponentData, componentUnitWeight: e.target.value })} />
                      {addComponentErrors.componentUnitWeight && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentUnitWeight}</div>}
                    </div>
                    {/* Component Weight Unit of Measure (Drop-down list) */}
                    <div className="col-md-6">
                      <label>Component Weight Unit of Measure <InfoIcon info="Select the unit of measure for the component's weight (e.g., g, kg)." /></label>
                      <select
                        className={`form-control select-with-icon${addComponentErrors.componentWeightUnitOfMeasure ? ' is-invalid' : ''}`}
                        value={addComponentData.componentWeightUnitOfMeasure}
                        onChange={e => setAddComponentData({ ...addComponentData, componentWeightUnitOfMeasure: e.target.value })}
                      >
                        <option value="">Select Weight UoM</option>
                        {unitOfMeasureOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                        ))}
                      </select>
                      {addComponentErrors.componentWeightUnitOfMeasure && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentWeightUnitOfMeasure}</div>}
                    </div>
                    {/* % Mechanical Post-Consumer Recycled Content (inc. Chemical) (Percentage) */}
                    <div className="col-md-6">
                      <label>% Mechanical Post-Consumer Recycled Content (inc. Chemical) <InfoIcon info="Enter the percentage of post-consumer recycled content, including chemical recycling." /></label>
                      <input type="number" className="form-control" value={addComponentData.percentPostConsumer} onChange={e => setAddComponentData({ ...addComponentData, percentPostConsumer: e.target.value })} placeholder="Percentage" />
                      {addComponentErrors.percentPostConsumer && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.percentPostConsumer}</div>}
                    </div>
                    {/* % Mechanical Post-Industrial Recycled Content (Percentage) */}
                    <div className="col-md-6">
                      <label>% Mechanical Post-Industrial Recycled Content <InfoIcon info="Enter the percentage of post-industrial recycled content." /></label>
                      <input type="number" className="form-control" value={addComponentData.percentPostIndustrial} onChange={e => setAddComponentData({ ...addComponentData, percentPostIndustrial: e.target.value })} placeholder="Percentage" />
                      {addComponentErrors.percentPostIndustrial && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.percentPostIndustrial}</div>}
                    </div>
                    {/* % Chemical Recycled Content (Percentage) */}
                    <div className="col-md-6">
                      <label>% Chemical Recycled Content <InfoIcon info="Enter the percentage of chemically recycled content." /></label>
                      <input type="number" className="form-control" value={addComponentData.percentChemical} onChange={e => setAddComponentData({ ...addComponentData, percentChemical: e.target.value })} placeholder="Percentage" />
                      {addComponentErrors.percentChemical && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.percentChemical}</div>}
                    </div>
                    {/* % Bio-sourced? (Percentage) */}
                    <div className="col-md-6">
                      <label>% Bio-sourced? <InfoIcon info="Enter the percentage of bio-sourced material in this component." /></label>
                      <input type="number" className="form-control" value={addComponentData.percentBioSourced} onChange={e => setAddComponentData({ ...addComponentData, percentBioSourced: e.target.value })} placeholder="Percentage" />
                      {addComponentErrors.percentBioSourced && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.percentBioSourced}</div>}
                    </div>
                    {/* Material structure - multimaterials only (with % wt) (Free text) */}
                    <div className="col-md-6">
                      <label>Material structure - multimaterials only (with % wt) <InfoIcon info="Describe the material structure, including percentages by weight if multimaterial." /></label>
                      <input type="text" className="form-control" value={addComponentData.materialStructure} onChange={e => setAddComponentData({ ...addComponentData, materialStructure: e.target.value })} />
                      {addComponentErrors.materialStructure && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.materialStructure}</div>}
                    </div>
                    {/* Component packaging colour / opacity (Free text) */}
                    <div className="col-md-6">
                      <label>Component packaging colour / opacity <InfoIcon info="Specify the color or opacity of the packaging." /></label>
                      <input type="text" className="form-control" value={addComponentData.packagingColour} onChange={e => setAddComponentData({ ...addComponentData, packagingColour: e.target.value })} />
                      {addComponentErrors.packagingColour && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.packagingColour}</div>}
                    </div>
                    {/* Component packaging level (Drop-down list) */}
                    <div className="col-md-6">
                      <label>Component packaging level <InfoIcon info="Select the packaging level for this component (e.g., primary, secondary)." /></label>
                      <select
                        className="form-control select-with-icon"
                        value={addComponentData.packagingLevel}
                        onChange={e => setAddComponentData({ ...addComponentData, packagingLevel: e.target.value })}
                      >
                        <option value="">Select Packaging Level</option>
                        {packagingLevelOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.item_name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Component dimensions (3D - LxWxH, 2D - LxW) (Free text) */}
                    <div className="col-md-6">
                      <label>Component dimensions (3D - LxWxH, 2D - LxW) <InfoIcon info="Enter the dimensions of the component (e.g., 10x5x2 cm)." /></label>
                      <input type="text" className="form-control" value={addComponentData.componentDimensions} onChange={e => setAddComponentData({ ...addComponentData, componentDimensions: e.target.value, packagingEvidence: addComponentData.packagingEvidence })} />
                      {addComponentErrors.componentDimensions && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentDimensions}</div>}
                    </div>
                    
                    {/* Evidence of % of chemical recycled or bio-source */}
                    <div className="col-md-6">
                      <label>Evidence of % of chemical recycled or bio-source <InfoIcon info="Upload files as evidence for chemical recycled or bio-source content (optional)." /></label>
                      <input 
                        type="file" 
                        multiple
                        className="form-control" 
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setAddComponentData({ 
                            ...addComponentData, 
                            packagingEvidence: files,
                            componentDimensions: addComponentData.componentDimensions 
                          });
                        }}
                        style={{ 
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                      {addComponentData.packagingEvidence.length > 0 && (
                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                          Selected files: {addComponentData.packagingEvidence.map(file => file.name).join(', ')}
                        </div>
                      )}
                    </div>
                    
                    {/* Category Selection and File Upload Section */}
                    <div className="col-12">
                      <div style={{ 
                        background: '#f8f9fa', 
                        padding: '24px', 
                        borderRadius: '8px', 
                        border: '1px solid #e9ecef',
                        marginTop: '16px'
                      }}>
                        <h6 style={{ 
                          fontWeight: '600', 
                          color: '#333', 
                          marginBottom: '20px',
                          fontSize: '16px'
                        }}>
                        Packaging Specification Evidence
                        </h6>
                        
                        {/* CH Pack Input Field */}
                        <div className="row" style={{ marginBottom: '20px' }}>
                          <div className="col-md-6">
                            <label style={{ 
                              fontWeight: '600', 
                              color: '#333', 
                              marginBottom: '8px',
                              display: 'block',
                              fontSize: '14px'
                            }}>
                              CH Pack <InfoIcon info="Enter the CH Pack value for this component." />
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={chPackValue}
                              onChange={e => setChPackValue(e.target.value)}
                              placeholder="Enter CH Pack value"
                              style={{
                                padding: '12px 16px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '14px',
                                backgroundColor: '#fff',
                                transition: 'border-color 0.3s ease'
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="row">
                          <div className="col-md-6">
                            <label style={{ 
                              fontWeight: '600', 
                              color: '#333', 
                              marginBottom: '8px',
                              display: 'block'
                            }}>
                              KPIS for Evidence Mapping<InfoIcon info="Choose one or more categories for file upload." />
                            </label>
                            <MultiSelect
                              options={[
                                { value: '1', label: 'Weight' },
                                { value: '2', label: 'Weight UoM' },
                                { value: '3', label: 'Packaging Type' },
                                { value: '4', label: 'Material Type' }
                              ]}
                              selectedValues={selectedCategories}
                              onSelectionChange={(categories) => {
                                setSelectedCategories(categories);
                                setCategoryError(''); // Clear error when categories change
                              }}
                              placeholder="Select Categories..."
                            />
                            {categoryError && (
                              <div style={{
                                color: '#dc3545',
                                fontSize: '13px',
                                marginTop: '8px',
                                padding: '8px 12px',
                                backgroundColor: '#f8d7da',
                                border: '1px solid #f5c6cb',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <i className="ri-error-warning-line" style={{ fontSize: '14px' }} />
                                {categoryError}
                              </div>
                            )}
                          </div>
                          
                          <div className="col-md-6">
                            <label style={{ 
                              fontWeight: '600', 
                              color: '#333', 
                              marginBottom: '8px',
                              display: 'block'
                            }}>
                              Browse Files <InfoIcon info="Select files to upload for the selected categories." />
                            </label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                              <input
                                type="file"
                                multiple
                                className="form-control"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  setSelectedFiles(files);
                                  setCategoryError(''); // Clear error when files change
                                }}
                                style={{ 
                                  flex: 1,
                                  padding: '10px 12px',
                                  border: '1px solid #ddd',
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}
                              />
                              <button
                                type="button"
                                className="btn"
                                style={{
                                  backgroundColor: '#30ea03',
                                  border: 'none',
                                  color: '#000',
                                  fontWeight: '600',
                                  padding: '10px 20px',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap',
                                  fontSize: '14px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  if (selectedCategories.length > 0 && selectedFiles.length > 0) {
                                    // Check if any selected categories are already assigned to other files
                                    const alreadyAssignedCategories = selectedCategories.filter(category => 
                                      uploadedFiles.some(upload => 
                                        upload.categories.includes(category)
                                      )
                                    );

                                    if (alreadyAssignedCategories.length > 0) {
                                      const categoryNames = alreadyAssignedCategories.map(cat => `Category ${cat}`).join(', ');
                                      setCategoryError(`${categoryNames} ${alreadyAssignedCategories.length === 1 ? 'is' : 'are'} already assigned to another file. Please remove ${alreadyAssignedCategories.length === 1 ? 'it' : 'them'} from the other file first.`);
                                      return;
                                    }

                                    const newUpload = {
                                      id: Date.now().toString(),
                                      categories: selectedCategories,
                                      files: selectedFiles
                                    };
                                    setUploadedFiles(prev => [...prev, newUpload]);
                                    setCategoryError(''); // Clear any previous errors
                                    // Don't clear selections - allow user to add more rows
                                    // setSelectedCategories([]);
                                    // setSelectedFiles([]);
                                  }
                                }}
                                disabled={selectedCategories.length === 0 || selectedFiles.length === 0}
                              >
                                <i className="ri-add-line" style={{ marginRight: '6px' }} />
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Uploaded Files Table INSIDE modal-body for single scroll */}
              {uploadedFiles.length > 0 && (
                <div className="row" style={{ marginTop: '24px' }}>
                  <div className="col-12">
                    <div style={{ 
                      background: '#fff', 
                      borderRadius: '8px', 
                      border: '1px solid #e9ecef',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ padding: '0 24px 24px 24px' }}>
                        <div className="table-responsive">
                          <table style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse',
                            backgroundColor: '#fff'
                          }}>
                            <thead>
                              <tr style={{ backgroundColor: '#000' }}>
                                <th style={{ 
                                  padding: '16px 20px', 
                                  fontSize: '14px', 
                                  fontWeight: '600',
                                  textAlign: 'left',
                                  borderBottom: '1px solid #e9ecef',
                                  color: '#fff'
                                }}>
                                  Category
                                </th>
                                <th style={{ 
                                  padding: '16px 20px', 
                                  fontSize: '14px', 
                                  fontWeight: '600',
                                  textAlign: 'left',
                                  borderBottom: '1px solid #e9ecef',
                                  color: '#fff'
                                }}>
                                  Files
                                </th>
                                <th style={{ 
                                  padding: '16px 20px', 
                                  fontSize: '14px', 
                                  fontWeight: '600',
                                  textAlign: 'center',
                                  borderBottom: '1px solid #e9ecef',
                                  width: '100px',
                                  color: '#fff'
                                }}>
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {uploadedFiles.map((upload, index) => (
                                <tr key={upload.id} style={{ 
                                  backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                                  transition: 'background-color 0.2s ease'
                                }}>
                                  <td style={{ 
                                    padding: '16px 20px', 
                                    fontSize: '14px',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#333'
                                  }}>
                                    {upload.categoryName || upload.categories.map(cat => {
                                      // Map category number to category name
                                      const categoryName = cat === '1' ? 'Weight' : 
                                                          cat === '2' ? 'Packaging Type' : 
                                                          cat === '3' ? 'Material' : 
                                                          cat === '4' ? 'Evidence' : `Category ${cat}`;
                                      return categoryName;
                                    }).join(', ')}
                                  </td>
                                  <td style={{ 
                                    padding: '16px 20px', 
                                    fontSize: '14px',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#333'
                                  }}>
                                    {upload.files.map(file => file.name).join(', ')}
                                  </td>
                                  <td style={{ 
                                    padding: '16px 20px', 
                                    textAlign: 'center',
                                    borderBottom: '1px solid #e9ecef'
                                  }}>
                                    <button
                                      type="button"
                                      style={{
                                        backgroundColor: '#dc3545',
                                        border: 'none',
                                        color: '#fff',
                                        padding: '8px 12px',
                                        fontSize: '13px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: '40px'
                                      }}
                                      onClick={() => {
                                        setUploadedFiles(prev => prev.filter(item => item.id !== upload.id));
                                      }}
                                      title="Delete"
                                    >
                                      <i className="ri-delete-bin-line" style={{ fontSize: '14px' }}></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-footer" style={{ 
                background: '#fff', 
                borderTop: '2px solid #000', 
                display: 'flex', 
                justifyContent: 'flex-end',
                padding: '20px 30px',
                borderRadius: '0 0 12px 12px'
              }}>
                                  <button
                    type="button"
                    className="btn"
                    style={{ 
                      backgroundColor: 'rgb(48, 234, 3)', 
                      border: 'none', 
                      color: '#000', 
                     
                      fontWeight: 600,
                      
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onClick={handleAddComponentSave}
                  >
                   
                    Save
                    <i className="ri-save-line" style={{ fontSize: '16px' }} />
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={showConfirm}
        message={pendingSkuStatus ? 'Are you sure you want to deactivate this SKU?' : 'Are you sure you want to activate this SKU?'}
        onConfirm={handleConfirmStatusChange}
        onCancel={handleCancelStatusChange}
      />

      {/* Inactive SKU Modal */}
      {showInactiveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <button
              onClick={handleInactiveModalClose}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
            <div style={{ textAlign: 'center', paddingTop: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
                First activate the SKU
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <ConfirmModal
        show={showErrorModal}
        message={errorMessage}
        onConfirm={handleErrorModalClose}
        onCancel={handleErrorModalClose}
      />

      {/* Component Confirmation Modal */}
      <ConfirmModal
        show={showComponentConfirm}
        message={pendingComponentStatus ? 'Are you sure you want to activate this component?' : 'Are you sure you want to deactivate this component?'}
        onConfirm={handleComponentConfirmStatusChange}
        onCancel={handleComponentCancelStatusChange}
      />

      {/* Edit Component Modal */}
      {showEditComponentModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: 'rgb(48, 234, 3)', color: '#000', borderBottom: '2px solid #000', alignItems: 'center' }}>
                <h5 className="modal-title" style={{ color: '#000', fontWeight: 700, flex: 1 }}>Edit Component Details</h5>
                <button
                  type="button"
                  onClick={() => setShowEditComponentModal(false)}
                  aria-label="Close"
                  style={{
                    background: '#000',
                    border: 'none',
                    color: '#fff',
                    fontSize: 32,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: 'pointer',
                    marginLeft: 8,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  &times;
                </button>
              </div>

              <div className="modal-body" style={{ padding: '30px', maxHeight: '70vh', overflowY: 'auto' }}>
                {editComponentSuccess && (
                  <div style={{ 
                    padding: '12px 16px', 
                    backgroundColor: '#d4edda', 
                    color: '#155724', 
                    border: '1px solid #c3e6cb', 
                    borderRadius: '4px', 
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="ri-check-line" style={{ fontSize: '16px' }} />
                    {editComponentSuccess}
                  </div>
                )}

                {editComponentErrors.server && (
                  <div style={{ 
                    padding: '12px 16px', 
                    backgroundColor: '#f8d7da', 
                    color: '#721c24', 
                    border: '1px solid #f5c6cb', 
                    borderRadius: '4px', 
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="ri-error-warning-line" style={{ fontSize: '16px' }} />
                    {editComponentErrors.server}
                  </div>
                )}

                <div className="row">
                  {/* Component Type */}
                  <div className="col-md-6">
                    <label>Component Type <InfoIcon info="Select the type of component." /></label>
                    <select
                      value={editComponentData.componentType}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentType: e.target.value })}
                      className="form-control"
                      disabled
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d',
                        cursor: 'not-allowed'
                      }}
                    >
                      <option value="">Select Component Type</option>
                      {materialTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.item_name}
                        </option>
                      ))}
                    </select>
                    {editComponentErrors.componentType && (
                      <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                        {editComponentErrors.componentType}
                      </div>
                    )}
                  </div>

                  {/* Component Code */}
                  <div className="col-md-6">
                    <label>Component Code <InfoIcon info="Enter the unique code for this component." /></label>
                    <input
                      type="text"
                      value={editComponentData.componentCode}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentCode: e.target.value })}
                      className="form-control"
                      disabled
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d',
                        cursor: 'not-allowed'
                      }}
                    />
                    {editComponentErrors.componentCode && (
                      <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                        {editComponentErrors.componentCode}
                      </div>
                    )}
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* Component Description */}
                  <div className="col-md-6">
                    <label>Component Description <InfoIcon info="Provide a detailed description of the component." /></label>
                    <input
                      type="text"
                      value={editComponentData.componentDescription}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentDescription: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* Component Category */}
                  <div className="col-md-6">
                    <label>Component Category <InfoIcon info="Select the category for this component." /></label>
                    <input
                      type="text"
                      value={editComponentData.componentCategory}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentCategory: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* Validity From */}
                  <div className="col-md-6">
                    <label>Component validity date - From <InfoIcon info="Start date for component validity." /></label>
                    <input
                      type="date"
                      value={editComponentData.validityFrom}
                      onChange={(e) => setEditComponentData({ ...editComponentData, validityFrom: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* Validity To */}
                  <div className="col-md-6">
                    <label>Component validity date - To <InfoIcon info="End date for component validity." /></label>
                    <input
                      type="date"
                      value={editComponentData.validityTo}
                      onChange={(e) => setEditComponentData({ ...editComponentData, validityTo: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* Component Quantity */}
                  <div className="col-md-6">
                    <label>Component Quantity <InfoIcon info="Enter the quantity of this component." /></label>
                    <input
                      type="number"
                      value={editComponentData.componentQuantity}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentQuantity: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* Component Unit of Measure */}
                  <div className="col-md-6">
                    <label>Component Unit of Measure <InfoIcon info="Select the unit of measure for this component." /></label>
                    <select
                      value={editComponentData.componentUnitOfMeasure}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentUnitOfMeasure: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select Unit of Measure</option>
                      {unitOfMeasureOptions.map((uom) => (
                        <option key={uom.id} value={uom.id}>
                          {uom.item_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Component Base Quantity */}
                  <div className="col-md-6">
                    <label>Component Base Quantity <InfoIcon info="Enter the base quantity for this component." /></label>
                    <input
                      type="number"
                      value={editComponentData.componentBaseQuantity}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentBaseQuantity: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* Component Base Unit of Measure */}
                  <div className="col-md-6">
                    <label>Component Base Unit of Measure <InfoIcon info="Select the base unit of measure." /></label>
                    <select
                      value={editComponentData.componentBaseUnitOfMeasure}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentBaseUnitOfMeasure: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select Base Unit of Measure</option>
                      {unitOfMeasureOptions.map((uom) => (
                        <option key={uom.id} value={uom.id}>
                          {uom.item_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* %w/w */}
                  <div className="col-md-6">
                    <label>%w/w <InfoIcon info="Enter the weight percentage." /></label>
                    <input
                      type="number"
                      step="0.01"
                      value={editComponentData.wW}
                      onChange={(e) => setEditComponentData({ ...editComponentData, wW: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* Component Packaging Type */}
                  <div className="col-md-6">
                    <label>Component Packaging Type <InfoIcon info="Select the packaging type for this component." /></label>
                    <select
                      value={editComponentData.componentPackagingType}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentPackagingType: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select Packaging Type</option>
                      {packagingMaterialOptions.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.item_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Component Packaging Material */}
                  <div className="col-md-6">
                    <label>Component Packaging Material <InfoIcon info="Enter the packaging material used." /></label>
                    <input
                      type="text"
                      value={editComponentData.componentPackagingMaterial}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentPackagingMaterial: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* Component Unit Weight */}
                  <div className="col-md-6">
                    <label>Component Unit Weight <InfoIcon info="Enter the unit weight of the component." /></label>
                    <input
                      type="number"
                      step="0.01"
                      value={editComponentData.componentUnitWeight}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentUnitWeight: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* Component Weight Unit of Measure */}
                  <div className="col-md-6">
                    <label>Component Weight Unit of Measure <InfoIcon info="Select the weight unit of measure." /></label>
                    <select
                      value={editComponentData.componentWeightUnitOfMeasure}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentWeightUnitOfMeasure: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select Weight Unit of Measure</option>
                      {unitOfMeasureOptions.map((uom) => (
                        <option key={uom.id} value={uom.id}>
                          {uom.item_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* % Post Consumer */}
                  <div className="col-md-6">
                    <label>% Post Consumer <InfoIcon info="Enter the percentage of post-consumer recycled content." /></label>
                    <input
                      type="number"
                      step="0.01"
                      value={editComponentData.percentPostConsumer}
                      onChange={(e) => setEditComponentData({ ...editComponentData, percentPostConsumer: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* % Post Industrial */}
                  <div className="col-md-6">
                    <label>% Post Industrial <InfoIcon info="Enter the percentage of post-industrial recycled content." /></label>
                    <input
                      type="number"
                      step="0.01"
                      value={editComponentData.percentPostIndustrial}
                      onChange={(e) => setEditComponentData({ ...editComponentData, percentPostIndustrial: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* % Chemical */}
                  <div className="col-md-6">
                    <label>% Chemical <InfoIcon info="Enter the percentage of chemically recycled content." /></label>
                    <input
                      type="number"
                      step="0.01"
                      value={editComponentData.percentChemical}
                      onChange={(e) => setEditComponentData({ ...editComponentData, percentChemical: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* % Bio Sourced */}
                  <div className="col-md-6">
                    <label>% Bio Sourced <InfoIcon info="Enter the percentage of bio-sourced content." /></label>
                    <input
                      type="number"
                      step="0.01"
                      value={editComponentData.percentBioSourced}
                      onChange={(e) => setEditComponentData({ ...editComponentData, percentBioSourced: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* Material Structure */}
                  <div className="col-md-6">
                    <label>Material Structure <InfoIcon info="Enter the material structure details." /></label>
                    <input
                      type="text"
                      value={editComponentData.materialStructure}
                      onChange={(e) => setEditComponentData({ ...editComponentData, materialStructure: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* Packaging Colour */}
                  <div className="col-md-6">
                    <label>Packaging Colour <InfoIcon info="Enter the packaging color information." /></label>
                    <input
                      type="text"
                      value={editComponentData.packagingColour}
                      onChange={(e) => setEditComponentData({ ...editComponentData, packagingColour: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* Packaging Level */}
                  <div className="col-md-6">
                    <label>Packaging Level <InfoIcon info="Select the packaging level." /></label>
                    <select
                      value={editComponentData.packagingLevel}
                      onChange={(e) => setEditComponentData({ ...editComponentData, packagingLevel: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select Packaging Level</option>
                      {packagingLevelOptions.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.item_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Component Dimensions */}
                  <div className="col-md-6">
                    <label>Component dimensions (3D - LxWxH, 2D - LxW) <InfoIcon info="Enter the component dimensions." /></label>
                    <input
                      type="text"
                      value={editComponentData.componentDimensions}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentDimensions: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ marginTop: '20px' }}>
                  {/* Packaging Evidence */}
                  <div className="col-md-6">
                    <label>Packaging Evidence <InfoIcon info="Upload files as evidence for packaging (optional)." /></label>
                    <input 
                      type="file" 
                      multiple
                      className="form-control" 
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setEditComponentData({ 
                          ...editComponentData, 
                          packagingEvidence: files,
                          componentDimensions: editComponentData.componentDimensions 
                        });
                      }}
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    {editComponentData.packagingEvidence.length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                        Selected files: {editComponentData.packagingEvidence.map(file => file.name).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Component Dimensions */}
                  <div className="col-md-6">
                    <label>Component dimensions (3D - LxWxH, 2D - LxW) <InfoIcon info="Enter the component dimensions." /></label>
                    <input
                      type="text"
                      value={editComponentData.componentDimensions}
                      onChange={(e) => setEditComponentData({ ...editComponentData, componentDimensions: e.target.value })}
                      className="form-control"
                      style={{ 
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                {/* Packaging Specification Evidence Section */}
                <div className="row" style={{ marginTop: '20px' }}>
                  <div className="col-12">
                    <div style={{ 
                      background: '#f8f9fa', 
                      padding: '24px', 
                      borderRadius: '8px', 
                      border: '1px solid #e9ecef',
                      marginTop: '16px'
                    }}>
                      <h6 style={{ 
                        fontWeight: '600', 
                        color: '#333', 
                        marginBottom: '20px',
                        fontSize: '16px'
                      }}>
                        Packaging Specification Evidence
                      </h6>
                      
                      <div className="row">
                        <div className="col-md-6">
                          <label style={{ 
                            fontWeight: '600', 
                            color: '#333', 
                            marginBottom: '8px',
                            display: 'block'
                          }}>
                            KPIS for Evidence Mapping<InfoIcon info="Choose one or more categories for file upload." />
                          </label>
                          <MultiSelect
                            options={[
                              { value: '1', label: 'Weight' },
                              { value: '2', label: 'Weight UoM' },
                              { value: '3', label: 'Packaging Type' },
                              { value: '4', label: 'Material Type' }
                            ]}
                            selectedValues={editSelectedCategories}
                            onSelectionChange={(categories) => {
                              setEditSelectedCategories(categories);
                              setEditCategoryError(''); // Clear error when categories change
                            }}
                            placeholder="Select Categories..."
                          />
                          {editCategoryError && (
                            <div style={{
                              color: '#dc3545',
                              fontSize: '13px',
                              marginTop: '8px',
                              padding: '8px 12px',
                              backgroundColor: '#f8d7da',
                              border: '1px solid #f5c6cb',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <i className="ri-error-warning-line" style={{ fontSize: '14px' }} />
                              {editCategoryError}
                            </div>
                          )}
                        </div>
                        
                        <div className="col-md-6">
                          <label style={{ 
                            fontWeight: '600', 
                            color: '#333', 
                            marginBottom: '8px',
                            display: 'block'
                          }}>
                            Browse Files <InfoIcon info="Select files to upload for the selected categories." />
                          </label>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            <input
                              type="file"
                              multiple
                              className="form-control"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setEditSelectedFiles(files);
                                setEditCategoryError(''); // Clear error when files change
                              }}
                              style={{ 
                                flex: 1,
                                padding: '10px 12px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '14px'
                              }}
                            />
                            <button
                              type="button"
                              className="btn"
                              style={{
                                backgroundColor: '#30ea03',
                                border: 'none',
                                color: '#000',
                                fontWeight: '600',
                                padding: '10px 20px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                fontSize: '14px',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                if (editSelectedCategories.length > 0 && editSelectedFiles.length > 0) {
                                  // Check if any selected categories are already assigned to other files
                                  const alreadyAssignedCategories = editSelectedCategories.filter(category => 
                                    editUploadedFiles.some(upload => 
                                      upload.categories.includes(category)
                                    )
                                  );

                                  if (alreadyAssignedCategories.length > 0) {
                                    const categoryNames = alreadyAssignedCategories.map(cat => `Category ${cat}`).join(', ');
                                    setEditCategoryError(`${categoryNames} ${alreadyAssignedCategories.length === 1 ? 'is' : 'are'} already assigned to another file. Please remove ${alreadyAssignedCategories.length === 1 ? 'it' : 'them'} from the other file first.`);
                                    return;
                                  }

                                  const newUpload = {
                                    id: Date.now().toString(),
                                    categories: editSelectedCategories,
                                    files: editSelectedFiles
                                  };
                                  setEditUploadedFiles(prev => [...prev, newUpload]);
                                  setEditCategoryError(''); // Clear any previous errors
                                }
                              }}
                              disabled={editSelectedCategories.length === 0 || editSelectedFiles.length === 0}
                            >
                              <i className="ri-add-line" style={{ marginRight: '6px' }} />
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Display Uploaded Files Table for Edit Modal */}
                {editUploadedFiles.length > 0 && (
                  <div className="row" style={{ marginTop: '24px' }}>
                    <div className="col-12">
                      <div style={{ 
                        background: '#fff', 
                        borderRadius: '8px', 
                        border: '1px solid #e9ecef',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ padding: '0 24px 24px 24px' }}>
                          <div className="table-responsive">
                            <table style={{ 
                              width: '100%', 
                              borderCollapse: 'collapse',
                              backgroundColor: '#fff'
                            }}>
                              <thead>
                                <tr style={{ backgroundColor: '#000' }}>
                                  <th style={{ 
                                    padding: '16px 20px', 
                                    fontSize: '14px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff'
                                  }}>
                                    Category
                                  </th>
                                  <th style={{ 
                                    padding: '16px 20px', 
                                    fontSize: '14px', 
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #e9ecef',
                                    color: '#fff'
                                  }}>
                                    Files
                                  </th>
                                  <th style={{ 
                                    padding: '16px 20px', 
                                    fontSize: '14px', 
                                    fontWeight: '600',
                                    textAlign: 'center',
                                    borderBottom: '1px solid #e9ecef',
                                    width: '100px',
                                    color: '#fff'
                                  }}>
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {editUploadedFiles.map((upload, index) => (
                                  <tr key={upload.id} style={{ 
                                    backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                                    transition: 'background-color 0.2s ease'
                                  }}>
                                    <td style={{ 
                                      padding: '16px 20px', 
                                      fontSize: '14px',
                                      borderBottom: '1px solid #e9ecef',
                                      color: '#333'
                                    }}>
                                      {upload.categoryName || upload.categories.map(cat => {
                                        // Map category number to category name
                                        const categoryName = cat === '1' ? 'Weight' : 
                                                            cat === '2' ? 'Packaging Type' : 
                                                            cat === '3' ? 'Material' : 
                                                            cat === '4' ? 'Evidence' : `Category ${cat}`;
                                        return categoryName;
                                      }).join(', ')}
                                    </td>
                                    <td style={{ 
                                      padding: '16px 20px', 
                                      fontSize: '14px',
                                      borderBottom: '1px solid #e9ecef',
                                      color: '#333'
                                    }}>
                                      {upload.files.map(file => file.name).join(', ')}
                                    </td>
                                    <td style={{ 
                                      padding: '16px 20px', 
                                      fontSize: '14px',
                                      borderBottom: '1px solid #e9ecef',
                                      textAlign: 'center'
                                    }}>
                                      <button
                                        type="button"
                                        onClick={() => setEditUploadedFiles(prev => prev.filter(item => item.id !== upload.id))}
                                        style={{
                                          backgroundColor: '#dc3545',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          padding: '6px 12px',
                                          fontSize: '12px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <i className="ri-delete-bin-line" style={{ marginRight: '4px' }} />
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ 
                background: '#fff', 
                borderTop: '2px solid #000', 
                display: 'flex', 
                justifyContent: 'flex-end',
                padding: '20px 30px',
                borderRadius: '0 0 12px 12px'
              }}>
                <button
                  type="button"
                  className="btn"
                  style={{ 
                    backgroundColor: 'rgb(48, 234, 3)', 
                    border: 'none', 
                    color: '#000', 
                    minWidth: 120, 
                    fontWeight: 600,
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={handleEditComponentSave}
                >
                  <i className="ri-save-line" style={{ fontSize: '16px' }} />
                  Update Component
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Component History Log Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            width: '95%',
            maxWidth: '1400px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #30ea03 0%, #28c402 100%)',
              color: '#000',
              padding: '20px 30px',
              borderRadius: '12px 12px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #000'
            }}>
              <h5 style={{ margin: 0, fontWeight: '600', fontSize: '18px' }}>
                <i className="ri-history-line me-2"></i>
                Component History Log
              </h5>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#000',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '24px 30px',
              flex: 1,
              overflow: 'auto'
            }}>


              {/* Audit Log Data Table */}
              {loadingHistory ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '40px',
                  color: '#666'
                }}>
                  <div className="spinner-border text-primary" role="status" style={{ marginBottom: '10px' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p style={{ margin: 0 }}>Loading audit logs...</p>
                </div>
              ) : componentHistory.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '40px',
                  color: '#666'
                }}>
                  <i className="ri-inbox-line" style={{ fontSize: '3rem', marginBottom: '10px' }}></i>
                  <p style={{ margin: 0 }}>No audit logs found for this component</p>
                </div>
              ) : (
                <div style={{
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  maxHeight: '70vh',
                  overflowY: 'auto'
                }}>
                  <div className="table-responsive">
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      backgroundColor: '#fff',
                      fontSize: '12px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#000', position: 'sticky', top: 0, zIndex: 1 }}>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Date
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Component Code
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '120px'
                          }}>
                            Description
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            SKU Code
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Formulation Ref
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Material Type
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Components Ref
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Valid From
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Valid To
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Material Group
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Quantity
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            UOM
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Base Qty
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Base UOM
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            % W/W
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Packaging Type
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Packaging Material
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Unit Weight
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Weight UOM
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            % PCR
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            % PIR
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            % Chemical
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            % Bio
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Material Structure
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Packaging Color
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Packaging Level
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Dimensions
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Status
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            User
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '100px'
                          }}>
                            Signed Off By
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Document Status
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            Year
                          </th>
                          <th style={{
                            padding: '12px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'left',
                            borderBottom: '1px solid #e9ecef',
                            color: '#fff',
                            minWidth: '80px'
                          }}>
                            CM Code
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedData(componentHistory).map((log, index) => (
                          <tr key={log.id || index} style={{
                            backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                            transition: 'background-color 0.2s ease'
                          }}>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              whiteSpace: 'nowrap'
                            }}>
                              {formatDate(log.created_date || log.changed_date)}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              fontWeight: '600'
                            }}>
                              {log.component_code || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              maxWidth: '150px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {log.component_description || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.sku_code || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.formulation_reference || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.material_type_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.components_reference || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_valid_from || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_valid_to || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_material_group || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.component_quantity || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_uom_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.component_base_quantity || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_base_uom_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.percent_w_w || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_packaging_type_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_packaging_material || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.component_unit_weight || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.weight_unit_measure_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.percent_mechanical_pcr_content || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.percent_mechanical_pir_content || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.percent_chemical_recycled_content || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333',
                              textAlign: 'right'
                            }}>
                              {log.percent_bio_sourced || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.material_structure_multimaterials || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_packaging_color_opacity || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_packaging_level_id || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.component_dimensions || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600',
                                backgroundColor: log.is_active ? '#28a745' : '#dc3545',
                                color: '#fff'
                              }}>
                                {log.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.created_by || log.changed_by || 'System'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.signed_off_by || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.document_status || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.year || 'N/A'}
                            </td>
                            <td style={{
                              padding: '12px 8px',
                              fontSize: '11px',
                              borderBottom: '1px solid #e9ecef',
                              color: '#333'
                            }}>
                              {log.cm_code || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {componentHistory.length > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '15px 20px',
                      borderTop: '1px solid #e9ecef',
                      backgroundColor: '#f8f9fa'
                    }}>
                      {/* Items per page selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>Show:</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                        <span style={{ fontSize: '12px', color: '#666' }}>entries</span>
                      </div>
                      
                      {/* Page info */}
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                      </div>
                      
                      {/* Pagination buttons */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #ddd',
                            backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                            color: currentPage === 1 ? '#999' : '#333',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          First
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #ddd',
                            backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                            color: currentPage === 1 ? '#999' : '#333',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          Previous
                        </button>
                        
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                          const page = Math.max(1, Math.min(getTotalPages() - 4, currentPage - 2)) + i;
                          if (page > getTotalPages()) return null;
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              style={{
                                padding: '6px 10px',
                                border: '1px solid #ddd',
                                backgroundColor: currentPage === page ? '#007bff' : '#fff',
                                color: currentPage === page ? '#fff' : '#333',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            >
                              {page}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === getTotalPages()}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #ddd',
                            backgroundColor: currentPage === getTotalPages() ? '#f5f5f5' : '#fff',
                            color: currentPage === getTotalPages() ? '#999' : '#333',
                            cursor: currentPage === getTotalPages() ? 'not-allowed' : 'pointer',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          Next
                        </button>
                        <button
                          onClick={() => handlePageChange(getTotalPages())}
                          disabled={currentPage === getTotalPages()}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #ddd',
                            backgroundColor: currentPage === getTotalPages() ? '#f5f5f5' : '#fff',
                            color: currentPage === getTotalPages() ? '#999' : '#333',
                            cursor: currentPage === getTotalPages() ? 'not-allowed' : 'pointer',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '15px 30px',
              borderTop: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Data Modal */}
      {showCopyDataModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: 'rgb(48, 234, 3)', color: '#000', borderBottom: '2px solid #000', alignItems: 'center' }}>
                <h5 className="modal-title" style={{ color: '#000', fontWeight: 700, flex: 1 }}>Copy Data</h5>
                <button
                  type="button"
                  onClick={handleCopyDataModalClose}
                  aria-label="Close"
                  style={{
                    background: '#000',
                    border: 'none',
                    color: '#fff',
                    fontSize: 32,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: 'pointer',
                    marginLeft: 8,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body" style={{ background: '#fff', padding: '30px' }}>
                <div className="container-fluid">
                  {/* Period Selection Section */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 style={{ color: '#000', marginBottom: '16px', fontWeight: 600 }}>Select Periods for Copy Data</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: '600', 
                            color: '#333',
                            fontSize: '14px'
                          }}>
                            From Period <span style={{ color: 'red' }}>*</span>
                          </label>
                          <select
                            value={copyFromPeriod}
                            onChange={(e) => setCopyFromPeriod(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                              backgroundColor: '#fff'
                            }}
                            disabled={uploadLoading}
                          >
                            <option value="">Select From Period</option>
                            {years.map(year => (
                              <option key={year.id} value={year.id}>
                                {year.period}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: '600', 
                            color: '#333',
                            fontSize: '14px'
                          }}>
                            To Period <span style={{ color: 'red' }}>*</span>
                          </label>
                          <select
                            value={copyToPeriod}
                            onChange={(e) => setCopyToPeriod(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                              backgroundColor: '#fff'
                            }}
                            disabled={uploadLoading}
                          >
                            <option value="">Select To Period</option>
                            {years.map(year => (
                              <option key={year.id} value={year.id}>
                                {year.period}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-12">
                      <div style={{ 
                        padding: '20px', 
                        border: '2px dashed #30ea03', 
                        borderRadius: '8px', 
                        textAlign: 'center',
                        backgroundColor: '#f8fff8'
                      }}>
                        <i className="ri-upload-cloud-2-line" style={{ fontSize: '48px', color: '#30ea03', marginBottom: '16px' }}></i>
                        <h6 style={{ color: '#000', marginBottom: '12px', fontWeight: 600 }}>Upload the SKU</h6>
                        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                          Select a file to upload and copy data. Supported formats: Excel (.xlsx, .xls), CSV (.csv)
                        </p>
                        
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          style={{
                            backgroundColor: '#30ea03',
                            color: '#000',
                            padding: '12px 24px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'inline-block',
                            border: 'none',
                            fontSize: '14px'
                          }}
                        >
                          <i className="ri-folder-open-line" style={{ marginRight: '8px' }}></i>
                          Choose File
                        </label>
                        
                        {uploadedFile && (
                          <div style={{ 
                            marginTop: '16px', 
                            padding: '12px', 
                            backgroundColor: '#e8f5e8', 
                            borderRadius: '6px',
                            border: '1px solid #30ea03'
                          }}>
                            <i className="ri-file-text-line" style={{ color: '#30ea03', marginRight: '8px' }}></i>
                            <strong>{uploadedFile.name}</strong>
                            <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
                              ({(uploadedFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {uploadError && (
                        <div style={{ 
                          marginTop: '16px', 
                          padding: '12px 16px', 
                          backgroundColor: '#f8d7da', 
                          color: '#721c24', 
                          border: '1px solid #f5c6cb', 
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <i className="ri-error-warning-line" style={{ fontSize: '16px' }} />
                          {uploadError}
                        </div>
                      )}
                      
                      {uploadSuccess && (
                        <div style={{ 
                          marginTop: '16px', 
                          padding: '12px 16px', 
                          backgroundColor: '#d4edda', 
                          color: '#155724', 
                          border: '1px solid #c3e6cb', 
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <i className="ri-check-line" style={{ fontSize: '16px' }} />
                          {uploadSuccess}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ 
                background: '#fff', 
                borderTop: '2px solid #000', 
                display: 'flex', 
                justifyContent: 'flex-end',
                padding: '20px 30px',
                borderRadius: '0 0 12px 12px'
              }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopyDataModalClose}
                  style={{
                    background: '#000',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '12px'
                  }}
                >
                 
                  Cancel
                  <i className="ri-close-fill" style={{ fontSize: '16px', color: '#fff', marginLeft: 6 }} />
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ 
                    backgroundColor: 'rgb(48, 234, 3)', 
                    border: 'none', 
                    color: '#000', 
                    minWidth: 120, 
                    fontWeight: 600,
                    padding: '8px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: uploadLoading ? 'not-allowed' : 'pointer',
                    opacity: uploadLoading ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={handleCopyDataUpload}
                  disabled={uploadLoading || !uploadedFile || !copyFromPeriod || !copyToPeriod}
                >
                  {uploadLoading ? (
                    <>
                      <i className="ri-loader-4-line" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      
                      Upload & Copy Data
                      <i className="ri-upload-line" style={{ fontSize: '16px' }} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles for button layout */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .filters ul li[style*="marginLeft: auto"] {
            margin-left: 0 !important;
            margin-top: 10px !important;
            width: 100% !important;
            justify-content: center !important;
          }
          .filters ul li[style*="marginLeft: auto"] button {
            min-width: 100px !important;
            font-size: 0.9rem !important;
            padding: 6px 12px !important;
          }
        }
        @media (max-width: 480px) {
          .filters ul li[style*="marginLeft: auto"] {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .filters ul li[style*="marginLeft: auto"] button {
            width: 100% !important;
            min-width: auto !important;
          }
        }
      `}</style>
    </Layout>
  );
};

export default CmSkuDetail; 