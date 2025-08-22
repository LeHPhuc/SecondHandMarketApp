import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Button, Row, Col, Typography, 
  Radio, Divider, Space, Tag, Alert, 
  Empty, Spin, App, Modal
} from 'antd';
import {
  ArrowLeftOutlined, ShoppingCartOutlined, CreditCardOutlined,
  EnvironmentOutlined, GiftOutlined, FileTextOutlined,
  CheckCircleOutlined, ShopOutlined, DollarOutlined,
  PhoneOutlined, UserOutlined, BankOutlined, PlusOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { authAPIs, endpoints } from '../configs/APIs';
import { MyUserContext } from '../configs/Context';
import '../css/CreateOrder.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CreateOrder = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useContext(MyUserContext);
  const [form] = Form.useForm();
  const [deliveryForm] = Form.useForm(); // Form cho modal thêm thông tin giao hàng

  // State management
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [deliveryInfos, setDeliveryInfos] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDeliveryInfo, setSelectedDeliveryInfo] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [orderNote, setOrderNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash payment'); // Default to cash payment
  const [showDeliveryModal, setShowDeliveryModal] = useState(false); // Modal state
  const [addingDelivery, setAddingDelivery] = useState(false); // Loading state cho modal

  // Check authentication
  const isLoggedIn = user && Object.keys(user).length > 0;

  useEffect(() => {
    if (!isLoggedIn) {
      message.error('Vui lòng đăng nhập để tạo đơn hàng');
      navigate('/login');
      return;
    }

    // Get selected products from navigation state
    const products = location.state?.selectedProducts || [];
    if (products.length === 0) {
      message.warning('Không có sản phẩm nào được chọn');
      navigate('/cart');
      return;
    }

    setSelectedProducts(products);
    loadInitialData();
  }, [isLoggedIn, location.state]);

  // Load delivery info and vouchers
  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDeliveryInfos(),
        loadVouchers()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      message.error('Không thể tải thông tin khởi tạo');
    } finally {
      setLoading(false);
    }
  };

  // Load delivery information
  const loadDeliveryInfos = async () => {
    try {
      const response = await authAPIs().get(endpoints.deliveryInfo);
      const deliveryList = Array.isArray(response.data) ? response.data : response.data.results || [];
      setDeliveryInfos(deliveryList);
      
      // Auto-select first delivery info
      if (deliveryList.length > 0) {
        setSelectedDeliveryInfo(deliveryList[0].id);
        form.setFieldsValue({ delivery_info_id: deliveryList[0].id });
      }
    } catch (error) {
      console.error('Error loading delivery info:', error);
      message.error('Không thể tải thông tin giao hàng');
    }
  };

  // Load vouchers
  const loadVouchers = async () => {
    try {
      const response = await authAPIs().get(endpoints.voucher);
      const voucherList = Array.isArray(response.data) ? response.data : response.data.results || [];
      
      // Filter valid vouchers
      const validVouchers = voucherList.filter(voucher => {
        const now = new Date();
        const expiryDate = new Date(voucher.expiry_date);
        const isNotExpired = expiryDate > now;
        const hasUsesLeft = !voucher.max_uses || voucher.used_count < voucher.max_uses;
        const meetsMinOrder = calculateSubtotal() >= (voucher.min_order_value || 0);
        
        return voucher.is_active && isNotExpired && hasUsesLeft && meetsMinOrder;
      });
      
      setVouchers(validVouchers);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      message.error('Không thể tải danh sách voucher');
    }
  };

  // Calculate subtotal
  const calculateSubtotal = () => {
    return selectedProducts.reduce((total, item) => 
      total + (item.product.price * item.quantity), 0
    );
  };

  // Calculate discount
  const calculateDiscount = () => {
    if (!selectedVoucher) return 0;
    
    const voucher = vouchers.find(v => v.id === selectedVoucher);
    if (!voucher) return 0;
    
    const subtotal = calculateSubtotal();
    const discountAmount = subtotal * (voucher.discount_percent / 100);
    
    return Math.min(discountAmount, voucher.max_discount_amount || discountAmount);
  };

  // Calculate final total
  const calculateTotal = () => calculateSubtotal() - calculateDiscount();

  // Handle payment method change
  const handlePaymentMethodChange = (value) => {
    setPaymentMethod(value);
    
    if (value === 'online payment') {
      message.info('Tính năng thanh toán online đang được phát triển. Hiện tại vui lòng chọn thanh toán tiền mặt.');
    }
  };

  // Handle delivery info change
  const handleDeliveryInfoChange = (value) => setSelectedDeliveryInfo(value);

  // Handle voucher change
  const handleVoucherChange = (value) => setSelectedVoucher(value);

  // Handle adding delivery info via modal
  const handleAddDeliveryInfo = async (values) => {
    try {
      setAddingDelivery(true);
      
      // Submit to API - backend perform_create will handle user assignment
      const response = await authAPIs().post(endpoints.deliveryInfo, values);
      const newDeliveryInfo = response.data;

      message.success('Thêm thông tin giao hàng thành công!');

      // Update delivery info list and auto-select
      setDeliveryInfos([...deliveryInfos, newDeliveryInfo]);
      setSelectedDeliveryInfo(newDeliveryInfo.id);
      form.setFieldsValue({ delivery_info_id: newDeliveryInfo.id });

      // Close modal and reset form
      setShowDeliveryModal(false);
      deliveryForm.resetFields();

    } catch (error) {
      console.error('Error adding delivery info:', error);
      
      let errorMessage = 'Không thể thêm thông tin giao hàng';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else {
          // Handle field-specific validation errors
          const fieldErrors = [];
          ['name', 'phone_number', 'address', 'non_field_errors'].forEach(field => {
            if (errorData[field]) {
              const fieldName = field === 'phone_number' ? 'Số điện thoại' : 
                               field === 'address' ? 'Địa chỉ' : 
                               field === 'name' ? 'Tên' : '';
              const errorMsg = Array.isArray(errorData[field]) ? errorData[field][0] : errorData[field];
              fieldErrors.push(fieldName ? `${fieldName}: ${errorMsg}` : errorMsg);
            }
          });
          
          errorMessage = fieldErrors.length > 0 ? fieldErrors.join('. ') : 
                        `Lỗi validation: ${JSON.stringify(errorData)}`;
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Bạn không có quyền thực hiện thao tác này.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Lỗi máy chủ. Vui lòng thử lại sau.';
      } else {
        errorMessage = error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      }
      
      message.error(errorMessage);
    } finally {
      setAddingDelivery(false);
    }
  };

  // Handle modal cancel
  const handleCancelDeliveryModal = () => {
    setShowDeliveryModal(false);
    deliveryForm.resetFields();
  };

  // Handle order submission
  const handleSubmitOrder = async () => {
    try {
      await form.validateFields();
      
      if (!selectedDeliveryInfo) {
        message.error('Vui lòng chọn địa chỉ giao hàng');
        return;
      }

      setSubmitting(true);

      // Prepare order data
      const orderData = {
        items: selectedProducts.map(item => ({
          product: item.product.id,
          quantity: item.quantity
        })),
        delivery_info_id: selectedDeliveryInfo,
        note: orderNote,
        payment_method: paymentMethod
      };

      if (selectedVoucher) {
        orderData.voucher = selectedVoucher;
      }

      const response = await authAPIs().post(endpoints.order, orderData);
      
      modal.success({
        title: 'Đặt hàng thành công!',
        content: (
          <div>
            <p>Đơn hàng của bạn đã được tạo thành công.</p>
            <p>Mã đơn hàng: <strong>{response.data.order_code}</strong></p>
            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #f0f0f0' }} />
            <div style={{ fontSize: '14px', color: '#666' }}>
              <p>
                <DollarOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                Phương thức thanh toán: <strong>
                  {paymentMethod === 'cash payment' ? 'Tiền mặt (COD)' : 'Thanh toán online'}
                </strong>
              </p>
              <p style={{ marginBottom: 0 }}>
                <EnvironmentOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Tổng giá trị: <strong style={{ color: '#ff6b35' }}>
                  {calculateTotal().toLocaleString()}đ
                </strong>
              </p>
            </div>
          </div>
        ),
        width: 450,
        onOk: () => navigate('/myorders')
      });

    } catch (error) {
      console.error('Error creating order:', error);
      
      let errorMessage = 'Không thể tạo đơn hàng';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      }
      
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Render product item
  const renderProductItem = (item, index) => (
    <div key={index} className="product-item">
      <Row gutter={16} align="middle">
        <Col flex="100px">
          <div className="product-image">
            <img 
              src={item.product.image || '/placeholder-product.jpg'} 
              alt={item.product.name}
            />
          </div>
        </Col>
        <Col flex="auto">
          <div className="product-info">
            <Title level={5}>{item.product.name}</Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {item.product.category?.name}
            </Text>
            <div style={{ marginTop: '8px' }}>
              <Text strong className="product-price">
                {item.product.price.toLocaleString()}đ
              </Text>
              <Text className="product-quantity">
                x {item.quantity}
              </Text>
            </div>
          </div>
        </Col>
        <Col>
          <Text strong className="product-total">
            {(item.product.price * item.quantity).toLocaleString()}đ
          </Text>
        </Col>
      </Row>
    </div>
  );

  // Render delivery info option
  const renderDeliveryInfo = (info) => (
    <div 
      key={info.id} 
      className={`delivery-info-item ${selectedDeliveryInfo === info.id ? 'selected' : 'unselected'}`}
    >
      <div className="delivery-info-content">
        <div className="delivery-info-details">
          <div className="delivery-info-header">
            <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            <Text strong className="delivery-info-name">{info.name}</Text>
            {info.is_default && (
              <Tag color="blue" className="delivery-info-default-tag">
                Mặc định
              </Tag>
            )}
          </div>
          
          <div className="delivery-info-phone">
            <PhoneOutlined style={{ marginRight: '8px', color: '#666' }} />
            <Text style={{ color: '#666' }}>{info.phone_number}</Text>
          </div>
          
          <div className="delivery-info-address">
            <EnvironmentOutlined style={{ marginRight: '8px', color: '#666', marginTop: '2px' }} />
            <Text style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
              {info.address}
            </Text>
          </div>
        </div>
        
        {selectedDeliveryInfo === info.id && (
          <CheckCircleOutlined className="delivery-info-selected-icon" />
        )}
      </div>
    </div>
  );

  // Render voucher option
  const renderVoucher = (voucher) => {
    const discount = Math.min(
      calculateSubtotal() * (voucher.discount_percent / 100),
      voucher.max_discount_amount || Infinity
    );

    return (
      <div key={voucher.id} className="voucher-item">
        <div className="voucher-content">
          <div>
            <Text strong className="voucher-name">{voucher.name}</Text>
            <div className="voucher-details">
              <Text>
                Giảm {voucher.discount_percent}% • Tối đa {voucher.max_discount_amount?.toLocaleString() || 'không giới hạn'}đ
              </Text>
            </div>
            <div className="voucher-min-order">
              <Text>
                Đơn tối thiểu: {voucher.min_order_value?.toLocaleString() || 0}đ
              </Text>
            </div>
          </div>
          <Text strong className="voucher-discount">
            -{discount.toLocaleString()}đ
          </Text>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="create-order-loading">
        <Spin size="large" />
        <p className="create-order-loading-text">Đang tải thông tin...</p>
      </div>
    );
  }

  if (selectedProducts.length === 0) {
    return (
      <div className="create-order-empty">
        <Empty description="Không có sản phẩm nào để đặt hàng" />
        <Button 
          type="primary" 
          onClick={() => navigate('/cart')} 
          className="create-order-empty-btn"
        >
          Quay lại giỏ hàng
        </Button>
      </div>
    );
  }

  // Group products by store
  const storeProducts = selectedProducts.reduce((acc, item) => {
    const storeId = item.product.store?.id || 'unknown';
    if (!acc[storeId]) {
      acc[storeId] = {
        store: item.product.store,
        products: []
      };
    }
    acc[storeId].products.push(item);
    return acc;
  }, {});

  return (
    <div className="cart-container">
      {/* Header */}
      <div className="cart-header create-order-header">
        <div className="cart-title">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(-1)}
            className="create-order-back-btn"
          >
            Quay lại
          </Button>
          <Title level={2} className="create-order-title">
            <CreditCardOutlined className="create-order-card-title" /> Đặt hàng
          </Title>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Order Details */}
        <Col xs={24} lg={16}>
          <Form form={form} layout="vertical" onFinish={handleSubmitOrder}>
            {/* Products Section */}
            <Card title={
              <span>
                <ShoppingCartOutlined className="create-order-card-title" />
                Sản phẩm đã chọn ({selectedProducts.length})
              </span>
            } className="create-order-card">
              <div className={`create-order-scrollable ${selectedProducts.length > 3 ? 'products-scrollable' : ''}`}
                   style={{
                     maxHeight: selectedProducts.length > 3 ? '500px' : 'auto',
                     overflowY: selectedProducts.length > 3 ? 'auto' : 'visible',
                   }}>
                {Object.entries(storeProducts).map(([storeId, storeData]) => (
                  <div key={storeId} style={{ marginBottom: '24px' }}>
                    {storeData.store && (
                      <div className="store-header">
                        <Text strong>
                          <ShopOutlined className="create-order-card-title" />
                          {storeData.store.name}
                        </Text>
                      </div>
                    )}
                    {storeData.products.map((item, index) => renderProductItem(item, `${storeId}-${index}`))}
                  </div>
                ))}
              </div>
              {selectedProducts.length > 3 && (
                <div className="products-scroll-indicator">
                  🛒 {selectedProducts.length} sản phẩm đã chọn • Cuộn để xem tất cả
                </div>
              )}
            </Card>

            {/* Delivery Information Section */}
            <Card 
              title={
                <span>
                  <EnvironmentOutlined className="create-order-card-title" />
                  Thông tin giao hàng
                </span>
              }
              extra={
                deliveryInfos.length > 0 && (
                  <Button 
                    type="dashed" 
                    icon={<PlusOutlined />}
                    onClick={() => setShowDeliveryModal(true)}
                    className="add-address-btn"
                  >
                    Thêm địa chỉ mới
                  </Button>
                )
              }
              className="create-order-card"
            >
              {deliveryInfos.length > 0 ? (
                <Form.Item
                  name="delivery_info_id"
                  rules={[{ required: true, message: 'Vui lòng chọn địa chỉ giao hàng' }]}
                >
                  <Radio.Group 
                    value={selectedDeliveryInfo} 
                    onChange={(e) => handleDeliveryInfoChange(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <div className="delivery-info-scrollable create-order-scrollable">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {deliveryInfos.map(info => (
                          <Radio key={info.id} value={info.id} style={{ width: '100%' }}>
                            {renderDeliveryInfo(info)}
                          </Radio>
                        ))}
                      </Space>
                    </div>
                    {deliveryInfos.length > 2 && (
                      <div className="delivery-scroll-indicator">
                        💡 Có {deliveryInfos.length} địa chỉ • Cuộn để xem thêm
                      </div>
                    )}
                  </Radio.Group>
                </Form.Item>
              ) : (
                <Empty description="Chưa có địa chỉ giao hàng">
                  <Button 
                    type="primary" 
                    onClick={() => setShowDeliveryModal(true)}
                    icon={<PlusOutlined />}
                    className="add-address-btn-primary"
                  >
                    Thêm thông tin giao hàng
                  </Button>
                </Empty>
              )}
            </Card>

            {/* Payment Method Section */}
            <Card 
              title={
                <span>
                  <DollarOutlined style={{ marginRight: '8px' }} />
                  Phương thức thanh toán
                </span>
              }
              style={{ marginBottom: '24px' }}
            >
              <Form.Item
                name="payment_method"
                rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán' }]}
                initialValue="cash payment"
              >
                <Radio.Group 
                  value={paymentMethod}
                  onChange={(e) => handlePaymentMethodChange(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio value="cash payment" style={{ width: '100%' }}>
                      <div style={{ 
                        padding: '16px', 
                        border: paymentMethod === 'cash payment' ? '2px solid #1890ff' : '1px solid #f0f0f0', 
                        borderRadius: '8px',
                        backgroundColor: paymentMethod === 'cash payment' ? '#f6ffed' : 'white',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <DollarOutlined style={{ fontSize: '24px', color: '#52c41a', marginRight: '12px' }} />
                          <div>
                            <Text strong style={{ fontSize: '16px' }}>Thanh toán tiền mặt</Text>
                            <div style={{ marginTop: '4px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                Thanh toán khi nhận hàng (COD)
                              </Text>
                            </div>
                          </div>
                        </div>
                        {paymentMethod === 'cash payment' && (
                          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                        )}
                      </div>
                    </Radio>
                    
                    <Radio value="online payment" style={{ width: '100%' }}>
                      <div style={{ 
                        padding: '16px', 
                        border: paymentMethod === 'online payment' ? '2px solid #1890ff' : '1px solid #f0f0f0', 
                        borderRadius: '8px',
                        backgroundColor: paymentMethod === 'online payment' ? '#f6ffed' : 'white',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: 0.6
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <BankOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
                          <div>
                            <Text strong style={{ fontSize: '16px' }}>Thanh toán online</Text>
                            <div style={{ marginTop: '4px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                Ví điện tử, thẻ ngân hàng (Đang phát triển)
                              </Text>
                            </div>
                          </div>
                        </div>
                        {paymentMethod === 'online payment' && (
                          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                        )}
                      </div>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>
              
              {paymentMethod === 'online payment' && (
                <Alert
                  message="Tính năng đang phát triển"
                  description="Thanh toán online hiện đang được phát triển. Vui lòng chọn thanh toán tiền mặt để hoàn tất đơn hàng."
                  type="warning"
                  showIcon
                  style={{ marginTop: '12px' }}
                />
              )}
            </Card>

            {/* Voucher Section */}
            <Card 
              title={
                <span>
                  <GiftOutlined className="create-order-card-title" />
                  Voucher giảm giá
                </span>
              }
              className="create-order-card"
            >
              {vouchers.length > 0 ? (
                <Form.Item name="voucher">
                  <Radio.Group 
                    value={selectedVoucher} 
                    onChange={(e) => handleVoucherChange(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <div className="voucher-scrollable create-order-scrollable">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Radio value={null}>
                          <div className="voucher-none">
                            <Text>Không sử dụng voucher</Text>
                          </div>
                        </Radio>
                        {vouchers.map(voucher => (
                          <Radio key={voucher.id} value={voucher.id} style={{ width: '100%' }}>
                            {renderVoucher(voucher)}
                          </Radio>
                        ))}
                      </Space>
                    </div>
                    {vouchers.length > 3 && (
                      <div className="voucher-scroll-indicator">
                        🎫 Có {vouchers.length} voucher khả dụng • Cuộn để xem thêm
                      </div>
                    )}
                  </Radio.Group>
                </Form.Item>
              ) : (
                <Alert
                  message="Không có voucher khả dụng"
                  description="Hiện tại không có voucher nào phù hợp với đơn hàng của bạn."
                  type="info"
                  showIcon
                />
              )}
            </Card>

            {/* Order Note Section */}
            <Card 
              title={
                <span>
                  <FileTextOutlined style={{ marginRight: '8px' }} />
                  Ghi chú đơn hàng
                </span>
              }
              style={{ marginBottom: '24px' }}
            >
              <Form.Item name="note">
                <TextArea 
                  rows={3}
                  placeholder="Ghi chú cho người bán (tùy chọn)"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  maxLength={200}
                  showCount
                />
              </Form.Item>
            </Card>
          </Form>
        </Col>

        {/* Order Summary */}
        <Col xs={24} lg={8}>
          <Card 
            title="Tóm tắt đơn hàng" 
            style={{ position: 'sticky', top: '20px' }}
          >
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Text>Tạm tính ({selectedProducts.length} sản phẩm):</Text>
                <Text strong>{calculateSubtotal().toLocaleString()}đ</Text>
              </div>
              
              {selectedVoucher && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text style={{ color: '#52c41a' }}>
                    <GiftOutlined style={{ marginRight: '4px' }} />
                    Giảm giá voucher:
                  </Text>
                  <Text strong style={{ color: '#52c41a' }}>
                    -{calculateDiscount().toLocaleString()}đ
                  </Text>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Text>Phí vận chuyển:</Text>
                <Text style={{ color: '#666' }}>Tính khi đặt hàng</Text>
              </div>
              
              {/* Payment Method Summary */}
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '6px', 
                marginTop: '12px',
                marginBottom: '12px'
              }}>
                <Text strong style={{ color: '#1890ff' }}>
                  {paymentMethod === 'cash payment' ? (
                    <>
                      <DollarOutlined style={{ marginRight: '6px' }} />
                      Thanh toán tiền mặt (COD)
                    </>
                  ) : (
                    <>
                      <BankOutlined style={{ marginRight: '6px' }} />
                      Thanh toán online
                    </>
                  )}
                </Text>
                <div style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px', color: '#666' }}>
                    {paymentMethod === 'cash payment' 
                      ? 'Thanh toán khi nhận hàng'
                      : 'Đang phát triển'
                    }
                  </Text>
                </div>
              </div>
              
              {/* Delivery Info Summary */}
              {selectedDeliveryInfo && deliveryInfos.length > 0 && (() => {
                const selectedInfo = deliveryInfos.find(info => info.id === selectedDeliveryInfo);
                return selectedInfo && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f0f9ff', 
                    borderRadius: '6px', 
                    marginBottom: '12px'
                  }}>
                    <Text strong style={{ color: '#1890ff' }}>
                      <EnvironmentOutlined style={{ marginRight: '6px' }} />
                      Giao đến:
                    </Text>
                    <div style={{ marginTop: '4px' }}>
                      <Text style={{ fontSize: '13px', display: 'block' }}>
                        {selectedInfo.name} - {selectedInfo.phone_number}
                      </Text>
                      <Text style={{ fontSize: '12px', color: '#666' }}>
                        {selectedInfo.address}
                      </Text>
                    </div>
                  </div>
                );
              })()}
            </div>

            <Divider />

            <div className="order-summary-total-section">
              <Title level={4} className="order-summary-total-label">Tổng cộng:</Title>
              <Title level={4} className="order-summary-total-amount">
                {calculateTotal().toLocaleString()}đ
              </Title>
            </div>

            <Button
              type="primary"
              size="large"
              block
              icon={<CheckCircleOutlined />}
              loading={submitting}
              onClick={handleSubmitOrder}
              disabled={!selectedDeliveryInfo || (paymentMethod === 'online payment')}
              className="order-submit-btn"
            >
              {submitting ? 'Đang xử lý...' : paymentMethod === 'cash payment' ? 'Đặt hàng (COD)' : 'Đặt hàng'}
            </Button>

            {paymentMethod === 'online payment' && (
              <Text type="secondary" style={{ 
                fontSize: '12px', 
                display: 'block', 
                marginTop: '12px', 
                textAlign: 'center',
                color: '#fa8c16'
              }}>
                ⚠️ Vui lòng chọn thanh toán tiền mặt để hoàn tất đơn hàng
              </Text>
            )}

            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '12px', textAlign: 'center' }}>
              Bằng việc đặt hàng, bạn đồng ý với các điều khoản của EcoReMart
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Modal thêm thông tin giao hàng */}
      <Modal
        title={
          <div>
            <PlusOutlined className="delivery-modal-title" />
            Thêm thông tin giao hàng
          </div>
        }
        open={showDeliveryModal}
        onCancel={handleCancelDeliveryModal}
        footer={null}
        width={600}
        centered
        destroyOnClose
      >
        <div className="delivery-modal-content">
          <Alert
            message="Lưu ý quan trọng"
            description={
              <div>
                <p>• Thông tin giao hàng phải chính xác và đầy đủ</p>
                <p>• Địa chỉ sẽ được xác thực bởi hệ thống Mapbox</p>
                <p>• Số điện thoại phải có đúng 10 chữ số</p>
                <p>• Hệ thống sẽ tự động liên kết với tài khoản của bạn</p>
              </div>
            }
            type="info"
            showIcon
            className="delivery-modal-alert"
          />

          <Form
            form={deliveryForm}
            layout="vertical"
            onFinish={handleAddDeliveryInfo}
            requiredMark="optional"
          >
            {/* Name Field */}
            <Form.Item
              label={
                <span>
                  <UserOutlined className="delivery-modal-field-label" />
                  Tên người nhận
                </span>
              }
              name="name"
              rules={[
                { required: true, message: 'Vui lòng nhập tên người nhận!' },
                { min: 2, message: 'Tên phải có ít nhất 2 ký tự!' },
                { max: 45, message: 'Tên không được vượt quá 45 ký tự!' },
                {
                  pattern: /^[a-zA-ZÀ-ỹ\s]+$/,
                  message: 'Tên chỉ được chứa chữ cái và khoảng trắng!'
                }
              ]}
            >
              <Input
                placeholder="Nhập tên người nhận hàng"
                size="large"
                maxLength={45}
                showCount
              />
            </Form.Item>

            {/* Phone Number Field */}
            <Form.Item
              label={
                <span>
                  <PhoneOutlined className="delivery-modal-field-label" />
                  Số điện thoại
                </span>
              }
              name="phone_number"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại!' },
                {
                  pattern: /^(0[3-9])[0-9]{8}$/,
                  message: 'Số điện thoại không hợp lệ! (VD: 0901234567)'
                }
              ]}
            >
              <Input
                placeholder="Nhập số điện thoại (VD: 0901234567)"
                size="large"
                maxLength={10}
                showCount
              />
            </Form.Item>

            {/* Address Field */}
            <Form.Item
              label={
                <span>
                  <EnvironmentOutlined className="delivery-modal-field-label" />
                  Địa chỉ giao hàng
                </span>
              }
              name="address"
              rules={[
                { required: true, message: 'Vui lòng nhập địa chỉ giao hàng!' },
                { min: 15, message: 'Địa chỉ phải có ít nhất 15 ký tự để đảm bảo đầy đủ!' },
                { max: 200, message: 'Địa chỉ không được vượt quá 200 ký tự!' }
              ]}
              extra="Địa chỉ sẽ được xác thực bởi Mapbox để đảm bảo tính chính xác"
            >
              <Input.TextArea
                placeholder="Nhập địa chỉ đầy đủ bao gồm: số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố&#10;VD: 123 Nguyễn Văn Linh, Phường Tân Thuận Đông, Quận 7, TP. Hồ Chí Minh"
                rows={4}
                maxLength={200}
                showCount
              />
            </Form.Item>

            {/* Action Buttons */}
            <Form.Item className="delivery-modal-actions">
              <Button 
                onClick={handleCancelDeliveryModal}
                size="large"
                className="delivery-modal-cancel-btn"
              >
                Hủy bỏ
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={addingDelivery}
                icon={<SaveOutlined />}
                className="delivery-modal-submit-btn"
              >
                {addingDelivery ? 'Đang lưu...' : 'Lưu thông tin'}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default CreateOrder;
