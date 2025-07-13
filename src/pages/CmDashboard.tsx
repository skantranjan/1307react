import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import MultiSelect from '../components/MultiSelect';
import Pagination from '../components/Pagination';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [appliedFilters, setAppliedFilters] = useState<{
    cmCodes: string[];
    signoffStatuses: string[];
  }>({ cmCodes: [], signoffStatuses: [] });

  const { instance, accounts } = useMsal();

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
          setCmCodes(result.data);
          
          // Extract unique signoff statuses for filter (if available)
          const uniqueStatuses = Array.from(new Set(result.data.map(item => item.signoff_status).filter((status): status is string => Boolean(status))));
          if (uniqueStatuses.length > 0) {
            setSignoffStatuses(uniqueStatuses);
          } else {
            // Fallback to default statuses if not available in API
            setSignoffStatuses(['approved', 'pending', 'rejected']);
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

  // Handle search and reset
  const handleSearch = () => {
    console.log('Search with filters:', {
      cmCodes: selectedCmCodes,
      signoffStatuses: selectedSignoffStatuses
    });
    
    // Apply the selected filters
    setAppliedFilters({
      cmCodes: selectedCmCodes,
      signoffStatuses: selectedSignoffStatuses
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
  };

  const handleReset = () => {
    // Clear all filters
    setSelectedCmCodes([]);
    setSelectedSignoffStatuses([]);
    setAppliedFilters({ cmCodes: [], signoffStatuses: [] });
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
            setSignoffStatuses(['approved', 'pending', 'rejected']);
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

    // Filter by CM Code
    if (appliedFilters.cmCodes.length > 0) {
      filtered = filtered.filter(item => appliedFilters.cmCodes.includes(item.cm_code));
    }

    // Filter by Signoff Status
    if (appliedFilters.signoffStatuses.length > 0) {
      filtered = filtered.filter(item => 
        item.signoff_status && appliedFilters.signoffStatuses.includes(item.signoff_status)
      );
    }

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
      'Signoff Status': row.signoff_status === 'approved'
        ? 'Approved'
        : row.signoff_status === 'rejected'
        ? 'Rejected'
        : row.signoff_status === 'pending'
        ? 'Pending'
        : '',
      'Signoff By': row.signoff_by || '',
      'Signoff Date': row.signoff_date || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, 'cm-data.xlsx');
  };

  return (
    <Layout>
      {loading && <Loader />}
      <div className="mainInternalPages" style={{ opacity: loading ? 0.5 : 1 }}>
        <div className="commonTitle">
          <div className="icon">
            <i className="ri-table-line"></i>
          </div>
          <h1>3PM Dashboard</h1>
        </div>
        <div className="row">
          <div className="col-sm-12">
            <div className="filters">
              <ul>
                <li>
                  <div className="fBold">3PM Code - Description</div>
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
                </li>
                <li>
                  <div className="fBold">Signoff Status</div>
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
                </li>
                <li>
                  <button 
                    className="btnCommon btnGreen filterButtons" 
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    <span>Search</span>
                    <i className="ri-search-line"></i>
                  </button>
                </li>
                <li>
                  <button 
                    className="btnCommon btnBlack filterButtons" 
                    onClick={handleReset}
                    disabled={loading}
                  >
                    <span>Reset</span>
                    <i className="ri-refresh-line"></i>
                  </button>
                </li>
              </ul>
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
                  <th>Signoff Status</th>
                  <th>Signoff By/Rejected By</th>
                  <th>Signoff Date/ Rejected Date</th>
                  <th>Add/View SKU</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                      No data available
                    </td>
                  </tr>
                ) : (
                  currentData.map((row: CmCode, index: number) => (
                    <tr key={index}>
                      <td>{row.cm_code}</td>
                      <td>{row.cm_description}</td>
                      <td
                        className={
                          row.signoff_status === 'approved'
                            ? 'status-cell approved'
                            : row.signoff_status === 'rejected'
                            ? 'status-cell rejected'
                            : row.signoff_status === 'pending'
                            ? 'status-cell pending'
                            : ''
                        }
                      >
                        {row.signoff_status === 'approved'
                          ? 'Approved'
                          : row.signoff_status === 'rejected'
                          ? 'Rejected'
                          : row.signoff_status === 'pending'
                          ? 'Pending'
                          : ''}
                      </td>
                      <td>
                        {row.signoff_status === 'approved' ? row.signoff_by : '-'}
                      </td>
                      <td>
                        {row.signoff_status === 'approved' ? row.signoff_date : '-'}
                      </td>
                      <td>
                        <div className="action-btns">
                          <Link
                            to={`/cm/${row.cm_code}`}
                            state={{ cmDescription: row.cm_description, status: row.signoff_status }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#000',
                              color: '#fff',
                              borderRadius: 6,
                              width: 36,
                              height: 36,
                              fontSize: 20,
                              border: 'none',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                              cursor: 'pointer',
                            }}
                            tabIndex={0}
                          >
                            <i className="ri-eye-line"></i>
                          </Link>
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
    </Layout>
  );
};

export default CmDashboard; 