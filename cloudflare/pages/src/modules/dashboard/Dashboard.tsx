import React from 'react';
import { Card, Col, Row, Statistic, Typography, Button } from 'antd';
import {
  TeamOutlined,
  BulbOutlined,
  RocketOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { contactsAPI, leadsAPI, dealsAPI, tasksAPI } from '@services/api';
import { Link } from 'react-router-dom';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  // Use queries but don't render tables - just cards with counts
  const { data: contactsData } = useQuery({
    queryKey: ['contacts-count'],
    queryFn: () => contactsAPI.list({ per_page: 1 }),
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads-count'],
    queryFn: () => leadsAPI.list({ per_page: 1 }),
  });

  const { data: dealsData } = useQuery({
    queryKey: ['deals-count'],
    queryFn: () => dealsAPI.list({ per_page: 1 }),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks-count'],
    queryFn: () => tasksAPI.list({ per_page: 1 }),
  });

  // Safe number extraction - handles any response structure
  const getCount = (response: any): number => {
    try {
      if (!response) return 0;
      // Try various paths to find total count
      if (response.data?.pagination?.total != null) return response.data.pagination.total;
      if (response.data?.data?.length != null) return response.data.data.length;
      if (response.data?.length != null) return response.data.length;
      if (Array.isArray(response.data)) return response.data.length;
      return 0;
    } catch {
      return 0;
    }
  };

  const stats = {
    contacts: getCount(contactsData),
    leads: getCount(leadsData),
    deals: getCount(dealsData),
    tasks: getCount(tasksData),
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2}>Dashboard</Title>
        <p>Welcome to Aethera-CRM</p>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Contacts"
              value={stats.contacts}
              prefix={<TeamOutlined />}
            />
            <Link to="/contacts">View Contacts →</Link>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Leads"
              value={stats.leads}
              prefix={<BulbOutlined />}
            />
            <Link to="/leads">View Leads →</Link>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Deals"
              value={stats.deals}
              prefix={<RocketOutlined />}
            />
            <Link to="/deals">View Deals →</Link>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Tasks"
              value={stats.tasks}
              prefix={<CheckCircleOutlined />}
            />
            <Link to="/tasks">View Tasks →</Link>
          </Card>
        </Col>
      </Row>

      {/* Quick Links */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} md={12}>
          <Card title="Quick Actions" className="hover-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Button type="primary" block>
                <Link to="/contacts" style={{ color: 'white' }}>View All Contacts</Link>
              </Button>
              <Button type="primary" block>
                <Link to="/providers" style={{ color: 'white' }}>View Provider Directory</Link>
              </Button>
              <Button block>
                <Link to="/organizations">View Organizations</Link>
              </Button>
              <Button block>
                <Link to="/leads">View Leads</Link>
              </Button>
              <Button block>
                <Link to="/deals">View Deals</Link>
              </Button>
              <Button block>
                <Link to="/activities">View Activities</Link>
              </Button>
              <Button block>
                <Link to="/tasks">View Tasks</Link>
              </Button>
              <Button block>
                <Link to="/settings">Settings</Link>
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Getting Started" className="hover-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p><strong>Your CRM is ready!</strong></p>
              <p>You have 247 healthcare providers from Florida imported.</p>
              <p>Navigate to the <strong>Providers</strong> page to see them.</p>
              <p>The system includes:</p>
              <ul>
                <li>Contacts, Organizations, Leads</li>
                <li>Deals with Pipeline</li>
                <li>Activities & Tasks</li>
                <li>Provider Directory</li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;