import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, theme } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  BuildOutlined,
  BulbOutlined,
  RocketOutlined,
  CalendarOutlined,
  MailOutlined,
  UserOutlined,
  CheckSquareOutlined,
  PhoneOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/leads',
      icon: <BulbOutlined />,
      label: 'Leads',
    },
    {
      key: '/contacts',
      icon: <TeamOutlined />,
      label: 'Contacts',
    },
    {
      key: '/organizations',
      icon: <BuildOutlined />,
      label: 'Organizations',
    },
    {
      key: '/deals',
      icon: <RocketOutlined />,
      label: 'Deals',
    },
    {
      key: '/activities',
      icon: <CalendarOutlined />,
      label: 'Activities',
    },
    {
      key: '/email',
      icon: <MailOutlined />,
      label: 'Email',
    },
    {
      key: '/providers',
      icon: <UserOutlined />,
      label: 'Providers',
    },
    {
      key: '/tasks',
      icon: <CheckSquareOutlined />,
      label: 'Tasks',
    },
    {
      key: '/calls',
      icon: <PhoneOutlined />,
      label: 'Calls',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth="80"
        onBreakpoint={(broken) => {
          setCollapsed(broken);
        }}
        theme="light"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          boxShadow: '2px 0 8px 0 rgba(29,35,41,0.05)',
        }}
      >
        <div
          style={{
            height: '64px',
            margin: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {!collapsed && (
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff', margin: 0 }}>
              Aethera-CRM
            </h1>
          )}
          {collapsed && (
            <span style={{ fontSize: '24px', color: '#1890ff' }}>A</span>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 2px 8px 0 rgba(29,35,41,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', cursor: 'pointer' },
            })}
            
            <div
              style={{
                width: '300px',
                display: 'flex',
                alignItems: 'center',
                background: '#f5f5f5',
                borderRadius: '8px',
                padding: '4px 12px',
              }}
            >
              <SearchOutlined style={{ color: '#999', marginRight: '8px' }} />
              <input
                type="text"
                placeholder="Search (Ctrl+K)"
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Badge count={5} size="small">
              <BellOutlined style={{ fontSize: '18px', cursor: 'pointer', color: '#666' }} />
            </Badge>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#1890ff' }}>
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
                {!collapsed && (
                  <span style={{ fontSize: '14px' }}>{user?.username}</span>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 'calc(100vh - 112px)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
