import React from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Card, Typography, Tag, message, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesAPI } from '@services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const Activities: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingActivity, setEditingActivity] = React.useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => activitiesAPI.list(),
  });

  const createMutation = useMutation({
    mutationFn: activitiesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      message.success('Activity created successfully');
      setModalVisible(false);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => activitiesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      message.success('Activity updated successfully');
      setModalVisible(false);
      form.resetFields();
      setEditingActivity(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: activitiesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      message.success('Activity deleted successfully');
    },
  });

  const handleCreate = () => {
    setEditingActivity(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingActivity(record);
    form.setFieldsValue({
      ...record,
      due_date: record.due_date ? dayjs(record.due_date) : null,
    });
    setModalVisible(true);
  };

  const handleDelete = (record: any) => {
    Modal.confirm({
      title: 'Are you sure?',
      content: `Delete activity?`,
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const handleSubmit = (values: any) => {
    const data = {
      ...values,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
    };
    
    if (editingActivity) {
      updateMutation.mutate({ id: editingActivity.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: any = {
      call: '📞',
      email: '✉️',
      task: '✓',
      meeting: '📅',
      note: '📝',
    };
    return icons[type] || '📌';
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'orange',
      completed: 'green',
      cancelled: 'red',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <span style={{ fontSize: '20px' }}>{getTypeIcon(type)}</span>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<CheckOutlined />}
            onClick={() => {
              updateMutation.mutate({
                id: record.id,
                data: { status: 'completed' },
              });
            }}
            disabled={record.status === 'completed'}
          />
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
          <Title level={2}>Activities</Title>
          <p>Track calls, emails, meetings, and tasks</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Activity
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
        title={editingActivity ? 'Edit Activity' : 'Add Activity'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingActivity(null);
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="call">Call</Select.Option>
              <Select.Option value="email">Email</Select.Option>
              <Select.Option value="task">Task</Select.Option>
              <Select.Option value="meeting">Meeting</Select.Option>
              <Select.Option value="note">Note</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="Enter subject" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Enter description" />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="pending">
            <Select>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="due_date" label="Due Date">
            <DatePicker style={{ width: '100%' }} showTime placeholder="Select due date" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingActivity ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Activities;
