import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@services/api';
import { useAuthStore } from '@stores/authStore';

const { Title, Paragraph } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const onFinish = async (values: any) => {
    setLoading(true);

    try {
      const response = await authAPI.login(values.username, values.password);
      const { token, user } = response.data.data;

      login(token, user);
      message.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '450px',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.2)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        styles={{ body: { padding: '48px 40px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
            }}
          >
            <SafetyOutlined style={{ fontSize: '36px', color: '#fff' }} />
          </div>
          <Title
            level={2}
            style={{
              color: '#ffffff',
              marginBottom: '12px',
              fontWeight: 600,
              fontSize: '28px',
            }}
          >
            Aethera-CRM
          </Title>
          <Paragraph
            style={{
              color: '#a0a0a0',
              fontSize: '15px',
              margin: 0,
            }}
          >
            Healthcare Provider Relationship Management
          </Paragraph>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
            label={
              <span style={{ color: '#e0e0e0', fontSize: '14px' }}>
                Username
              </span>
            }
          >
            <Input
              prefix={<UserOutlined style={{ color: '#667eea' }} />}
              placeholder="Enter your username"
              autoComplete="username"
              style={{ borderRadius: '8px' }}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
            label={
              <span style={{ color: '#e0e0e0', fontSize: '14px' }}>
                Password
              </span>
            }
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#667eea' }} />}
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{ borderRadius: '8px' }}
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                marginTop: '8px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
              }}
            >
              Secure Sign In
            </Button>
          </Form.Item>
        </Form>

      </Card>
    </div>
  );
};

export default Login;
