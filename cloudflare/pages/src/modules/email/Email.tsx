import React, { useState } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Modal, Form, Input, Select, message, Badge, Tabs, Empty, Result, Spin, Divider, List } from 'antd';
import { MailOutlined, SendOutlined, InboxOutlined, FileTextOutlined, PlusOutlined, DeleteOutlined, EyeOutlined, PhoneOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailsAPI } from '@services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Email {
  id: string;
  message_id: string;
  thread_id: string | null;
  from_address: string;
  to_addresses: string;
  subject: string;
  body: string;
  html_body: string | null;
  direction: string;
  status: string;
  sentiment_score: number | null;
  category: string | null;
  crm_record_type: string | null;
  crm_record_id: string | null;
  created_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  owner_id: string;
  created_at: string;
}

const Email: React.FC = () => {
  const queryClient = useQueryClient();
  const [composeVisible, setComposeVisible] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateForm] = Form.useForm();
  const [composeForm] = Form.useForm();

  const { data: emailsData, isLoading } = useQuery({
    queryKey: ['emails', activeTab],
    queryFn: async () => {
      const res = await emailsAPI.list({ direction: activeTab === 'sent' ? 'outbound' : 'inbound' });
      return res;
    },
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await emailsAPI.getTemplates();
      return res;
    },
  });

  const emailsList = React.useMemo(() => {
    if (!emailsData) return [];
    const raw = (emailsData as any).data;
    return Array.isArray(raw) ? raw : [];
  }, [emailsData]);

  const templatesList = React.useMemo(() => {
    if (!templatesData) return [];
    const raw = (templatesData as any).data;
    return Array.isArray(raw) ? raw : [];
  }, [templatesData]);

  const sendMutation = useMutation({
    mutationFn: (data: any) => emailsAPI.send(data),
    onSuccess: () => {
      message.success('Email sent successfully');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setComposeVisible(false);
      composeForm.resetFields();
    },
    onError: (error: any) => {
      message.error(`Failed: ${error.message}`);
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => emailsAPI.createTemplate(data),
    onSuccess: () => {
      message.success('Template created');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setTemplateModalVisible(false);
      templateForm.resetFields();
    },
    onError: (error: any) => message.error(`Failed: ${error.message}`),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => emailsAPI.deleteTemplate(id),
    onSuccess: () => {
      message.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (error: any) => message.error(`Failed: ${error.message}`),
  });

  const handleSend = (values: any) => {
    sendMutation.mutate({
      to: values.to,
      subject: values.subject,
      body: values.body,
    });
  };

  const handleCreateTemplate = (values: any) => {
    createTemplateMutation.mutate(values);
  };

  const useTemplate = (template: EmailTemplate) => {
    composeForm.setFieldsValue({
      subject: template.subject,
      body: template.body,
    });
    setComposeVisible(true);
  };

  const columns = [
    {
      title: '',
      dataIndex: 'status',
      key: 'status',
      width: 50,
      render: (status: string) => (
        <Badge status={status === 'unread' ? 'processing' : 'default'} />
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (subject: string, record: Email) => (
        <Text strong={record.status === 'unread'}>{subject || '(no subject)'}</Text>
      ),
    },
    {
      title: activeTab === 'sent' ? 'To' : 'From',
      dataIndex: activeTab === 'sent' ? 'to_addresses' : 'from_address',
      key: 'contact',
      width: 220,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'date',
      width: 160,
      render: (date: string) => dayjs(date).format('MMM D, YYYY h:mm A'),
    },
    {
      title: 'Type',
      dataIndex: 'direction',
      key: 'direction',
      width: 100,
      render: (dir: string) => (
        <Tag color={dir === 'outbound' ? 'blue' : 'green'}>
          {dir === 'outbound' ? 'Sent' : 'Received'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Title level={2}><MailOutlined /> Email</Title>
          <Paragraph>Send emails and manage templates</Paragraph>
        </div>
        <Space>
          <Button icon={<FileTextOutlined />} onClick={() => setTemplateModalVisible(true)}>
            Templates ({templatesList.length})
          </Button>
          <Button type="primary" icon={<SendOutlined />} onClick={() => { composeForm.resetFields(); setComposeVisible(true); }}>
            Compose
          </Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab={<span><InboxOutlined /> Inbox</span>} key="inbox" />
        <Tabs.TabPane tab={<span><SendOutlined /> Sent</span>} key="sent" />
      </Tabs>

      <Card>
        <Table
          columns={columns}
          dataSource={emailsList}
          rowKey="id"
          loading={isLoading}
          locale={{ emptyText: <Empty description="No emails yet. Click Compose to send one." /> }}
          pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} emails` }}
          onRow={(record: Email) => ({
            onClick: () => setSelectedEmail(record),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      {selectedEmail && (
        <Card
          title={selectedEmail.subject || '(no subject)'}
          style={{ marginTop: 16 }}
          extra={<Button onClick={() => setSelectedEmail(null)}>Close</Button>}
        >
          <div style={{ marginBottom: 8 }}><Text strong>From: </Text>{selectedEmail.from_address}</div>
          <div style={{ marginBottom: 8 }}><Text strong>To: </Text>{selectedEmail.to_addresses}</div>
          <div style={{ marginBottom: 16 }}><Text strong>Date: </Text>{dayjs(selectedEmail.created_at).format('MMM D, YYYY h:mm A')}</div>
          {selectedEmail.sentiment_score !== null && (
            <div style={{ marginBottom: 8 }}>
              <Text strong>Sentiment: </Text>
              <Tag color={selectedEmail.sentiment_score > 0.3 ? 'green' : selectedEmail.sentiment_score < -0.3 ? 'red' : 'blue'}>
                {selectedEmail.sentiment_score.toFixed(2)}
              </Tag>
            </div>
          )}
          <Divider />
          <div style={{ whiteSpace: 'pre-wrap', padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
            {selectedEmail.html_body ? (
              <div dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }} />
            ) : (
              selectedEmail.body || '(no content)'
            )}
          </div>
        </Card>
      )}

      <Modal
        title="Compose Email"
        open={composeVisible}
        onCancel={() => setComposeVisible(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form form={composeForm} layout="vertical" onFinish={handleSend}>
          <Form.Item name="to" label="To" rules={[{ required: true, message: 'Recipient email required' }]}>
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="Email subject" />
          </Form.Item>
          <Form.Item name="body" label="Body" rules={[{ required: true }]}>
            <TextArea rows={8} placeholder="Write your message..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={sendMutation.isPending}>
              Send Email
            </Button>
          </Form.Item>
        </Form>
        {templatesList.length > 0 && (
          <>
            <Divider>Use a Template</Divider>
            <List
              size="small"
              dataSource={templatesList}
              renderItem={(t: EmailTemplate) => (
                <List.Item
                  actions={[<Button size="small" type="link" onClick={() => useTemplate(t)}>Use</Button>]}
                >
                  <List.Item.Meta title={t.name} description={`${t.subject || '(no subject)'} — ${t.category || 'general'}`} />
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>

      <Modal
        title="Email Templates"
        open={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginBottom: 16, width: '100%' }}
          onClick={() => {
            templateForm.resetFields();
            Modal.confirm({
              title: 'New Template',
              content: (
                <Form form={templateForm} layout="vertical">
                  <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                    <Input placeholder="Template name" />
                  </Form.Item>
                  <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                    <Input placeholder="Email subject" />
                  </Form.Item>
                  <Form.Item name="category" label="Category">
                    <Select allowClear placeholder="Select category">
                      <Select.Option value="outreach">Outreach</Select.Option>
                      <Select.Option value="follow-up">Follow-up</Select.Option>
                      <Select.Option value="general">General</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="body" label="Body" rules={[{ required: true }]}>
                    <TextArea rows={6} placeholder="Use {{name}}, {{specialty}}, {{city}} as merge fields" />
                  </Form.Item>
                </Form>
              ),
              onOk: () => templateForm.validateFields().then(handleCreateTemplate),
            });
          }}
        >
          New Template
        </Button>
        {templatesLoading ? (
          <Spin />
        ) : (templatesList.length === 0) ? (
          <Empty description="No templates yet" />
        ) : (
          <List
            dataSource={templatesList}
            renderItem={(t: EmailTemplate) => (
              <List.Item
                actions={[
                  <Button size="small" icon={<EyeOutlined />} onClick={() => {
                    Modal.info({
                      title: t.name,
                      content: (
                        <div>
                          <p><strong>Subject:</strong> {t.subject}</p>
                          <p><strong>Category:</strong> {t.category || 'general'}</p>
                          <Divider />
                          <pre style={{ whiteSpace: 'pre-wrap' }}>{t.body}</pre>
                        </div>
                      ),
                    });
                  }} />,
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => {
                    Modal.confirm({
                      title: 'Delete template?',
                      content: `Delete "${t.name}"?`,
                      onOk: () => deleteTemplateMutation.mutate(t.id),
                    });
                  }} />,
                ]}
              >
                <List.Item.Meta
                  title={t.name}
                  description={
                    <Space>
                      <Tag>{t.category || 'general'}</Tag>
                      <Text type="secondary">{t.subject}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default Email;
