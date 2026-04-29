import React from 'react';
import { Card, Typography, Table, Input, Select, Space } from 'antd';

const { Title, Paragraph } = Typography;

const PublicDirectory: React.FC = () => {
  const columns = [
    {
      title: 'Provider Name',
      dataIndex: 'last_name',
      key: 'name',
      render: (_: any, record: any) => `Dr. ${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Specialty',
      dataIndex: 'specialty_primary',
      key: 'specialty_primary',
    },
    {
      title: 'Location',
      key: 'location',
      render: (_: any, record: any) => `${record.city}, ${record.state}`,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ padding: '24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2}>Aethera Provider Directory</Title>
        <Paragraph>Find healthcare providers in your area</Paragraph>
        
        <Space style={{ marginTop: '16px' }}>
          <Input.Search placeholder="Search by name or specialty" style={{ width: 300 }} />
          <Select placeholder="Select specialty" style={{ width: 200 }}>
            <Select.Option value="all">All Specialties</Select.Option>
          </Select>
          <Select placeholder="Select state" style={{ width: 150 }}>
            <Select.Option value="all">All States</Select.Option>
          </Select>
        </Space>
      </div>

      <div style={{ padding: '24px' }}>
        <Card>
          <Table
            columns={columns}
            dataSource={[]}
            rowKey="npi"
            pagination={false}
            locale={{ emptyText: 'No providers found. Search to see results.' }}
          />
        </Card>
      </div>
    </div>
  );
};

export default PublicDirectory;
