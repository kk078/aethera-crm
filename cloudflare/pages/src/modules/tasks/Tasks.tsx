import React from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Card, Typography, Tag, DatePicker, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI } from '@services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const Tasks: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksAPI.list(),
  });

  const { data: overdueData } = useQuery({
    queryKey: ['tasks-overdue'],
    queryFn: () => tasksAPI.getOverdue(),
  });

  const createMutation = useMutation({
    mutationFn: tasksAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-overdue'] });
      message.success('Task created successfully');
      setModalVisible(false);
      form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => tasksAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-overdue'] });
      message.success('Task updated successfully');
      setModalVisible(false);
      form.resetFields();
      setEditingTask(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tasksAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-overdue'] });
      message.success('Task deleted successfully');
    },
  });

  const handleCreate = () => {
    setEditingTask(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingTask(record);
    form.setFieldsValue({
      ...record,
      due_date: record.due_date ? dayjs(record.due_date) : null,
    });
    setModalVisible(true);
  };

  const handleDelete = (record: any) => {
    Modal.confirm({
      title: 'Are you sure?',
      content: `Delete task "${record.title}"?`,
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const handleSubmit = (values: any) => {
    const data = {
      ...values,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
    };
    
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      low: 'blue',
      medium: 'green',
      high: 'orange',
      urgent: 'red',
    };
    return colors[priority] || 'default';
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'orange',
      'in-progress': 'blue',
      completed: 'green',
      cancelled: 'red',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => <Tag color={getPriorityColor(priority)}>{priority}</Tag>,
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
      render: (date: string) => {
        if (!date) return '-';
        const isOverdue = new Date(date) < new Date();
        return (
          <span style={{ color: isOverdue ? 'red' : 'inherit' }}>
            {new Date(date).toLocaleDateString()}
          </span>
        );
      },
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

  const overdueCount = overdueData?.data?.data?.length || 0;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>Tasks</Title>
          <p>Manage your tasks and to-dos</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Task
        </Button>
      </div>

      {overdueCount > 0 && (
        <Card style={{ marginBottom: '24px', borderLeft: '4px solid red' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: 'red' }}>
              ⚠️ {overdueCount} overdue task{overdueCount > 1 ? 's' : ''}
            </span>
            <Button type="link" onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks-overdue'] })}>
              Refresh
            </Button>
          </div>
        </Card>
      )}

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
        title={editingTask ? 'Edit Task' : 'Add Task'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingTask(null);
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Enter task title" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={4} placeholder="Enter task description" />
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select>
              <Select.Option value="low">Low</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="urgent">Urgent</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="pending">
            <Select>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="in-progress">In Progress</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="due_date" label="Due Date">
            <DatePicker style={{ width: '100%' }} showTime placeholder="Select due date" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Tasks;
