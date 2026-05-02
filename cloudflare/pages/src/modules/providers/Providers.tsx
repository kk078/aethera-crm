import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Table, Button, Input, Space, Tag, Modal, Form, Spin, Alert, Select, Row, Col, message, Checkbox } from 'antd';
import { SearchOutlined, ImportOutlined, EyeOutlined, ReloadOutlined, PhoneOutlined, MailOutlined, UserAddOutlined, DeleteOutlined, CloudUploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import ProviderDetail from './ProviderDetail';
import { leadsAPI, onboardingAPI } from '@services/api';

const { Title, Paragraph } = Typography;

interface Provider {
  id: string;
  npi: string;
  provider_type: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  specialty_primary: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  medicare_enrollment_status: string | null;
  is_lead?: boolean;
}

interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

const Providers: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    per_page: 50,
    total: 0,
    total_pages: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [searchField, setSearchField] = useState('name');
  const [searchApplied, setSearchApplied] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedNpi, setSelectedNpi] = useState<string | null>(null);
  const [leadLoading, setLeadLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showOnlyLeads, setShowOnlyLeads] = useState(false);
  const [importForm] = Form.useForm();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const token = useAuthStore((state) => state.token);

  // Selection helpers
  const handleSelectChange = (npi: string, checked: boolean) => {
    if (checked) {
      setSelectedRows(prev => [...prev, npi]);
    } else {
      setSelectedRows(prev => prev.filter(item => item !== npi));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(providers.map(p => p.npi));
    } else {
      setSelectedRows([]);
    }
  };

  // Bulk technical setup operations
  const handleBulkInitializeTechnicalSetup = async () => {
    if (selectedRows.length === 0) {
      message.warning('Please select providers first');
      return;
    }

    setBulkActionLoading(true);
    try {
      const currentToken = useAuthStore.getState().token;
      message.loading({ content: `Initializing technical setup for ${selectedRows.length} providers...`, key: 'bulk-tech-setup' });

      let successCount = 0;
      let errorCount = 0;

      for (const npi of selectedRows) {
        try {
          // First get provider to get their ID
          const providerRes = await fetch(`https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/providers/${npi}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` },
          });
          if (!providerRes.ok) continue;

          const providerData = await providerRes.json();
          const providerId = providerData.data?.id;

          if (providerId) {
            // Create technical setup record
            const payload = {
              clearinghouse_id: null,
              clearinghouse_name: null,
              era_enrollment_status: 'not_started',
              edi_enrollment_status: 'not_started',
              credentialing_status: 'pending',
              caqh_verified: 0,
              setup_complete: 0,
            };

            const setupRes = await fetch(
              `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/onboarding/technical-setup/provider/${providerId}`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${currentToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
              }
            );

            if (setupRes.ok) {
              successCount++;
            } else {
              errorCount++;
            }
          }
        } catch (err) {
          errorCount++;
          console.error('Error initializing tech setup for', npi, err);
        }
      }

      message.destroy('bulk-tech-setup');
      message.success(`Bulk technical setup initialized: ${successCount} succeeded, ${errorCount} errors`);

      // Refresh the list
      loadProviders(pagination.page, searchApplied);
      setSelectedRows([]);
    } catch (err: any) {
      message.destroy('bulk-tech-setup');
      message.error(err.message || 'Failed to initialize technical setup');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUpdateEraStatus = async (status: string) => {
    if (selectedRows.length === 0) {
      message.warning('Please select providers first');
      return;
    }

    setBulkActionLoading(true);
    try {
      const currentToken = useAuthStore.getState().token;
      message.loading({ content: `Updating ERA status to ${status} for ${selectedRows.length} providers...`, key: 'bulk-era-status' });

      let successCount = 0;
      let errorCount = 0;

      for (const npi of selectedRows) {
        try {
          // Get provider to get their ID
          const providerRes = await fetch(`https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/providers/${npi}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` },
          });
          if (!providerRes.ok) continue;

          const providerData = await providerRes.json();
          const providerId = providerData.data?.id;

          if (providerId) {
            // Get current technical setup
            const setupRes = await fetch(
              `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/onboarding/technical-setup/provider/${providerId}`,
              {
                headers: { 'Authorization': `Bearer ${currentToken}` },
              }
            );

            if (setupRes.ok) {
              const setupData = await setupRes.json();
              const currentSetup = setupData.data;

              if (currentSetup) {
                // Update only ERA status
                const payload = {
                  clearinghouse_id: currentSetup.clearinghouse_id,
                  clearinghouse_name: currentSetup.clearinghouse_name,
                  era_enrollment_status: status,
                  edi_enrollment_status: currentSetup.edi_enrollment_status,
                  credentialing_status: currentSetup.credentialing_status,
                  caqh_verified: currentSetup.caqh_verified,
                  setup_complete: currentSetup.setup_complete,
                };

                const updateRes = await fetch(
                  `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/onboarding/technical-setup/provider/${providerId}`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${currentToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                  }
                );

                if (updateRes.ok) {
                  successCount++;
                } else {
                  errorCount++;
                }
              }
            }
          }
        } catch (err) {
          errorCount++;
          console.error('Error updating ERA status for', npi, err);
        }
      }

      message.destroy('bulk-era-status');
      message.success(`Bulk ERA status updated to ${status}: ${successCount} succeeded, ${errorCount} errors`);

      // Refresh the list
      loadProviders(pagination.page, searchApplied);
      setSelectedRows([]);
    } catch (err: any) {
      message.destroy('bulk-era-status');
      message.error(err.message || `Failed to update ERA status to ${status}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUpdateClearinghouse = async (clearinghouseId: string, clearinghouseName: string) => {
    if (selectedRows.length === 0) {
      message.warning('Please select providers first');
      return;
    }

    setBulkActionLoading(true);
    try {
      const currentToken = useAuthStore.getState().token;
      message.loading({ content: `Setting clearinghouse to ${clearinghouseName || clearinghouseId} for ${selectedRows.length} providers...`, key: 'bulk-clearinghouse' });

      let successCount = 0;
      let errorCount = 0;

      for (const npi of selectedRows) {
        try {
          const providerRes = await fetch(`https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/providers/${npi}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` },
          });
          if (!providerRes.ok) continue;

          const providerData = await providerRes.json();
          const providerId = providerData.data?.id;

          if (providerId) {
            const setupRes = await fetch(
              `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/onboarding/technical-setup/provider/${providerId}`,
              {
                headers: { 'Authorization': `Bearer ${currentToken}` },
              }
            );

            if (setupRes.ok) {
              const setupData = await setupRes.json();
              const currentSetup = setupData.data;

              if (currentSetup) {
                const payload = {
                  clearinghouse_id: clearinghouseId,
                  clearinghouse_name: clearinghouseName,
                  era_enrollment_status: currentSetup.era_enrollment_status,
                  edi_enrollment_status: currentSetup.edi_enrollment_status,
                  credentialing_status: currentSetup.credentialing_status,
                  caqh_verified: currentSetup.caqh_verified,
                  setup_complete: currentSetup.setup_complete,
                };

                const updateRes = await fetch(
                  `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/onboarding/technical-setup/provider/${providerId}`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${currentToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                  }
                );

                if (updateRes.ok) {
                  successCount++;
                } else {
                  errorCount++;
                }
              }
            }
          }
        } catch (err) {
          errorCount++;
          console.error('Error updating clearinghouse for', npi, err);
        }
      }

      message.destroy('bulk-clearinghouse');
      message.success(`Bulk clearinghouse set to ${clearinghouseName || clearinghouseId}: ${successCount} succeeded, ${errorCount} errors`);

      loadProviders(pagination.page, searchApplied);
      setSelectedRows([]);
    } catch (err: any) {
      message.destroy('bulk-clearinghouse');
      message.error(err.message || 'Failed to update clearinghouse');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const loadProviders = useCallback(async (page: number = 1, search?: string) => {
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) {
      setError('Not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let apiUrl = `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/providers?page=${page}&per_page=${pagination.per_page}`;
      if (search) {
        apiUrl += `&search=${encodeURIComponent(search)}`;
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      let providerList: Provider[] = [];
      if (result.data && Array.isArray(result.data)) {
        providerList = result.data;
      } else if (Array.isArray(result)) {
        providerList = result;
      }

      // Check lead status for each provider
      const leadChecks = await Promise.all(
        providerList.map(async (p) => {
          try {
            const res = await fetch(`https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/provider-leads/${p.npi}/lead`, {
              headers: { 'Authorization': `Bearer ${currentToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              return { ...p, is_lead: data.data?.is_lead || false };
            }
          } catch (e) {}
          return { ...p, is_lead: false };
        })
      );

      // Filter to show only non-leads if the filter is enabled
      const filteredProviders = showOnlyLeads
        ? leadChecks.filter(p => !p.is_lead)
        : leadChecks;
      setProviders(filteredProviders);
      setPagination(result.pagination || pagination);
    } catch (err: any) {
      console.error('[Providers] Error:', err);
      setError(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page]);

  useEffect(() => {
    if (token) loadProviders(1, searchApplied);
  }, [token, searchApplied]);

  const handleSearch = () => {
    setSearchApplied(searchText);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    loadProviders(newPage, searchApplied);
  };

  const handleClearSearch = () => {
    setSearchText('');
    setSearchApplied('');
    loadProviders(1);
  };

  // Add provider to leads
  const handleAddToLeads = async (npi: string) => {
    setLeadLoading(npi);
    try {
      const currentToken = useAuthStore.getState().token;
      const response = await fetch(
        `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/provider-leads/${npi}/lead`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        message.success('Provider added to leads!');
        setProviders(prev => prev.map(p => p.npi === npi ? { ...p, is_lead: true } : p));
      } else {
        const error = await response.json();
        if (response.status === 409) {
          message.info('This provider is already a lead');
          setProviders(prev => prev.map(p => p.npi === npi ? { ...p, is_lead: true } : p));
        } else {
          message.error(error.message || 'Failed to add lead');
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to add lead');
    } finally {
      setLeadLoading(null);
    }
  };

  // Bulk add providers to leads (for outreach campaigns)
  const handleBulkAddToLeads = async () => {
    setBulkLoading(true);
    try {
      const currentToken = useAuthStore.getState().token;
      const providersToAdd = providers.filter(p => !p.is_lead);

      if (providersToAdd.length === 0) {
        message.info('No providers available to add');
        setBulkLoading(false);
        return;
      }

      message.loading({ content: `Adding ${providersToAdd.length} providers to leads...`, key: 'bulk-add' });

      let successCount = 0;
      let alreadyLeadCount = 0;
      let errorCount = 0;

      // Add in batches to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < providersToAdd.length; i += batchSize) {
        const batch = providersToAdd.slice(i, i + batchSize);

        const promises = batch.map(p =>
          fetch(`https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/provider-leads/${p.npi}/lead`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${currentToken}`,
              'Content-Type': 'application/json',
            },
          }).then(res => res.json().then(data => ({ status: res.status, data, npi: p.npi })))
        );

        const results = await Promise.all(promises);

        results.forEach(res => {
          if (res.status === 201) {
            successCount++;
            setProviders(prev => prev.map(p => p.npi === res.npi ? { ...p, is_lead: true } : p));
          } else if (res.status === 409) {
            alreadyLeadCount++;
            setProviders(prev => prev.map(p => p.npi === res.npi ? { ...p, is_lead: true } : p));
          } else {
            errorCount++;
            console.error('Error adding lead:', res.data);
          }
        });
      }

      message.destroy('bulk-add');
      message.success(`Bulk add complete: ${successCount} added, ${alreadyLeadCount} already leads, ${errorCount} errors`);

      // Refresh the list
      loadProviders(pagination.page, searchApplied);
    } catch (err: any) {
      message.destroy('bulk-add');
      message.error(err.message || 'Failed to bulk add providers');
    } finally {
      setBulkLoading(false);
    }
  };

  // Scrape email for provider
  const handleScrapeEmail = async (npi: string) => {
    setLeadLoading(npi);
    message.loading({ content: 'Finding email with Hunter.io...', key: npi });
    try {
      const currentToken = useAuthStore.getState().token;
      const response = await fetch(
        `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/provider-leads/${npi}/scrape-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      message.destroy(npi);

      if (result.data?.email) {
        message.success(`Found email: ${result.data.email}`);
        setProviders(prev => prev.map(p => p.npi === npi ? { ...p, email: result.data.email } : p));
      } else if (result.data?.generated_patterns?.length > 0) {
        Modal.info({
          title: 'Email Not Found',
          content: (
            <div>
              <p>Hunter.io couldn't find this email. Potential patterns:</p>
              <ul>
                {result.data.generated_patterns.slice(0, 3).map((p: any) => (
                  <li key={p.email}>{p.email} ({p.confidence}% confidence)</li>
                ))}
              </ul>
            </div>
          ),
        });
      } else {
        message.info('No email found. Try by phone.');
      }
    } catch (err: any) {
      message.destroy(npi);
      message.error('Email scraper failed');
    } finally {
      setLeadLoading(null);
    }
  };

  // Delete from leads
  const handleDeleteFromLeads = async (npi: string) => {
    Modal.confirm({
      title: 'Remove from Leads?',
      content: 'This will mark the lead as deleted (data is preserved). Are you sure?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setLeadLoading(npi);
        try {
          const currentToken = useAuthStore.getState().token;
          const response = await fetch(
            `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/provider-leads/${npi}/lead`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${currentToken}` },
            }
          );

          if (response.ok) {
            message.success('Removed from leads');
            setProviders(prev => prev.map(p => p.npi === npi ? { ...p, is_lead: false } : p));
          } else {
            message.error('Failed to remove');
          }
        } catch (err: any) {
          message.error('Failed to remove');
        } finally {
          setLeadLoading(null);
        }
      },
    });
  };

  const columns = [
    {
      title: (
        <Checkbox
          checked={providers.length > 0 && selectedRows.length === providers.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      key: 'selection',
      render: (record: Provider) => (
        <Checkbox
          checked={selectedRows.includes(record.npi)}
          onChange={(e) => handleSelectChange(record.npi, e.target.checked)}
        />
      ),
      width: 60,
      fixed: 'left' as const,
    },
    {
      title: 'Provider Name',
      key: 'name',
      render: (record: Provider) => {
        const name = record.provider_type === 'individual'
          ? `Dr. ${record.first_name || ''} ${record.last_name || ''}`.trim()
          : record.organization_name || 'Unknown Organization';
        return (
          <div>
            <div style={{ fontWeight: 'bold' }}>{name || record.npi}</div>
            {record.specialty_primary && (
              <div style={{ fontSize: '12px', color: '#666' }}>{record.specialty_primary}</div>
            )}
            {record.is_lead && <Tag color="green" style={{ marginTop: '4px' }}>✅ Lead</Tag>}
          </div>
        );
      },
    },
    {
      title: 'NPI',
      dataIndex: 'npi',
      key: 'npi',
      render: (npi: string) => <Tag>{npi}</Tag>,
    },
    {
      title: 'Location',
      key: 'location',
      render: (record: Provider) =>
        `${record.city || ''}, ${record.state || ''}`.trim() || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string | null) => {
        if (!phone) return <span style={{ color: '#999' }}>-</span>;
        return (
          <a href={`tel:${phone.replace(/\D/g, '')}`} style={{ color: '#1890ff' }}>
            <PhoneOutlined /> {phone}
          </a>
        );
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string | null, record: Provider) => {
        if (email) {
          return (
            <a href={`mailto:${email}`} style={{ color: '#52c41a' }}>
              <MailOutlined /> {email}
            </a>
          );
        }
        return (
          <Button 
            type="link" 
            size="small" 
            onClick={() => handleScrapeEmail(record.npi)}
            loading={leadLoading === record.npi}
          >
            Find Email
          </Button>
        );
      },
    },
    {
      title: 'Add to Leads',
      key: 'actions',
      render: (record: Provider) => {
        if (record.is_lead) {
          return (
            <Button 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteFromLeads(record.npi)}
              loading={leadLoading === record.npi}
            >
              Remove Lead
            </Button>
          );
        }
        return (
          <Button 
            type="primary" 
            size="small" 
            icon={<UserAddOutlined />}
            onClick={() => handleAddToLeads(record.npi)}
            loading={leadLoading === record.npi}
          >
            Add to Leads
          </Button>
        );
      },
    },
    {
      title: 'View',
      key: 'view',
      render: (record: Provider) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => {
            setSelectedNpi(record.npi);
            setViewModalVisible(true);
          }}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Title level={2}>Providers</Title>
          <Paragraph>Healthcare provider directory with NPPES integration - Click phone/emails to contact</Paragraph>
        </div>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={5}>
            <Select value={searchField} onChange={setSearchField} style={{ width: '100%' }}>
              <Select.Option value="name">Name</Select.Option>
              <Select.Option value="npi">NPI</Select.Option>
              <Select.Option value="specialty">Specialty</Select.Option>
              <Select.Option value="city">City</Select.Option>
            </Select>
          </Col>
          <Col xs={24} md={9}>
            <Input
              placeholder="Search providers..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={10}>
            <Space>
              <Button
                type={showOnlyLeads ? 'primary' : 'default'}
                icon={showOnlyLeads ? <DeleteOutlined /> : <UserAddOutlined />}
                onClick={() => setShowOnlyLeads(!showOnlyLeads)}
              >
                {showOnlyLeads ? 'Show All Providers' : 'Show Only Not Leads'}
              </Button>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={bulkLoading}
                onClick={handleBulkAddToLeads}
              >
                Bulk Add to Leads
              </Button>
              {/* Bulk Technical Setup Actions */}
              {selectedRows.length > 0 && (
                <Space size="small">
                  <Button
                    type="default"
                    icon={<CheckCircleOutlined />}
                    loading={bulkActionLoading}
                    onClick={handleBulkInitializeTechnicalSetup}
                  >
                    Init Technical Setup
                  </Button>
                  <Select
                    defaultValue="pending"
                    style={{ width: 120 }}
                    onChange={(value) => handleBulkUpdateEraStatus(value)}
                    disabled={selectedRows.length === 0 || bulkActionLoading}
                    options={[
                      { value: 'pending', label: 'Set ERA: Pending' },
                      { value: 'active', label: 'Set ERA: Active' },
                      { value: 'not_started', label: 'Set ERA: Not Started' },
                    ]}
                  />
                  <Input.Search
                    placeholder="Clearinghouse ID"
                    style={{ width: 120 }}
                    onSearch={(value) => handleBulkUpdateClearinghouse(value, value)}
                    disabled={selectedRows.length === 0 || bulkActionLoading}
                  />
                </Space>
              )}
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Search</Button>
              {searchApplied && <Button icon={<ReloadOutlined />} onClick={handleClearSearch}>Clear</Button>}
            </Space>
          </Col>
        </Row>
        <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
          Showing <strong>{providers.length}</strong> of <strong>{pagination.total}</strong> providers
          {showOnlyLeads && <Tag color="orange" style={{ marginLeft: '8px' }}>Filter: Only non-leads</Tag>}
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={providers}
          rowKey="npi"
          loading={loading}
          pagination={{
            pageSize: pagination.per_page,
            current: pagination.page,
            total: pagination.total,
            onChange: handlePageChange,
          }}
        />
      </Card>

      <ProviderDetail
        npi={selectedNpi}
        visible={viewModalVisible}
        onClose={() => {
          setViewModalVisible(false);
          setSelectedNpi(null);
        }}
      />
    </div>
  );
};

export default Providers;