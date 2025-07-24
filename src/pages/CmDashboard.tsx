import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import MultiSelect from '../components/MultiSelect';
import Pagination from '../components/Pagination';
import * as XLSX from 'xlsx';
import { Link, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { useMsal } from '@azure/msal-react';

// Interface for CM Code data structure with signoff status
interface CmCode {
  cm_code: string;
  cm_description: string;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  signoff_by?: string | null;
  signoff_date?: string | null;
  signoff_status?: string | null;
  document_url?: string | null;
  periods?: string | null; // Comma-separated period IDs like "2,3"
  region?: string | null;
  srm_lead?: string | null;
  is_active?: boolean;
}

// Interface for new 3PM data
interface New3PMData {
  cm_code: string;
  cm_description: string;
  region: string;
}

// Interface for Period data structure
interface Period {
  id: number;
  period: string;
}

// Interface for Signoff Details
interface SignoffDetail {
  [key: string]: any; // Allow any properties from API response
}

// Interface for API Response
interface SignoffApiResponse {
  success: boolean;
  cm_code: string;
  count: number;
  data: SignoffDetail[];
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  count: number;
  data: CmCode[];
}

// CmDashboard: Main dashboard page for the sustainability portal
const CmDashboard: React.FC = () => {
  const [cmCodes, setCmCodes] = useState<CmCode[]>([]);
  const [signoffStatuses, setSignoffStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCmCodes, setSelectedCmCodes] = useState<string[]>([]);
  const [selectedSignoffStatuses, setSelectedSignoffStatuses] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedSrmLeads, setSelectedSrmLeads] = useState<string[]>([]);
  const [periods, setPeriods] = useState<Array<{id: number, period: string}>>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [srmLeads, setSrmLeads] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  // Signoff modal state
  const [showSignoffModal, setShowSignoffModal] = useState(false);
  const [selectedCmCode, setSelectedCmCode] = useState<string>('');
  const [signoffDetails, setSignoffDetails] = useState<SignoffDetail[]>([]);
  const [signoffLoading, setSignoffLoading] = useState(false);
  const [signoffError, setSignoffError] = useState<string | null>(null);
  const [selectedSignoffPeriod, setSelectedSignoffPeriod] = useState<string>('');

  // Add 3PM modal state
  const [showAdd3PMModal, setShowAdd3PMModal] = useState(false);
  const [new3PMData, setNew3PMData] = useState<New3PMData>({
    cm_code: '',
    cm_description: '',
    region: ''
  });
  const [add3PMLoading, setAdd3PMLoading] = useState(false);
  const [add3PMError, setAdd3PMError] = useState<string | null>(null);

  const [appliedFilters, setAppliedFilters] = useState<{
    cmCodes: string[];
    signoffStatuses: string[];
    period: string;
    region: string[];
    srmLead: string[];
  }>({ cmCodes: [], signoffStatuses: [], period: '', region: [], srmLead: [] });

  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  // Fetch CM codes from API
  useEffect(() => {
    const fetchCmCodes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Making API call to:', 'http://localhost:3000/cm-codes');
        
        const response = await fetch('http://localhost:3000/cm-codes', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const result: ApiResponse = await response.json();
        
        if (result.success) {
          console.log('CM Codes API Response:', result.data);
          console.log('Sample CM Code with periods:', result.data.find(item => item.periods));
          console.log('Sample CM Code with signoff_status:', result.data.find(item => item.signoff_status));
          console.log('All signoff_status values:', result.data.map(item => ({ cm_code: item.cm_code, signoff_status: item.signoff_status })));
          setCmCodes(result.data);
          
          // Extract unique signoff statuses for filter (if available)
          const uniqueStatuses = Array.from(new Set(result.data.map(item => item.signoff_status).filter((status): status is string => Boolean(status))));
          if (uniqueStatuses.length > 0) {
            setSignoffStatuses(uniqueStatuses);
          } else {
            // Fallback to default statuses if not available in API
            setSignoffStatuses(['signed', 'pending', 'rejected']);
          }
        } else {
          throw new Error('API returned unsuccessful response');
        }
      } catch (err) {
        console.error('Error fetching CM codes:', err);
        
        // Provide more specific error messages
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch')) {
            setError('Backend server is not running. Please start the backend on port 3000.');
          } else if (err.message.includes('401')) {
            setError('Authentication failed. Please check if the backend is configured to accept requests.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to fetch CM codes');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCmCodes();
  }, []);

  // Fetch periods from API
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const response = await fetch('http://localhost:3000/sku-details-active-years');
        if (!response.ok) throw new Error('Failed to fetch periods');
        const result = await response.json();
        console.log('Periods API Response:', result);
        if (result.success && Array.isArray(result.years)) {
          // Handle both string and object formats
          const processedPeriods = result.years.map((item: any) => {
            if (typeof item === 'string') {
              return { id: item, period: item };
            } else if (item && typeof item === 'object' && item.id && item.period) {
              return { id: item.id, period: item.period };
            } else {
              return null;
            }
          }).filter(Boolean);
          setPeriods(processedPeriods);
          console.log('Available periods:', processedPeriods);
          
          // Set current period as default (most recent period)
          if (processedPeriods.length > 0) {
            // Sort periods to get the most recent one (assuming periods are in format like "2024", "2025", etc.)
            const sortedPeriods = [...processedPeriods].sort((a, b) => {
              const aYear = parseInt(a.period);
              const bYear = parseInt(b.period);
              return bYear - aYear; // Sort in descending order (most recent first)
            });
            
            const currentPeriod = sortedPeriods[0];
            console.log('Setting current period as default:', currentPeriod);
            setSelectedPeriod(currentPeriod.id.toString());
            
            // Apply the current period filter automatically
            setAppliedFilters(prev => ({
              ...prev,
              period: currentPeriod.id.toString()
            }));
          }
        } else {
          setPeriods([]);
        }
      } catch (err) {
        console.error('Error fetching periods:', err);
        setPeriods([]);
      }
    };
    fetchPeriods();
  }, []);

  // Fetch regions from API
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await fetch('http://localhost:3000/regions');
        if (!response.ok) throw new Error('Failed to fetch regions');
        const result = await response.json();
        console.log('Regions API Response:', result);
        if (result.success && Array.isArray(result.regions)) {
          setRegions(result.regions);
          console.log('Available regions:', result.regions);
        } else {
          setRegions([]);
        }
      } catch (err) {
        console.error('Error fetching regions:', err);
        setRegions([]);
      }
    };
    fetchRegions();
  }, []);

  // Fetch SRM Leads from API
  useEffect(() => {
    const fetchSrmLeads = async () => {
      try {
        const response = await fetch('http://localhost:3000/srm-leads');
        if (!response.ok) throw new Error('Failed to fetch SRM Leads');
        const result = await response.json();
        console.log('SRM Leads API Response:', result);
        if (result.success && Array.isArray(result.srmLeads)) {
          setSrmLeads(result.srmLeads);
          console.log('Available SRM Leads:', result.srmLeads);
        } else {
          setSrmLeads([]);
        }
      } catch (err) {
        console.error('Error fetching SRM Leads:', err);
        setSrmLeads([]);
      }
    };
    fetchSrmLeads();
  }, []);

  // Set current period as default and apply filter when periods are loaded
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      // If periods are loaded but no period is selected, set the current period
      const sortedPeriods = [...periods].sort((a, b) => {
        const aYear = parseInt(a.period);
        const bYear = parseInt(b.period);
        return bYear - aYear; // Sort in descending order (most recent first)
      });
      
      if (sortedPeriods.length > 0) {
        const currentPeriod = sortedPeriods[0];
        console.log('Setting current period as default and applying filter:', currentPeriod);
        setSelectedPeriod(currentPeriod.id.toString());
        
        // Apply current period filter by default
        setAppliedFilters(prev => ({
          ...prev,
          period: currentPeriod.id.toString()
        }));
      }
    }
  }, [periods, selectedPeriod]);

  // Handle search and reset
  const handleSearch = () => {
    console.log('Applying additional filters:', {
      cmCodes: selectedCmCodes,
      signoffStatuses: selectedSignoffStatuses,
      period: selectedPeriod,
      region: selectedRegions,
      srmLead: selectedSrmLeads
    });
    
    // Apply the selected filters (including current period)
    setAppliedFilters({
      cmCodes: selectedCmCodes,
      signoffStatuses: selectedSignoffStatuses,
      period: selectedPeriod,
      region: selectedRegions,
      srmLead: selectedSrmLeads
    });
    
    // Reset to first page when applying filters
    setCurrentPage(1);
    
    // You can add your search logic here
    // For example, filter the table data based on selected values
    if (selectedCmCodes.length > 0) {
      console.log(`Filtering by 3PM Codes: ${selectedCmCodes.join(', ')}`);
    }
    if (selectedSignoffStatuses.length > 0) {
      console.log(`Filtering by Signoff Statuses: ${selectedSignoffStatuses.join(', ')}`);
    }
    if (selectedPeriod) {
      console.log(`Filtering by Period: ${selectedPeriod}`);
    }
    if (selectedRegions.length > 0) {
      console.log(`Filtering by Regions: ${selectedRegions.join(', ')}`);
    }
    if (selectedSrmLeads.length > 0) {
      console.log(`Filtering by SRM Leads: ${selectedSrmLeads.join(', ')}`);
    }
  };

  const handleReset = () => {
    // Clear all filters except period
    setSelectedCmCodes([]);
    setSelectedSignoffStatuses([]);
    setSelectedRegions([]);
    setSelectedSrmLeads([]);
    
    // Set current period as default and apply it as filter
    if (periods.length > 0) {
      const sortedPeriods = [...periods].sort((a, b) => {
        const aYear = parseInt(a.period);
        const bYear = parseInt(b.period);
        return bYear - aYear; // Sort in descending order (most recent first)
      });
      const currentPeriod = sortedPeriods[0];
      setSelectedPeriod(currentPeriod.id.toString());
      
      // Apply current period filter
      setAppliedFilters({ cmCodes: [], signoffStatuses: [], period: currentPeriod.id.toString(), region: [], srmLead: [] });
    } else {
      setSelectedPeriod('');
      setAppliedFilters({ cmCodes: [], signoffStatuses: [], period: '', region: [], srmLead: [] });
    }
    
    setCurrentPage(1);
    
    // Refresh data from API
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3000/cm-codes', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ApiResponse = await response.json();
        
        if (result.success) {
          setCmCodes(result.data);
          
          // Extract unique signoff statuses for filter (if available)
          const uniqueStatuses = Array.from(new Set(result.data.map(item => item.signoff_status).filter((status): status is string => Boolean(status))));
          if (uniqueStatuses.length > 0) {
            setSignoffStatuses(uniqueStatuses);
          } else {
            // Fallback to default statuses if not available in API
            setSignoffStatuses(['signed', 'pending', 'rejected']);
          }
        } else {
          throw new Error('API returned unsuccessful response');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch CM codes');
        console.error('Error fetching CM codes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  };

  // Filter data based on applied filters
  const filteredData = useMemo(() => {
    let filtered = cmCodes;
    console.log('Starting filter with total items:', filtered.length);
    console.log('Applied filters:', appliedFilters);

    // Filter by CM Code
    if (appliedFilters.cmCodes.length > 0) {
      filtered = filtered.filter(item => appliedFilters.cmCodes.includes(item.cm_code));
      console.log(`Filtered by CM Codes: ${appliedFilters.cmCodes.join(', ')}. Results: ${filtered.length}`);
    }

    // Filter by Signoff Status
    if (appliedFilters.signoffStatuses.length > 0) {
      filtered = filtered.filter(item => 
        item.signoff_status && appliedFilters.signoffStatuses.includes(item.signoff_status)
      );
      console.log(`Filtered by Signoff Statuses: ${appliedFilters.signoffStatuses.join(', ')}. Results: ${filtered.length}`);
    }

    // Filter by Period
    if (appliedFilters.period) {
      const beforePeriodFilter = filtered.length;
      console.log(`Applying period filter for period ID: "${appliedFilters.period}"`);
      console.log(`Items before period filter:`, filtered.map(item => ({ cm_code: item.cm_code, periods: item.periods })));
      
      filtered = filtered.filter(item => {
        // Check if the item has period data (assuming it's stored as comma-separated values)
        if (item.periods) {
          // Split the comma-separated period values and check if selected period ID exists
          const itemPeriods = item.periods.split(',').map((p: string) => p.trim());
          const selectedPeriodId = appliedFilters.period; // This is the ID value from dropdown
          const matches = itemPeriods.includes(selectedPeriodId);
          console.log(`Item ${item.cm_code} has periods: "${item.periods}" -> [${itemPeriods}]. Selected Period ID: "${selectedPeriodId}". Match: ${matches}`);
          return matches;
        }
        console.log(`Item ${item.cm_code} has no period data`);
        return false; // If no period data, exclude from results
      });
      console.log(`Filtered by Period ID: ${appliedFilters.period}. Before: ${beforePeriodFilter}, After: ${filtered.length}`);
    }

    // Filter by Region
    if (appliedFilters.region.length > 0) {
      filtered = filtered.filter(item => 
        item.region && appliedFilters.region.includes(item.region)
      );
      console.log(`Filtered by Regions: ${appliedFilters.region.join(', ')}. Results: ${filtered.length}`);
    }

    // Filter by SRM Lead
    if (appliedFilters.srmLead.length > 0) {
      filtered = filtered.filter(item => 
        item.srm_lead && appliedFilters.srmLead.includes(item.srm_lead)
      );
      console.log(`Filtered by SRM Leads: ${appliedFilters.srmLead.join(', ')}. Results: ${filtered.length}`);
    }

    console.log(`Final filtered results: ${filtered.length} items`);
    return filtered;
  }, [cmCodes, appliedFilters]);

  // Pagination logic
  const totalRecords = filteredData.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleExportToExcel = () => {
    const exportData = currentData.map(row => ({
      '3PM Code': row.cm_code,
      '3PM Description': row.cm_description,
      'Region': row.region || '',
      'SRM Lead': row.srm_lead || '',
      'Signoff Status': row.signoff_status === 'signed'
        ? 'Signed'
        : row.signoff_status === 'rejected'
        ? 'Rejected'
        : row.signoff_status === 'pending'
        ? 'Pending'
        : '',
      'Signoff By': row.signoff_by || '',
      'Signoff Date': row.signoff_date || '',
      'Is Active': row.is_active ? 'Yes' : 'No'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, 'cm-data.xlsx');
  };

  // Handle file icon click to show signoff details
  const handleFileIconClick = async (cmCode: string) => {
    console.log('File icon clicked for CM Code:', cmCode);
    setSelectedCmCode(cmCode);
    setShowSignoffModal(true);
    console.log('Modal should be open now, showSignoffModal:', true);
    setSignoffLoading(true);
    setSignoffError(null);
    setSignoffDetails([]);
    setSelectedSignoffPeriod('');

    // Use the selected period from dashboard filter, or current period if none selected
    let periodToUse = selectedPeriod;
    if (!periodToUse && periods.length > 0) {
      const sortedPeriods = [...periods].sort((a, b) => {
        const aYear = parseInt(a.period);
        const bYear = parseInt(b.period);
        return bYear - aYear; // Sort in descending order (most recent first)
      });
      periodToUse = sortedPeriods[0].id.toString();
      console.log('No period selected, using current period for signoff details:', periodToUse);
    } else {
      console.log('Using selected period from dashboard filter for signoff details:', periodToUse);
    }

    // Fetch signoff details with the appropriate period
    await fetchSignoffDetails(cmCode, periodToUse);
  };

  // Function to fetch signoff details with period filter
  const fetchSignoffDetails = async (cmCode: string, period?: string) => {
    try {
      setSignoffLoading(true);
      setSignoffError(null);
      
      let url = `http://localhost:3000/signoff-details-by-cm-period?cm_code=${encodeURIComponent(cmCode)}`;
      if (period) {
        url += `&period=${encodeURIComponent(period)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SignoffApiResponse = await response.json();
      console.log('Signoff Details API Response:', result);
      
      if (result.success) {
        if (result.data && Array.isArray(result.data)) {
          setSignoffDetails(result.data);
        } else {
          setSignoffDetails([]);
        }
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err) {
      console.error('Error fetching signoff details:', err);
      setSignoffError(err instanceof Error ? err.message : 'Failed to fetch signoff details');
    } finally {
      setSignoffLoading(false);
    }
  };

  // Handle close signoff modal
  const handleCloseSignoffModal = () => {
    setShowSignoffModal(false);
    setSelectedCmCode('');
    setSignoffDetails([]);
    setSignoffError(null);
  };

  // Handle open Add 3PM modal
  const handleOpenAdd3PMModal = () => {
    setShowAdd3PMModal(true);
    setNew3PMData({
      cm_code: '',
      cm_description: '',
      region: ''
    });
    setAdd3PMError(null);
  };

  // Handle close Add 3PM modal
  const handleCloseAdd3PMModal = () => {
    setShowAdd3PMModal(false);
    setNew3PMData({
      cm_code: '',
      cm_description: '',
      region: ''
    });
    setAdd3PMError(null);
  };

  // Handle Add 3PM form input changes
  const handleAdd3PMInputChange = (field: keyof New3PMData, value: string) => {
    setNew3PMData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle Add 3PM form submission
  const handleAdd3PMSave = async () => {
    try {
      setAdd3PMLoading(true);
      setAdd3PMError(null);

      // Validate required fields
      if (!new3PMData.cm_code.trim()) {
        throw new Error('3PM Code is required');
      }
      if (!new3PMData.cm_description.trim()) {
        throw new Error('3PM Description is required');
      }
      if (!new3PMData.region.trim()) {
        throw new Error('Region is required');
      }

      // Check if 3PM code already exists
      const existingCode = cmCodes.find(cm => cm.cm_code.toLowerCase() === new3PMData.cm_code.toLowerCase());
      if (existingCode) {
        throw new Error('3PM Code already exists');
      }

      // TODO: Replace with actual API call
      // const response = await fetch('http://localhost:3000/cm-codes', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(new3PMData)
      // });

      // if (!response.ok) {
      //   throw new Error('Failed to add 3PM code');
      // }

      // For now, simulate success
      console.log('Adding new 3PM:', new3PMData);
      
      // Close modal and refresh data
      handleCloseAdd3PMModal();
      
      // Refresh the CM codes list
      const fetchData = async () => {
        try {
          setLoading(true);
          const response = await fetch('http://localhost:3000/cm-codes', {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result: ApiResponse = await response.json();
          
          if (result.success) {
            setCmCodes(result.data);
          } else {
            throw new Error('API returned unsuccessful response');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch CM codes');
          console.error('Error fetching CM codes:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
      
    } catch (err) {
      setAdd3PMError(err instanceof Error ? err.message : 'Failed to add 3PM code');
      console.error('Error adding 3PM:', err);
    } finally {
      setAdd3PMLoading(false);
    }
  };

  // Handle is_active status change
  const handleIsActiveChange = async (cmCode: string, currentStatus: boolean) => {
    try {
      // Optimistically update the UI
      setCmCodes(prev => prev.map(cm => 
        cm.cm_code === cmCode ? { ...cm, is_active: !currentStatus } : cm
      ));

      // Make API call to update the status
      const response = await fetch(`http://localhost:3000/cm-codes/${encodeURIComponent(cmCode)}/toggle-active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (!response.ok) {
        // Revert the change if API call fails
        setCmCodes(prev => prev.map(cm => 
          cm.cm_code === cmCode ? { ...cm, is_active: currentStatus } : cm
        ));
        throw new Error('Failed to update status');
      }

      console.log(`Successfully updated is_active status for ${cmCode} to ${!currentStatus}`);
    } catch (err) {
      console.error('Error updating is_active status:', err);
      // Revert the change if API call fails
      setCmCodes(prev => prev.map(cm => 
        cm.cm_code === cmCode ? { ...cm, is_active: currentStatus } : cm
      ));
    }
  };


  // Filter signoff details - since we're using one API, we just show the data as returned
  const filteredSignoffDetails = signoffDetails;

  return (
    <Layout>
      {loading && <Loader />}
      <div className="mainInternalPages" style={{ opacity: loading ? 0.5 : 1 }}>
        <div className="commonTitle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="icon">
              <i className="ri-table-line"></i>
            </div>
            <h1>3PM Dashboard</h1>
          </div>
          <button
            onClick={handleOpenAdd3PMModal}
            style={{
              background: '#30ea03',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#28c003';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#30ea03';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <i className="ri-add-line"></i>
            Add 3PM
          </button>
        </div>
        <div className="row">
          <div className="col-sm-12">
            <div className="filters">
              <div className="filter-bar" style={{ display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="fBold" style={{ marginBottom: 4 }}>Period</div>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="filter-control"
                    style={{ width: '100%', height: '38px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', backgroundColor: '#fff' }}
                    disabled={loading}
                  >
                    <option value="">Select Period</option>
                    {periods.map(period => (
                      <option key={period.id} value={period.id.toString()}>
                        {period.period}
                      </option>
                    ))}
                  </select>
                  {loading && <small style={{color: '#666'}}>Loading periods...</small>}
                  {error && <small style={{color: 'red'}}>Error: {error}</small>}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="fBold" style={{ marginBottom: 4 }}>Region</div>
                  <MultiSelect
                    options={regions.map(region => ({
                      value: region,
                      label: region.charAt(0).toUpperCase() + region.slice(1)
                    }))}
                    selectedValues={selectedRegions}
                    onSelectionChange={setSelectedRegions}
                    placeholder="Select Regions..."
                    disabled={loading}
                    loading={loading}
                  />
                  {loading && <small style={{color: '#666'}}>Loading regions...</small>}
                  {error && <small style={{color: 'red'}}>Error: {error}</small>}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="fBold" style={{ marginBottom: 4 }}>SRM Lead</div>
                  <MultiSelect
                    options={srmLeads.map(srmLead => ({
                      value: srmLead,
                      label: srmLead.charAt(0).toUpperCase() + srmLead.slice(1)
                    }))}
                    selectedValues={selectedSrmLeads}
                    onSelectionChange={setSelectedSrmLeads}
                    placeholder="Select SRM Leads..."
                    disabled={loading}
                    loading={loading}
                  />
                  {loading && <small style={{color: '#666'}}>Loading SRM Leads...</small>}
                  {error && <small style={{color: 'red'}}>Error: {error}</small>}
                </div>
                <div style={{ flex: 2, minWidth: 220 }}>
                  <div className="fBold" style={{ marginBottom: 4 }}>3PM Code - Description</div>
                  <MultiSelect
                    options={cmCodes
                      .sort((a, b) => a.cm_description.localeCompare(b.cm_description))
                      .map(cmCode => ({
                        value: cmCode.cm_code,
                        label: `${cmCode.cm_code} - ${cmCode.cm_description}`
                      }))
                    }
                    selectedValues={selectedCmCodes}
                    onSelectionChange={setSelectedCmCodes}
                    placeholder="Select 3PM Codes..."
                    disabled={loading}
                    loading={loading}
                  />
                  {loading && <small style={{color: '#666'}}>Loading 3PM codes...</small>}
                  {error && <small style={{color: 'red'}}>Error: {error}</small>}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div className="fBold" style={{ marginBottom: 4 }}>Signoff Status</div>
                  <MultiSelect
                    options={signoffStatuses.map(status => ({
                      value: status,
                      label: status.charAt(0).toUpperCase() + status.slice(1)
                    }))}
                    selectedValues={selectedSignoffStatuses}
                    onSelectionChange={setSelectedSignoffStatuses}
                    placeholder="Select Signoff Status..."
                    disabled={loading}
                    loading={loading}
                  />
                  {loading && <small style={{color: '#666'}}>Loading signoff statuses...</small>}
                  {error && <small style={{color: 'red'}}>Error: {error}</small>}
                </div>
                <div style={{ minWidth: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <button 
                    className="btnCommon btnGreen filter-control"
                    style={{ height: '38px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    <span>Apply Filters</span>
                    <i className="ri-search-line"></i>
                  </button>
                </div>
                <div style={{ minWidth: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <button 
                    className="btnCommon btnBlack filter-control"
                    style={{ height: '38px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={handleReset}
                    disabled={loading}
                  >
                    <span>Reset</span>
                    <i className="ri-refresh-line"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button
            onClick={handleExportToExcel}
            style={{
              background: '#30ea03',
              color: '#000',
              border: 'none',
              borderRadius: 4,
              padding: '8px 18px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Export to Excel
          </button>
        </div>
        <div className="table-responsive tableCommon">

          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <i className="ri-loader-4-line spinning" style={{ fontSize: '24px', color: '#666' }}></i>
              <p>Loading table data...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
              <p>Error loading table data: {error}</p>
            </div>
          ) : (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>3PM Code</th>
                  <th>3PM Description</th>
                  <th>Region</th>
                  <th>SRM Lead</th>
                  <th>Signoff Status</th>
                  <th>Signoff By/Rejected By</th>
                  <th>Signoff Date/ Rejected Date</th>
                  <th style={{ width: '80px', padding: '8px 4px', textAlign: 'center' }}>Is Active</th>
                  <th style={{ width: '60px', padding: '8px 4px', textAlign: 'center' }}>Document</th>
                  <th style={{ width: '60px', padding: '8px 4px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '12px' }}>Add/View SKU</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '20px' }}>
                      No data available
                    </td>
                  </tr>
                ) : (
                  currentData.map((row: CmCode, index: number) => (
                    <tr key={index}>
                      <td>{row.cm_code}</td>
                      <td>{row.cm_description}</td>
                      <td>{row.region || '-'}</td>
                      <td>{row.srm_lead || '-'}</td>
                      <td
                        className={
                          row.signoff_status === 'signed'
                            ? 'status-cell approved'
                            : row.signoff_status === 'rejected'
                            ? 'status-cell rejected'
                            : row.signoff_status === 'pending'
                            ? 'status-cell pending'
                            : ''
                        }
                      >
                        {(() => {
                          console.log('Row signoff_status:', row.signoff_status, 'Type:', typeof row.signoff_status);
                          return row.signoff_status === 'signed'
                            ? 'Signed'
                            : row.signoff_status === 'rejected'
                            ? 'Rejected'
                            : row.signoff_status === 'pending'
                            ? 'Pending'
                            : row.signoff_status || 'No Status';
                        })()}
                      </td>
                      <td>
                        {row.signoff_status === 'signed' ? row.signoff_by : '-'}
                      </td>
                      <td>
                        {row.signoff_status === 'signed' ? row.signoff_date : '-'}
                      </td>
                      <td style={{ padding: '8px 4px', width: '80px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                          <input
                            type="checkbox"
                            checked={row.is_active || false}
                            onChange={() => handleIsActiveChange(row.cm_code, row.is_active || false)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#30ea03'
                            }}
                            title={row.is_active ? 'Deactivate 3PM' : 'Activate 3PM'}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '8px 4px', width: '60px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                          <button
                            type="button"
                            onClick={() => handleFileIconClick(row.cm_code)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#000',
                              color: '#fff',
                              borderRadius: 4,
                              width: 28,
                              height: 28,
                              fontSize: 14,
                              border: 'none',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              cursor: 'pointer',
                              textDecoration: 'none',
                              margin: 0,
                              padding: 0
                            }}
                            title="View Document Details"
                          >
                            <i className="ri-file-line"></i>
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '8px 4px', width: '60px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                          <button
                            onClick={() => {
                              console.log('Eye icon clicked for CM Code:', row.cm_code);
                              console.log('Navigating to:', `/cm/${row.cm_code}`);
                              // Use proper React Router navigation
                              navigate(`/cm/${row.cm_code}`, { 
                                state: { 
                                  cmDescription: row.cm_description, 
                                  status: row.signoff_status 
                                } 
                              });
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#000',
                              color: '#fff',
                              borderRadius: 4,
                              width: 28,
                              height: 28,
                              fontSize: 14,
                              border: 'none',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              cursor: 'pointer',
                              textDecoration: 'none',
                              margin: 0,
                              padding: 0
                            }}
                            title="View SKU Details"
                          >
                            <i className="ri-eye-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {!loading && !error && currentData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      {/* Signoff Details Modal */}
      {showSignoffModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="signoff-modal" style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
            width: '80%',
            maxWidth: '1200px',
            height: '95vh',
            padding: '40px',
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            borderRadius: '12px',
            position: 'relative',
            border: '2px solid #e9ecef'
          }}>
            {/* Close Button */}
            <button
              onClick={handleCloseSignoffModal}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#000',
                border: 'none',
                fontSize: '24px',
                color: '#fff',
                cursor: 'pointer',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                zIndex: 1000
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#333';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#000';
                e.currentTarget.style.color = '#fff';
              }}
            >
              <i className="ri-close-line"></i>
            </button>
            
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333', paddingRight: '50px' }}>
              Signoff Details for {selectedCmCode}
            </h2>
            
            {signoffLoading && <Loader />}
            {signoffError && <p style={{ color: 'red' }}>{signoffError}</p>}
            {filteredSignoffDetails.length > 0 && (
              <div>
                <div style={{ 
                  marginBottom: '24px',
                  paddingBottom: '16px',
                  borderBottom: '2px solid #e9ecef'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '18px', fontWeight: '600' }}>
                    Signoff Records
                  </h3>
                </div>
                
                {filteredSignoffDetails.map((record, index) => (
                  <div key={index} style={{ 
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Key Fields in Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '8px'
                    }}>
                      {/* Signoff By */}
                      <div style={{
                        background: '#ffffff',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #e9ecef',
                        position: 'relative'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '4px'
                        }}>
                          <i className="ri-user-line" style={{ color: '#30ea03', fontSize: '12px' }}></i>
                          <span style={{ fontSize: '10px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                            Signoff By
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>
                          {record.signoff_by || 'N/A'}
                        </div>
                      </div>

                      {/* Document URL */}
                      <div style={{
                        background: '#ffffff',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #e9ecef',
                        position: 'relative'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '4px'
                        }}>
                          <i className="ri-file-line" style={{ color: '#30ea03', fontSize: '12px' }}></i>
                          <span style={{ fontSize: '10px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                            Document
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>
                          {record.document_url ? (
                            <a 
                              href={record.document_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                color: '#007bff',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <i className="ri-external-link-line" style={{ fontSize: '10px' }}></i>
                              View Document
                            </a>
                          ) : (
                            <span style={{ color: '#6c757d' }}>No document available</span>
                          )}
                        </div>
                      </div>

                      {/* Period */}
                      <div style={{
                        background: '#ffffff',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #e9ecef',
                        position: 'relative'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '4px'
                        }}>
                          <i className="ri-calendar-line" style={{ color: '#30ea03', fontSize: '12px' }}></i>
                          <span style={{ fontSize: '10px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                            Period
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>
                          {record.period ? (
                            (() => {
                              // Convert period ID to readable format
                              const periodId = record.period;
                              const periodMap: { [key: string]: string } = {
                                '1': 'July 2024 to June 2025',
                                '2': 'July 2025 to June 2026',
                                '3': 'July 2026 to June 2027',
                                '4': 'July 2027 to June 2028',
                                '5': 'July 2028 to June 2029'
                              };
                              return periodMap[periodId] || `Period ${periodId}`;
                            })()
                          ) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button 
              style={{
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 20px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '16px'
              }}
              onClick={handleCloseSignoffModal}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add 3PM Modal */}
      {showAdd3PMModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="add-3pm-modal" style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
            width: '90%',
            maxWidth: '500px',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            position: 'relative',
            border: '2px solid #e9ecef'
          }}>
            {/* Close Button */}
            <button
              onClick={handleCloseAdd3PMModal}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: '#000',
                border: 'none',
                fontSize: '20px',
                color: '#fff',
                cursor: 'pointer',
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                zIndex: 1000
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#333';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#000';
              }}
            >
              <i className="ri-close-line"></i>
            </button>
            
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '25px', 
              color: '#333', 
              paddingRight: '40px',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Add New 3PM
            </h2>
            
            {add3PMLoading && <Loader />}
            {add3PMError && (
              <div style={{
                background: '#f8d7da',
                color: '#721c24',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '20px',
                border: '1px solid #f5c6cb'
              }}>
                <i className="ri-error-warning-line" style={{ marginRight: '8px' }}></i>
                {add3PMError}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#333',
                fontSize: '14px'
              }}>
                3PM Code <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="text"
                value={new3PMData.cm_code}
                onChange={(e) => handleAdd3PMInputChange('cm_code', e.target.value)}
                placeholder="Enter 3PM Code"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#fff'
                }}
                disabled={add3PMLoading}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#333',
                fontSize: '14px'
              }}>
                3PM Description <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <textarea
                value={new3PMData.cm_description}
                onChange={(e) => handleAdd3PMInputChange('cm_description', e.target.value)}
                placeholder="Enter 3PM Description"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  resize: 'vertical'
                }}
                disabled={add3PMLoading}
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#333',
                fontSize: '14px'
              }}>
                Region <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <select
                value={new3PMData.region}
                onChange={(e) => handleAdd3PMInputChange('region', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#fff'
                }}
                disabled={add3PMLoading}
              >
                <option value="">Select Region</option>
                <option value="North America">North America</option>
                <option value="Europe">Europe</option>
                <option value="Asia Pacific">Asia Pacific</option>
                <option value="Latin America">Latin America</option>
                <option value="Middle East & Africa">Middle East & Africa</option>
                <option value="Global">Global</option>
              </select>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCloseAdd3PMModal}
                style={{
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                disabled={add3PMLoading}
                onMouseEnter={(e) => {
                  if (!add3PMLoading) e.currentTarget.style.background = '#5a6268';
                }}
                onMouseLeave={(e) => {
                  if (!add3PMLoading) e.currentTarget.style.background = '#6c757d';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd3PMSave}
                style={{
                  background: '#30ea03',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                disabled={add3PMLoading}
                onMouseEnter={(e) => {
                  if (!add3PMLoading) {
                    e.currentTarget.style.background = '#28c003';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!add3PMLoading) {
                    e.currentTarget.style.background = '#30ea03';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {add3PMLoading ? (
                  <>
                    <i className="ri-loader-4-line spinning"></i>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="ri-save-line"></i>
                    Add 3PM
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .filter-bar .multi-select-container, .filter-bar .multi-select-trigger, .filter-bar .filter-control {
          min-height: 38px !important;
          height: 38px !important;
        }
        .filter-bar .multi-select-container {
          width: 100%;
        }
        .filter-bar .multi-select-trigger {
          width: 100%;
        }
        .filter-bar .fBold {
          margin-bottom: 4px;
        }
        /* Responsive filter bar */
        @media (max-width: 1200px) {
          .filter-bar { flex-direction: column !important; gap: 12px !important; }
          .filter-bar > div { width: 100% !important; min-width: 0 !important; }
        }
        /* Responsive table: horizontal scroll on small screens */
        @media (max-width: 900px) {
          .table-responsive { overflow-x: auto !important; }
          .tableCommon table { min-width: 1000px !important; }
        }
        @media (max-width: 600px) {
          .mainInternalPages { padding: 4px !important; }
          .filter-bar { gap: 8px !important; }
          .commonTitle h1 { font-size: 1.2rem !important; }
        }
        /* Responsive modal */
        @media (max-width: 900px) {
          .signoff-modal {
            width: 98% !important;
            max-width: 98vw !important;
            padding: 10px !important;
          }
        }
        /* Responsive Add 3PM button */
        @media (max-width: 768px) {
          .commonTitle {
            flex-direction: column !important;
            gap: 15px !important;
            align-items: stretch !important;
          }
          .commonTitle > div:first-child {
            justify-content: center !important;
          }
          .commonTitle button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
        /* Responsive Add 3PM modal */
        @media (max-width: 600px) {
          .add-3pm-modal {
            width: 95% !important;
            max-width: 95vw !important;
            padding: 20px !important;
          }
          .add-3pm-modal h2 {
            font-size: 20px !important;
            padding-right: 30px !important;
          }
        }
      `}</style>
    </Layout>
  );
};

export default CmDashboard; 