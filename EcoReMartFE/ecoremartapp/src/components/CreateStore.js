import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Button, Upload, Typography, Row, Col,
  App, Steps, Result, Space
} from 'antd';
import {
  ShopOutlined, CameraOutlined, SaveOutlined,
  PhoneOutlined, EnvironmentOutlined,
  BankOutlined, UserOutlined, IdcardOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { authAPIs, endpoints } from '../configs/APIs';
import { MyUserContext } from '../configs/Context';
import '../css/MyStore.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CreateStore = () => {
  const { message: messageApi } = App.useApp();
  const navigate = useNavigate();
  const user = useContext(MyUserContext);
  const [form] = Form.useForm();

  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [formData, setFormData] = useState({});
  const [isCreated, setIsCreated] = useState(false);
  const [createdStore, setCreatedStore] = useState(null);

  // Steps configuration
  const steps = [
    {
      title: 'Thông tin cơ bản',
      icon: <ShopOutlined />,
      description: 'Tên, địa chỉ, giới thiệu cửa hàng'
    },
    {
      title: 'Liên hệ & Avatar',
      icon: <PhoneOutlined />,
      description: 'Số điện thoại và ảnh đại diện'
    },
    {
      title: 'Hoàn thành',
      icon: <CheckCircleOutlined />,
      description: 'Xem lại và tạo cửa hàng'
    }
  ];

  // Navigation handlers
  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      setFormData(prev => ({ ...prev, ...values }));
      setCurrentStep(prev => prev + 1);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Main store creation handler
  const handleCreateStore = async () => {
    try {
      setLoading(true);
      
      // Prepare form data for multipart upload
      const submitData = new FormData();
      const allFormData = { ...formData };
      
      // Add required fields according to backend model
      submitData.append('name', allFormData.name);
      submitData.append('phone_number', allFormData.phone_number);
      submitData.append('address', allFormData.address);
      submitData.append('introduce', allFormData.introduce || '');
      
      // Add avatar if selected
      if (selectedAvatar?.file) {
        submitData.append('avatar', selectedAvatar.file);
      }

      // Make API call to create store
      const response = await authAPIs().post(endpoints.store, submitData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });

      // Handle successful creation
      setCreatedStore(response.data);
      setIsCreated(true);
      messageApi.success('Tạo cửa hàng thành công!');

    } catch (error) {
      console.error('Error creating store:', error);
      
      // Handle different error types from backend
      let errorMessage = 'Không thể tạo cửa hàng. Vui lòng thử lại.';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else {
          // Handle field-specific validation errors
          const errors = [];
          Object.entries(errorData).forEach(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages.join(', ') : messages;
            const fieldName = getFieldDisplayName(field);
            
            // Handle specific backend validation messages
            if (field === 'phone_number') {
              if (msg.includes('bắt đầu bằng số 0')) {
                errors.push('Số điện thoại phải bắt đầu bằng số 0');
              } else if (msg.includes('chỉ được chứa chữ số')) {
                errors.push('Số điện thoại chỉ được chứa chữ số');
              } else if (msg.includes('đúng 10 chữ số')) {
                errors.push('Số điện thoại phải có đúng 10 chữ số');
              } else {
                errors.push(`${fieldName}: ${msg}`);
              }
            } else if (field === 'address') {
              if (msg.includes('không tồn tại') || msg.includes('không hợp lệ')) {
                errors.push('Địa chỉ không tồn tại hoặc không hợp lệ - vui lòng nhập địa chỉ chính xác');
              } else {
                errors.push(`${fieldName}: ${msg}`);
              }
            } else if (field === 'name') {
              if (msg.includes('unique')) {
                errors.push('Tên cửa hàng này đã tồn tại - vui lòng chọn tên khác');
              } else {
                errors.push(`${fieldName}: ${msg}`);
              }
            } else {
              errors.push(`${fieldName}: ${msg}`);
            }
          });
          
          if (errors.length > 0) {
            errorMessage = errors.join('\n');
          }
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Kết nối bị timeout. Vui lòng kiểm tra mạng và thử lại.';
      }
      
      messageApi.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get Vietnamese field names
  const getFieldDisplayName = (field) => {
    const fieldNames = {
      name: 'Tên cửa hàng',
      phone_number: 'Số điện thoại', 
      address: 'Địa chỉ',
      introduce: 'Giới thiệu',
      avatar: 'Ảnh đại diện'
    };
    return fieldNames[field] || field;
  };

  // Step 1: Basic store information
  const renderStep1 = () => (
    <div>
      <Title level={4} style={{ marginBottom: '24px', textAlign: 'center' }}>
        <ShopOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
        Thông tin cơ bản cửa hàng
      </Title>

      <Form.Item
        name="name"
        label="Tên cửa hàng"
        rules={[
          { required: true, message: 'Vui lòng nhập tên cửa hàng' },
          { min: 2, message: 'Tên cửa hàng phải có ít nhất 2 ký tự' },
          { max: 45, message: 'Tên cửa hàng không được quá 45 ký tự' }
        ]}
      >
        <Input 
          prefix={<ShopOutlined />}
          placeholder="Nhập tên cửa hàng (tối đa 45 ký tự)" 
          size="large"
          showCount
          maxLength={45}
        />
      </Form.Item>

      <Form.Item
        name="address"
        label="Địa chỉ cửa hàng"
        rules={[
          { required: true, message: 'Vui lòng nhập địa chỉ cửa hàng' },
          { min: 10, message: 'Địa chỉ phải có ít nhất 10 ký tự' },
          { max: 100, message: 'Địa chỉ không được quá 100 ký tự' }
        ]}
        extra="Hệ thống sẽ kiểm tra tính hợp lệ của địa chỉ qua Mapbox API"
      >
        <Input
          prefix={<EnvironmentOutlined />}
          placeholder="VD: 123 Nguyễn Văn A, Phường 1, Quận 1, TP.HCM"
          size="large"
          showCount
          maxLength={100}
        />
      </Form.Item>

      <Form.Item
        name="introduce" 
        label="Giới thiệu cửa hàng"
        rules={[
          { max: 150, message: 'Giới thiệu không được quá 150 ký tự' }
        ]}
        extra="Mô tả ngắn gọn về cửa hàng của bạn (tùy chọn)"
      >
        <TextArea
          rows={4}
          placeholder="Giới thiệu về cửa hàng, sản phẩm, dịch vụ..."
          showCount
          maxLength={150}
          size="large"
        />
      </Form.Item>

      <div style={{ 
        background: '#e6f7ff', 
        border: '1px solid #91d5ff', 
        borderRadius: '8px', 
        padding: '16px',
        marginTop: '24px'
      }}>
        <Text style={{ fontSize: '14px', color: '#1890ff' }}>
          💡 <strong>Lưu ý:</strong> Tên cửa hàng phải là duy nhất • Địa chỉ sẽ được kiểm tra qua hệ thống Mapbox
        </Text>
      </div>
    </div>
  );

  // Step 2: Contact and Avatar
  const renderStep2 = () => (
    <div>
      <Title level={4} style={{ marginBottom: '24px', textAlign: 'center' }}>
        <PhoneOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
        Thông tin liên hệ & Ảnh đại diện
      </Title>

      <Form.Item
        name="phone_number"
        label="Số điện thoại"
        rules={[
          { required: true, message: 'Vui lòng nhập số điện thoại' },
          { 
            pattern: /^0[0-9]{9}$/, 
            message: 'Số điện thoại phải bắt đầu bằng số 0 và có đúng 10 chữ số' 
          }
        ]}
        extra="Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số"
      >
        <Input 
          prefix={<PhoneOutlined />}
          placeholder="0xxxxxxxxx (10 chữ số, bắt đầu bằng 0)" 
          size="large"
          maxLength={10}
        />
      </Form.Item>

      <Form.Item label="Ảnh đại diện cửa hàng" extra="Chọn ảnh đại diện cho cửa hàng (tùy chọn, tối đa 5MB)">
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              // Validate file type
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                messageApi.error('Chỉ có thể upload file hình ảnh!');
                return Upload.LIST_IGNORE;
              }
              
              // Validate file size
              const isLt5M = file.size / 1024 / 1024 < 5;
              if (!isLt5M) {
                messageApi.error('Kích thước file phải nhỏ hơn 5MB!');
                return Upload.LIST_IGNORE;
              }
              
              // Create preview
              const reader = new FileReader();
              reader.onload = (e) => {
                setSelectedAvatar({
                  file: file,
                  preview: e.target.result,
                  name: file.name
                });
              };
              reader.readAsDataURL(file);
              
              return false; // Prevent default upload
            }}
            accept="image/*"
          >
            <div style={{ 
              width: 120, 
              height: 120, 
              border: '2px dashed #d9d9d9', 
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: '#fafafa',
              transition: 'all 0.3s ease'
            }}>
              <CameraOutlined style={{ fontSize: 28, color: '#999', marginBottom: 8 }} />
              <Text style={{ color: '#999', fontSize: '12px', textAlign: 'center' }}>
                Chọn ảnh<br />đại diện
              </Text>
            </div>
          </Upload>
          
          {selectedAvatar && (
            <div style={{ position: 'relative' }}>
              <img
                src={selectedAvatar.preview}
                alt="Preview avatar"
                style={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: '8px', 
                  border: '2px solid #1890ff',
                  objectFit: 'cover'
                }}
              />
              <Button
                type="text"
                danger
                size="small"
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#ff4d4f',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => setSelectedAvatar(null)}
              >
                ×
              </Button>
              <Text style={{ 
                display: 'block', 
                marginTop: '8px', 
                fontSize: '12px', 
                textAlign: 'center',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {selectedAvatar.name}
              </Text>
            </div>
          )}
        </div>
      </Form.Item>

      <div style={{ 
        background: '#fff7e6', 
        border: '1px solid #ffd591', 
        borderRadius: '8px', 
        padding: '16px'
      }}>
        <Text style={{ fontSize: '14px', color: '#fa8c16' }}>
          ⚠️ <strong>Lưu ý quan trọng:</strong><br />
          • Số điện thoại phải bắt đầu bằng số 0<br />
          • Chỉ được chứa 10 chữ số<br />
          • Ảnh đại diện tối đa 5MB
        </Text>
      </div>
    </div>
  );

  // Step 3: Review and confirm
  const renderStep3 = () => (
    <div>
      <Title level={4} style={{ marginBottom: '24px', textAlign: 'center' }}>
        <CheckCircleOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
        Xác nhận thông tin cửa hàng
      </Title>

      <div style={{ 
        background: '#fafafa', 
        borderRadius: '8px', 
        padding: '24px',
        border: '1px solid #f0f0f0'
      }}>
        {/* Store Header */}
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          marginBottom: '24px', 
          alignItems: 'center',
          paddingBottom: '16px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div>
            {selectedAvatar ? (
              <img 
                src={selectedAvatar.preview} 
                alt="Store avatar"
                style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '8px', 
                  objectFit: 'cover',
                  border: '2px solid #e8e8e8'
                }}
              />
            ) : (
              <div style={{
                width: 80, 
                height: 80, 
                borderRadius: '8px', 
                backgroundColor: '#e6f7ff',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '2px solid #91d5ff'
              }}>
                <ShopOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              </div>
            )}
          </div>
          <div>
            <Title level={3} style={{ margin: '0 0 8px 0', color: '#1890ff' }}>
              {formData.name}
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              📍 {formData.address}
            </Text>
          </div>
        </div>

        {/* Store Details */}
        <Row gutter={[24, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={12}>
            <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '6px' }}>
              <Text strong style={{ color: '#1890ff' }}>
                📞 Số điện thoại:
              </Text>
              <br />
              <Text style={{ fontSize: '16px' }}>{formData.phone_number}</Text>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '6px' }}>
              <Text strong style={{ color: '#1890ff' }}>
                🏪 Tên cửa hàng:
              </Text>
              <br />
              <Text style={{ fontSize: '16px' }}>{formData.name}</Text>
            </div>
          </Col>
          <Col xs={24}>
            <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '6px' }}>
              <Text strong style={{ color: '#1890ff' }}>
                📝 Giới thiệu:
              </Text>
              <br />
              <Text style={{ fontSize: '14px' }}>
                {formData.introduce || 'Chưa có giới thiệu'}
              </Text>
            </div>
          </Col>
        </Row>
      </div>

      <div style={{ 
        background: '#f6ffed', 
        border: '1px solid #b7eb8f', 
        borderRadius: '8px', 
        padding: '16px',
        marginTop: '16px',
        textAlign: 'center'
      }}>
        <Text style={{ color: '#52c41a', fontSize: '16px' }}>
          🎉 Sẵn sàng tạo cửa hàng của bạn!
        </Text>
      </div>
    </div>
  );

  // Success result page
  const renderSuccess = () => (
    <Result
      status="success"
      title="Tạo cửa hàng thành công!"
      subTitle={
        <div>
          <Text style={{ fontSize: '16px' }}>
            Chào mừng <strong>{createdStore?.name || formData.name}</strong> đến với EcoReMart!
          </Text>
          <br />
          <Text type="secondary">
            Bạn có thể bắt đầu quản lý cửa hàng và thêm sản phẩm ngay bây giờ.
          </Text>
        </div>
      }
      extra={[
        <Button 
          type="primary" 
          size="large"
          key="store" 
          onClick={() => navigate('/my-store')}
        >
          Đi đến cửa hàng của tôi
        </Button>,
        <Button 
          size="large"
          key="home" 
          onClick={() => navigate('/')}
        >
          Về trang chủ
        </Button>
      ]}
    />
  );

  return (
    <div className="my-store-container">
      {/* Header Card */}
      <Card className="store-header-card">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <ShopOutlined style={{ 
            fontSize: '48px', 
            color: '#1890ff', 
            marginBottom: '16px' 
          }} />
          <Title level={2} style={{ margin: '0 0 8px 0' }}>
            {isCreated ? 'Cửa hàng đã được tạo!' : 'Tạo cửa hàng mới'}
          </Title>
          <Paragraph type="secondary" style={{ fontSize: '16px', margin: 0 }}>
            {isCreated 
              ? 'Chào mừng bạn đến với EcoReMart!' 
              : 'Bắt đầu kinh doanh trực tuyến cùng EcoReMart'
            }
          </Paragraph>
        </div>
      </Card>

      {/* Main Content Card */}
      <Card className="main-content-card">
        {isCreated ? (
          renderSuccess()
        ) : (
          <div>
            {/* Steps Progress */}
            <Steps 
              current={currentStep} 
              style={{ marginBottom: '32px' }}
              size="default"
            >
              {steps.map((step, index) => (
                <Steps.Step
                  key={index}
                  title={step.title}
                  description={step.description}
                  icon={step.icon}
                />
              ))}
            </Steps>

            {/* Form Content */}
            <Form
              form={form}
              layout="vertical"
              initialValues={formData}
              size="large"
              style={{ maxWidth: '800px', margin: '0 auto' }}
            >
              <div style={{ minHeight: '500px', padding: '24px 0' }}>
                {currentStep === 0 && renderStep1()}
                {currentStep === 1 && renderStep2()}
                {currentStep === 2 && renderStep3()}
              </div>

              {/* Navigation Buttons */}
              <div style={{ 
                marginTop: '32px', 
                textAlign: 'center',
                borderTop: '1px solid #f0f0f0',
                paddingTop: '24px'
              }}>
                <Space size="large">
                  {/* Cancel/Back buttons */}
                  {currentStep === 0 && (
                    <Button 
                      size="large" 
                      onClick={() => navigate(-1)}
                    >
                      Hủy bỏ
                    </Button>
                  )}

                  {currentStep > 0 && (
                    <Button 
                      size="large" 
                      onClick={handlePrev}
                    >
                      ← Quay lại
                    </Button>
                  )}

                  {/* Next/Submit buttons */}
                  {currentStep < steps.length - 1 ? (
                    <Button 
                      type="primary" 
                      size="large" 
                      onClick={handleNext}
                    >
                      Tiếp theo →
                    </Button>
                  ) : (
                    <Button 
                      type="primary"
                      size="large"
                      icon={<SaveOutlined />}
                      loading={loading}
                      onClick={handleCreateStore}
                    >
                      {loading ? 'Đang tạo cửa hàng...' : 'Tạo cửa hàng'}
                    </Button>
                  )}
                </Space>
              </div>
            </Form>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CreateStore;
