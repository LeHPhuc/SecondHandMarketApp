import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Avatar, Button, Form, Input, Typography, Row, Col, 
  Divider, message, Modal, Upload, Tag, Spin, Tabs,
  Alert, Tooltip
} from 'antd';
import {
  UserOutlined, ArrowLeftOutlined, EditOutlined, CameraOutlined,
  MailOutlined, PhoneOutlined, EnvironmentOutlined,
  PlusOutlined, DeleteOutlined, SaveOutlined, ShopOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { authAPIs, endpoints } from '../configs/APIs';
import { MyUserContext, MyDispatchContext } from '../configs/Context';
import '../css/Profile.css';
import cookie from "react-cookies";

// Constants
const NAME_PATTERN = /^[A-Za-zÀÁẠẢÃÂẤẦẨẪẬĂẮẰẲẴẶÈÉẸẺẼÊẾỀỂỄỆÌÍỊỈĨÒÓỌỎÕÔỐỒỔỖỘƠỚỜỞỠỢÙÚỤỦŨƯỨỪỬỮỰỲÝỴỶỸĐàáạảãâấầẩẫậăắằẳẵặèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ\s]+$/;
const PHONE_PATTERN = /^(0[3-9])[0-9]{8}$/;
const ADDRESS_KEYWORDS = ['đường', 'phường', 'quận', 'huyện', 'tỉnh', 'thành phố', 'tp', 'số', 'ngõ', 'thôn', 'xã'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;

const Profile = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const navigate = useNavigate();
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);
  
  // Forms
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [deliveryForm] = Form.useForm();
  
  // States
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [deliveryInfos, setDeliveryInfos] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Memoized values
  const isLoggedIn = useMemo(() => user && Object.keys(user).length > 0, [user]);
  const userEmail = useMemo(() => userInfo?.email || user?.email, [userInfo?.email, user?.email]);
  const displayName = useMemo(() => {
    if (userInfo?.first_name || userInfo?.last_name) {
      return `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim();
    }
    return 'Chưa cập nhật tên';
  }, [userInfo?.first_name, userInfo?.last_name]);

  // Utility functions
  const normalizeText = useCallback((text) => {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const validatePhone = useCallback((phone) => PHONE_PATTERN.test(phone), []);

  const validateName = useCallback((name) => {
    return name && name.length >= 2 && name.length <= 30 && NAME_PATTERN.test(name);
  }, []);

  const updateUserData = useCallback((newData) => {
    const updatedData = { ...userInfo, ...newData };
    setUserInfo(updatedData);
    cookie.save("user", updatedData);
    dispatch({ type: "login", payload: updatedData });
  }, [userInfo, dispatch]);

  const showError = useCallback((error, defaultMessage) => {
    let errorMessage = defaultMessage;
    
    if (error.response?.status === 400 && error.response.data) {
      const errorData = error.response.data;
      const fieldErrors = [];
      
      Object.keys(errorData).forEach(field => {
        if (Array.isArray(errorData[field])) {
          fieldErrors.push(errorData[field][0]);
        } else if (typeof errorData[field] === 'string') {
          fieldErrors.push(errorData[field]);
        }
      });
      
      if (fieldErrors.length > 0) {
        errorMessage = fieldErrors.join('; ');
      }
    } else if (error.response?.status === 401) {
      errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!';
      setTimeout(() => navigate('/login'), 2000);
    }
    
    messageApi.error(errorMessage);
  }, [messageApi, navigate]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    
    const initializeProfile = async () => {
      await Promise.all([loadUserProfile(), loadDeliveryInfos()]);
    };
    
    initializeProfile();
  }, [isLoggedIn, navigate]);

  // Load user profile with optimized error handling
  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use context data as fallback
      if (user?.id) {
        setUserInfo(user);
        profileForm.setFieldsValue({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          phone_number: user.phone_number || ''
        });
      }
      
      // Try to refresh from API
      try {
        const response = await authAPIs().get(endpoints.currentuser);
        const userData = response.data;
        
        updateUserData(userData);
        profileForm.setFieldsValue({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          phone_number: userData.phone_number || ''
        });
        
      } catch (apiError) {
        console.log('API currentuser not available:', apiError.message);
        
        if (apiError.response?.status === 401) {
          messageApi.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
          cookie.remove("user");
          cookie.remove("id_token");
          dispatch({ type: "logout" });
          navigate('/login');
          return;
        }
      }
      
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      
      if (!user?.id) {
        messageApi.error('Vui lòng đăng nhập để xem thông tin profile');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [user, profileForm, updateUserData, messageApi, dispatch, navigate]);

  // Load delivery information
  const loadDeliveryInfos = useCallback(async () => {
    try {
      setDeliveryLoading(true);
      const response = await authAPIs().get(endpoints.deliveryInfo);
      setDeliveryInfos(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error loading delivery info:', error);
      messageApi.error('Không thể tải thông tin giao hàng');
    } finally {
      setDeliveryLoading(false);
    }
  }, [messageApi]);

  // Update profile with optimized validation
  const handleUpdateProfile = useCallback(async (values) => {
    try {
      setUpdating(true);
      
      // Validate and normalize data
      const updateData = {
        first_name: values.first_name?.trim() || '',
        last_name: values.last_name?.trim() || '',
        phone_number: values.phone_number?.trim() || ''
      };

      // Client-side validation
      if (!validateName(updateData.first_name) || !validateName(updateData.last_name)) {
        messageApi.error('Họ và tên phải có từ 2-30 ký tự và chỉ chứa chữ cái!');
        return;
      }

      if (updateData.phone_number && !validatePhone(updateData.phone_number)) {
        messageApi.error('Số điện thoại không hợp lệ! (VD: 0901234567)');
        return;
      }

      const endpoint = endpoints.updateprofile.replace('{id}', user.id);
      const response = await authAPIs().patch(endpoint, updateData);
      
      messageApi.success('Cập nhật thông tin thành công!');
      
      const updatedUserData = {
        ...response.data,
        store: response.data.store || userInfo?.store,
      };
      
      updateUserData(updatedUserData);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      showError(error, 'Không thể cập nhật thông tin');
    } finally {
      setUpdating(false);
    }
  }, [user.id, userInfo?.store, validateName, validatePhone, messageApi, updateUserData, showError]);

  // Handle password reset with Firebase
  const handleChangePassword = useCallback(async () => {
    try {
      setChangingPassword(true);
      
      if (!userEmail) {
        messageApi.error('Không tìm thấy email. Vui lòng cập nhật email trước!');
        return;
      }

      modal.confirm({
        title: 'Xác nhận đặt lại mật khẩu',
        content: `Bạn có chắc muốn đặt lại mật khẩu cho email: ${userEmail}?`,
        okText: 'Gửi email',
        cancelText: 'Hủy',
        onOk: async () => {
          try {
            const { sendPasswordResetEmail } = await import('firebase/auth');
            const { auth } = await import('../firebase');
            
            await sendPasswordResetEmail(auth, userEmail);
            
            messageApi.success({
              content: `Email đặt lại mật khẩu đã được gửi đến: ${userEmail}`,
              duration: 5
            });
            
            modal.info({
              title: 'Email đã được gửi!',
              content: (
                <div>
                  <p>Chúng tôi đã gửi liên kết đặt lại mật khẩu đến email của bạn.</p>
                  <p><strong>Hướng dẫn:</strong></p>
                  <ol style={{ paddingLeft: 20, marginTop: 8 }}>
                    <li>Kiểm tra hộp thư email ({userEmail})</li>
                    <li>Nhấp vào liên kết "Đặt lại mật khẩu"</li>
                    <li>Tạo mật khẩu mới</li>
                    <li>Đăng nhập lại với mật khẩu mới</li>
                  </ol>
                  <p style={{ marginTop: 12, color: '#8c8c8c', fontSize: '12px' }}>
                    💡 Không nhận được email? Kiểm tra thư mục spam.
                  </p>
                </div>
              ),
              okText: 'Đã hiểu',
              width: 500
            });
            
          } catch (error) {
            console.error('Firebase reset password error:', error);
            
            const errorMessages = {
              'auth/user-not-found': 'Email này chưa được đăng ký trong hệ thống.',
              'auth/invalid-email': 'Định dạng email không hợp lệ.',
              'auth/too-many-requests': 'Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.'
            };
            
            const errorMessage = errorMessages[error.code] || 'Không thể gửi email đặt lại mật khẩu.';
            messageApi.error(errorMessage);
          }
        }
      });
      
    } catch (error) {
      console.error('Error in change password flow:', error);
      messageApi.error('Có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setChangingPassword(false);
    }
  }, [userEmail, messageApi, modal]);

  // Handle avatar upload with validation
  const handleAvatarUpload = useCallback(async (file) => {
    try {
      setUploadLoading(true);
      
      // File validation
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        messageApi.error('Chỉ được upload file JPG/PNG!');
        return false;
      }

      if (file.size > MAX_FILE_SIZE) {
        messageApi.error('Kích thước file phải nhỏ hơn 2MB!');
        return false;
      }

      const formData = new FormData();
      formData.append('avatar', file);
      
      const endpoint = endpoints.updateprofile.replace('{id}', user.id);
      const response = await authAPIs().patch(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      messageApi.success('Cập nhật avatar thành công!');
      
      const updatedUserData = {
        ...userInfo,
        avatar: response.data.avatar
      };
      
      updateUserData(updatedUserData);
      
      return false;
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showError(error, 'Không thể cập nhật avatar');
      return false;
    } finally {
      setUploadLoading(false);
    }
  }, [user.id, userInfo, messageApi, updateUserData, showError]);

  // Validate delivery address
  const validateDeliveryAddress = useCallback((address) => {
    if (!address || address.length < 15) {
      return 'Địa chỉ phải có ít nhất 15 ký tự!';
    }
    
    const addressLower = address.toLowerCase();
    const hasValidComponents = ADDRESS_KEYWORDS.some(keyword => addressLower.includes(keyword));
    
    if (!hasValidComponents) {
      return 'warning'; // Just warning, not error
    }
    
    if (!/^[A-Za-zÀ-ỹ0-9\s,\/\-\.]+$/.test(address)) {
      return 'Địa chỉ chứa ký tự không hợp lệ!';
    }
    
    return null;
  }, []);

  // Handle delivery info submission
  const handleDeliverySubmit = useCallback(async (values) => {
    try {
      setDeliveryLoading(true);
      
      const deliveryData = {
        name: normalizeText(values.name.trim()),
        phone_number: values.phone_number.trim(),
        address: values.address.trim().replace(/\s+/g, ' ').replace(/,\s*,/g, ',')
      };

      // Validation
      if (!validateName(deliveryData.name)) {
        messageApi.error('Tên người nhận phải có từ 2-50 ký tự và chỉ chứa chữ cái!');
        return;
      }

      if (!validatePhone(deliveryData.phone_number)) {
        messageApi.error('Số điện thoại không hợp lệ! (VD: 0901234567)');
        return;
      }

      const addressValidation = validateDeliveryAddress(deliveryData.address);
      if (addressValidation && addressValidation !== 'warning') {
        messageApi.error(addressValidation);
        return;
      }
      
      if (addressValidation === 'warning') {
        messageApi.warning('Địa chỉ nên chứa thông tin đường/phường/quận/tỉnh!');
      }

      const method = editingDelivery ? 'put' : 'post';
      const url = editingDelivery 
        ? `${endpoints.deliveryInfo}${editingDelivery.id}/`
        : endpoints.deliveryInfo;

      await authAPIs()[method](url, deliveryData);
      
      messageApi.success(editingDelivery ? 'Cập nhật thành công!' : 'Thêm thành công!');
      
      setDeliveryModalVisible(false);
      setEditingDelivery(null);
      deliveryForm.resetFields();
      loadDeliveryInfos();
      
    } catch (error) {
      console.error('Error saving delivery info:', error);
      showError(error, 'Không thể lưu thông tin giao hàng');
    } finally {
      setDeliveryLoading(false);
    }
  }, [editingDelivery, normalizeText, validateName, validatePhone, validateDeliveryAddress, 
      deliveryForm, loadDeliveryInfos, messageApi, showError]);

  // Delete delivery info
  const handleDeleteDelivery = useCallback((deliveryInfo) => {
    confirm({
      title: 'Xóa thông tin giao hàng',
      content: `Bạn có chắc muốn xóa địa chỉ "${deliveryInfo.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await authAPIs().delete(`${endpoints.deliveryInfo}${deliveryInfo.id}/`);
          messageApi.success('Xóa thông tin giao hàng thành công!');
          loadDeliveryInfos();
        } catch (error) {
          console.error('Error deleting delivery info:', error);
          showError(error, 'Không thể xóa thông tin giao hàng');
        }
      }
    });
  }, [loadDeliveryInfos, messageApi, showError]);

  // Edit delivery info
  const handleEditDelivery = useCallback((deliveryInfo) => {
    setEditingDelivery(deliveryInfo);
    deliveryForm.setFieldsValue({
      name: deliveryInfo.name,
      phone_number: deliveryInfo.phone_number,
      address: deliveryInfo.address,
      is_default: deliveryInfo.is_default
    });
    setDeliveryModalVisible(true);
  }, [deliveryForm]);

  // Create name input handler with normalization
  const createNameInputHandler = useCallback((formInstance, fieldName) => (e) => {
    const normalized = normalizeText(e.target.value);
    if (normalized !== e.target.value) {
      formInstance.setFieldsValue({ [fieldName]: normalized });
    }
  }, [normalizeText]);

  // Create phone input handler
  const createPhoneInputHandler = useCallback((formInstance, fieldName) => (e) => {
    const value = e.target.value.replace(/\D/g, '');
    formInstance.setFieldsValue({ [fieldName]: value });
  }, []);

  if (loading) {
    return (
      <div className="profile-loading">
        <Spin size="large" />
        <div className="profile-loading-text">Đang tải thông tin...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {contextHolder}
      {modalContextHolder}
      {/* Header */}
      <div className="profile-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="profile-back-btn"
        >
          Quay lại
        </Button>
        <Title level={2} className="profile-title">
          Thông tin cá nhân
        </Title>
        <Text className="profile-subtitle">
          Quản lý thông tin cá nhân, địa chỉ giao hàng và bảo mật
        </Text>
      </div>

      {/* Avatar Section */}
      {userInfo && (
        <div className="profile-avatar-section">
          <Tooltip title="Click để thay đổi avatar" placement="top">
            <Upload
              name="avatar"
              showUploadList={false}
              beforeUpload={handleAvatarUpload}
              accept="image/jpeg,image/png,image/jpg"
              disabled={uploadLoading}
            >
              <div className="avatar-upload-wrapper">
                <Avatar
                  size={120}
                  src={userInfo.avatar}
                  icon={uploadLoading ? <LoadingOutlined /> : <UserOutlined />}
                  className="profile-avatar"
                />
                {uploadLoading && (
                  <div className="avatar-loading-overlay">
                    <Spin size="large" />
                  </div>
                )}
              </div>
            </Upload>
          </Tooltip>
          
          <Title level={3} className="profile-user-name">
            {displayName}
          </Title>
          
          <Text className="profile-user-email">{userEmail}</Text>
          
          <div className="profile-avatar-actions">
            <Upload
              name="avatar"
              showUploadList={false}
              beforeUpload={handleAvatarUpload}
              accept="image/jpeg,image/png,image/jpg"
            >
              <Button 
                type="default" 
                icon={uploadLoading ? <LoadingOutlined /> : <CameraOutlined />} 
                loading={uploadLoading}
                className="profile-upload-btn"
                size="large"
              >
                {uploadLoading ? 'Đang cập nhật...' : 'Thay đổi avatar'}
              </Button>
            </Upload>
            
            <div className="avatar-upload-hint">
              <Text type="secondary" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                Hỗ trợ JPG, PNG. Tối đa 2MB
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Store Info */}
      {userInfo?.store && (
        <div className="profile-store-info">
          <div className="profile-store-header">
            <ShopOutlined className="profile-store-icon" />
            <Title level={4} className="profile-store-title">
              Cửa hàng của bạn
            </Title>
          </div>
          <div className="profile-store-content">
            <Avatar
              size={60}
              src={userInfo.store.avatar}
              icon={<ShopOutlined />}
              className="profile-store-avatar"
            />
            <div className="profile-store-details">
              <Title level={3} className="profile-store-name">
                {userInfo.store.name}
              </Title>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Card className="profile-card">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
        >
          {/* Profile Tab */}
          <TabPane tab="Thông tin cá nhân" key="profile">
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleUpdateProfile}
              className="profile-form"
              size="large"
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Họ"
                    name="first_name"
                    rules={[
                      { required: true, message: 'Vui lòng nhập họ của bạn!' },
                      { min: 2, message: 'Họ phải có ít nhất 2 ký tự!' },
                      { max: 30, message: 'Họ không được vượt quá 30 ký tự!' },
                      { 
                        pattern: /^[A-Za-zÀÁẠẢÃÂẤẦẨẪẬĂẮẰẲẴẶÈÉẸẺẼÊẾỀỂỄỆÌÍỊỈĨÒÓỌỎÕÔỐỒỔỖỘƠỚỜỞỠỢÙÚỤỦŨƯỨỪỬỮỰỲÝỴỶỸĐàáạảãâấầẩẫậăắằẳẵặèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ\s]+$/,
                        message: 'Họ chỉ được chứa chữ cái và khoảng trắng!'
                      }
                    ]}
                  >
                    <Input
                      placeholder="Nhập họ của bạn (VD: Nguyễn)"
                      prefix={<UserOutlined />}
                      maxLength={30}
                      showCount
                      onBlur={createNameInputHandler(profileForm, 'first_name')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Tên"
                    name="last_name"
                    rules={[
                      { required: true, message: 'Vui lòng nhập tên của bạn!' },
                      { min: 2, message: 'Tên phải có ít nhất 2 ký tự!' },
                      { max: 30, message: 'Tên không được vượt quá 30 ký tự!' },
                      { 
                        pattern: NAME_PATTERN,
                        message: 'Tên chỉ được chứa chữ cái và khoảng trắng!'
                      }
                    ]}
                  >
                    <Input
                      placeholder="Nhập tên của bạn (VD: Văn A)"
                      prefix={<UserOutlined />}
                      maxLength={30}
                      showCount
                      onBlur={createNameInputHandler(profileForm, 'last_name')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Email"
                name="email"
                extra="Email không thể thay đổi. Được sử dụng để đặt lại mật khẩu và nhận thông báo quan trọng"
              >
                <Input
                  disabled
                  placeholder="Email của bạn"
                  prefix={<MailOutlined />}
                  style={{ 
                    backgroundColor: '#f5f5f5',
                    cursor: 'not-allowed',
                    color: '#999'
                  }}
                />
              </Form.Item>

              <Form.Item
                label="Số điện thoại"
                name="phone_number"
                rules={[
                  {
                    pattern: PHONE_PATTERN,
                    message: 'Số điện thoại không hợp lệ! (VD: 0901234567)'
                  }
                ]}
                extra="Số điện thoại để liên hệ khi có đơn hàng hoặc thông báo khẩn cấp"
              >
                <Input
                  placeholder="Nhập số điện thoại (VD: 0901234567)"
                  prefix={<PhoneOutlined />}
                  maxLength={10}
                  onChange={createPhoneInputHandler(profileForm, 'phone_number')}
                />
              </Form.Item>

              <div className="profile-form-actions">
                <Button 
                  onClick={() => profileForm.resetFields()}
                  className="profile-cancel-btn"
                >
                  Hủy thay đổi
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updating}
                  icon={<SaveOutlined />}
                  className="profile-save-btn"
                >
                  {updating ? 'Đang lưu...' : 'Lưu thông tin'}
                </Button>
              </div>
            </Form>
          </TabPane>

          {/* Delivery Info Tab */}
          <TabPane tab="Địa chỉ giao hàng" key="delivery-info">
            <div className="delivery-info-header">
              <Title level={4} className="delivery-info-title">
                Thông tin giao hàng
              </Title>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingDelivery(null);
                  deliveryForm.resetFields();
                  setDeliveryModalVisible(true);
                }}
                className="delivery-add-btn"
              >
                Thêm địa chỉ mới
              </Button>
            </div>

            <Spin spinning={deliveryLoading}>
              {deliveryInfos.length > 0 ? (
                <div className="delivery-info-list">
                  {deliveryInfos.map((info) => (
                    <div 
                      key={info.id} 
                      className={`delivery-info-item ${info.is_default ? 'default' : ''}`}
                    >
                      <div className="delivery-item-header">
                        <div className="delivery-item-main">
                          <div className="delivery-item-name">
                            <UserOutlined />
                            <Title level={5} className="delivery-item-name-text">
                              {info.name}
                            </Title>
                            {info.is_default && (
                              <Tag color="blue" className="delivery-item-default-tag">
                                Mặc định
                              </Tag>
                            )}
                          </div>
                          
                          <div className="delivery-item-phone">
                            <PhoneOutlined className="delivery-item-phone-icon" />
                            <Text>{info.phone_number}</Text>
                          </div>
                          
                          <div className="delivery-item-address">
                            <EnvironmentOutlined className="delivery-item-address-icon" />
                            <Text>{info.address}</Text>
                          </div>
                        </div>
                        
                        <div className="delivery-item-actions">
                          <Button
                            type="default"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEditDelivery(info)}
                            className="delivery-edit-btn"
                          >
                            Sửa
                          </Button>
                          <Button
                            type="default"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteDelivery(info)}
                            className="delivery-delete-btn"
                          >
                            Xóa
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="delivery-empty">
                  <EnvironmentOutlined className="delivery-empty-icon" />
                  <Text>Chưa có thông tin giao hàng nào</Text>
                  <br />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setDeliveryModalVisible(true)}
                    style={{ marginTop: 16 }}
                  >
                    Thêm địa chỉ giao hàng
                  </Button>
                </div>
              )}
            </Spin>
          </TabPane>

          {/* Reset Password Tab */}
          <TabPane tab="Đặt lại mật khẩu" key="password">
            <div className="reset-password-section">
              <Alert
                message="Đặt lại mật khẩu qua Email"
                description="Chúng tôi sẽ gửi liên kết đặt lại mật khẩu đến email của bạn. Đây là cách an toàn nhất để thay đổi mật khẩu."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Card className="reset-password-card" size="small">
                <div className="reset-password-content">
                  <div className="reset-password-icon">
                    <MailOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                  </div>
                  
                  <div className="reset-password-info">
                    <Title level={4}>Đặt lại mật khẩu</Title>
                    <Paragraph>
                      Email hiện tại: <Text strong>{userEmail || 'Chưa cập nhật'}</Text>
                    </Paragraph>
                    <Paragraph type="secondary">
                      Sau khi nhấn nút bên dưới, chúng tôi sẽ gửi email hướng dẫn đặt lại mật khẩu đến địa chỉ email của bạn.
                    </Paragraph>
                  </div>
                </div>

                <Divider />

                <div className="reset-password-steps">
                  <Title level={5}>Hướng dẫn:</Title>
                  <ol className="reset-steps-list">
                    <li>Nhấn nút "Gửi email đặt lại mật khẩu"</li>
                    <li>Kiểm tra hộp thư email của bạn</li>
                    <li>Nhấp vào liên kết trong email</li>
                    <li>Tạo mật khẩu mới theo yêu cầu</li>
                    <li>Đăng nhập lại với mật khẩu mới</li>
                  </ol>
                </div>

                <div className="reset-password-action">
                  {!userEmail ? (
                    <Alert
                      message="Cần cập nhật email"
                      description="Vui lòng cập nhật email trong tab 'Thông tin cá nhân' trước khi đặt lại mật khẩu."
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  ) : null}
                  
                  <Button
                    type="primary"
                    size="large"
                    icon={<MailOutlined />}
                    loading={changingPassword}
                    onClick={handleChangePassword}
                    disabled={!userEmail}
                    className="reset-password-btn"
                    block
                  >
                    {changingPassword ? 'Đang gửi email...' : 'Gửi email đặt lại mật khẩu'}
                  </Button>
                </div>
              </Card>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* Modal thêm/sửa thông tin giao hàng */}
      <Modal
        title={editingDelivery ? 'Chỉnh sửa thông tin giao hàng' : 'Thêm thông tin giao hàng mới'}
        open={deliveryModalVisible}
        onCancel={() => {
          setDeliveryModalVisible(false);
          setEditingDelivery(null);
          deliveryForm.resetFields();
        }}
        footer={null}
        width={600}
        className="profile-modal"
      >
        <Form
          form={deliveryForm}
          layout="vertical"
          onFinish={handleDeliverySubmit}
          size="large"
        >
          <Form.Item
            label="Tên người nhận"
            name="name"
            rules={[
              { required: true, message: 'Vui lòng nhập tên người nhận!' },
              { min: 2, message: 'Tên phải có ít nhất 2 ký tự!' },
              { max: 50, message: 'Tên không được vượt quá 50 ký tự!' },
              { 
                pattern: NAME_PATTERN,
                message: 'Tên chỉ được chứa chữ cái và khoảng trắng!'
              }
            ]}
          >
            <Input
              placeholder="Nhập tên người nhận (VD: Nguyễn Văn A)"
              prefix={<UserOutlined />}
              maxLength={50}
              showCount
              onBlur={createNameInputHandler(deliveryForm, 'name')}
            />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone_number"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              {
                pattern: PHONE_PATTERN,
                message: 'Số điện thoại không hợp lệ! (VD: 0901234567)'
              }
            ]}
          >
            <Input
              placeholder="Nhập số điện thoại (VD: 0901234567)"
              prefix={<PhoneOutlined />}
              maxLength={10}
              onChange={createPhoneInputHandler(deliveryForm, 'phone_number')}
              onPaste={(e) => {
                e.preventDefault();
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                const numbersOnly = paste.replace(/\D/g, '');
                deliveryForm.setFieldsValue({ phone_number: numbersOnly.slice(0, 10) });
              }}
            />
          </Form.Item>

          <Form.Item
            label="Địa chỉ giao hàng"
            name="address"
            rules={[
              { required: true, message: 'Vui lòng nhập địa chỉ giao hàng!' },
              { min: 15, message: 'Địa chỉ phải có ít nhất 15 ký tự!' },
              { max: 300, message: 'Địa chỉ không được vượt quá 300 ký tự!' }
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder={`Nhập địa chỉ đầy đủ (số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố)

VD: 123 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh`}
              maxLength={300}
              showCount
              style={{ 
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button 
              onClick={() => {
                setDeliveryModalVisible(false);
                setEditingDelivery(null);
                deliveryForm.resetFields();
              }}
              style={{ marginRight: 12 }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={deliveryLoading}
              icon={<SaveOutlined />}
            >
              {deliveryLoading ? 'Đang lưu...' : 'Lưu thông tin'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
