import React from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Card, Typography, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsAPI } from '@services/api';

const { Title } = Typography;

const Leads: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingLead, setEditingLead] = React.useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsAPI.list(),
  });

  const createMutation = useMutation({
    mutationFn: leadsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      message.success('Lead created successfully');
      setModalVisible(false);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => leadsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      message.success('Lead updated successfully');
      setModalVisible(false);
      form.resetFields();
      setEditingLead(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: leadsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      message.success('Lead deleted successfully');
    },
  });

  const convertMutation = useMutation({
    mutationFn: leadsAPI.convert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      message.success('Lead converted to contact');
    },
  });

  const handleCreate = () => {
    setEditingLead(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingLead(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (record: any) => {
    Modal.confirm({
      title: 'Are you sure?',
      content: `Delete lead ${record.first_name || record.company}?`,
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const handleConvert = (record: any) => {
    Modal.confirm({
      title: 'Convert Lead?',
      content: 'This will create a contact from this lead.',
      onOk: () => convertMutation.mutate(record.id),
    });
  };

  const handleSubmit = (values: any) => {
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      new: 'blue',
      contacted: 'cyan',
      qualified: 'green',
      converted: 'purple',
      lost: 'red',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'first_name',
      key: 'name',
      render: (_: any, record: any) => `${record.first_name || ''} ${record.last_name || ''}`.trim() || record.company,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Lead Score',
      dataIndex: 'lead_score',
      key: 'lead_score',
      render: (score: number) => score ? (
        <Tag color={score > 80 ? 'green' : score > 50 ? 'yellow' : 'default'}>
          {score}
        </Tag>
      ) : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          {record.status !== 'converted' && (
            <Button
              type="link"
              onClick={() => handleConvert(record)}
            >
              Convert
            </Button>
          )}
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>Leads</Title>
          <p>Track and manage your leads</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Lead
        </Button>
      </div>

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

      <Modal
        title={editingLead ? 'Edit Lead' : 'Add Lead'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingLead(null);
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="first_name" label="First Name">
            <Input placeholder="Enter first name" />
          </Form.Item>
          <Form.Item name="last_name" label="Last Name">
            <Input placeholder="Enter last name" />
          </Form.Item>
          <Form.Item name="company" label="Company">
            <Input placeholder="Enter company name" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" placeholder="Enter email" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Enter phone number" />
          </Form.Item>
          <Form.Item name="specialty" label="Specialty">
            <Input placeholder="Enter specialty" />
          </Form.Item>
          <Form.Item name="npi" label="NPI">
            <Input placeholder="Enter NPI number" />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="new">
            <Select>
              <Select.Option value="new">New</Select.Option>
              <Select.Option value="contacted">Contacted</Select.Option>
              <Select.Option value="qualified">Qualified</Select.Option>
              <Select.Option value="converted">Converted</Select.Option>
              <Select.Option value="lost">Lost</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingLead ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Leads;
