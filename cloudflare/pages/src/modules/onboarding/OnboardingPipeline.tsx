import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Button, Space, Tag, Modal, Form, Input, message, Table, Col, Row, Divider, Badge } from 'antd';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersAPI, onboardingAPI } from '@services/api';
import { useAuthStore } from '@stores/authStore';

const { Title } = Typography;

interface OnboardingProvider {
  id: string;
  npi: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  workflow_stage: string;
  specialty_primary: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  clearinghouse_id?: string;
  created_at: string;
  updated_at?: string;
}

interface ProviderDetails {
  id: string;
  npi: string;
  workflow_stage: string;
  clearinghouse_id?: string;
  ede_id?: string;
  era_id?: string;
}

const STAGES = [
  { id: 'outreach', label: 'Outreach', color: 'default' },
  { id: 'discovery', label: 'Discovery', color: 'blue' },
  { id: 'analysis', label: 'Analysis', color: 'cyan' },
  { id: 'contracting', label: 'Contracting', color: 'orange' },
  { id: 'credentialing', label: 'Credentialing', color: 'green' },
  { id: 'tech_setup', label: 'Tech Setup', color: 'purple' },
  { id: 'go_live', label: 'Go Live', color: 'gold' },
];

const OnboardingPipeline: React.FC = () => {
  const [providers, setProviders] = useState<OnboardingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [clearinghouseModalVisible, setClearinghouseModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderDetails | null>(null);
  const [form] = Form.useForm();

  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  const { data: stagesData } = useQuery({
    queryKey: ['onboarding-stages'],
    queryFn: () => onboardingAPI.getStatuses(),
  });

  // Load providers
  const loadProviders = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await providersAPI.list();
      const providersList = (response.data?.data || []) as OnboardingProvider[];
      setProviders(providersList);
    } catch (err: any) {
      console.error('Error loading providers:', err);
      message.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Use query to load providers
  const { data: providersData, isLoading } = useQuery({
    queryKey: ['onboarding-providers'],
    queryFn: () => onboardingAPI.listProviders(),
  });

  useEffect(() => {
    if (providersData?.data) {
      setProviders(providersData.data);
    }
  }, [providersData]);

  // Update provider workflow stage
  const updateStageMutation = useMutation({
    mutationFn: ({ providerId, stage }: { providerId: string; stage: string }) =>
      onboardingAPI.updateProviderBillingStatus(providerId, { billing_integration_status: stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-providers'] });
      message.success('Provider stage updated');
    },
  });

  // Update clearinghouse credentials
  const updateCredentialsMutation = useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: any }) =>
      onboardingAPI.updateProviderBillingStatus(providerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-providers'] });
      message.success('Clearinghouse credentials saved');
      setClearinghouseModalVisible(false);
      form.resetFields();
      setSelectedProvider(null);
    },
  });

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const provider = providers.find(p => p.id === result.draggableId);

    if (!provider) return;

    // Check if moving to Tech Setup stage
    const targetStage = STAGES.find(s => s.id === destination.droppableId)?.id;
    if (targetStage === 'tech_setup') {
      // Show clearinghouse modal if credentials not set
      const currentProvider = providers.find(p => p.id === result.draggableId);
      if (currentProvider && !currentProvider.clearinghouse_id) {
        setSelectedProvider({
          id: currentProvider.id,
          npi: currentProvider.npi,
          workflow_stage: currentProvider.workflow_stage,
        });
        setClearinghouseModalVisible(true);
        return;
      }
    }

    updateStageMutation.mutate({
      providerId: provider.id,
      stage: destination.droppableId,
    });
  };

  // Handle clearinghouse credentials form submission
  const handleClearinghouseSubmit = (values: any) => {
    if (selectedProvider) {
      updateCredentialsMutation.mutate({
        providerId: selectedProvider.id,
        data: {
          clearinghouse_id: values.clearinghouse_id,
          ede_id: values.ede_id,
          era_id: values.era_id,
        },
      });
    }
  };

  // Get provider name
  const getProviderName = (p: OnboardingProvider) => {
    const name = p.organization_name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
    return name || p.npi;
  };

  // Get providers by stage
  const getProvidersByStage = (stageId: string) => {
    return providers.filter(p => p.workflow_stage === stageId);
  };

  // View provider details
  const handleViewProvider = (provider: OnboardingProvider) => {
    setSelectedProvider({
      id: provider.id,
      npi: provider.npi,
      workflow_stage: provider.workflow_stage,
      clearinghouse_id: provider.clearinghouse_id || undefined,
      ede_id: undefined,
      era_id: undefined,
    });
    setViewModalVisible(true);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>Onboarding Pipeline</Title>
          <p>Drag and drop providers through RCM stages</p>
        </div>
        <Space>
          <Badge count={getProvidersByStage('tech_setup').length} overflowCount={99}>
            <Button onClick={() => message.info('Tech Setup providers ready for credentials')}>
              Tech Ready: {getProvidersByStage('tech_setup').length}
            </Button>
          </Badge>
        </Space>
      </div>

      {/* Pipeline Board */}
      <div style={{ overflowX: 'auto' }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Row gutter={[16, 16]} style={{ minWidth: '1000px' }}>
            {STAGES.map((stage) => (
              <Col key={stage.id} xs={24} sm={12} md={6} lg={4} xl={3}>
                <Droppable droppableId={stage.id}>
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      style={{
                        backgroundColor: snapshot.isDraggingOver ? '#f0f5ff' : '#f5f5f5',
                        padding: '12px',
                        borderRadius: '8px',
                        minHeight: '100px',
                        height: '100%',
                      }}
                      {...provided.droppableProps}
                    >
                      <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                        <Badge count={getProvidersByStage(stage.id).length} overflowCount={99}>
                          <Tag color={stage.color} style={{ fontSize: '14px', fontWeight: 'bold' }}>
                            {stage.label}
                          </Tag>
                        </Badge>
                      </div>

                      {getProvidersByStage(stage.id).map((provider, index) => (
                        <Draggable key={provider.id} draggableId={provider.id} index={index}>
                          {(dragProvided: any, dragSnapshot: any) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{
                                backgroundColor: dragSnapshot.isDragging ? '#fff' : '#ffffff',
                                border: '1px solid #e8e8e8',
                                borderRadius: '4px',
                                padding: '12px',
                                marginBottom: '8px',
                                boxShadow: dragSnapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'grab',
                                ...dragProvided.draggableProps.style,
                              }}
                            >
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                {getProviderName(provider)}
                              </div>
                              {provider.specialty_primary && (
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                  {provider.specialty_primary}
                                </div>
                              )}
                              <div style={{ fontSize: '12px', color: '#999' }}>
                                {provider.city || ''} {provider.state || ''}
                              </div>
                              <div style={{ marginTop: '8px', fontSize: '11px', color: '#888' }}>
                                NPI: {provider.npi}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </Col>
            ))}
          </Row>
        </DragDropContext>
      </div>

      {/* Provider Details Modal */}
      <Modal
        title="Provider Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedProvider(null);
        }}
        footer={null}
        width={500}
      >
        {selectedProvider && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {getProviderName(providers.find(p => p.id === selectedProvider.id) as OnboardingProvider)}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                NPI: {selectedProvider.npi}
              </div>
            </div>

            <Divider />

            <div style={{ marginBottom: '16px' }}>
              <strong>Current Stage:</strong>{' '}
              <Tag color="blue">
                {selectedProvider.workflow_stage?.replace(/_/g, ' ') || 'Outreach'}
              </Tag>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>Clearinghouse ID:</strong>{' '}
              {providers.find(p => p.id === selectedProvider.id)?.clearinghouse_id || 'Not set'}
            </div>

            <div style={{ marginTop: '24px' }}>
              <Button
                type="primary"
                block
                onClick={() => {
                  setViewModalVisible(false);
                  setSelectedProvider(selectedProvider);
                  setClearinghouseModalVisible(true);
                }}
              >
                Configure EDI/ERA
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Clearinghouse Credentials Modal */}
      <Modal
        title="Configure EDI/ERA Credentials"
        open={clearinghouseModalVisible}
        onCancel={() => {
          setClearinghouseModalVisible(false);
          form.resetFields();
          setSelectedProvider(null);
        }}
        footer={null}
        width={500}
      >
        {selectedProvider && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleClearinghouseSubmit}
            initialValues={{
              clearinghouse_id: providers.find(p => p.id === selectedProvider.id)?.clearinghouse_id || '',
            }}
          >
            <Form.Item
              name="clearinghouse_id"
              label="Clearinghouse ID"
              rules={[{ required: true, message: 'Enter clearinghouse ID' }]}
            >
              <Input placeholder="e.g., 23556" />
            </Form.Item>

            <Form.Item
              name="ede_id"
              label="EDI Envelope ID (EDID)"
              rules={[{ required: true, message: 'Enter EDI Envelope ID' }]}
            >
              <Input placeholder="e.g., 123456789" />
            </Form.Item>

            <Form.Item
              name="era_id"
              label="ERA ID"
              rules={[{ required: false, message: 'Enter ERA ID' }]}
            >
              <Input placeholder="Optional - ERA ID for payment notification" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={updateCredentialsMutation.isPending}
                >
                  Save Credentials
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setClearinghouseModalVisible(false);
                    form.resetFields();
                    setSelectedProvider(null);
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default OnboardingPipeline;
