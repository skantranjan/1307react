import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiGet } from '../utils/api';

const UploadData: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedFromYear, setSelectedFromYear] = useState<string>('');
  const [selectedToYear, setSelectedToYear] = useState<string>('');
  const [years, setYears] = useState<Array<{id: string, period: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get 3PM Code and Description from URL parameters
  const cmCode = searchParams.get('cmCode') || '';
  const cmDescription = searchParams.get('cmDescription') || '';

  // Fetch years from API
  useEffect(() => {
    const fetchYears = async () => {
      try {
        console.log('Fetching years for UploadData...');
        setLoading(true);
        setError(null);
        
        // Use the specified API endpoint
        let response = await apiGet('/sku-details-active-years');
        console.log('Years API response status:', response.status);
        console.log('Years API response headers:', response.headers);
        
        if (!response.ok) {
          console.log('Primary endpoint failed, trying alternative endpoints...');
          
          // Try alternative endpoints
          const alternativeEndpoints = [
            '/component-years',
            '/years',
            '/periods',
            '/active-years'
          ];
          
          for (const endpoint of alternativeEndpoints) {
            try {
              console.log(`Trying alternative endpoint: ${endpoint}`);
              response = await apiGet(endpoint);
              console.log(`${endpoint} response status:`, response.status);
              
              if (response.ok) {
                console.log(`Success with endpoint: ${endpoint}`);
                break;
              }
            } catch (altErr) {
              console.log(`Failed with endpoint ${endpoint}:`, altErr);
            }
          }
          
                  if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          
          // If all API calls fail, use mock data for testing
          console.log('Using mock data as fallback');
          const mockYears = [
            { id: '2024', period: '2024' },
            { id: '2025', period: '2025' },
            { id: '2023', period: '2023' }
          ];
          setYears(mockYears);
          
          // Auto-select previous year and current year
          const now = new Date();
          const currentYear = now.getFullYear();
          const previousYear = currentYear - 1;
          
          const previousYearOption = mockYears.find(year => 
            year.period.includes(previousYear.toString())
          );
          
          const currentYearOption = mockYears.find(year => 
            year.period.includes(currentYear.toString())
          );
          
          if (previousYearOption) {
            setSelectedFromYear(previousYearOption.id);
            console.log('Auto-selected previous year for From:', previousYearOption.period);
          }
          
          if (currentYearOption) {
            setSelectedToYear(currentYearOption.id);
            console.log('Auto-selected current year for To:', currentYearOption.period);
          }
          
          setError('Using mock data - API endpoints are not available');
          return;
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
        
        console.log('Extracted yearsData:', yearsData);
        
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
          // Auto-select previous year and current year
          const now = new Date();
          const currentYear = now.getFullYear();
          const previousYear = currentYear - 1;
          
          // Find previous year and current year options
          const previousYearOption = cleanedYears.find((year: any) => 
            year.period.includes(previousYear.toString()) || year.id.includes(previousYear.toString())
          );
          
          const currentYearOption = cleanedYears.find((year: any) => 
            year.period.includes(currentYear.toString()) || year.id.includes(currentYear.toString())
          );
          
          // Auto-select previous year for "From" and current year for "To"
          if (previousYearOption) {
            setSelectedFromYear(previousYearOption.id);
            console.log('Auto-selected previous year for From:', previousYearOption.period);
          }
          
          if (currentYearOption) {
            setSelectedToYear(currentYearOption.id);
            console.log('Auto-selected current year for To:', currentYearOption.period);
          }
        }
      } catch (err) {
        console.error('Error fetching years:', err);
        setYears([]);
        setError(`Failed to load years: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    fetchYears();
  }, []);

  // Handle apply filters button click
  const handleApplyFilters = () => {
    if (selectedFromYear && selectedToYear) {
      console.log('Applying period filter - From:', selectedFromYear, 'To:', selectedToYear);
    } else {
      console.log('Please select both From and To periods');
    }
  };

  return (
    <Layout>
      <div className="mainInternalPages">
        <div style={{ marginBottom: 8 }}>
        </div>
        {/* Dashboard Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 0'
        }}>
          <div className="commonTitle">
            <div className="icon">
              <i className="ri-upload-cloud-2-fill"></i>
            </div>
            <h1>Upload Data</h1>
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
              transition: 'all 0.3s ease',
              minWidth: '100px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: 18, marginRight: 6 }} />
            Back
          </button>
        </div>

        {/* 3PM Info Section */}
        <div className="filters CMDetails">
          <div className="row">
            <div className="col-sm-12 ">
              <ul style={{ display: 'flex', alignItems: 'center', padding: '6px 15px 8px' }}>
                <li><strong>3PM Code: </strong> {cmCode}</li>
                <li> | </li>
                <li><strong>3PM Description: </strong> {cmDescription}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="row"> 
          <div className="col-sm-12">
            <div className="filters">
              <ul>
                <li>
                  <div className="fBold">From Period</div>
                  <div className="form-control">
                    <select
                      value={selectedFromYear}
                      onChange={(e) => {
                        setSelectedFromYear(e.target.value);
                      }}
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
                      <option value="">Select From Period</option>
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
                </li>
                <li>
                  <div className="fBold">To Period</div>
                  <div className="form-control">
                    <select
                      value={selectedToYear}
                      onChange={(e) => {
                        setSelectedToYear(e.target.value);
                      }}
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
                      <option value="">Select To Period</option>
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
                </li>
                <li>
                  <button className="btnCommon btnGreen filterButtons" onClick={handleApplyFilters} disabled={loading}>
                    <span>Apply Filter</span>
                    <i className="ri-search-line"></i>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <i className="ri-loader-4-line spinning" style={{ fontSize: '24px', color: '#666' }}></i>
            <p>Loading periods...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
            <p>Error loading periods: {error}</p>
          </div>
        )}

        {selectedFromYear && selectedToYear ? (
          <div className="row">
            <div className="col-12">
              <div className="text-center py-5">
                <h5 className="text-muted">Period Range Selected</h5>
                <p className="text-muted">
                  From: {years.find(year => year.id === selectedFromYear)?.period || selectedFromYear} | 
                  To: {years.find(year => year.id === selectedToYear)?.period || selectedToYear}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="row">
            <div className="col-12">
              <div className="text-center py-5">
                <h5 className="text-muted">Select Period Range</h5>
                <p className="text-muted">Please select both From and To periods to proceed</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UploadData; 