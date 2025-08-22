import React, { useState, useContext } from 'react';
import { Button, Form, Input, message, Card, Space, Upload, Avatar } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { authAPIs, endpoints } from '../configs/APIs';
import { MyUserContext } from '../configs/Context';

const TestUserAPI = () => {
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [currentUserLoading, setCurrentUserLoading] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const user = useContext(MyUserContext);

  const testUpdateAPI = async (values) => {
    try {
      setLoading(true);
      
      const updateData = {
        first_name: values.first_name?.trim() || '',
        last_name: values.last_name?.trim() || '',
        phone_number: values.phone_number?.trim() || ''
      };

      // Test với ViewSet endpoint
      const endpoint = endpoints.updateprofile.replace('{id}', user.id);
      console.log('Testing endpoint:', endpoint);
      console.log('Testing data:', updateData);
      
      const response = await authAPIs().patch(endpoint, updateData);
      console.log('API Response:', response.data);
      
      messageApi.success('Test API thành công!');
      
    } catch (error) {
      console.error('API Test Error:', error);
      console.error('Error Response:', error.response);
      
      let errorMessage = 'Test API thất bại';
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        console.error('Error Data:', errorData);
        errorMessage = `Validation Error: ${JSON.stringify(errorData)}`;
      } else if (error.response?.status === 401) {
        errorMessage = 'Unauthorized - Token có thể đã hết hạn';
      } else if (error.response?.status === 404) {
        errorMessage = 'Endpoint không tìm thấy - Kiểm tra URL';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server Error - Kiểm tra backend';
      }
      
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testCurrentUserAPI = async () => {
    try {
      setCurrentUserLoading(true);
      
      console.log('Testing currentuser endpoint:', endpoints.currentuser);
      
      const response = await authAPIs().get(endpoints.currentuser);
      console.log('Current User API Response:', response.data);
      
      messageApi.success('Test Current User API thành công!');
      
    } catch (error) {
      console.error('Current User API Test Error:', error);
      console.error('Error Response:', error.response);
      
      let errorMessage = 'Test Current User API thất bại';
      
      if (error.response?.status === 401) {
        errorMessage = 'Unauthorized - Token có thể đã hết hạn';
      } else if (error.response?.status === 404) {
        errorMessage = 'Endpoint không tìm thấy - Kiểm tra URL backend';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server Error - Kiểm tra backend ViewSet';
      }
      
      messageApi.error(errorMessage);
    } finally {
      setCurrentUserLoading(false);
    }
  };

  const testAvatarUpload = async (file) => {
    try {
      setAvatarLoading(true);
      
      const formData = new FormData();
      formData.append('avatar', file);
      
      const endpoint = endpoints.updateprofile.replace('{id}', user.id);
      console.log('Testing avatar upload:', endpoint);
      
      const response = await authAPIs().patch(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Avatar upload response:', response.data);
      messageApi.success('Test upload avatar thành công!');
      
      return false; // Prevent default upload
      
    } catch (error) {
      console.error('Avatar upload test error:', error);
      messageApi.error('Test upload avatar thất bại!');
      return false;
    } finally {
      setAvatarLoading(false);
    }
  };

  if (!user || !user.id) {
    return (
      <Card>
        {contextHolder}
        <p>Cần đăng nhập để test API</p>
      </Card>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {contextHolder}
      
      <Card title="Test User Update API" style={{ maxWidth: 500, marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Current Name:</strong> {user.first_name} {user.last_name}</p>
          <p><strong>Update Endpoint:</strong> {endpoints.updateprofile.replace('{id}', user.id)}</p>
          <p><strong>Current User Endpoint:</strong> {endpoints.currentuser}</p>
        </div>

        <Space style={{ marginBottom: 16 }}>
          <Button 
            type="default" 
            onClick={testCurrentUserAPI}
            loading={currentUserLoading}
          >
            Test Current User API
          </Button>
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={testUpdateAPI}
          initialValues={{
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            phone_number: user.phone_number || ''
          }}
        >
          <Form.Item
            label="First Name"
            name="first_name"
            rules={[{ required: true, message: 'Required!' }]}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>

          <Form.Item
            label="Last Name"
            name="last_name"
            rules={[{ required: true, message: 'Required!' }]}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>

          <Form.Item
            label="Phone Number"
            name="phone_number"
          >
            <Input placeholder="Enter phone number" />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Test Update Profile
            </Button>
            <Button onClick={() => form.resetFields()}>
              Reset
            </Button>
          </Space>
        </Form>
      </Card>

      <Card title="Test Avatar Upload" style={{ maxWidth: 500 }}>
        <div style={{ marginBottom: 16 }}>
          <Avatar size={64} src={user.avatar} icon={<UserOutlined />} />
          <p style={{ marginTop: 8 }}>Current Avatar: {user.avatar || 'None'}</p>
        </div>

        <Upload
          beforeUpload={testAvatarUpload}
          showUploadList={false}
          accept="image/*"
        >
          <Button 
            icon={<UploadOutlined />} 
            loading={avatarLoading}
          >
            Test Upload Avatar
          </Button>
        </Upload>
      </Card>
    </div>
  );
};

export default TestUserAPI;
