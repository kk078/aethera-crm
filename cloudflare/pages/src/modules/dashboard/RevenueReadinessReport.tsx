import React, { useState } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Modal, Alert, Descriptions, Badge, Collapse, Select, Empty, Input, List } from 'antd';
import { DownloadOutlined, EyeOutlined, CheckCircleOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { onboardingAPI } from '@services/api';
import { Row, Col } from 'antd';

const { Title, Paragraph } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

interface ProviderReport {
  provider: {
    id: string;
    npi: string;
    name: string;
    specialty: string;
    location: string;
  };
  technicalSetup: {
    clearinghouse: string;
    eraStatus: string;
    ediStatus: string;
    credentialingStatus: string;
    caqhVerified: boolean;
    setupComplete: boolean;
  };
  missingItems: string[];
  readinessScore: number;
}

interface RevenueReadinessReport {
  providers: ProviderReport[];
  summary: {
    total: number;
    fullyReady: number;
    needsAttention: number;
    critical: number;
    overallReadiness: number;
  };
  byState: Record<string, number>;
  bySpecialty: Record<string, { total: number; ready: number; missing: string[] }>;
  generatedAt: string;
}

const RevenueReadinessReport: React.FC = () => {
  const [report, setReport] = useState<RevenueReadinessReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const token = useAuthStore((state) => state.token);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setReport(null);

      const response = await fetch(
        'https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/onboarding/report/revenue-readiness',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setReport(result);
    } catch (err: any) {
      console.error('Error loading revenue readiness report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    const headers = [
      'Provider Name',
      'NPI',
      'Specialty',
      'Location',
      'Clearinghouse',
      'ERA Status',
      'EDI Status',
      'Credentialing Status',
      'CAQH Verified',
      'Setup Complete',
      'Readiness Score',
      'Missing Items',
    ];

    const rows = report.providers.map((p) => [
      `"${p.provider.name.replace(/"/g, '""')}"`,
      p.provider.npi,
      `"${p.provider.specialty || ''}"`,
      `"${p.provider.location}"`,
      `"${p.technicalSetup.clearinghouse.replace(/"/g, '""')}"`,
      p.technicalSetup.eraStatus,
      p.technicalSetup.ediStatus,
      p.technicalSetup.credentialingStatus,
      p.technicalSetup.caqhVerified ? 'Yes' : 'No',
      p.technicalSetup.setupComplete ? 'Yes' : 'No',
      p.readinessScore,
      `"${p.missingItems.join('; ').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue-readiness-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (!report) return;

    const jsonContent = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue-readiness-report-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    if (status === 'active' || status === 'Yes' || status === 'complete') return 'green';
    if (status === 'pending' || status === 'in_progress') return 'orange';
    if (status === 'Not started' || status === 'No' || status === 'Not configured') return 'default';
    return 'default';
  };

  const getReadinessBadge = (score: number) => {
    if (score >= 90) return <Badge status="success" text={<Tag color="green">Fully Ready</Tag>} />;
    if (score >= 70) return <Badge status="success" text={<Tag color="blue">Mostly Ready</Tag>} />;
    if (score >= 40) return <Badge status="warning" text={<Tag color="orange">Needs Attention</Tag>} />;
    return <Badge status="error" text={<Tag color="red">Critical</Tag>} />;
  };

  const columns = [
    {
      title: 'Provider',
      key: 'provider',
      render: (record: ProviderReport) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.provider.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.provider.npi} {record.provider.specialty && `| ${record.provider.specialty}`}
          </div>
          <div style={{ fontSize: '11px', color: '#999' }}>{record.provider.location}</div>
        </div>
      ),
    },
    {
      title: 'Readiness Score',
      key: 'score',
      render: (record: ProviderReport) => (
        <div>
          <strong style={{ fontSize: '16px' }}>{record.readinessScore}%</strong>
          {getReadinessBadge(record.readinessScore)}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: ProviderReport) => {
        const criticalCount = record.missingItems.filter(item =>
          item.includes('Missing') || item.includes('Not started') || item.includes('Not configured')
        ).length;

        if (record.readinessScore === 100) {
          return <Tag color="green" icon={<CheckCircleOutlined />}>Ready</Tag>;
        }
        if (criticalCount > 0) {
          return <Tag color="red" icon={<ExclamationCircleOutlined />}>Critical</Tag>;
        }
        return <Tag color="orange" icon={<WarningOutlined />}>Needs Review</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ProviderReport) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedProvider(record);
            setShowDetails(true);
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
          <Title level={2}>Revenue Readiness Report</Title>
          <Paragraph>Comprehensive analysis of all providers' technical onboarding status and readiness for billing</Paragraph>
        </div>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Space>
          <Button type="primary" icon={<DownloadOutlined />} onClick={loadReport} loading={loading}>
            Generate Report
          </Button>
          {report && (
            <Space>
              <Button icon={<DownloadOutlined />} onClick={exportToCSV}>
                Export CSV
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportToJSON}>
                Export JSON
              </Button>
            </Space>
          )}
        </Space>
      </Card>

      {error && (
        <Alert
          message="Error Loading Report"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadReport}>Retry</Button>
          }
        />
      )}

      {report && (
        <div>
          {/* Summary Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} md={6}>
              <Card>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  {report.summary.total}
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>Total Providers</div>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'green' }}>
                  {report.summary.fullyReady}
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>Fully Ready</div>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'orange' }}>
                  {report.summary.needsAttention}
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>Needs Attention</div>
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'red' }}>
                  {report.summary.critical}
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>Critical</div>
              </Card>
            </Col>
          </Row>

          {/* Overall Readiness */}
          <Card style={{ marginBottom: '24px' }}>
            <Descriptions title="Overall Readiness" layout="horizontal" column={2}>
              <Descriptions.Item label="Overall Readiness">
                <Tag color={report.summary.overallReadiness >= 70 ? 'green' : 'orange'} style={{ fontSize: '16px' }}>
                  {report.summary.overallReadiness}%
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Generated">
                {new Date(report.generatedAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Breakdown by State */}
          {Object.keys(report.byState).length > 0 && (
            <Card title="Breakdown by State" style={{ marginBottom: '24px' }}>
              <Row gutter={[16, 16]}>
                {Object.entries(report.byState).map(([state, count]) => (
                  <Col xs={12} md={6} key={state}>
                    <div style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{state}</div>
                      <div style={{ color: '#666' }}>{count} providers</div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* Breakdown by Specialty */}
          {Object.keys(report.bySpecialty).length > 0 && (
            <Card title="Breakdown by Specialty">
              <Collapse>
                {Object.entries(report.bySpecialty).map(([specialty, data]) => (
                  <Panel header={`${specialty} (${data.ready}/${data.total} ready)`} key={specialty}>
                    {data.missing.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <strong>Missing items across providers:</strong>
                        <ul>
                          {data.missing.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Panel>
                ))}
              </Collapse>
            </Card>
          )}

          {/* Providers Table */}
          <Card title="Provider Details">
            <Table
              columns={columns}
              dataSource={report.providers}
              rowKey="provider.id"
              loading={loading}
              pagination={{
                pageSize: 50,
                showTotal: (total) => `Total ${total} providers`,
              }}
            />
          </Card>
        </div>
      )}

      {!report && !loading && !error && (
        <Empty
          description="Click 'Generate Report' to analyze all providers"
          style={{ marginTop: '48px' }}
        />
      )}

      {/* Provider Details Modal */}
      {selectedProvider && (
        <Modal
          title={selectedProvider.provider.name}
          open={showDetails}
          onCancel={() => setShowDetails(false)}
          footer={[
            <Button key="close" onClick={() => setShowDetails(false)}>Close</Button>,
          ]}
          width={600}
        >
          <Descriptions layout="vertical" bordered>
            <Descriptions.Item label="NPI" span={1}>
              {selectedProvider.provider.npi}
            </Descriptions.Item>
            <Descriptions.Item label="Specialty" span={1}>
              {selectedProvider.provider.specialty}
            </Descriptions.Item>
            <Descriptions.Item label="Location" span={2}>
              {selectedProvider.provider.location}
            </Descriptions.Item>

            <Descriptions.Item label="Clearinghouse" span={1}>
              {selectedProvider.technicalSetup.clearinghouse}
            </Descriptions.Item>
            <Descriptions.Item label="ERA Status" span={1}>
              <Tag color={getStatusColor(selectedProvider.technicalSetup.eraStatus)}>
                {selectedProvider.technicalSetup.eraStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="EDI Status" span={1}>
              <Tag color={getStatusColor(selectedProvider.technicalSetup.ediStatus)}>
                {selectedProvider.technicalSetup.ediStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Credentialing Status" span={1}>
              <Tag color={getStatusColor(selectedProvider.technicalSetup.credentialingStatus)}>
                {selectedProvider.technicalSetup.credentialingStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="CAQH Verified" span={1}>
              {selectedProvider.technicalSetup.caqhVerified ? (
                <Tag color="green" icon={<CheckCircleOutlined />}>Yes</Tag>
              ) : (
                <Tag color="default" icon={<ExclamationCircleOutlined />}>No</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Setup Complete" span={1}>
              {selectedProvider.technicalSetup.setupComplete ? (
                <Tag color="green" icon={<CheckCircleOutlined />}>Yes</Tag>
              ) : (
                <Tag color="default" icon={<ExclamationCircleOutlined />}>No</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>

          {selectedProvider.missingItems.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <strong>Missing/Incomplete Items:</strong>
              <List
                size="small"
                dataSource={selectedProvider.missingItems}
                renderItem={(item) => (
                  <List.Item>
                    <ExclamationCircleOutlined style={{ color: 'red', marginRight: '8px' }} />
                    {item}
                  </List.Item>
                )}
              />
            </div>
          )}

          <div style={{ marginTop: '24px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Readiness Score</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>
              {selectedProvider.readinessScore}%
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Based on completed technical setup items and enrollment status
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RevenueReadinessReport;
