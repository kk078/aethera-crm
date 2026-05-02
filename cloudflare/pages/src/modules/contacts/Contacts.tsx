import React from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Card, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsAPI } from '@services/api';
import { useAuthStore } from '@stores/authStore';

const { Title } = Typography;
const { TextArea } = Input;

const Contacts: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsAPI.list(),
  });

  const createMutation = useMutation({
    mutationFn: contactsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      message.success('Contact created successfully');
      setModalVisible(false);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => contactsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      message.success('Contact updated successfully');
      setModalVisible(false);
      form.resetFields();
      setEditingContact(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: contactsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      message.success('Contact deleted successfully');
    },
  });

  const handleCreate = () => {
    setEditingContact(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingContact(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (record: any) => {
    Modal.confirm({
      title: 'Are you sure?',
      content: `Delete contact ${record.first_name} ${record.last_name}?`,
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const handleSubmit = (values: any) => {
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'first_name',
      key: 'name',
      render: (_: any, record: any) => `${record?.first_name || ''} ${record?.last_name || ''}`.trim(),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => email || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '-',
    },
    {
      title: 'Organization',
      dataIndex: 'organization_name',
      key: 'organization_name',
      render: (org: string) => org || '-',
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
          <Title level={2}>Contacts</Title>
          <p>Manage your contacts and relationships</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Contact
        </Button>
      </div>

      <Card className="hover-card">
        <Table
          columns={columns}
          dataSource={data?.data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: data?.data?.pagination?.per_page || 20,
            current: data?.data?.pagination?.page || 1,
            total: data?.data?.pagination?.total || 0,
          }}
        />
      </Card>

      <Modal
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingContact(null);
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
            <Input placeholder="Enter first name" />
          </Form.Item>
          <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
            <Input placeholder="Enter last name" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" placeholder="Enter email" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Enter phone number" />
          </Form.Item>
          <Form.Item name="title" label="Title">
            <Input placeholder="Enter job title" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <TextArea rows={3} placeholder="Enter address" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingContact ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Contacts;
