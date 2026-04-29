import React from 'react';
import { Card, Typography, Empty, Space, Button } from 'antd';
import { BulbOutlined, TeamOutlined, BuildOutlined, RocketOutlined, CheckSquareOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const modules = [
  {
    title: 'Leads',
    description: 'Manage and track potential customers',
    icon: <BulbOutlined />,
    path: '/leads',
    color: '#52c41a',
  },
  {
    title: 'Contacts',
    description: 'View and manage all your contacts',
    icon: <TeamOutlined />,
    path: '/contacts',
    color: '#1890ff',
  },
  {
    title: 'Organizations',
    description: 'Track companies and accounts',
    icon: <BuildOutlined />,
    path: '/organizations',
    color: '#722ed1',
  },
  {
    title: 'Deals',
    description: 'Manage your sales pipeline',
    icon: <RocketOutlined />,
    path: '/deals',
    color: '#faad14',
  },
  {
    title: 'Activities',
    description: 'Track calls, emails, and meetings',
    icon: <CheckSquareOutlined />,
    path: '/activities',
    color: '#13c2c2',
  },
  {
    title: 'Email',
    description: 'Manage email communications',
    icon: <MailOutlined />,
    path: '/email',
    color: '#eb2f96',
  },
  {
    title: 'Providers',
    description: 'Healthcare provider directory',
    icon: <UserOutlined />,
    path: '/providers',
    color: '#2f54eb',
  },
];

const GettingStarted: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <Title level={3}>Welcome to Aethera-CRM!</Title>
      <Paragraph style={{ fontSize: '16px', color: '#666', maxWidth: '600px', margin: '0 auto 32px' }}>
        Get started by exploring the modules below or add your first record.
      </Paragraph>

      <Space wrap size="large" style={{ justifyContent: 'center' }}>
        {modules.map((module) => (
          <Card
            key={module.title}
            hoverable
            onClick={() => navigate(module.path)}
            style={{
              width: 200,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            styles={{ body: { padding: '24px 16px' } }}
          >
            <div
              style={{
                fontSize: '48px',
                color: module.color,
                marginBottom: '16px',
              }}
            >
              {module.icon}
            </div>
            <Title level={5} style={{ marginBottom: '8px' }}>
              {module.title}
            </Title>
            <Paragraph style={{ fontSize: '12px', color: '#999', margin: 0 }}>
              {module.description}
            </Paragraph>
          </Card>
        ))}
      </Space>
    </div>
  );
};

export default GettingStarted;
