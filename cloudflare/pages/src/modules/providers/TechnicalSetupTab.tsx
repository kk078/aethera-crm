import React, { useState, useCallback, useEffect } from 'react';
import { Card, Descriptions, Tag, Spin, Alert, Button, message, Modal, Form, Input, Select, Typography, Space, Checkbox, List } from 'antd';
import { useAuthStore } from '@stores/authStore';
import { onboardingAPI } from '@services/api';
import { EditOutlined, CheckCircleOutlined, InfoCircleOutlined, LinkOutlined, FileTextOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface TechnicalSetup {
  id: string;
  provider_id: string;
  clearinghouse_id: string | null;
  clearinghouse_name: string | null;
  era_enrollment_status: string | null;
  edi_enrollment_status: string | null;
  credentialing_status: string | null;
  caqh_verified: number | null;
  setup_complete: number | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Specialty-based required documents and setup checklists
const SPECIALTY_REQUIREMENTS: Record<string, { requiredDocs: string[]; subTasks: Array<{ title: string; description: string; type: 'checkbox' | 'input' | 'select' }> }> = {
  'Mental Health': {
    requiredDocs: ['Supervising Physician NPI', 'License Copy', 'Scope of Practice Documentation'],
    subTasks: [
      { title: 'Verify Supervising Physician', description: 'Confirm supervising physician NPI and credentials', type: 'checkbox' },
      { title: 'Telehealth Payer Linkage', description: 'Establish telehealth billing relationships with payers', type: 'checkbox' },
      { title: 'CBH/MCO Enrollment', description: 'Enroll in County Behavioral Health or Managed Care Organizations', type: 'checkbox' },
    ],
  },
  'Cardiology': {
    requiredDocs: ['Facility Billing Setup', 'Device Testing Records', 'Cath Lab Agreements'],
    subTasks: [
      { title: 'Facility Billing Setup', description: 'Configure facility-based billing for cardiology procedures', type: 'checkbox' },
      { title: 'Cath Lab Privileges', description: 'Obtain cath lab privileging for provider', type: 'checkbox' },
      { title: 'PCI Coding Training', description: 'Complete PCI coding and documentation training', type: 'checkbox' },
    ],
  },
  'Primary Care': {
    requiredDocs: ['Group NPI Enrollment', 'Medicare Part B Waiver', 'Patient Intake Forms'],
    subTasks: [
      { title: 'Quality Reporting (MIPS/MACRA)', description: 'Enroll in and configure MIPS/MACRA reporting', type: 'checkbox' },
      { title: 'PCP Capitation Setup', description: 'Set up primary care capitation billing', type: 'checkbox' },
      { title: 'Chronic Care Management', description: 'Enable chronic care management (CCM) billing', type: 'checkbox' },
    ],
  },
  'Anesthesiology': {
    requiredDocs: ['Facility Credentials', 'AAPC Certification', 'Anesthesia Waiver'],
    subTasks: [
      { title: 'Anesthesia Unit Time Setup', description: 'Configure anesthesia unit time and base unit billing', type: 'checkbox' },
      { title: 'Modifier 26/TC Setup', description: 'Setup professional/technical component billing', type: 'checkbox' },
      { title: 'PACU Billing', description: 'Configure post-anesthesia care unit billing', type: 'checkbox' },
    ],
  },
  'Dermatology': {
    requiredDocs: ['Skin Biopsy Protocols', 'Cosmetic Procedure Waivers', 'Mohs Surgery Privileges'],
    subTasks: [
      { title: 'Mohs Surgery Privileges', description: 'Obtain Mohs micrographic surgery privileges', type: 'checkbox' },
      { title: 'Cosmetic Procedure Waivers', description: 'Execute waivers for non-covered cosmetic procedures', type: 'checkbox' },
      { title: 'Skin Cancer Screening', description: 'Enroll in skin cancer screening programs', type: 'checkbox' },
    ],
  },
  'Emergency Medicine': {
    requiredDocs: ['24/7 Availability Agreement', 'Triage Protocols', 'ER Privileges'],
    subTasks: [
      { title: '24/7 Availability', description: 'Confirm emergency department availability', type: 'checkbox' },
      { title: 'Triage Protocols', description: 'Document emergency triage protocols', type: 'checkbox' },
      { title: 'ER Coding Compliance', description: 'Configure emergency room coding compliance rules', type: 'checkbox' },
    ],
  },
  'Family Practice': {
    requiredDocs: ['Wellness Program Documentation', 'Preventive Care Protocols', 'Annual Physical Forms'],
    subTasks: [
      { title: 'Wellness Program Setup', description: 'Enroll in wellness programs and preventive care initiatives', type: 'checkbox' },
      { title: 'Annual Physical Forms', description: 'Configure annual physical examination billing', type: 'checkbox' },
      { title: 'Preventive Care Protocols', description: 'Document preventive care service protocols', type: 'checkbox' },
    ],
  },
  'Internal Medicine': {
    requiredDocs: ['Chronic Care Management', 'Preventive Care Protocols', 'Hospital Privileges'],
    subTasks: [
      { title: 'Chronic Care Management', description: 'Enroll in chronic care management programs', type: 'checkbox' },
      { title: 'Hospitalist Coordination', description: 'Configure hospitalist coordination and transition of care', type: 'checkbox' },
      { title: 'Complex Chronic Care', description: 'Setup complex chronic care coordination billing', type: 'checkbox' },
    ],
  },
  'Pediatrics': {
    requiredDocs: ['Immunization Records', 'Well-Baby Checklist', 'Vaccination Protocols'],
    subTasks: [
      { title: 'Immunization Records', description: 'Configure immunization tracking and reporting', type: 'checkbox' },
      { title: 'Well-Baby Visits', description: 'Setup well-baby visit scheduling and billing', type: 'checkbox' },
      { title: 'Vaccination Protocols', description: 'Document vaccination administration protocols', type: 'checkbox' },
    ],
  },
  'Obstetrics and Gynecology': {
    requiredDocs: ['OB Care Protocol', 'Pap Smear Documentation', 'Prenatal Care Forms'],
    subTasks: [
      { title: 'OB Care Protocol', description: 'Configure OB/GYN care coordination and billing', type: 'checkbox' },
      { title: 'Pap Smear Billing', description: 'Setup Pap smear screening and cervical cancer billing', type: 'checkbox' },
      { title: 'Prenatal Care Billing', description: 'Configure prenatal care code bundles', type: 'checkbox' },
    ],
  },
  // Default for unspecified or other specialties
  'default': {
    requiredDocs: ['General Provider Information', 'Tax ID Documentation', 'W-9 Form'],
    subTasks: [
      { title: 'General Information Review', description: 'Verify all provider information is accurate', type: 'checkbox' },
      { title: 'Tax ID Verification', description: 'Confirm Tax ID and W-9 form submission', type: 'checkbox' },
      { title: 'Bank Account Setup', description: 'Configure direct deposit for payments', type: 'checkbox' },
    ],
  },
};

// Get requirements based on specialty
const getRequirementsForSpecialty = (specialty: string | null) => {
  if (!specialty) return SPECIALTY_REQUIREMENTS['default'];

  const specialtyLower = specialty.toLowerCase();

  // Match specialty keywords
  if (specialtyLower.includes('mental') || specialtyLower.includes('behavioral') || specialtyLower.includes('psych')) {
    return SPECIALTY_REQUIREMENTS['Mental Health'];
  }
  if (specialtyLower.includes('cardio') || specialtyLower.includes('cardiac')) {
    return SPECIALTY_REQUIREMENTS['Cardiology'];
  }
  if (specialtyLower.includes('family') || specialtyLower.includes('primary')) {
    return SPECIALTY_REQUIREMENTS['Family Practice'];
  }
  if (specialtyLower.includes('anesthes')) {
    return SPECIALTY_REQUIREMENTS['Anesthesiology'];
  }
  if (specialtyLower.includes('dermat')) {
    return SPECIALTY_REQUIREMENTS['Dermatology'];
  }
  if (specialtyLower.includes('emergency')) {
    return SPECIALTY_REQUIREMENTS['Emergency Medicine'];
  }
  if (specialtyLower.includes('internal')) {
    return SPECIALTY_REQUIREMENTS['Internal Medicine'];
  }
  if (specialtyLower.includes('pedo')) {
    return SPECIALTY_REQUIREMENTS['Pediatrics'];
  }
  if (specialtyLower.includes('obgyn') || specialtyLower.includes('ob/gyn') || specialtyLower.includes('gyn')) {
    return SPECIALTY_REQUIREMENTS['Obstetrics and Gynecology'];
  }

  return SPECIALTY_REQUIREMENTS['default'];
};

// Get specialty display name
const getSpecialtyDisplayName = (specialty: string | null) => {
  if (!specialty) return 'General Practice';

  const specialtyLower = specialty.toLowerCase();

  if (specialtyLower.includes('mental') || specialtyLower.includes('behavioral') || specialtyLower.includes('psych')) return 'Mental Health';
  if (specialtyLower.includes('cardio') || specialtyLower.includes('cardiac')) return 'Cardiology';
  if (specialtyLower.includes('family') || specialtyLower.includes('primary')) return 'Family Practice';
  if (specialtyLower.includes('anesthes')) return 'Anesthesiology';
  if (specialtyLower.includes('dermat')) return 'Dermatology';
  if (specialtyLower.includes('emergency')) return 'Emergency Medicine';
  if (specialtyLower.includes('internal')) return 'Internal Medicine';
  if (specialtyLower.includes('pedo')) return 'Pediatrics';
  if (specialtyLower.includes('obgyn') || specialtyLower.includes('ob/gyn') || specialtyLower.includes('gyn')) return 'Obstetrics and Gynecology';

  return specialty || 'General Practice';
};

interface TechnicalSetupTabProps {
  providerId: string;
  providerNpi: string;
  providerName: string;
  specialty: string | null;
  refetchProviderData: () => void;
}

const TechnicalSetupTab: React.FC<TechnicalSetupTabProps> = ({
  providerId,
  providerNpi,
  providerName,
  specialty,
  refetchProviderData,
}) => {
  const requirements = getRequirementsForSpecialty(specialty);
  const [technicalSetup, setTechnicalSetup] = useState<TechnicalSetup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const token = useAuthStore((state) => state.token);

  const loadTechnicalSetup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setTechnicalSetup(null);

      const response = await fetch(
        `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/onboarding/technical-setup/provider/${providerId}`,
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

      if (result.data?.technical_setup_not_started) {
        setTechnicalSetup(null);
      } else {
        setTechnicalSetup(result.data);
      }
    } catch (err: any) {
      console.error('Error loading technical setup:', err);
      setError(err.message || 'Failed to load technical setup');
    } finally {
      setLoading(false);
    }
  }, [providerId, token]);

  useEffect(() => {
    if (providerId) {
      loadTechnicalSetup();
    }
  }, [providerId, loadTechnicalSetup]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleSave = async (values: any) => {
    try {
      setSaveLoading(true);

      const payload = {
        clearinghouse_id: values.clearinghouse_id || null,
        clearinghouse_name: values.clearinghouse_name || null,
        era_enrollment_status: values.era_enrollment_status || 'not_started',
        edi_enrollment_status: values.edi_enrollment_status || 'not_started',
        credentialing_status: values.credentialing_status || 'pending',
        caqh_verified: values.caqh_verified ? 1 : 0,
        setup_complete: values.setup_complete ? 1 : 0,
      };

      const response = await fetch(
        `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/onboarding/technical-setup/provider/${providerId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.data) {
        message.success('Technical setup saved successfully');
        setEditing(false);
        loadTechnicalSetup();
        refetchProviderData();
      }
    } catch (err: any) {
      message.error(`Failed to save technical setup: ${err.message || 'Unknown error'}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSaveLoading(true);

      const payload = {
        clearinghouse_id: null,
        clearinghouse_name: null,
        era_enrollment_status: 'not_started',
        edi_enrollment_status: 'not_started',
        credentialing_status: 'pending',
        caqh_verified: 0,
        setup_complete: 0,
      };

      const response = await fetch(
        `https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1/onboarding/technical-setup/provider/${providerId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.data) {
        message.success('Technical setup created successfully');
        setEditing(false);
        loadTechnicalSetup();
        refetchProviderData();
      }
    } catch (err: any) {
      message.error(`Failed to create technical setup: ${err.message || 'Unknown error'}`);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>Loading technical setup...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Data"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadTechnicalSetup}>Retry</Button>
        }
      />
    );
  }

  if (!technicalSetup) {
    return (
      <Card title="Technical Setup" size="small">
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Alert
            message="No Technical Setup Found"
            description="This provider has not yet been configured with technical onboarding settings."
            type="info"
            icon={<InfoCircleOutlined />}
            style={{ maxWidth: '500px', margin: '0 auto' }}
          />
          <Space style={{ marginTop: '24px' }}>
            <Button type="primary" icon={<EditOutlined />} onClick={handleCreate}>
              Create Technical Setup
            </Button>
          </Space>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Technical Setup" size="small" extra={<Button icon={<EditOutlined />} onClick={handleEdit}>Edit</Button>}>
      {/* Quick Action Buttons for Enrollment Portals */}
      {/* Status Alert with Enrollment Links */}
      {technicalSetup.era_enrollment_status === 'pending' || technicalSetup.edi_enrollment_status === 'pending' ? (
        <Alert
          message="Enrollment In Progress"
          description={
            <div>
              <p style={{ margin: '8px 0' }}>
                The provider's enrollment is pending. Use the links below to complete the process:
              </p>
              <Space direction="vertical" size="small">
                <Button icon={<LinkOutlined />} onClick={() => window.open('https://www.availity.com', '_blank')}>
                  Availity Enrollment Portal
                </Button>
                <Button icon={<LinkOutlined />} onClick={() => window.open('https://www.trizetto.com', '_blank')}>
                  Trizetto Enrollment Portal
                </Button>
              </Space>
            </div>
          }
          type="warning"
          style={{ marginBottom: '16px' }}
          showIcon
        />
      ) : (
        <div style={{ marginBottom: '16px' }}>
          <Typography.Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>Quick Actions</Typography.Text>
          <Space>
            <Button icon={<LinkOutlined />} onClick={() => window.open('https://www.availity.com', '_blank')}>
              Availity Portal
            </Button>
            <Button icon={<LinkOutlined />} onClick={() => window.open('https://www.trizetto.com', '_blank')}>
              Trizetto Portal
            </Button>
            <Button icon={<FileTextOutlined />} onClick={() => message.info('Download enrollment forms from clearinghouse portal')}>
              Download Forms
            </Button>
          </Space>
        </div>
      )}

      <Descriptions column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} size="small">
        <Descriptions.Item label="Clearinghouse ID">
          {technicalSetup.clearinghouse_id || 'Not configured'}
        </Descriptions.Item>
        <Descriptions.Item label="Clearinghouse Name">
          {technicalSetup.clearinghouse_name || 'Not configured'}
        </Descriptions.Item>
        <Descriptions.Item label="ERA Enrollment Status">
          <Tag color={technicalSetup.era_enrollment_status === 'active' ? 'green' : technicalSetup.era_enrollment_status === 'pending' ? 'orange' : 'default'}>
            {technicalSetup.era_enrollment_status || 'Not started'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="EDI Enrollment Status">
          <Tag color={technicalSetup.edi_enrollment_status === 'active' ? 'green' : technicalSetup.edi_enrollment_status === 'pending' ? 'orange' : 'default'}>
            {technicalSetup.edi_enrollment_status || 'Not started'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Credentialing Status">
          <Tag color={technicalSetup.credentialing_status === 'complete' ? 'green' : technicalSetup.credentialing_status === 'in_progress' ? 'orange' : 'default'}>
            {technicalSetup.credentialing_status || 'Pending'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="CAQH Verified">
          <Tag color={technicalSetup.caqh_verified === 1 ? 'green' : 'default'}>
            {technicalSetup.caqh_verified === 1 ? 'Yes' : 'No'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Setup Complete">
          <Tag color={technicalSetup.setup_complete === 1 ? 'green' : 'default'}>
            {technicalSetup.setup_complete === 1 ? 'Yes' : 'No'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Created At">
          {technicalSetup.created_at ? dayjs(technicalSetup.created_at).format('MMM D, YYYY') : 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Last Updated">
          {technicalSetup.updated_at ? dayjs(technicalSetup.updated_at).format('MMM D, YYYY') : 'N/A'}
        </Descriptions.Item>
      </Descriptions>

      {/* Specialty-Based Requirements Checklist */}
      <div style={{ marginTop: '24px' }}>
        <Typography.Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '12px' }}>
          <CheckCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          Specialty Requirements Checklist
        </Typography.Text>
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Typography.Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            Required Documents ({requirements.requiredDocs.length} items):
          </Typography.Text>
          <List
            size="small"
            dataSource={requirements.requiredDocs}
            renderItem={(doc) => (
              <List.Item>
                <CheckOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                {doc}
              </List.Item>
            )}
          />
        </Card>
        <Typography.Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Sub-Tasks for {getSpecialtyDisplayName(specialty)}:
        </Typography.Text>
        <List
          size="small"
          dataSource={requirements.subTasks}
          renderItem={(task, index) => (
            <List.Item>
              <Checkbox defaultChecked={index < 2}>
                <strong>{task.title}</strong>
                <div style={{ fontSize: '12px', color: '#666' }}>{task.description}</div>
              </Checkbox>
            </List.Item>
          )}
        />
      </div>

      {/* Edit Modal */}
      {editing && (
        <Modal
          title={`Edit Technical Setup for ${providerName}`}
          open={editing}
          onCancel={() => setEditing(false)}
          footer={null}
          width={600}
        >
          <Form
            layout="vertical"
            initialValues={{
              clearinghouse_id: technicalSetup.clearinghouse_id || '',
              clearinghouse_name: technicalSetup.clearinghouse_name || '',
              era_enrollment_status: technicalSetup.era_enrollment_status || 'not_started',
              edi_enrollment_status: technicalSetup.edi_enrollment_status || 'not_started',
              credentialing_status: technicalSetup.credentialing_status || 'pending',
              caqh_verified: technicalSetup.caqh_verified === 1,
              setup_complete: technicalSetup.setup_complete === 1,
            }}
            onFinish={handleSave}
          >
            <Form.Item
              name="clearinghouse_id"
              label="Clearinghouse ID"
              rules={[{ required: false, message: 'Enter clearinghouse ID' }]}
            >
              <Input placeholder="e.g., 8088080808" />
            </Form.Item>
            <Form.Item
              name="clearinghouse_name"
              label="Clearinghouse Name"
              rules={[{ required: false, message: 'Enter clearinghouse name' }]}
            >
              <Input placeholder="e.g., Change Healthcare, Availity" />
            </Form.Item>
            <Form.Item
              name="era_enrollment_status"
              label="ERA Enrollment Status"
              rules={[{ required: true, message: 'Select ERA status' }]}
            >
              <Select>
                <Select.Option value="not_started">Not Started</Select.Option>
                <Select.Option value="pending">Pending</Select.Option>
                <Select.Option value="active">Active</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="edi_enrollment_status"
              label="EDI Enrollment Status"
              rules={[{ required: true, message: 'Select EDI status' }]}
            >
              <Select>
                <Select.Option value="not_started">Not Started</Select.Option>
                <Select.Option value="pending">Pending</Select.Option>
                <Select.Option value="active">Active</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="credentialing_status"
              label="Credentialing Status"
              rules={[{ required: true, message: 'Select credentialing status' }]}
            >
              <Select>
                <Select.Option value="pending">Pending</Select.Option>
                <Select.Option value="in_progress">In Progress</Select.Option>
                <Select.Option value="complete">Complete</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="caqh_verified"
              label="CAQH Verified"
              valuePropName="checked"
            >
              <Checkbox />
            </Form.Item>
            <Form.Item
              name="setup_complete"
              label="Setup Complete"
              valuePropName="checked"
            >
              <Checkbox />
            </Form.Item>
            <Space style={{ justifyContent: 'flex-end' }}>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                Save Changes
              </Button>
            </Space>
          </Form>
        </Modal>
      )}
    </Card>
  );
};

export default TechnicalSetupTab;
