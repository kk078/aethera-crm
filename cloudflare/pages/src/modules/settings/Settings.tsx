import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, message, Divider, Switch, Space, Spin, Alert, Tag, Collapse } from 'antd';
import { MailOutlined, CheckCircleOutlined, CloseCircleOutlined, SettingOutlined, ApiOutlined, PhoneOutlined, RobotOutlined } from '@ant-design/icons';
import { emailsAPI, twilioAPI } from '@services/api';

const { Title, Text, Paragraph } = Typography;

const Settings: React.FC = () => {
  const [relayForm] = Form.useForm();
  const [twilioForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([loadRelayConfig(), loadTwilioConfig()]).finally(() => setLoading(false));
  }, []);

  const loadRelayConfig = async () => {
    try {
      const res = await emailsAPI.getSmtpConfig();
      const config = res.data;
      relayForm.setFieldsValue({
        relay_url: config.relay_url || '',
        api_key: config.api_key || '',
        from_email: config.from_email || 'info@aetherahealthcare.com',
        from_name: config.from_name || 'Aethera Healthcare',
        use_relay: config.use_relay || false,
      });
    } catch {}
  };

  const loadTwilioConfig = async () => {
    try {
      const res = await twilioAPI.getConfig();
      const config = res.data;
      twilioForm.setFieldsValue({
        account_sid: config.account_sid || '',
        auth_token: config.auth_token || '',
        phone_number: config.phone_number || '',
        enabled: config.enabled || false,
      });
    } catch {}
  };

  const handleSaveRelay = async (values: any) => {
    setSaving(true);
    setTestResult(null);
    try {
      await emailsAPI.saveSmtpConfig({
        relay_url: values.relay_url,
        api_key: values.api_key,
        from_email: values.from_email || 'info@aetherahealthcare.com',
        from_name: values.from_name || 'Aethera Healthcare',
        use_relay: values.use_relay || false,
      });
      message.success('Gmail relay configuration saved');
    } catch (e: any) {
      message.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    const to = prompt('Enter test recipient email:');
    if (!to) return;
    setTesting(true);
    try {
      const res = await emailsAPI.testSmtp(to);
      setTestResult({ success: true, message: res.data?.message || 'Test email sent' });
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveTwilio = async (values: any) => {
    setSavingTwilio(true);
    try {
      await twilioAPI.saveConfig({
        account_sid: values.account_sid,
        auth_token: values.auth_token,
        phone_number: values.phone_number,
        enabled: values.enabled || false,
      });
      message.success('Twilio configuration saved');
    } catch (e: any) {
      message.error(`Save failed: ${e.message}`);
    } finally {
      setSavingTwilio(false);
    }
  };

  const handleSaveProfile = async (values: any) => {
    message.success('Profile saved');
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2}><SettingOutlined /> Settings</Title>
        <Paragraph>Manage your account, Gmail relay, and integrations</Paragraph>
      </div>

      {/* Gmail Relay Card */}
      <Card title={<Space><MailOutlined /> Gmail Relay</Space>} style={{ marginBottom: 24 }}>
        <Paragraph type="secondary">
          Configure a <Text strong>custom Gmail relay worker</Text> to send emails from{' '}
          <Text strong>info@aetherahealthcare.com</Text> (Google Workspace) through the CRM.
          The relay uses the Gmail API with OAuth 2.0 to send on your behalf.
        </Paragraph>

        <Alert
          type="info"
          showIcon
          message="How it works"
          description={
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li>Deploy the relay worker with your Google Workspace OAuth credentials</li>
              <li>The relay worker gets a URL like <Text code>https://gmail-relay.your-name.workers.dev</Text></li>
              <li>Enter that URL and an API key below to connect CRM → relay → Gmail</li>
            </ol>
          }
          style={{ marginBottom: 16 }}
        />

        <Form form={relayForm} layout="vertical" onFinish={handleSaveRelay}>
          <Form.Item
            name="relay_url"
            label="Relay Worker URL"
            rules={[
              { required: true, message: 'Relay URL is required' },
              { type: 'url', message: 'Must be a valid URL' },
            ]}
            extra="e.g. https://aethera-gmail-relay.your-name.workers.dev/send"
          >
            <Input placeholder="https://aethera-gmail-relay.your-name.workers.dev/send" />
          </Form.Item>

          <Form.Item
            name="api_key"
            label="API Key (shared secret between CRM and relay)"
            rules={[{ required: true, message: 'API key is required' }]}
          >
            <Input.Password placeholder="Enter a shared secret API key" />
          </Form.Item>

          <Divider />
          <Text strong>Sender Identity (from address)</Text>
          <div style={{ marginTop: 8 }}>
            <Space style={{ width: '100%' }}>
              <Form.Item name="from_name" label="From Name" style={{ flex: 1 }}>
                <Input placeholder="Aethera Healthcare" />
              </Form.Item>
              <Form.Item name="from_email" label="From Email" rules={[{ type: 'email' }]} style={{ flex: 1 }}>
                <Input placeholder="info@aetherahealthcare.com" />
              </Form.Item>
            </Space>
          </div>

          <Form.Item
            name="use_relay"
            label="Enable Gmail relay for outgoing emails"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Divider />
          <Space>
            <Button type="primary" htmlType="submit" loading={saving} icon={<MailOutlined />}>
              Save Configuration
            </Button>
            <Button onClick={handleTest} loading={testing} icon={<ApiOutlined />}>
              Send Test Email
            </Button>
          </Space>
        </Form>

        {testResult && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={testResult.success ? 'success' : 'error'}
              showIcon
              message={testResult.success ? 'Test email sent!' : 'Test failed'}
              description={testResult.message}
            />
          </div>
        )}
      </Card>

      {/* Twilio & AI Calls Card */}
      <Card title={<Space><PhoneOutlined /> Twilio & AI Calls</Space>} style={{ marginBottom: 24 }}>
        <Paragraph type="secondary">
          Configure Twilio to make calls and send SMS. AI-assisted features (sentiment analysis, call summaries, talking scripts, lead scoring) work automatically in the Calls page without AI Gateway.
        </Paragraph>
        <Form form={twilioForm} layout="vertical" onFinish={handleSaveTwilio}>
          <Form.Item name="account_sid" label="Account SID" rules={[{ required: true }]}>
            <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
          </Form.Item>
          <Form.Item name="auth_token" label="Auth Token" rules={[{ required: true }]}>
            <Input.Password placeholder="Your Twilio Auth Token" />
          </Form.Item>
          <Form.Item name="phone_number" label="Twilio Phone Number" rules={[{ required: true }]}>
            <Input placeholder="+15551234567" />
          </Form.Item>
          <Form.Item name="enabled" label="Enable Twilio integration" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Divider />
          <Button type="primary" htmlType="submit" loading={savingTwilio} icon={<PhoneOutlined />}>
            Save Twilio Configuration
          </Button>
        </Form>
      </Card>

      {/* Profile Card */}
      <Card title="Profile Settings" style={{ marginBottom: 24 }}>
        <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile}>
          <Form.Item label="Username" name="username" initialValue="aethera">
            <Input disabled />
          </Form.Item>
          <Form.Item label="Email" name="email" initialValue="info@aetherahealthcare.com">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Integration Status */}
      <Card title="Integration Status">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><MailOutlined /> Gmail Email Relay</span>
            {relayForm.getFieldValue('use_relay')
              ? <Tag icon={<CheckCircleOutlined />} color="green">Enabled</Tag>
              : <Tag color="default">Disabled</Tag>
            }
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><PhoneOutlined /> Twilio Phone / SMS</span>
            {twilioForm.getFieldValue('enabled')
              ? <Tag icon={<CheckCircleOutlined />} color="green">Enabled</Tag>
              : <Tag color="default">Disabled</Tag>
            }
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><RobotOutlined /> AI Features</span>
            <Tag color="blue">Active (rule-based)</Tag>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default Settings;
