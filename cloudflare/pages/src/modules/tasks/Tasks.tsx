import React from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Card, Typography, Tag, DatePicker, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI } from '@services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

// Payer priority for task sorting - high volume payers first
const PAYER_PRIORITY: Record<string, number> = {
  medicare: 1,
  bcbs: 2,
  medicaid: 3,
  united: 4,
  humana: 5,
  aetna: 6,
  cigna: 7,
  centene: 8,
};

// Storage keys for persisting user preferences
const SORT_PREFERENCE_KEY = 'tasks_sort_preference';

// Helper to get payer priority
const getPayerPriority = (description: string, priority: string): number => {
  const descLower = (description || '').toLowerCase();
  for (const [payer, prio] of Object.entries(PAYER_PRIORITY)) {
    if (descLower.includes(payer)) return prio;
  }
  // Also check the actual priority field
  if (priority === 'high' || priority === 'urgent') return 9;
  if (priority === 'medium') return 10;
  return 11;
};

// Sort task helper function
const sortTasksByPayerPriority = (tasks: any[], sortByDueDate: boolean = true) => {
  return tasks.sort((a: any, b: any) => {
    const priorityA = getPayerPriority(a.description, a.priority);
    const priorityB = getPayerPriority(b.description, b.priority);
    // Sort by priority (lower number = higher priority)
    if (priorityA !== priorityB) return priorityA - priorityB;
    // Then by due date (soonest first) if enabled
    if (sortByDueDate && a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    // Then by created date
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
};

// Get stored sort preference
const getSortPreference = (): boolean => {
  try {
    const stored = localStorage.getItem(SORT_PREFERENCE_KEY);
    return stored ? JSON.parse(stored) : true;
  } catch {
    return true;
  }
};

// Save sort preference
const saveSortPreference = (sortByDueDate: boolean) => {
  try {
    localStorage.setItem(SORT_PREFERENCE_KEY, JSON.stringify(sortByDueDate));
  } catch {
    // Ignore storage errors
  }
};

const Tasks: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<any>(null);
  const [form] = Form.useForm();
  // Sort preference state - persists to localStorage
  const [sortByDueDate, setSortByDueDate] = React.useState<boolean>(() => getSortPreference());

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksAPI.list(),
  });

  // Auto-sort tasks by payer priority (persisting preference)
  const sortedTasks = React.useMemo(() => {
    const tasks = data?.data?.data || [];
    return sortTasksByPayerPriority(tasks, sortByDueDate);
  }, [data, sortByDueDate]);

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
      // Save sort preference
      saveSortPreference(sortByDueDate);
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
      // Save sort preference
      saveSortPreference(sortByDueDate);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tasksAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-overdue'] });
      message.success('Task deleted successfully');
      // Save sort preference
      saveSortPreference(sortByDueDate);
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

  // Filter sorted tasks for overdue (for display) - must be declared before overdueCount
  const overdueTasks = React.useMemo(() => {
    const now = new Date();
    return sortedTasks.filter((t: any) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed');
  }, [sortedTasks]);

  const overdueCount = overdueTasks.length;

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
          dataSource={sortedTasks}
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
