import React, { useState, useEffect } from 'react';
import { Modal, Descriptions, Tabs, Card, Tag, Button, Space, message, Table, Alert, Form, Input, Select, DatePicker, Typography, Spin } from 'antd';
import { useAuthStore } from '@stores/authStore';
import { onboardingAPI, dealsAPI } from '@services/api';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { Title } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface DealDetailProps {
  dealId: string | null;
  visible: boolean;
  onClose: () => void;
}

interface ChecklistItem {
  baas_executed: number;
  baas_signed_date: string | null;
  service_agreement_executed: number;
  service_agreement_signed_date: string | null;
  edi_enrollment_status: string;
  clearinghouse_integration_status: string;
  clearinghouse_name: string | null;
  test_transactions_sent: number;
  production_transactions_enabled: number;
  npi_verification_status: string;
  caqh_verification_status: string;
  payer_linking_status: string;
  credentialing_complete: number;
  credentialing_complete_date: string | null;
  overall_status: string;
}

const DealDetail: React.FC<DealDetailProps> = ({ dealId, visible, onClose }) => {
  const [activeTab, setActiveTab] = useState('technical');
  const [checklist, setChecklist] = useState<ChecklistItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);

  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (dealId && visible) {
      loadDealDetail();
      loadChecklist(dealId);
      loadDocuments(dealId);
    }
  }, [dealId, visible]);

  const loadDealDetail = async () => {
    try {
      const response = await dealsAPI.get(dealId || '');
      console.log('Deal detail:', response.data);
    } catch (error) {
      console.error('Error loading deal:', error);
    }
  };

  const loadChecklist = async (dealId: string) => {
    try {
      setLoading(true);
      const response = await onboardingAPI.getChecklist(dealId);
      if (response.data) {
        setChecklist(response.data);
      }
    } catch (error: any) {
      console.error('Error loading checklist:', error);
      if (error.response?.status !== 404) {
        message.error('Failed to load checklist');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (dealId: string) => {
    try {
      setDocumentLoading(true);
      // First get deal to find provider_id
      const dealResponse = await dealsAPI.get(dealId);
      if (dealResponse.data?.provider_id) {
        const docResponse = await onboardingAPI.getDocumentsByProvider(dealResponse.data.provider_id);
        setDocuments(docResponse.data?.data || []);
      }
    } catch (error: any) {
      console.error('Error loading documents:', error);
    } finally {
      setDocumentLoading(false);
    }
  };

  const updateChecklistMutation = useMutation({
    mutationFn: ({ dealId, data }: any) => onboardingAPI.updateChecklistItems(dealId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', variables.dealId] });
      message.success('Checklist updated successfully');
    },
  });

  const handleChecklistUpdate = (values: any) => {
    if (dealId) {
      updateChecklistMutation.mutate({ dealId, data: values });
    }
  };

  const columns = [
    { title: 'Document Type', dataIndex: 'document_type', key: 'document_type' },
    { title: 'Document Name', dataIndex: 'document_name', key: 'document_name' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    {
      title: 'Uploaded At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => date ? dayjs(date).format('MM/DD/YYYY') : '-',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: any = {
      approved: 'green',
      pending: 'orange',
      rejected: 'red',
    };
    return colors[status] || 'default';
  };

  return (
    <Modal
      title="Deal Details"
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
    >
      <Spin spinning={loading}>
        {checklist ? (
          <div>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              {/* Technical Setup Tab */}
              <TabPane tab="Technical Setup" key="technical">
                <Card title="Technical Checklist" className="hover-card">
                  <Form
                    layout="vertical"
                    onFinish={handleChecklistUpdate}
                  >
                    <Title level={5}>EDI/ERA Enrollment</Title>
                    <div style={{ marginBottom: 16 }}>
                      <Form.Item
                        name="edi_enrollment_status"
                        label="EDI Enrollment Status"
                        initialValue={checklist.edi_enrollment_status}
                      >
                        <Select>
                          <Select.Option value="pending">Pending</Select.Option>
                          <Select.Option value="in_progress">In Progress</Select.Option>
                          <Select.Option value="completed">Completed</Select.Option>
                          <Select.Option value="rejected">Rejected</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Form.Item
                        name="clearinghouse_integration_status"
                        label="Clearinghouse Integration"
                        initialValue={checklist.clearinghouse_integration_status}
                      >
                        <Select>
                          <Select.Option value="pending">Pending</Select.Option>
                          <Select.Option value="connected">Connected</Select.Option>
                          <Select.Option value="testing">Testing</Select.Option>
                          <Select.Option value="live">Live</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Form.Item
                        name="clearinghouse_name"
                        label="Clearinghouse Name"
                        initialValue={checklist.clearinghouse_name || ''}
                      >
                        <Input placeholder="Enter clearinghouse name" />
                      </Form.Item>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Form.Item
                        name="test_transactions_sent"
                        label="Test Transactions Sent"
                        initialValue={checklist.test_transactions_sent || 0}
                      >
                        <Input type="number" min={0} />
                      </Form.Item>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Form.Item
                        name="production_transactions_enabled"
                        label="Production Transactions Enabled"
                        valuePropName="checked"
                        initialValue={checklist.production_transactions_enabled ? true : false}
                      >
                        <Select>
                          <Select.Option value={1}>Yes</Select.Option>
                          <Select.Option value={0}>No</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <Title level={5}>Credentialing Status</Title>
                    <div style={{ marginBottom: 16 }}>
                      <Form.Item
                        name="npi_verification_status"
                        label="NPI Verification"
                        initialValue={checklist.npi_verification_status}
                      >
                        <Select>
                          <Select.Option value="pending">Pending</Select.Option>
                          <Select.Option value="verified">Verified</Select.Option>
                          <Select.Option value="not_verified">Not Verified</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Form.Item
                        name="caqh_verification_status"
                        label="CAQH Verification"
                        initialValue={checklist.caqh_verification_status}
                      >
                        <Select>
                          <Select.Option value="pending">Pending</Select.Option>
                          <Select.Option value="verified">Verified</Select.Option>
                          <Select.Option value="not_verified">Not Verified</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Form.Item
                        name="payer_linking_status"
                        label="Payer Linking Status"
                        initialValue={checklist.payer_linking_status}
                      >
                        <Select>
                          <Select.Option value="pending">Pending</Select.Option>
                          <Select.Option value="completed">Completed</Select.Option>
                          <Select.Option value="partial">Partial</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <Form.Item
                        name="credentialing_complete"
                        label="Credentialing Complete"
                        valuePropName="checked"
                        initialValue={checklist.credentialing_complete ? true : false}
                      >
                        <Select>
                          <Select.Option value={1}>Yes</Select.Option>
                          <Select.Option value={0}>No</Select.Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={updateChecklistMutation.isPending}>
                        Save Technical Checklist
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </TabPane>

              {/* Legal Documents Tab */}
              <TabPane tab="Legal Documents" key="legal">
                <Card title="Legal Documents" className="hover-card">
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid #f0f0f0', borderRadius: '4px', marginBottom: '8px' }}>
                      <div>
                        <strong>BAA (Business Associate Agreement)</strong>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {checklist.baas_executed ? (
                            <Tag color="green">Signed: {checklist.baas_signed_date || 'Date missing'}</Tag>
                          ) : (
                            <Tag color="orange">Not Signed</Tag>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid #f0f0f0', borderRadius: '4px', marginBottom: '8px' }}>
                      <div>
                        <strong>Service Agreement</strong>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {checklist.service_agreement_executed ? (
                            <Tag color="green">Signed: {checklist.service_agreement_signed_date || 'Date missing'}</Tag>
                          ) : (
                            <Tag color="orange">Not Signed</Tag>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Alert message="Upload legal documents via the Documents tab" type="info" />
                </Card>
              </TabPane>

              {/* Documents Tab */}
              <TabPane tab="Documents" key="documents">
                <Card title="Provider Documents" className="hover-card">
                  <Table
                    columns={columns}
                    dataSource={documents}
                    rowKey="id"
                    loading={documentLoading}
                    pagination={false}
                  />
                </Card>
              </TabPane>
            </Tabs>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Alert message="No onboarding checklist found for this deal" type="info" />
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default DealDetail;
