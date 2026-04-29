import React, { useState } from 'react';
import { Card, Typography, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, DatePicker, message, Table } from 'antd';
import { PlusOutlined, DollarOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsAPI } from '@services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const Deals: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => dealsAPI.list(),
  });

  const { data: pipelineData } = useQuery({
    queryKey: ['deals-pipeline'],
    queryFn: () => dealsAPI.getPipeline(),
  });

  const createMutation = useMutation({
    mutationFn: dealsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-pipeline'] });
      message.success('Deal created successfully');
      setModalVisible(false);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => dealsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-pipeline'] });
      message.success('Deal updated successfully');
      setModalVisible(false);
      form.resetFields();
      setEditingDeal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dealsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-pipeline'] });
      message.success('Deal deleted successfully');
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: any) => dealsAPI.updateStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-pipeline'] });
      message.success('Deal stage updated');
    },
  });

  const handleCreate = () => {
    setEditingDeal(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingDeal(record);
    form.setFieldsValue({
      ...record,
      expected_close_date: record.expected_close_date ? dayjs(record.expected_close_date) : null,
    });
    setModalVisible(true);
  };

  const handleDelete = (record: any) => {
    Modal.confirm({
      title: 'Are you sure?',
      content: `Delete deal ${record.name}?`,
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const handleStageChange = (record: any, newStage: string) => {
    const probabilities: any = {
      'Prospecting': 10,
      'Qualification': 30,
      'Proposal': 50,
      'Negotiation': 70,
      'Closed Won': 100,
      'Closed Lost': 0,
    };
    
    updateStageMutation.mutate({
      id: record.id,
      stage: newStage,
      probability: probabilities[newStage],
    });
  };

  const handleSubmit = (values: any) => {
    const data = {
      ...values,
      expected_close_date: values.expected_close_date ? values.expected_close_date.format('YYYY-MM-DD') : null,
    };
    
    if (editingDeal) {
      updateMutation.mutate({ id: editingDeal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStageColor = (stage: string) => {
    const colors: any = {
      'Prospecting': 'blue',
      'Qualification': 'cyan',
      'Proposal': 'green',
      'Negotiation': 'orange',
      'Closed Won': 'green',
      'Closed Lost': 'red',
    };
    return colors[stage] || 'default';
  };

  const stages = [
    'Prospecting',
    'Qualification',
    'Proposal',
    'Negotiation',
    'Closed Won',
    'Closed Lost',
  ];

  const columns = [
    {
      title: 'Deal Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_: any, record: any) => `${record.first_name || ''} ${record.last_name || ''}`.trim(),
    },
    {
      title: 'Organization',
      dataIndex: 'organization_name',
      key: 'organization_name',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => amount ? `$${amount.toLocaleString()}` : '-',
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage: string, record: any) => (
        <Select
          value={stage}
          onChange={(value) => handleStageChange(record, value)}
          style={{ width: 120 }}
        >
          {stages.map((s) => (
            <Select.Option key={s} value={s}>
              {s}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Probability',
      dataIndex: 'probability',
      key: 'probability',
      render: (prob: number) => prob ? `${prob}%` : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleDelete(record)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const totalPipelineValue = pipelineData?.data.data?.reduce((acc: any, stage: any) => acc + (stage.total_amount || 0), 0) || 0;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>Deals</Title>
          <p>Manage your sales pipeline</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Deal
        </Button>
      </div>

      {/* Pipeline Overview */}
      <Card className="hover-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Title level={4} style={{ margin: 0 }}>Pipeline Overview</Title>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
            Total: ${totalPipelineValue.toLocaleString()}
          </div>
        </div>
        <Space wrap size="large">
          {pipelineData?.data.data?.map((stage: any, index: number) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {stage.count || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>{stage.stage}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                ${stage.total_amount?.toLocaleString() || 0}
              </div>
            </div>
          ))}
        </Space>
      </Card>

      {/* Deals Table */}
      <Card className="hover-card">
        <Table
          columns={columns}
          dataSource={data?.data.data}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: data?.data.pagination?.per_page || 20,
            current: data?.data.pagination?.page || 1,
            total: data?.data.pagination?.total || 0,
          }}
        />
      </Card>

      {/* Add/Edit Deal Modal */}
      <Modal
        title={editingDeal ? 'Edit Deal' : 'Add Deal'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingDeal(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Deal Name" rules={[{ required: true }]}>
            <Input placeholder="Enter deal name" />
          </Form.Item>
          
          <Form.Item name="stage" label="Stage" initialValue="Prospecting" rules={[{ required: true }]}>
            <Select>
              {stages.map((s) => (
                <Select.Option key={s} value={s}>{s}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="amount" label="Amount ($)">
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, ''))}
              placeholder="Enter deal amount"
            />
          </Form.Item>
          
          <Form.Item name="probability" label="Probability (%)">
            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="Enter probability" />
          </Form.Item>
          
          <Form.Item name="expected_close_date" label="Expected Close Date">
            <DatePicker style={{ width: '100%' }} placeholder="Select expected close date" />
          </Form.Item>
          
          <Form.Item name="lost_reason" label="Lost Reason">
            <TextArea rows={3} placeholder="Reason for losing this deal" />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingDeal ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Deals;
