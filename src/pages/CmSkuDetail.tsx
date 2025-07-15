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
  formulationReference?: string;
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

  // New state for open index
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First panel open by default

  // Add mock component data for table rows (replace with real API data as needed)
  const [componentRows, setComponentRows] = useState(initialComponentRows);

  // New state for confirm modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSkuId, setPendingSkuId] = useState<number | null>(null);
  const [pendingSkuStatus, setPendingSkuStatus] = useState<boolean>(false);

  // State for applied filters
  const [appliedFilters, setAppliedFilters] = useState<{ years: string[]; skuDescriptions: string[] }>({ years: [], skuDescriptions: [] });

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

    return yearMatch && descMatch;
  });

  // Search button handler
  const handleSearch = () => {
    setAppliedFilters({ years: selectedYears, skuDescriptions: selectedSkuDescriptions });
    setOpenIndex(0); // Optionally reset to first panel
  };

  // Reset button handler
  const handleReset = () => {
    setSelectedYears([]);
    setSelectedSkuDescriptions([]);
    setAppliedFilters({ years: [], skuDescriptions: [] });
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
  const [years, setYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

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
        
        // Extract period values from objects or convert to strings
        const yearsAsStrings = yearsData
          .map((year: any) => {
            if (typeof year === 'string' || typeof year === 'number') {
              return String(year);
            } else if (year && typeof year === 'object' && year.period) {
              return String(year.period);
            } else if (year && typeof year === 'object' && year.id) {
              return String(year.id);
            } else {
              return null;
            }
          })
          .filter((year: string | null) => year && year.trim() !== '') as string[];
        
        console.log('Processed years:', yearsAsStrings); // Debug log
        setYears(yearsAsStrings);
      } catch (err) {
        console.error('Error fetching years:', err);
        setYears([]);
      }
    };
    fetchYears();
  }, []);

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

  // Add state for material types
  const [materialTypes, setMaterialTypes] = useState<Array<{id: number, item_name: string, item_order: number, is_active: boolean, created_by: string, created_date: string}>>([]);

  // Fetch material types from API
  useEffect(() => {
    const fetchMaterialTypes = async () => {
      try {
        const response = await fetch('http://localhost:3000/material-type-master');
        if (!response.ok) throw new Error('Failed to fetch material types');
        const result = await response.json();
        if (result.success) {
          setMaterialTypes(result.data);
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
        const response = await fetch('http://localhost:3000/master-component-umo');
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setUnitOfMeasureOptions(result.data);
        } else {
          setUnitOfMeasureOptions([]);
        }
      } catch (err) {
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
      alert('Failed to update status. Please try again.');
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

  // Add state for Add SKU modal fields and validation
  const [addSkuPeriod, setAddSkuPeriod] = useState('');
  const [addSku, setAddSku] = useState('');
  const [addSkuDescription, setAddSkuDescription] = useState('');
  const [addSkuQty, setAddSkuQty] = useState('');
  const [addSkuErrors, setAddSkuErrors] = useState({ sku: '', skuDescription: '', period: '', qty: '', server: '' });
  const [addSkuSuccess, setAddSkuSuccess] = useState('');
  const [addSkuLoading, setAddSkuLoading] = useState(false);

  // Add SKU handler
  const handleAddSkuSave = async () => {
    // Client-side validation
    let errors = { sku: '', skuDescription: '', period: '', qty: '', server: '' };
    if (!addSku.trim()) errors.sku = 'A value is required for SKU code';
    if (!addSkuDescription.trim()) errors.skuDescription = 'A value is required for SKU description';
    if (!addSkuPeriod) errors.period = 'A value is required for the Period';
    if (!addSkuQty || isNaN(Number(addSkuQty)) || Number(addSkuQty) <= 0) errors.qty = 'A value is required for Purchased Quantity';
    setAddSkuErrors(errors);
    setAddSkuSuccess('');
    if (errors.sku || errors.skuDescription || errors.period || errors.qty) return;

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
          purchased_quantity: addSkuQty, // send as string
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
      setAddSkuErrors({ sku: '', skuDescription: '', period: '', qty: '', server: '' });
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
        setAddSkuQty('');
        setAddSkuSuccess('');
        setLoading(true); // show full-page loader
        await fetchSkuDetails(); // refresh data
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
    formulationReference: '',
  });
  const [editSkuErrors, setEditSkuErrors] = useState({ sku: '', skuDescription: '', period: '', qty: '', formulationReference: '', server: '' });
  const [editSkuSuccess, setEditSkuSuccess] = useState('');
  const [editSkuLoading, setEditSkuLoading] = useState(false);

  // Handler to open Edit SKU modal (to be called on Edit SKU button click)
  const handleEditSkuOpen = (sku: SkuData) => {
    setEditSkuData({
      period: sku.period || '',
      sku: sku.sku_code || '',
      skuDescription: sku.sku_description || '',
      qty: sku.purchased_quantity != null ? String(sku.purchased_quantity) : '',
      dualSource: sku.dual_source || '',
      skuReference: sku.sku_reference || '',
      formulationReference: sku.formulation_reference || '',
    });
    setEditSkuErrors({ sku: '', skuDescription: '', period: '', qty: '', formulationReference: '', server: '' });
    setEditSkuSuccess('');
    setShowEditSkuModal(true);
  };

  // Edit SKU handler
  const handleEditSkuUpdate = async () => {
    // Client-side validation
    let errors = { sku: '', skuDescription: '', period: '', qty: '', formulationReference: '', server: '' };
    if (!editSkuData.sku.trim()) errors.sku = 'A value is required for SKU code';
    if (!editSkuData.skuDescription.trim()) errors.skuDescription = 'A value is required for SKU description';
    if (!editSkuData.period) errors.period = 'A value is required for the Period';
    if (!editSkuData.qty || isNaN(Number(editSkuData.qty)) || Number(editSkuData.qty) <= 0) errors.qty = 'A value is required for Purchased Quantity';
    // Formulation Reference is now optional, so no validation
    setEditSkuErrors(errors);
    setEditSkuSuccess('');
    if (errors.sku || errors.skuDescription || errors.period || errors.qty) return;

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
          purchased_quantity: editSkuData.qty, // send as string
          dual_source: editSkuData.dualSource,
          sku_reference: editSkuData.skuReference,
          formulation_reference: editSkuData.formulationReference
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setEditSkuErrors({ ...errors, server: result.message || 'Server validation failed' });
        setEditSkuLoading(false);
        return;
      }
      setEditSkuSuccess('SKU updated successfully!');
      setEditSkuErrors({ sku: '', skuDescription: '', period: '', qty: '', formulationReference: '', server: '' });
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
  });



  // Add state for Add Component modal fields and validation
  const [addComponentErrors, setAddComponentErrors] = useState<Record<string, string>>({});
  const [addComponentSuccess, setAddComponentSuccess] = useState("");

  // Add state for category selection and file upload
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, categories: string[], files: File[]}>>([]);

  // Add state for selectedSkuCode
  const [selectedSkuCode, setSelectedSkuCode] = useState<string>('');

  // Add state for component details per SKU
  const [componentDetails, setComponentDetails] = useState<{ [skuCode: string]: any[] }>({});
  const [componentDetailsLoading, setComponentDetailsLoading] = useState<{ [skuCode: string]: boolean }>({});

  // Function to fetch component details for a SKU
  const fetchComponentDetails = async (skuCode: string) => {
    setComponentDetailsLoading(prev => ({ ...prev, [skuCode]: true }));
    try {
      const res = await fetch(`http://localhost:3000/component-details/${skuCode}`);
      const data = await res.json();
      setComponentDetails(prev => ({ ...prev, [skuCode]: data.data || [] }));
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
    const errors: Record<string, string> = {};
    if (!addComponentData.componentType) errors.componentType = 'A value is required for Material Type';
    if (!selectedSkuCode) errors.skuCode = 'A value is required for SKU Code';
    if (!addComponentData.componentCode) errors.componentCode = 'A value is required for Component Code';
    if (!addComponentData.componentDescription) errors.componentDescription = 'A value is required for Component Description';
    if (!addComponentData.validityFrom) errors.validityFrom = 'A value is required for Component validity date - From';
    if (!addComponentData.validityTo) errors.validityTo = 'A value is required for Component validity date - To';
    if (!addComponentData.componentCategory) errors.componentCategory = 'A value is required for Component Category';
    if (!addComponentData.componentQuantity) errors.componentQuantity = 'A value is required for Component Quantity';
    if (!addComponentData.componentUnitOfMeasure) errors.componentUnitOfMeasure = 'A value is required for Component Unit of Measure';
    if (!addComponentData.componentBaseQuantity) errors.componentBaseQuantity = 'A value is required for Component Base Quantity';
    if (!addComponentData.componentBaseUnitOfMeasure) errors.componentBaseUnitOfMeasure = 'A value is required for Component Base Unit of Measure';
    if (!addComponentData.wW) errors.wW = 'A value is required for %w/w';
    if (!addComponentData.componentPackagingType) errors.componentPackagingType = 'A value is required for Component Packaging Type';
    if (!addComponentData.componentPackagingMaterial) errors.componentPackagingMaterial = 'A value is required for Component Packaging Material';
    if (!addComponentData.componentUnitWeight) errors.componentUnitWeight = 'A value is required for Component Unit Weight';
    if (!addComponentData.componentWeightUnitOfMeasure) errors.componentWeightUnitOfMeasure = 'A value is required for Component Weight Unit of Measure';
    if (!addComponentData.percentPostConsumer) errors.percentPostConsumer = 'A value is required for % Mechanical Post-Consumer Recycled Content (inc. Chemical)';
    if (!addComponentData.percentPostIndustrial) errors.percentPostIndustrial = 'A value is required for % Mechanical Post-Industrial Recycled Content';
    if (!addComponentData.percentChemical) errors.percentChemical = 'A value is required for % Chemical Recycled Content';
    if (!addComponentData.percentBioSourced) errors.percentBioSourced = 'A value is required for % Bio-sourced?';
    if (!addComponentData.materialStructure) errors.materialStructure = 'A value is required for Material structure - multimaterials only (with % wt)';
    if (!addComponentData.packagingColour) errors.packagingColour = 'A value is required for Component packaging colour / opacity';
    if (!addComponentData.packagingLevel) errors.packagingLevel = 'A value is required for Component packaging level';
    if (!addComponentData.componentDimensions) errors.componentDimensions = 'A value is required for Component dimensions (3D - LxWxH, 2D - LxW)';
    setAddComponentErrors(errors);
    if (Object.keys(errors).length > 0) {
      console.log('Validation errors:', errors);
      return;
    }

    const payload = {
      material_type_id: addComponentData.componentType ? parseInt(addComponentData.componentType) : null,
      sku_code: selectedSkuCode,
      cm_code: cmCode || '',
      component_code: addComponentData.componentCode || '',
      component_description: addComponentData.componentDescription || '',
      component_valid_from: addComponentData.validityFrom || '',
      component_valid_to: addComponentData.validityTo || '',
      component_material_group: addComponentData.componentCategory || '',
      component_quantity: parseFloat(addComponentData.componentQuantity) || 0,
      component_uom_id: addComponentData.componentUnitOfMeasure ? parseInt(addComponentData.componentUnitOfMeasure) : null,
      component_base_quantity: parseFloat(addComponentData.componentBaseQuantity) || 0,
      component_base_uom_id: addComponentData.componentBaseUnitOfMeasure ? parseInt(addComponentData.componentBaseUnitOfMeasure) : null,
      percent_w_w: parseFloat(addComponentData.wW) || 0,
      component_packaging_type_id: addComponentData.componentPackagingType ? parseInt(addComponentData.componentPackagingType) : null,
      component_packaging_material: addComponentData.componentPackagingMaterial || '',
      component_unit_weight: parseFloat(addComponentData.componentUnitWeight) || 0,
      weight_unit_measure_id: addComponentData.componentWeightUnitOfMeasure ? parseInt(addComponentData.componentWeightUnitOfMeasure) : null,
      percent_mechanical_pcr_content: parseFloat(addComponentData.percentPostConsumer) || 0,
      percent_mechanical_pir_content: parseFloat(addComponentData.percentPostIndustrial) || 0,
      percent_chemical_recycled_content: parseFloat(addComponentData.percentChemical) || 0,
      percent_bio_sourced: parseFloat(addComponentData.percentBioSourced) || 0,
      material_structure_multimaterials: addComponentData.materialStructure || '',
      component_packaging_color_opacity: addComponentData.packagingColour || '',
      component_packaging_level_id: addComponentData.packagingLevel ? parseInt(addComponentData.packagingLevel) : null,
      component_dimensions: addComponentData.componentDimensions || '',
      user_id: 1,
      created_by: 1,
    };

    try {
      const response = await fetch('http://localhost:3000/add-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setAddComponentErrors({ ...errors, server: result.message || 'Server validation failed' });
        return;
      }
      // Send audit log
      await fetch('http://localhost:3000/add-component-audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setAddComponentSuccess('Component added successfully!');
      setAddComponentErrors({});
      setTimeout(async () => {
        setShowAddComponentModal(false);
        setAddComponentData({
          ...addComponentData,
          componentType: '',
          formulationReference: '',
        });
        setAddComponentSuccess('');
        setLoading(true);
        await fetchSkuDetails();
        setLoading(false);
      }, 1200);
    } catch (err) {
      setAddComponentErrors({ ...errors, server: 'Network or server error' });
    }
  };

  // Export to Excel handler
  const handleExportToExcel = () => {
    // Prepare data for export
    const exportData = filteredSkuData.map(sku => ({
      'SKU Code': sku.sku_code,
      'SKU Description': sku.sku_description,
      'Reference SKU': sku.sku_reference,
      'Period': sku.period,
      'Purchased Quantity': sku.purchased_quantity,
      'Dual Source': sku.dual_source,
      'Formulation Reference': sku.formulation_reference,
      'Is Active': sku.is_active ? 'Active' : 'Inactive',
      'Created By': sku.created_by,
      'Created Date': sku.created_date
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SKUs');
    XLSX.writeFile(workbook, '3pm-detail-skus.xlsx');
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

  // Dynamic table for component details
  const ComponentTable: React.FC<{ data: any[], onStatusChange: (id: number, newStatus: boolean, skuCode?: string) => void, skuCode?: string }> = ({ data, onStatusChange, skuCode }) => {
    if (!data || data.length === 0) {
      return <div>No component details available.</div>;
    }
    // Exclude technical fields you don't want to show
    const excludeFields = ['id', 'user_id', 'created_by', 'last_update_date', 'created_date', 'category_entry_id', 'data_verification_entry_id', 'signed_off_by', 'signed_off_date', 'mandatory_fields_completion_status', 'evidence_provided', 'document_status', 'year', 'component_unit_weight_id', 'sku_code', 'formulation_reference'];
    const columns = Object.keys(data[0]).filter(key => !excludeFields.includes(key));
    return (
      <div className="table-responsive tableCommon tableGreen" style={{ overflowX: 'auto', marginTop: 16 }}>
        <table className="table table-striped">
          <thead>
            <tr>
              <th style={{ background: '#39ea03', minWidth: 80, position: 'sticky', left: 0, zIndex: 2 }}>Actions</th>
              <th style={{ background: '#39ea03', minWidth: 80, position: 'sticky', left: 80, zIndex: 2 }}>Is Active</th>
              {columns.map(col => (
                <th key={col} style={{ background: '#39ea03', minWidth: 80 }}>{col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row.id || idx}>
                {/* Actions column */}
                <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                  <i className="ri-edit-line" style={{ cursor: 'pointer', marginRight: 8 }} title="Edit"></i>
                  <i className="ri-eye-line" style={{ cursor: 'pointer' }} title="View"></i>
                </td>
                {/* Is Active column */}
                <td style={{ position: 'sticky', left: 80, background: '#fff', zIndex: 1, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={!!row.is_active}
                    onChange={() => onStatusChange(row.id, !row.is_active, skuCode)}
                  />
                </td>
                {columns.map(col => (
                  <td key={col}>{row[col] !== null && row[col] !== undefined ? String(row[col]) : ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  useEffect(() => {
    if (filteredSkuData.length > 0 && openIndex === 0 && !componentDetails[filteredSkuData[0].sku_code]) {
      fetchComponentDetails(filteredSkuData[0].sku_code);
    }
    // eslint-disable-next-line
  }, [filteredSkuData]);

  // Add this function in your main component:
  const handleComponentStatusChange = async (componentId: number, newStatus: boolean, skuCode?: string) => {
    try {
      await fetch(`http://localhost:3000/component-status-change/${componentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      });
      // Update local state
      if (skuCode) {
        setComponentDetails(prev => ({
          ...prev,
          [skuCode]: prev[skuCode].map(row =>
            row.id === componentId ? { ...row, is_active: newStatus } : row
          )
        }));
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <Layout>
      {(loading || !minimumLoaderComplete) && <Loader />}
      <div className="mainInternalPages" style={{ display: (loading || !minimumLoaderComplete) ? 'none' : 'block' }}>
        <div style={{ 
          marginBottom: 8, 
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
              padding: '10px 16px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(48, 234, 3, 0.3)',
              transition: 'all 0.3s ease',
              minWidth: '100px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(48, 234, 3, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(48, 234, 3, 0.3)';
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: 18, marginRight: 6 }} />
            Back
          </button>
        </div>

        <div className="filters CMDetails">
          <div className="row">
            <div className="col-sm-12 ">
              <ul style={{ display: 'flex', alignItems: 'center' }}>
                <li><strong>3PM Code: </strong> {cmCode}</li>
                <li> | </li>
                <li><strong>3PM Description: </strong> {cmDescription}</li>
                <li> | </li>
                <li>
                  <strong>Status: </strong>
                  <span style={{
                    display: 'inline-block',
                    marginLeft: 8,
                    padding: '2px 14px',
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
                  <div className="fBold">Years</div>
                  <select
                    value={selectedYears.length > 0 ? selectedYears[0] : ''}
                    onChange={(e) => setSelectedYears(e.target.value ? [e.target.value] : [])}
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
                    {years.filter(y => y && typeof y === 'string' && y.trim() !== '').map((year, index) => (
                      <option key={index} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </li>
                <li>
                  <div className="fBold">SKU Code-Description</div>
                  <MultiSelect
                    options={skuDescriptions.filter(desc => desc && typeof desc === 'string' && desc.trim() !== '').map(desc => ({ value: desc, label: desc }))}
                    selectedValues={selectedSkuDescriptions}
                    onSelectionChange={setSelectedSkuDescriptions}
                    placeholder="Select SKU Code-Description..."
                    disabled={skuDescriptions.length === 0}
                    loading={skuDescriptions.length === 0}
                  />
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
                </li>
                <li style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btnCommon btnGreen"
                    style={{ minWidth: 120, fontWeight: 600 }}
                    onClick={() => setShowSkuModal(true)}
                  >
                    Add SKU <i className="ri-add-circle-line"></i>
                  </button>
                  <button
                    className="btnCommon btnGreen"
                    style={{ minWidth: 120 }}
                    onClick={handleExportToExcel}
                  >
                    Export to Excel <i className="ri-file-excel-2-line"></i>
                  </button>
                  <button
                    className="btnCommon btnGreen"
                    style={{ 
                      minWidth: 120,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600
                    }}
                    onClick={() => {
                      navigate(`/sedforapproval?cmCode=${encodeURIComponent(cmCode || '')}&cmDescription=${encodeURIComponent(cmDescription)}`);
                    }}
                  >
                    <i className="ri-file-pdf-2-line" style={{ fontSize: 16 }}></i>
                    Generate PDF
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
              filteredSkuData.map((sku, index) => (
                <div key={sku.id} className="panel panel-default" style={{ marginBottom: 10, borderRadius: 6, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                  <div
                    className="panel-heading panel-title"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', background: '#000', color: '#fff', fontWeight: 600 }}
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
                          padding: '6px 18px',
                          cursor: 'pointer',
                          marginLeft: 8,
                          minWidth: 90
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          handleHeaderStatusClick(sku.id, sku.is_active);
                        }}
                      >
                        {sku.is_active ? 'Active' : 'Deactive'}
                      </button>
                    </span>
                  </div>
                  <Collapse isOpened={openIndex === index}>
                    <div className="panel-body" style={{ minHeight: 80, padding: 24, position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 8 }}>
                        <button
                          style={{
                            background: '#30ea03',
                            color: '#000',
                            border: 'none',
                            borderRadius: 4,
                            fontWeight: 'bold',
                            padding: '8px 22px',
                            fontSize: 16,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                          title="Edit SKU"
                          onClick={() => {
                            console.log('SKU passed to Edit:', sku);
                            handleEditSkuOpen(sku);
                          }}
                        >
                          <i className="ri-pencil-line" style={{ fontSize: 18, marginRight: 6 }} />
                          Edit SKU
                        </button>
                        <button
                          style={{
                            background: '#30ea03',
                            color: '#000',
                            border: 'none',
                            borderRadius: 4,
                            fontWeight: 'bold',
                            padding: '8px 22px',
                            fontSize: 16,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                          title="Send for Approval"
                          onClick={() => {
                            navigate(`/sedforapproval?cmCode=${encodeURIComponent(cmCode || '')}&cmDescription=${encodeURIComponent(cmDescription)}`);
                          }}
                        >
                          <i className="ri-send-plane-2-line" style={{ fontSize: 18, marginRight: 6 }} />
                          Send for Approval
                        </button>
                      </div>
                      <p><strong>Reference SKU: </strong> {sku.sku_reference}</p>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 600, marginRight: 8 }}>Component Detail:</span>
                        <span style={{ marginRight: 8 }}>Packaging Type</span>
                        <input type="radio" name={`option-${sku.id}`} value="Option 1" style={{ marginRight: 8 }} />
                        <span style={{ marginRight: 8 }}>Material Type</span>
                        <input type="radio" name={`option-${sku.id}`} value="Option 2" style={{ marginRight: 8 }} />
                        <button
                          className="add-sku-btn"
                          style={{ backgroundColor: '#30ea03', color: '#000', marginLeft: 'auto', minWidth: 140 }}
                          onClick={e => { e.stopPropagation(); setSelectedSkuCode(sku.sku_code); setShowAddComponentModal(true); }}
                        >
                          Add Component <i className="ri-add-circle-line"></i>
                        </button>
                      </div>
                      {componentDetailsLoading[sku.sku_code] ? (
                        <div>Loading component details...</div>
                      ) : (
                        <ComponentTable data={componentDetails[sku.sku_code] || []} onStatusChange={handleComponentStatusChange} skuCode={sku.sku_code} />
                      )}
                    </div>
                  </Collapse>
                </div>
              ))
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
                  style={{ background: 'none', border: 'none', color: '#000', fontSize: 32, fontWeight: 900, lineHeight: 1, cursor: 'pointer', marginLeft: 8 }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body" style={{ background: '#fff' }}>
                <div className="container-fluid">
                  <div className="row g-3">
                    {/* Period dropdown */}
                    <div className="col-md-6">
                      <label>Period</label>
                      <select
                        className={`form-control${addSkuErrors.period ? ' is-invalid' : ''}`}
                        value={addSkuPeriod}
                        onChange={e => setAddSkuPeriod(e.target.value)}
                        disabled={addSkuLoading}
                      >
                        <option value="">Select Period</option>
                        {years.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      {addSkuErrors.period && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.period}</div>}
                    </div>
                    {/* SKU text field */}
                    <div className="col-md-6">
                      <label>SKU</label>
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
                      <label>SKU Description</label>
                      <input
                        type="text"
                        className={`form-control${addSkuErrors.skuDescription ? ' is-invalid' : ''}`}
                        value={addSkuDescription}
                        onChange={e => setAddSkuDescription(e.target.value)}
                        disabled={addSkuLoading}
                      />
                      {addSkuErrors.skuDescription && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.skuDescription}</div>}
                    </div>
                    {/* Purchased Quantity text field */}
                    <div className="col-md-6">
                      <label>Purchased Quantity</label>
                      <input
                        type="text"
                        className={`form-control${addSkuErrors.qty ? ' is-invalid' : ''}`}
                        value={addSkuQty}
                        onChange={e => setAddSkuQty(e.target.value)}
                        disabled={addSkuLoading}
                      />
                      {addSkuErrors.qty && <div className="invalid-feedback" style={{ color: 'red' }}>{addSkuErrors.qty}</div>}
                    </div>
                  </div>
                  {addSkuErrors.server && <div style={{ color: 'red', marginTop: 16, fontWeight: 600 }}>{addSkuErrors.server}</div>}
                  {addSkuSuccess && <div style={{ color: '#30ea03', marginTop: 16, fontWeight: 600 }}>{addSkuSuccess}</div>}
                </div>
              </div>
              {/* Professional footer, white bg, black top border, Save button right-aligned */}
              <div className="modal-footer" style={{ background: '#fff', borderTop: '2px solid #000', display: 'flex', justifyContent: 'flex-end' }}>
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
                  style={{ background: 'none', border: 'none', color: '#000', fontSize: 32, fontWeight: 900, lineHeight: 1, cursor: 'pointer', marginLeft: 8 }}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body" style={{ background: '#fff' }}>
                <div className="container-fluid">
                  <div className="row g-3">
                    {/* Period (read-only) */}
                    <div className="col-md-6">
                      <label>
                        Period <span style={{ color: 'red' }}>*</span>
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>
                          <i className="ri-lock-line" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Read Only
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.period}
                        readOnly
                        style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                      />
                    </div>
                    {/* SKU (read-only) */}
                    <div className="col-md-6">
                      <label>
                        SKU <span style={{ color: 'red' }}>*</span>
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>
                          <i className="ri-lock-line" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Read Only
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.sku}
                        readOnly
                        style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                      />
                    </div>
                    {/* SKU Description (read-only) */}
                    <div className="col-md-6">
                      <label>
                        SKU Description <span style={{ color: 'red' }}>*</span>
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>
                          <i className="ri-lock-line" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Read Only
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.skuDescription}
                        readOnly
                        style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                      />
                    </div>
                    {/* Purchased Quantity text field (required) */}
                    <div className="col-md-6">
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
                    </div>
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
                    {/* Formulation Reference text field (optional) */}
                    <div className="col-md-6">
                      <label>Formulation Reference</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editSkuData.formulationReference}
                        onChange={e => setEditSkuData({ ...editSkuData, formulationReference: e.target.value })}
                        placeholder="Enter Formulation Reference"
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
                  margin: 0
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
                padding: '30px',
                maxHeight: '70vh',
                overflowY: 'auto'
              }}>
                <div className="container-fluid" style={{ padding: 0 }}>
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
                  Material Type <InfoIcon info="Please select either Packaging or Raw Material for each SKU component" />
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
              <div className="col-md-6">
                <label>Component Code <InfoIcon info="Enter the unique code for this component." /></label>
                <input type="text" className="form-control" value={addComponentData.componentCode} onChange={e => setAddComponentData({ ...addComponentData, componentCode: e.target.value })} />
                {addComponentErrors.componentCode && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentCode}</div>}
              </div>
              {/* Component Description (Free text) */}
              <div className="col-md-6">
                <label>Component Description <InfoIcon info="Describe the component in detail." /></label>
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
              {/* Component Category (Drop-down list) */}
              <div className="col-md-6">
                <label>Component Category <InfoIcon info="Select the category for this component." /></label>
                <select
                  className="form-control select-with-icon"
                  value={addComponentData.componentCategory}
                  onChange={e => setAddComponentData({ ...addComponentData, componentCategory: e.target.value })}
                >
                  <option value="">Select Category</option>
                  <option value="Cat1">Category 1</option>
                  <option value="Cat2">Category 2</option>
                </select>
                {addComponentErrors.componentCategory && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentCategory}</div>}
              </div>
              {/* Component Quantity (Numeric) */}
              <div className="col-md-6">
                <label>Component Quantity <InfoIcon info="Enter the quantity of this component used." /></label>
                <input type="number" className="form-control" value={addComponentData.componentQuantity} onChange={e => setAddComponentData({ ...addComponentData, componentQuantity: e.target.value })} />
                {addComponentErrors.componentQuantity && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentQuantity}</div>}
              </div>
              {/* Component Unit of Measure (Drop-down list) */}
              <div className="col-md-6">
                <label>Component Unit of Measure <InfoIcon info="Select the unit of measure for the component quantity (e.g., PCS, KG)." /></label>
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
                  {materialTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.item_name}
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
                <input type="text" className="form-control" value={addComponentData.componentDimensions} onChange={e => setAddComponentData({ ...addComponentData, componentDimensions: e.target.value })} />
                {addComponentErrors.componentDimensions && <div style={{ color: 'red', fontSize: 13 }}>{addComponentErrors.componentDimensions}</div>}
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
                    File Upload Section
                  </h6>
                  
                  <div className="row">
                    <div className="col-md-6">
                      <label style={{ 
                        fontWeight: '600', 
                        color: '#333', 
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        Select Categories <InfoIcon info="Choose one or more categories for file upload." />
                      </label>
                      <MultiSelect
                        options={[
                          { value: '1', label: 'Category 1' },
                          { value: '2', label: 'Category 2' },
                          { value: '3', label: 'Category 3' },
                          { value: '4', label: 'Category 4' }
                        ]}
                        selectedValues={selectedCategories}
                        onSelectionChange={setSelectedCategories}
                        placeholder="Select Categories..."
                      />
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
                              const newUpload = {
                                id: Date.now().toString(),
                                categories: selectedCategories,
                                files: selectedFiles
                              };
                              setUploadedFiles(prev => [...prev, newUpload]);
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

        {/* Display Uploaded Files Table */}
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
                  <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
                              {upload.categories.map(cat => `Category ${cat}`).join(', ')}
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
                    onClick={handleAddComponentSave}
                  >
                    <i className="ri-save-line" style={{ fontSize: '16px' }} />
                    Save
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

      {/* Responsive styles for button layout */}
      <style>{`
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