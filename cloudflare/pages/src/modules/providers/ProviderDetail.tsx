import React, { useState, useEffect } from 'react';
import { Modal, Descriptions, Tag, Spin, Alert, Button, Collapse, Card, List, Typography, Badge, Tabs, Select, Space, message } from 'antd';
import { useAuthStore } from '@stores/authStore';
import { onboardingAPI } from '@services/api';
import TechnicalSetupTab from './TechnicalSetupTab';

const { Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

interface Provider {
  id: string;
  npi: string;
  provider_type: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  specialty_primary: string | null;
  specialty_secondary: string | null;
  taxonomy_codes: string | null;
  hospital_affiliations: string | null;
  medicare_enrollment_status: string | null;
  medicaid_enrollment_status: string | null;
  board_certifications: string | null;
  medical_school: string | null;
  disciplinary_actions: string | null;
  website: string | null;
  // Technical RCM fields
  edi_submitter_id: string | null;
  clearinghouse_partner: string | null;
  era_enrollment_status: string | null;
  workflow_stage: string | null;
  billing_integration_status: string | null;
  tax_id_linked: number | null;
  clearinghouse_id: string | null;
}

interface ProviderDetailProps {
  npi: string | null;
  visible: boolean;
  onClose: () => void;
}

const ProviderDetail: React.FC<ProviderDetailProps> = ({ npi, visible, onClose }) => {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [technicalSetupVersion, setTechnicalSetupVersion] = useState(0);

  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (npi && visible) {
      loadProvider(npi);
    }
  }, [npi, visible]);

  const loadProvider = async (npiValue: string) => {
    try {
      setLoading(true);
      setError(null);
      setProvider(null);

      const response = await fetch(
        `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/providers/${npiValue}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Provider detail:', result);

      if (result.data) {
        setProvider(result.data);
        // Extract provider ID from the response
        if (result.data.id) {
          setProviderId(result.data.id);
        }
      } else {
        setError('Provider not found');
      }
    } catch (err: any) {
      console.error('Error loading provider:', err);
      setError(err.message || 'Failed to load provider details');
    } finally {
      setLoading(false);
    }
  };

  const getProviderName = (p: Provider) => {
    if (p.provider_type === 'individual') {
      const name = `Dr. ${p.first_name || ''} ${p.last_name || ''}`.trim();
      return name || p.npi;
    }
    return p.organization_name || 'Unknown Organization';
  };

  const formatAddress = (p: Provider) => {
    const parts = [p.address, p.city, p.state, p.zip].filter(Boolean);
    return parts.join(', ') || 'Not available';
  };

  const formatList = (value: string | null) => {
    if (!value) return 'Not available';
    return value;
  };

  return (
    <Modal
      title={provider ? getProviderName(provider) : 'Provider Details'}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>Close</Button>,
      ]}
      width={800}
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>Loading provider details...</p>
        </div>
      )}

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => npi && loadProvider(npi)}>Retry</Button>
          }
        />
      )}

      {provider && !loading && (
        <Descriptions
          layout="vertical"
          bordered
          column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
        >
          <Descriptions.Item label="NPI" span={1}>
            <Tag color="blue">{provider.npi}</Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Provider Type" span={1}>
            <Tag color={provider.provider_type === 'individual' ? 'green' : 'purple'}>
              {provider.provider_type}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Full Name / Organization" span={2}>
            <strong>{getProviderName(provider)}</strong>
          </Descriptions.Item>

          <Descriptions.Item label="Primary Specialty" span={1}>
            {provider.specialty_primary || 'Not specified'}
          </Descriptions.Item>

          <Descriptions.Item label="Secondary Specialty" span={1}>
            {provider.specialty_secondary || 'Not specified'}</Descriptions.Item>

          <Descriptions.Item label="Address" span={2}>
            {formatAddress(provider)}
          </Descriptions.Item>

          <Descriptions.Item label="Phone" span={1}>
            {provider.phone || 'Not available'}
          </Descriptions.Item>

          <Descriptions.Item label="Fax" span={1}>
            {provider.fax || 'Not available'}</Descriptions.Item>

          <Descriptions.Item label="Email" span={2}>
            {provider.email || 'Not available'}
          </Descriptions.Item>

          <Descriptions.Item label="Website" span={2}>
            {provider.website ? (
              <a href={provider.website} target="_blank" rel="noopener noreferrer">
                {provider.website}
              </a>
            ) : 'Not available'}
          </Descriptions.Item>

          <Descriptions.Item label="Taxonomy Codes" span={2}>
            {formatList(provider.taxonomy_codes)}
          </Descriptions.Item>

          <Descriptions.Item label="Hospital Affiliations" span={2}>
            {formatList(provider.hospital_affiliations)}
          </Descriptions.Item>

          <Descriptions.Item label="Medicare Enrollment" span={1}>
            <Tag color={provider.medicare_enrollment_status === 'active' ? 'green' : 'default'}>
              {provider.medicare_enrollment_status || 'Unknown'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Medicaid Enrollment" span={1}>
            <Tag color={provider.medicaid_enrollment_status === 'active' ? 'green' : 'default'}>
              {provider.medicaid_enrollment_status || 'Unknown'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Board Certifications" span={2}>
            {formatList(provider.board_certifications)}
          </Descriptions.Item>

          <Descriptions.Item label="Medical School" span={2}>
            {provider.medical_school || 'Not available'}
          </Descriptions.Item>

          <Descriptions.Item label="Disciplinary Actions" span={2}>
            {provider.disciplinary_actions || 'None reported'}
          </Descriptions.Item>
        </Descriptions>
      )}

      {/* Technical Onboarding Section */}
      {provider && !loading && (
        <Card title="Technical Onboarding" size="small" style={{ marginTop: '24px' }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="EDI Submitter ID">
              {provider.edi_submitter_id || 'Not configured'}
            </Descriptions.Item>
            <Descriptions.Item label="Clearinghouse Partner">
              {provider.clearinghouse_partner || 'Not configured'}
            </Descriptions.Item>
            <Descriptions.Item label="ERA Enrollment Status">
              <Tag color={provider.era_enrollment_status === 'active' ? 'green' : 'default'}>
                {provider.era_enrollment_status || 'Not started'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Workflow Stage">
              <Tag color={provider.workflow_stage === 'active' ? 'green' : 'blue'}>
                {provider.workflow_stage || 'outreach'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Billing Integration Status">
              <Tag color={provider.billing_integration_status === 'complete' ? 'green' : 'orange'}>
                {provider.billing_integration_status || 'not_started'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tax ID Linked">
              <Tag color={provider.tax_id_linked === 1 ? 'green' : 'default'}>
                {provider.tax_id_linked === 1 ? 'Yes' : 'No'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Clearinghouse ID">
              {provider.clearinghouse_id || 'Not configured'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Technical Setup Tab - full component for editing */}
      {providerId && provider && !loading && (
        <TechnicalSetupTab
          providerId={providerId}
          providerNpi={provider.npi}
          providerName={provider.organization_name || `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || `Provider ${provider.npi}`}
          specialty={provider.specialty_primary}
          refetchProviderData={() => setTechnicalSetupVersion(v => v + 1)}
        />
      )}

    </Modal>
  );
};

export default ProviderDetail;