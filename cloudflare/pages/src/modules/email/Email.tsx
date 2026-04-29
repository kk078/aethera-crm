import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Modal, Form, Input, Select, message, Badge, Tabs, Empty, Result, Spin, Divider, List, Row, Col, Alert } from 'antd';
import { MailOutlined, SendOutlined, InboxOutlined, FileTextOutlined, PlusOutlined, DeleteOutlined, EyeOutlined, PhoneOutlined, SettingOutlined, GoogleOutlined, LinkOutlined, UserOutlined } from '@ant-design/icons';
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

interface OAuthConfig {
  client_id: string;
  redirect_uri: string;
  from_email: string;
  from_name: string;
  use_oauth: boolean;
}

const Email: React.FC = () => {
  const queryClient = useQueryClient();
  const [composeVisible, setComposeVisible] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [oauthConfigModalVisible, setOauthConfigModalVisible] = useState(false);
  const [authCodeModalVisible, setAuthCodeModalVisible] = useState(false);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [oauthCode, setOauthCode] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [templateForm] = Form.useForm();
  const [composeForm] = Form.useForm();
  const [oauthForm] = Form.useForm();

  // Setup mutation for pre-configuring Gmail OAuth
  const setupMutation = useMutation({
    mutationFn: () => emailsAPI.setup(),
    onSuccess: (data) => {
      message.success('Gmail setup completed successfully');
      queryClient.invalidateQueries({ queryKey: ['oauth-config'] });
      setSetupModalVisible(false);
    },
    onError: (error: any) => {
      message.error(`Setup failed: ${error.message}`);
    },
  });

  const { data: emailsData, isLoading, refetch: refetchEmails } = useQuery({
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

  const { data: oauthConfigData } = useQuery({
    queryKey: ['oauth-config'],
    queryFn: async () => {
      const res = await emailsAPI.getOAuthConfig();
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

  const oauthConfig = React.useMemo(() => {
    if (!oauthConfigData) return null;
    return (oauthConfigData as any).data as OAuthConfig;
  }, [oauthConfigData]);

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

  const saveOAuthConfigMutation = useMutation({
    mutationFn: (data: any) => emailsAPI.saveOAuthConfig(data),
    onSuccess: () => {
      message.success('Gmail OAuth configured successfully');
      queryClient.invalidateQueries({ queryKey: ['oauth-config'] });
      setOauthConfigModalVisible(false);
    },
    onError: (error: any) => message.error(`Failed: ${error.message}`),
  });

  const getAuthUrlMutation = useMutation({
    mutationFn: () => emailsAPI.getAuthUrl(),
    onSuccess: (data) => {
      const url = (data as any).data?.auth_url;
      if (url) {
        setAuthUrl(url);
        setAuthCodeModalVisible(true);
      }
    },
    onError: (error: any) => message.error(`Failed to get auth URL: ${error.message}`),
  });

  const exchangeTokenMutation = useMutation({
    mutationFn: (code: string) => emailsAPI.exchangeToken(code),
    onSuccess: (data) => {
      const userData = (data as any).data;
      message.success(`Gmail connected: ${userData.email}`);
      setAuthCodeModalVisible(false);
      setOauthCode('');
      queryClient.invalidateQueries({ queryKey: ['oauth-config'] });
    },
    onError: (error: any) => message.error(`Token exchange failed: ${error.message}`),
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

  const handleSaveOAuthConfig = (values: any) => {
    saveOAuthConfigMutation.mutate({
      client_id: values.client_id,
      client_secret: values.client_secret,
      redirect_uri: values.redirect_uri,
      from_email: values.from_email || 'info@aetherahealthcare.com',
      from_name: values.from_name || 'Aethera Healthcare',
      use_oauth: true,
    });
  };

  const handleAuthCodeSubmit = () => {
    if (oauthCode.trim()) {
      exchangeTokenMutation.mutate(oauthCode.trim());
    }
  };

  const useTemplate = (template: EmailTemplate) => {
    composeForm.setFieldsValue({
      subject: template.subject,
      body: template.body,
    });
    setComposeVisible(true);
  };

  const renderEmailBody = (email: Email) => {
    if (email.html_body) {
      return <div dangerouslySetInnerHTML={{ __html: email.html_body }} />;
    }
    return <div style={{ whiteSpace: 'pre-wrap' }}>{email.body || '(no content)'}</div>;
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

  // OAuth connection check
  const isOAuthConnected = oauthConfig?.use_oauth && !!oauthConfig.client_id;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Title level={2}><MailOutlined /> Email</Title>
          <Paragraph>Send emails and manage templates</Paragraph>
        </div>
        <Space>
          <Button icon={<SettingOutlined />} onClick={() => setOauthConfigModalVisible(true)}>
            Gmail Settings
          </Button>
          {oauthConfig && !isOAuthConnected && (
            <Button icon={<GoogleOutlined />} onClick={() => setSetupModalVisible(true)}>
              Setup Gmail
            </Button>
          )}
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
            {renderEmailBody(selectedEmail)}
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

      {/* Gmail OAuth Configuration Modal */}
      <Modal
        title={<span><GoogleOutlined /> Gmail OAuth Configuration</span>}
        open={oauthConfigModalVisible}
        onCancel={() => setOauthConfigModalVisible(false)}
        footer={null}
        width={500}
      >
        {isOAuthConnected ? (
          <div>
            <Alert
              message="Gmail is connected"
              description={
                <Text>
                  Email: <strong>{oauthConfig?.from_email}</strong><br />
                  Status: <Tag color="green">Active</Tag>
                </Text>
              }
              type="success"
              style={{ marginBottom: 16 }}
            />
            <Button icon={<GoogleOutlined />} onClick={() => getAuthUrlMutation.mutate()}>
              Re-authenticate
            </Button>
          </div>
        ) : (
          <Form form={oauthForm} layout="vertical" onFinish={handleSaveOAuthConfig}>
            <Alert
              message="Configure Gmail OAuth"
              description="Enter your Google Cloud credentials to enable email sending via Gmail API."
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Form.Item name="client_id" label="Client ID" rules={[{ required: true }]}>
              <Input placeholder="Enter your Google Cloud Client ID" />
            </Form.Item>
            <Form.Item name="client_secret" label="Client Secret" rules={[{ required: true }]}>
              <Input.Password placeholder="Enter your Google Cloud Client Secret" />
            </Form.Item>
            <Form.Item name="redirect_uri" label="Redirect URI">
              <Input placeholder="Enter redirect URI (default: urn:ietf:wg:oauth:2.0:oob)" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<LinkOutlined />}>
                  Save Configuration
                </Button>
                <Button icon={<GoogleOutlined />} onClick={() => getAuthUrlMutation.mutate()}>
                  Generate Auth URL
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* OAuth Authorization Code Modal */}
      <Modal
        title="Gmail Authorization"
        open={authCodeModalVisible}
        onCancel={() => setAuthCodeModalVisible(false)}
        footer={null}
        width={500}
      >
        <div style={{ textAlign: 'center' }}>
          <GoogleOutlined style={{ fontSize: 48, color: '#4285F4', marginBottom: 16 }} />
          <Paragraph>Sign in to Gmail to authorize Aethera CRM</Paragraph>

          {authUrl && (
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" href={authUrl} target="_blank">
                Open Gmail Authorization Page
              </Button>
            </div>
          )}

          <Paragraph type="secondary">
            If the button above doesn't work, open this URL in your browser:
          </Paragraph>

          <Card size="small" style={{ marginBottom: 16, wordBreak: 'break-all' }}>
            <Text copyable>{authUrl}</Text>
          </Card>

          <Paragraph type="secondary">
            After authorizing, paste the authorization code below:
          </Paragraph>

          <Input
            placeholder="Enter authorization code"
            value={oauthCode}
            onChange={(e) => setOauthCode(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          <Button
            type="primary"
            disabled={!oauthCode.trim()}
            onClick={handleAuthCodeSubmit}
            loading={exchangeTokenMutation.isPending}
          >
            Exchange Code for Token
          </Button>
        </div>
      </Modal>

      {/* Setup Modal */}
      <Modal
        title={<span><GoogleOutlined /> Setup Gmail Integration</span>}
        open={setupModalVisible}
        onCancel={() => setSetupModalVisible(false)}
        footer={null}
        width={500}
      >
        <Alert
          message="Pre-configured Gmail OAuth"
          description="Your Gmail OAuth credentials have been pre-configured in the system. Simply click Setup to complete the configuration."
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Button
          type="primary"
          onClick={() => setupMutation.mutate()}
          loading={setupMutation.isPending}
          icon={<GoogleOutlined />}
          style={{ width: '100%' }}
        >
          Setup Gmail OAuth
        </Button>

        <Divider />

        <Paragraph type="secondary">
          What happens next:
        </Paragraph>
        <ul>
          <li>OAuth configuration will be saved to the database</li>
          <li>Pre-built email templates will be added</li>
          <li>You can configure your OAuth credentials in Gmail Settings if needed</li>
        </ul>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button onClick={() => setSetupModalVisible(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Email;
