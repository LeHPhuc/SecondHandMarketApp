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
  const [shipFee, setShipFee] = useState(0);
  const [calculatingShipFee, setCalculatingShipFee] = useState(false);
  const [shipFeeError, setShipFeeError] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);
  const [storeInfo, setStoreInfo] = useState(null);

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

  // Function to calculate ship fee - UPDATED
  const calculateShipFeeApi = async (deliveryInfoId, productIds) => {
    if (!deliveryInfoId || !productIds || productIds.length === 0) {
      setShipFee(0);
      setShipFeeError('');
      setDistanceKm(0);
      setStoreInfo(null);
      return;
    }

    // Check if we have delivery info
    const selectedInfo = deliveryInfos.find(info => info.id === deliveryInfoId);
    if (!selectedInfo) {
      setShipFeeError('Không tìm thấy thông tin giao hàng');
      return;
    }

    try {
      setCalculatingShipFee(true);
      setShipFeeError('');

      console.log('🚚 Calculating ship fee with:', {
        delivery_info_id: deliveryInfoId,
        product_id: productIds[0], // Chỉ gửi product đầu tiên
        endpoint: endpoints.calculateShipFee
      });

      // Chỉ gửi 1 product_id thay vì mảng product_ids
      const response = await authAPIs().post(endpoints.calculateShipFee, {
        delivery_info_id: deliveryInfoId,
        product_id: productIds[0] // Chỉ gửi product đầu tiên
      });

      console.log('🚚 Ship fee response:', response.data);

      // Check if response has ship_fee (API trả về {ship_fee: 60742})
      if (response.data && response.data.ship_fee !== undefined) {
        setShipFee(response.data.ship_fee);
        setDistanceKm(response.data.distance_km || 0);
        setStoreInfo({
          name: response.data.store_name || 'Cửa hàng',
          address: response.data.start_address || ''
        });
        setShipFeeError('');
        console.log('✅ Ship fee calculated successfully:', response.data.ship_fee);
      } else {
        throw new Error(response.data.error || 'Không thể tính phí ship');
      }

    } catch (error) {
      console.error('🚚 Ship fee calculation error:', error);
      console.log('🚚 Error response:', error.response?.data);
      console.log('🚚 Error status:', error.response?.status);
      
      setShipFee(0);
      setDistanceKm(0);
      setStoreInfo(null);
      
      let errorMessage = 'Không thể tính phí ship';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('🚚 Final error message:', errorMessage);
      setShipFeeError(errorMessage);
    } finally {
      setCalculatingShipFee(false);
    }
  };

  // Auto calculate ship fee when delivery info or products change
  useEffect(() => {
    if (selectedDeliveryInfo && selectedProducts.length > 0) {
      const productIds = selectedProducts.map(item => item.product.id);
      calculateShipFeeApi(selectedDeliveryInfo, productIds);
    } else {
      // Reset ship fee khi không có đủ thông tin
      setShipFee(0);
      setShipFeeError('');
      setDistanceKm(0);
      setStoreInfo(null);
    }
  }, [selectedDeliveryInfo, selectedProducts]);

  // Handle delivery info change with ship fee recalculation
  const handleDeliveryInfoChange = (value) => {
    setSelectedDeliveryInfo(value);
    // Ship fee sẽ được tính lại trong useEffect
  };

  // Calculate final total with ship fee
  const calculateTotal = () => calculateSubtotal() - calculateDiscount() + shipFee;

  // Handle payment method change
  const handlePaymentMethodChange = (value) => {
    setPaymentMethod(value);
    
    if (value === 'online payment') {
      message.success('Thanh toán online đã sẵn sàng!');
    } else {
      message.info('COD được chọn. Thanh toán khi nhận hàng.');
    }
  };

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

  // ===== PAYOS PAYMENT FUNCTIONS =====
  const createPayOSPayment = async (order) => {
    try {
      const payosEndpoint = endpoints.createPayOSPayment.replace('{id}', order.id);
      const response = await authAPIs().post(payosEndpoint);
      
      if (response.data && response.data.success) {
        // Lưu thông tin PayOS
        localStorage.setItem('current_order_id', order.id);
        localStorage.setItem('payos_order_code', response.data.payos_order_code);
        
        return {
          success: true,
          payment_url: response.data.payment_url,
          qr_code: response.data.qr_code,
          amount: response.data.amount,
          payos_order_code: response.data.payos_order_code,
          expires_in: response.data.expires_in,
          instructions: response.data.instructions
        };
      } else {
        throw new Error(response.data?.error || 'PayOS response không thành công');
      }
    } catch (error) {
      console.error('PayOS API error:', error);
      throw error;
    }
  };

  // ===== HANDLE COD ORDER SUBMISSION =====
  const handleCODOrder = async () => {
    try {
      await form.validateFields();
      
      if (!selectedDeliveryInfo) {
        message.error('Vui lòng chọn địa chỉ giao hàng');
        return;
      }

      setSubmitting(true);

      // Prepare COD order data
      const orderData = {
        items: selectedProducts.map(item => ({
          product: item.product.id,
          quantity: item.quantity
        })),
        delivery_info_id: selectedDeliveryInfo,
        note: orderNote,
        payment_method: 'cash payment' // COD payment
      };

      if (selectedVoucher) {
        orderData.voucher = selectedVoucher;
      }

      // Tạo đơn hàng COD
      const response = await authAPIs().post(endpoints.order, orderData);
      const order = response.data;
      
      modal.success({
        title: 'Đặt hàng thành công!',
        content: (
          <div>
            <p>Đơn hàng của bạn đã được tạo thành công.</p>
            <p>Mã đơn hàng: <strong>{order.order_code}</strong></p>
            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #f0f0f0' }} />
            <div style={{ fontSize: '14px', color: '#666' }}>
              <p>💰 Thanh toán: <strong>COD (Thanh toán khi nhận hàng)</strong></p>
              <p>💵 Tổng tiền: <strong style={{ color: '#f56500' }}>{order.total_cost?.toLocaleString() || calculateTotal().toLocaleString()} VND</strong></p>
              <p>📞 Người bán sẽ liên hệ xác nhận đơn hàng trong thời gian sớm nhất.</p>
            </div>
          </div>
        ),
        onOk: () => {
          navigate('/myorders');
        },
        okText: 'Xem đơn hàng',
        width: 500,
      });

    } catch (error) {
      console.error('COD order creation error:', error);
      let errorMessage = 'Không thể tạo đơn hàng COD';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      }
      
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // ===== HANDLE PAYOS ORDER SUBMISSION =====
  const handlePayOSOrder = async () => {
    try {
      await form.validateFields();
      
      if (!selectedDeliveryInfo) {
        message.error('Vui lòng chọn địa chỉ giao hàng');
        return;
      }

      setSubmitting(true);

      // Prepare PayOS order data
      const orderData = {
        items: selectedProducts.map(item => ({
          product: item.product.id,
          quantity: item.quantity
        })),
        delivery_info_id: selectedDeliveryInfo,
        note: orderNote,
        payment_method: 'online payment' // PayOS payment
      };

      if (selectedVoucher) {
        orderData.voucher = selectedVoucher;
      }

      // 1. TẠO ĐƠN HÀNG TRƯỚC
      const response = await authAPIs().post(endpoints.order, orderData);
      const order = response.data;
      
      // 2. TẠO PAYOS PAYMENT LINK
      const payosResult = await createPayOSPayment(order);
      
      if (payosResult.success && payosResult.payment_url) {
        // Lưu order ID để PaymentSuccess/PaymentCancel sử dụng
        localStorage.setItem('current_order_id', order.id.toString());
        localStorage.setItem('payos_order_code', payosResult.payos_order_code || order.id);
        
        // Hiển thị thông báo
        message.success({
          content: 'Đang chuyển đến trang thanh toán online...',
          duration: 2,
        });
        
        // Redirect đến PayOS
        setTimeout(() => {
          window.location.href = payosResult.payment_url;
        }, 1500);
        
      } else {
        // PayOS thất bại
        localStorage.setItem('current_order_id', order.id.toString());
        localStorage.setItem('payos_order_code', order.id.toString());
        
        message.error({
          content: 'Không thể tạo payment link. Đang chuyển đến trang hủy...',
          duration: 2,
        });
        
        setTimeout(() => {
          window.location.href = `/payment-cancel/${order.id}`;
        }, 1500);
        
        return;
      }

    } catch (error) {
      console.error('PayOS order creation error:', error);
      let errorMessage = 'Không thể tạo đơn hàng thanh toán online';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
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
          <Form form={form} layout="vertical">{/* Form không cần onFinish vì sử dụng onClick cho buttons */}
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
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <BankOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
                          <div>
                            <Text strong style={{ fontSize: '16px' }}>Thanh toán online</Text>
                            <div style={{ marginTop: '4px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                Chuyển khoản qua trang thanh toán online
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
              
              {/* Ship Fee Section - UPDATED */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Text>
                  <ShoppingCartOutlined style={{ marginRight: '4px' }} />
                  Phí vận chuyển:
                  {distanceKm > 0 && (
                    <Text type="secondary" style={{ fontSize: '11px', marginLeft: '4px' }}>
                      (~{distanceKm}km)
                    </Text>
                  )}
                </Text>
                <div style={{ textAlign: 'right' }}>
                  {calculatingShipFee ? (
                    <Spin size="small" />
                  ) : shipFeeError ? (
                    <Text type="danger" style={{ fontSize: '12px' }}>
                      Chưa thể tính
                    </Text>
                  ) : (
                    <Text strong style={{ color: shipFee > 0 ? '#f56500' : '#52c41a' }}>
                      {shipFee > 0 ? `${shipFee.toLocaleString()}đ` : 'Miễn phí'}
                    </Text>
                  )}
                </div>
              </div>

              {/* Ship Fee Error Alert */}
              {shipFeeError && (
                <Alert
                  message="⚠️ Phí vận chuyển"
                  description={shipFeeError}
                  type="warning"
                  size="small"
                  showIcon
                  style={{ marginBottom: '12px', fontSize: '12px' }}
                  action={
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        if (selectedDeliveryInfo && selectedProducts.length > 0) {
                          const productIds = selectedProducts.map(item => item.product.id);
                          calculateShipFeeApi(selectedDeliveryInfo, productIds);
                        }
                      }}
                    >
                      Thử lại
                    </Button>
                  }
                />
              )}

              {/* Shipping Info */}
              {shipFee > 0 && !shipFeeError && storeInfo && (
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#fff7e6', 
                  borderRadius: '6px', 
                  marginBottom: '12px',
                  border: '1px solid #ffd666'
                }}>
                  <Text style={{ fontSize: '12px', color: '#d48806' }}>
                    🚚 Từ <strong>{storeInfo.name}</strong> đến địa chỉ của bạn: <strong>{distanceKm}km</strong>
                  </Text>
                </div>
              )}

              {shipFee === 0 && !calculatingShipFee && !shipFeeError && selectedDeliveryInfo && (
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#f6ffed', 
                  borderRadius: '6px', 
                  marginBottom: '12px',
                  border: '1px solid #b7eb8f'
                }}>
                  <Text style={{ fontSize: '12px', color: '#389e0d' }}>
                    🎉 <strong>Miễn phí vận chuyển!</strong> {distanceKm > 0 && `(Khoảng cách: ${distanceKm}km)`}
                  </Text>
                </div>
              )}
              
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
                      Thanh toán online (PayOS)
                    </>
                  )}
                </Text>
                <div style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px', color: '#666' }}>
                    {paymentMethod === 'cash payment' 
                      ? 'Thanh toán khi nhận hàng'
                      : 'Chuyển khoản qua PayOS'
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

            {/* 2 NÚT THANH TOÁN RIÊNG BIỆT - UPDATED với ship fee validation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paymentMethod === 'cash payment' && (
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<DollarOutlined />}
                  loading={submitting || calculatingShipFee}
                  onClick={handleCODOrder}
                  disabled={!selectedDeliveryInfo || !!shipFeeError}
                  className="order-submit-btn cod-btn"
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  {submitting ? 'Đang tạo đơn hàng...' : 
                   calculatingShipFee ? 'Đang tính phí ship...' : 
                   '💰 Đặt hàng COD'}
                </Button>
              )}
              
              {paymentMethod === 'online payment' && (
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<CreditCardOutlined />}
                  loading={submitting || calculatingShipFee}
                  onClick={handlePayOSOrder}
                  disabled={!selectedDeliveryInfo || !!shipFeeError}
                  className="order-submit-btn payos-btn"
                  style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                >
                  {submitting ? 'Đang tạo đơn hàng...' : 
                   calculatingShipFee ? 'Đang tính phí ship...' : 
                   '💳 Thanh toán online'}
                </Button>
              )}
            </div>

            {/* Payment method info với ship fee */}
            {paymentMethod === 'online payment' && (
              <Alert
                message="💡 Thanh toán online"
                description="Hệ thống sẽ tự động tính hoa hồng khi thanh toán thành công"
                type="info"
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}

            {/* Shipping calculation note */}
            {selectedDeliveryInfo && !shipFeeError && (
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '12px', textAlign: 'center' }}>
                {calculatingShipFee 
                  ? '🔄 Đang tính phí vận chuyển...'
                  : shipFee > 0 
                    ? `💡 Phí ship đã được tính tự động dựa trên khoảng cách ${distanceKm}km` 
                    : '🎉 Miễn phí vận chuyển!'
                }
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
            message="Lưu ý"
            description={
              <div>
                <p>• Thông tin giao hàng phải chính xác và đầy đủ</p>
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