import React from 'react';
import { Card, Typography, Table, Button, Space, Tag, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsAPI } from '@services/api';

const { Title } = Typography;

const Organizations: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingOrg, setEditingOrg] = React.useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsAPI.list(),
  });

  const createMutation = useMutation({
    mutationFn: organizationsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      message.success('Organization created successfully');
      setModalVisible(false);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => organizationsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      message.success('Organization updated successfully');
      setModalVisible(false);
      form.resetFields();
      setEditingOrg(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: organizationsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      message.success('Organization deleted successfully');
    },
  });

  const handleCreate = () => {
    setEditingOrg(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingOrg(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (record: any) => {
    Modal.confirm({
      title: 'Are you sure?',
      content: `Delete organization ${record.name}?`,
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const handleSubmit = (values: any) => {
    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      key: 'industry',
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
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
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
          <Title level={2}>Organizations</Title>
          <p>Manage companies and accounts</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Organization
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
        title={editingOrg ? 'Edit Organization' : 'Add Organization'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingOrg(null);
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Enter organization name" />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select placeholder="Select type">
              <Select.Option value="customer">Customer</Select.Option>
              <Select.Option value="partner">Partner</Select.Option>
              <Select.Option value="vendor">Vendor</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="industry" label="Industry">
            <Input placeholder="Enter industry" />
          </Form.Item>
          <Form.Item name="website" label="Website">
            <Input type="url" placeholder="Enter website URL" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" placeholder="Enter email" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Enter phone number" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={3} placeholder="Enter address" />
          </Form.Item>
          <Form.Item name="city" label="City">
            <Input placeholder="Enter city" />
          </Form.Item>
          <Form.Item name="state" label="State">
            <Input placeholder="Enter state" />
          </Form.Item>
          <Form.Item name="zip" label="ZIP">
            <Input placeholder="Enter ZIP code" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingOrg ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Organizations;
