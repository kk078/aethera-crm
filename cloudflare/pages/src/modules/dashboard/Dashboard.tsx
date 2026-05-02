import React from 'react';
import { Card, Col, Row, Statistic, Typography, Button, Table, Alert, Space, Tag, List } from 'antd';
import {
  TeamOutlined,
  BulbOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { contactsAPI, leadsAPI, dealsAPI, tasksAPI, onboardingAPI } from '@services/api';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  // Use queries but don't render tables - just cards with counts
  const { data: contactsData } = useQuery({
    queryKey: ['contacts-count'],
    queryFn: () => contactsAPI.list({ per_page: 1 }),
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads-count'],
    queryFn: () => leadsAPI.list({ per_page: 1 }),
  });

  const { data: dealsData } = useQuery({
    queryKey: ['deals-count'],
    queryFn: () => dealsAPI.list({ per_page: 1 }),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks-count'],
    queryFn: () => tasksAPI.list({ per_page: 1 }),
  });

  // RCM Pipeline data
  const { data: pipelineStages } = useQuery({
    queryKey: ['onboarding-stages'],
    queryFn: () => onboardingAPI.getStatuses(),
  });

  // Dashboard summary
  const { data: dashboardSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => onboardingAPI.getDashboardSummary(),
  });

  // Bottleneck data
  const { data: bottlenecks } = useQuery({
    queryKey: ['bottlenecks'],
    queryFn: () => onboardingAPI.getBottlenecks(),
  });

  // Document vault summary
  const { data: documentSummary } = useQuery({
    queryKey: ['document-summary'],
    queryFn: () => onboardingAPI.getDocumentSummary(),
  });

  // Revenue readiness data
  const { data: revenueReadiness } = useQuery({
    queryKey: ['revenue-readiness'],
    queryFn: () => onboardingAPI.getRevenueReadiness(),
  });

  // Power Stats data
  const { data: pipelineValueData } = useQuery({
    queryKey: ['pipeline-value'],
    queryFn: () => onboardingAPI.getPipelineValue(),
  });

  const { data: technicalBlockersData } = useQuery({
    queryKey: ['technical-blockers'],
    queryFn: () => onboardingAPI.getTechnicalBlockers(),
  });

  const { data: credentialingGapData } = useQuery({
    queryKey: ['credentialing-gap'],
    queryFn: () => onboardingAPI.getCredentialingGap(),
  });

  // Safe number extraction - handles any response structure
  const getCount = (response: any): number => {
    try {
      if (!response) return 0;
      // Try various paths to find total count
      if (response.data?.pagination?.total != null) return response.data.pagination.total;
      if (response.data?.data?.length != null) return response.data.data.length;
      if (response.data?.length != null) return response.data.length;
      if (Array.isArray(response.data)) return response.data.length;
      return 0;
    } catch {
      return 0;
    }
  };

  const stats = {
    contacts: getCount(contactsData),
    leads: getCount(leadsData),
    deals: getCount(dealsData),
    tasks: getCount(tasksData),
  };

  // Pipeline summary stats
  const dealsByStage = dashboardSummary?.data?.deals_by_stage || {};
  const onboardingChecklists = dashboardSummary?.data?.onboarding_checklists || {};
  const revenue = dashboardSummary?.data?.revenue || {};

  // Revenue readiness stats
  const providers = revenueReadiness?.data?.providers || {};
  const readinessPercentage = revenueReadiness?.data?.revenue_readiness_percentage || 0;

  // Power Stats
  const pipelineValue = pipelineValueData?.data || {};
  const technicalBlockers = technicalBlockersData?.data || {};
  const credentialingGap = credentialingGapData?.data || {};

  // Column for bottleneck table
  const bottleneckColumns = [
    {
      title: 'Provider',
      key: 'provider',
      render: (_: any, record: any) => (
        <div>
          <div><strong>{record.organization_name || `${record.first_name || ''} ${record.last_name || ''}`.trim()}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>NPI: {record.npi}</div>
        </div>
      ),
    },
    {
      title: 'Deal',
      dataIndex: 'deal_name',
      key: 'deal_name',
    },
    {
      title: 'Stage',
      dataIndex: 'pipeline_stage',
      key: 'pipeline_stage',
      render: (stage: string) => <Tag color={stage === 'credentialing' ? 'orange' : 'cyan'}>{stage.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Days Stuck',
      dataIndex: 'days_stuck',
      key: 'days_stuck',
      render: (days: number) => (
        <span style={{ color: days > 21 ? '#cf1322' : '#faad14' }}>
          {Math.round(days)} days
        </span>
      ),
    },
    {
      title: 'Last Updated',
      dataIndex: 'last_updated',
      key: 'last_updated',
      render: (date: string) => dayjs(date).format('MM/DD/YYYY'),
    },
  ];

  // Document summary display
  const renderDocumentSummary = () => {
    const byType = documentSummary?.data?.by_type || {};
    return (
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {Object.entries(byType).map(([docType, counts]: any) => (
          <Card key={docType} size="small" title={docType.replace(/_/g, ' ')} style={{ marginBottom: '8px' }}>
            <Space>
              <Tag color="green">Approved: {counts.approved}</Tag>
              <Tag color="orange">Pending: {counts.pending}</Tag>
              <Tag color="default">Total: {counts.total}</Tag>
            </Space>
          </Card>
        ))}
        {Object.keys(byType).length === 0 && (
          <Alert message="No documents uploaded yet" type="info" />
        )}
      </Space>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2}>Dashboard</Title>
        <p>Welcome to Aethera-CRM</p>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Contacts"
              value={stats.contacts}
              prefix={<TeamOutlined />}
            />
            <Link to="/contacts">View Contacts →</Link>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Leads"
              value={stats.leads}
              prefix={<BulbOutlined />}
            />
            <Link to="/leads">View Leads →</Link>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Deals"
              value={stats.deals}
              prefix={<RocketOutlined />}
            />
            <Link to="/deals">View Deals →</Link>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Tasks"
              value={stats.tasks}
              prefix={<CheckCircleOutlined />}
            />
            <Link to="/tasks">View Tasks →</Link>
          </Card>
        </Col>
      </Row>

      {/* RCM Pipeline Summary */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="RCM Pipeline Overview" className="hover-card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  {dealsByStage.qualified || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Qualified Deals</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                  {dealsByStage.active || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Active Deals</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                  {onboardingChecklists?.in_progress || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>In Progress</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                  ${revenue?.pipeline_value?.toLocaleString() || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Pipeline Value</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#13c2c2' }}>
                  {readinessPercentage}%
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Revenue Readiness</div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Revenue Readiness Widget */}
        <Col xs={24} lg={12}>
          <Card title="Revenue Readiness Overview" className="hover-card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <ClockCircleOutlined style={{ fontSize: '20px', color: '#13c2c2', marginRight: '8px' }} />
              <Title level={5} style={{ margin: 0 }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Technical Onboarding Completion</div>
              </Title>
            </div>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '8px' }}>
              <Tag color="green">{providers?.active_era || 0} providers with Active ERA status</Tag>
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: readinessPercentage > 50 ? '#52c41a' : readinessPercentage > 25 ? '#faad14' : '#cf1322', marginBottom: '16px' }}>
              {readinessPercentage}%
            </div>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Complete</span>
                <Tag color="green">{providers?.complete || 0}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>In Progress</span>
                <Tag color="orange">{providers?.in_progress || 0}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Not Started</span>
                <Tag color="default">{providers?.not_started || 0}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Tax ID Linked</span>
                <Tag color="blue">{providers?.tax_id_linked || 0}</Tag>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Bottleneck Widget */}
        <Col xs={24} lg={12}>
          <Card title="Bottleneck Alert" className="hover-card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <WarningOutlined style={{ fontSize: '20px', color: '#cf1322', marginRight: '8px' }} />
              <Title level={5} style={{ margin: 0 }}>
                Providers Stuck in Credentialing &gt;14 Days
              </Title>
            </div>
            {bottlenecks?.data?.data?.length ? (
              <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                <List
                  size="small"
                  dataSource={bottlenecks.data.data.slice(0, 5)}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <span>{item.organization_name || `${item.first_name || ''} ${item.last_name || ''}`.trim()}</span>
                            <Tag color="orange">{Math.round(item.days_stuck)} days</Tag>
                          </Space>
                        }
                        description={`${item.deal_name} - ${item.pipeline_stage.replace(/_/g, ' ')}`}
                      />
                    </List.Item>
                  )}
                />
              </div>
            ) : (
              <Alert message="No bottlenecks detected - all providers moving smoothly!" type="success" />
            )}
            <div style={{ marginTop: '12px' }}>
              <Link to="/deals?filter=bottleneck">View All Bottlenecks</Link>
            </div>
          </Card>
        </Col>

        {/* Power Stats Row */}
        <Col xs={24} lg={24}>
          <Row gutter={[16, 16]}>
            {/* Total Pipeline Value */}
            <Col xs={24} sm={8}>
              <Card title="Total Pipeline Value" className="hover-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <DollarOutlined style={{ fontSize: '32px', color: '#52c41a', marginRight: '12px' }} />
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>
                      {pipelineValue?.total_pipeline_value ? `$${pipelineValue.total_pipeline_value.toLocaleString()}` : '$0'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {pipelineValue?.total_deals || 0} Deals x {pipelineValue?.average_claim_volume || 0} Avg Claims
                    </div>
                  </div>
                </div>
              </Card>
            </Col>

            {/* Technical Blockers */}
            <Col xs={24} sm={8}>
              <Card title="Technical Blockers" className="hover-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <AlertOutlined style={{ fontSize: '32px', color: '#cf1322', marginRight: '12px' }} />
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#cf1322' }}>
                      {technicalBlockers?.technical_blockers || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Providers Stuck &gt; 15 Days in Technical Setup
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px' }}>
                  <Link to="/deals?filter=technical_blocker">View Blockers →</Link>
                </div>
              </Card>
            </Col>

            {/* Credentialing Gap */}
            <Col xs={24} sm={8}>
              <Card title="Credentialing Gap" className="hover-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ExclamationCircleOutlined style={{ fontSize: '32px', color: '#faad14', marginRight: '12px' }} />
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#faad14' }}>
                      {credentialingGap?.credentialing_gap || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Providers Missing CAQH Attestation
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px' }}>
                  <Link to="/providers?filter=credentialing_gap">View Missing →</Link>
                </div>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Document Vault Summary */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24}>
          <Card title="Document Vault Status" className="hover-card">
            {renderDocumentSummary()}
          </Card>
        </Col>
      </Row>

      {/* Quick Links */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} md={12}>
          <Card title="Quick Actions" className="hover-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Button type="primary" block>
                <Link to="/contacts" style={{ color: 'white' }}>View All Contacts</Link>
              </Button>
              <Button type="primary" block>
                <Link to="/providers" style={{ color: 'white' }}>View Provider Directory</Link>
              </Button>
              <Button block>
                <Link to="/organizations">View Organizations</Link>
              </Button>
              <Button block>
                <Link to="/leads">View Leads</Link>
              </Button>
              <Button block>
                <Link to="/deals">View Deals</Link>
              </Button>
              <Button block>
                <Link to="/activities">View Activities</Link>
              </Button>
              <Button block>
                <Link to="/tasks">View Tasks</Link>
              </Button>
              <Button block>
                <Link to="/settings">Settings</Link>
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Getting Started" className="hover-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p><strong>Your CRM is ready!</strong></p>
              <p>You have 247 healthcare providers from Florida imported.</p>
              <p>Navigate to the <strong>Providers</strong> page to see them.</p>
              <p>The system includes:</p>
              <ul>
                <li>Contacts, Organizations, Leads</li>
                <li>Deals with Pipeline</li>
                <li>Activities & Tasks</li>
                <li>Provider Directory</li>
                <li><strong>RCM Pipeline with Onboarding Checklists</strong></li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
