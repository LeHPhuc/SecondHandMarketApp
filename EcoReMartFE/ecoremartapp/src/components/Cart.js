import React, { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Row, Col, Card, Button, Checkbox, InputNumber, Image, Avatar,
  Empty, Spin, Divider, Typography, Space, App
} from "antd";
import {
  ShoppingCartOutlined, DeleteOutlined, PlusOutlined, MinusOutlined,
  ShopOutlined, ArrowLeftOutlined, CreditCardOutlined
} from "@ant-design/icons";
import { endpoints, authAPIs } from "../configs/APIs";
import { MyUserContext } from "../configs/Context";
import "../css/Cart.css";

const { Title, Text } = Typography;

const Cart = () => {
  const { message, modal } = App.useApp(); // Thêm modal từ App context
  const navigate = useNavigate();
  const user = useContext(MyUserContext);
  
  const [cartData, setCartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [updating, setUpdating] = useState({});

  const isLoggedIn = user !== null && user !== undefined && Object.keys(user || {}).length > 0;

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadCart();
  }, [isLoggedIn]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await authAPIs().get(endpoints.mycart);
      setCartData(response.data || []);
    } catch (error) {
      console.error("Error loading cart:", error);
      message.error("Không thể tải giỏ hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (productId, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, productId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== productId));
    }
  };

  const handleSelectStore = (storeProducts, checked) => {
    const productIds = storeProducts.map(item => item.product.id);
    if (checked) {
      const newSelected = [...new Set([...selectedItems, ...productIds])];
      setSelectedItems(newSelected);
    } else {
      setSelectedItems(selectedItems.filter(id => !productIds.includes(id)));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allProductIds = cartData.flatMap(store => 
        store.products.map(item => item.product.id)
      );
      setSelectedItems(allProductIds);
    } else {
      setSelectedItems([]);
    }
  };

  const updateQuantity = async (productId, action) => {
    setUpdating(prev => ({ ...prev, [productId]: true }));
    
    try {
      if (action === 'increase') {
        await authAPIs().patch(endpoints.addquantityproductcart, {
          product_id: productId,
          quantity: 1
        });

        setCartData(prevData => 
          prevData.map(store => ({
            ...store,
            products: store.products.map(item => 
              item.product.id === productId 
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          }))
        );

        message.success("Đã tăng số lượng");

      } else if (action === 'decrease') {
        const currentItem = cartData
          .flatMap(store => store.products)
          .find(item => item.product.id === productId);

        if (currentItem && currentItem.quantity <= 1) {
          removeFromCart(productId);
          return;
        }

        await authAPIs().patch(endpoints.addquantityproductcart, {
          product_id: productId,
          quantity: -1
        });

        setCartData(prevData => 
          prevData.map(store => ({
            ...store,
            products: store.products.map(item => 
              item.product.id === productId 
                ? { ...item, quantity: item.quantity - 1 }
                : item
            )
          }))
        );

        message.success("Đã giảm số lượng");
      }

    } catch (error) {
      const errorMsg = error.response?.data?.error;
      
      if (errorMsg === "Số lượng vượt quá giới hạn sẵn có.") {
        message.warning("Đã đạt số lượng tối đa");
      } else if (errorMsg === "Sản phẩm không tồn tại.") {
        message.error("Sản phẩm không tồn tại");
        loadCart();
      } else if (errorMsg === "Sản phẩm chưa có trong giỏ hàng.") {
        message.error("Sản phẩm không có trong giỏ hàng");
        loadCart();
      } else if (errorMsg) {
        message.error(errorMsg);
      } else {
        message.error("Không thể cập nhật số lượng");
      }
    } finally {
      setUpdating(prev => ({ ...prev, [productId]: false }));
    }
  };

  const removeFromCart = async (productIds) => {
    const idsArray = Array.isArray(productIds) ? productIds : [productIds];
    const productCount = idsArray.length;
    const isMultiple = productCount > 1;
    
    modal.confirm({
      title: isMultiple ? "Xóa nhiều sản phẩm" : "Xóa sản phẩm",
      content: isMultiple 
        ? `Bạn có chắc muốn xóa ${productCount} sản phẩm được chọn khỏi giỏ hàng?`
        : "Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?",
      okText: "Xóa",
      cancelText: "Hủy",
      okType: "danger",
      onOk: async () => {
        try {
          const response = await authAPIs().delete(endpoints.deleteproductcart, {
            data: {
              product_ids: idsArray
            }
          });
          
          setCartData(prevData => 
            prevData.map(store => ({
              ...store,
              products: store.products.filter(item => !idsArray.includes(item.product.id))
            })).filter(store => store.products.length > 0)
          );

          setSelectedItems(selectedItems.filter(id => !idsArray.includes(id)));
          
          if (response.data.message) {
            message.success(response.data.message);
          } else {
            message.success(isMultiple 
              ? `Đã xóa ${productCount} sản phẩm khỏi giỏ hàng`
              : "Đã xóa sản phẩm khỏi giỏ hàng"
            );
          }
          
        } catch (error) {
          console.error("Error removing from cart:", error);
          const errorMsg = error.response?.data?.error;
          
          if (errorMsg === "Yêu cầu danh sách product_ids là một mảng.") {
            message.error("Dữ liệu không hợp lệ");
          } else if (errorMsg) {
            message.error(errorMsg);
          } else {
            message.error("Không thể xóa sản phẩm");
          }
        }
      }
    });
  };

  const removeSelectedItems = () => {
    if (selectedItems.length === 0) {
      message.warning("Vui lòng chọn sản phẩm để xóa");
      return;
    }
    
    removeFromCart(selectedItems);
  };

  const calculateTotal = () => {
    let total = 0;
    cartData.forEach(store => {
      store.products.forEach(item => {
        if (selectedItems.includes(item.product.id)) {
          total += parseFloat(item.product.price) * item.quantity;
        }
      });
    });
    return total;
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      message.warning("Vui lòng chọn sản phẩm để thanh toán");
      return;
    }

    const selectedProducts = cartData.flatMap(store => 
      store.products.filter(item => selectedItems.includes(item.product.id))
    );

    navigate('/CreateOrder', { state: { selectedProducts } });
  };

  if (loading) {
    return (
      <div className="cart-loading">
        <Spin size="large" />
        <p>Đang tải giỏ hàng...</p>
      </div>
    );
  }

  if (!cartData.length) {
    return (
      <div className="cart-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Title level={4}>Giỏ hàng trống</Title>
              <Text type="secondary">Hãy thêm sản phẩm vào giỏ hàng để bắt đầu mua sắm</Text>
            </div>
          }
        >
          <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => navigate('/')}>
            Tiếp tục mua sắm
          </Button>
        </Empty>
      </div>
    );
  }

  const totalItems = cartData.reduce((sum, store) => 
    sum + store.products.reduce((storeSum, item) => storeSum + item.quantity, 0), 0
  );

  const allProductIds = cartData.flatMap(store => 
    store.products.map(item => item.product.id)
  );

  return (
    <div className="cart-container">
      {/* Header */}
      <div className="cart-header">
        <div className="cart-title">
          <Link to="/" className="back-btn">
            <ArrowLeftOutlined /> Quay lại
          </Link>
          <Title level={2}>
            <ShoppingCartOutlined /> Giỏ hàng ({totalItems} sản phẩm)
          </Title>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Cart Items */}
        <Col xs={24} lg={16}>
          <Card className="cart-items-card">
            {/* Select All */}
            <div className="select-all-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Checkbox
                  checked={selectedItems.length === allProductIds.length && allProductIds.length > 0}
                  indeterminate={selectedItems.length > 0 && selectedItems.length < allProductIds.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                >
                  Chọn tất cả ({allProductIds.length} sản phẩm)
                </Checkbox>
                
                {selectedItems.length > 0 && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={removeSelectedItems}
                    style={{ marginLeft: 'auto' }}
                  >
                    Xóa đã chọn ({selectedItems.length})
                  </Button>
                )}
              </div>
            </div>

            <Divider />

            {/* Cart Items by Store */}
            {cartData.map((storeData, storeIndex) => {
              const storeProductIds = storeData.products.map(item => item.product.id);
              const storeSelectedCount = storeProductIds.filter(id => selectedItems.includes(id)).length;
              
              return (
                <div key={storeData.store.id} className="store-section">
                  {/* Store Header */}
                  <div className="store-header">
                    <Checkbox
                      checked={storeSelectedCount === storeProductIds.length && storeProductIds.length > 0}
                      indeterminate={storeSelectedCount > 0 && storeSelectedCount < storeProductIds.length}
                      onChange={(e) => handleSelectStore(storeData.products, e.target.checked)}
                    >
                      <Space>
                        <Avatar src={storeData.store.avatar} size={24} />
                        <Text strong>{storeData.store.name}</Text>
                      </Space>
                    </Checkbox>
                  </div>

                  {/* Store Products */}
                  {storeData.products.map((item) => (
                    <div key={item.product.id} className="cart-item">
                      <div className="item-checkbox">
                        <Checkbox
                          checked={selectedItems.includes(item.product.id)}
                          onChange={(e) => handleSelectItem(item.product.id, e.target.checked)}
                        />
                      </div>

                      <div className="item-image">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          width={80}
                          height={80}
                          style={{ borderRadius: '8px', objectFit: 'cover' }}
                        />
                      </div>

                      <div className="item-info">
                        <Link to={`/product/${item.product.id}`} className="item-name">
                          <Text strong>{item.product.name}</Text>
                        </Link>
                        <Text type="secondary">Còn lại: {item.product.available_quantity}</Text>
                        <div className="item-price">
                          <Text strong style={{ color: '#ff6b35', fontSize: '16px' }}>
                            {Number(item.product.price).toLocaleString()}đ
                          </Text>
                        </div>
                      </div>

                      <div className="item-quantity">
                        <div className="quantity-controls">
                          <Button
                            size="small"
                            icon={<MinusOutlined />}
                            onClick={() => updateQuantity(item.product.id, 'decrease')}
                            disabled={updating[item.product.id]}
                          />
                          <span style={{ 
                            display: 'inline-block', 
                            width: '60px', 
                            textAlign: 'center',
                            margin: '0 8px',
                            fontSize: '16px',
                            fontWeight: 500,
                            border: '1px solid #d9d9d9',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            background: '#fafafa'
                          }}>
                            {item.quantity}
                          </span>
                          <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => updateQuantity(item.product.id, 'increase')}
                            disabled={item.quantity >= item.product.available_quantity || updating[item.product.id]}
                          />
                        </div>
                      </div>

                      <div className="item-total">
                        <Text strong style={{ color: '#ff6b35', fontSize: '16px' }}>
                          {(Number(item.product.price) * item.quantity).toLocaleString()}đ
                        </Text>
                      </div>

                      <div className="item-actions">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </div>
                  ))}

                  {storeIndex < cartData.length - 1 && <Divider />}
                </div>
              );
            })}
          </Card>
        </Col>

        {/* Checkout Summary */}
        <Col xs={24} lg={8}>
          <Card className="checkout-summary" style={{ position: 'sticky', top: '20px' }}>
            <Title level={4}>Tóm tắt đơn hàng</Title>
            
            <div className="summary-row">
              <Text>Sản phẩm đã chọn:</Text>
              <Text strong>{selectedItems.length}</Text>
            </div>

            <div className="summary-row">
              <Text>Tạm tính:</Text>
              <Text strong style={{ color: '#ff6b35' }}>
                {calculateTotal().toLocaleString()}đ
              </Text>
            </div>

            <Divider />

            <div className="summary-row">
              <Title level={4}>Tổng cộng:</Title>
              <Title level={4} style={{ color: '#ff6b35', margin: 0 }}>
                {calculateTotal().toLocaleString()}đ
              </Title>
            </div>

            <Button
              type="primary"
              size="large"
              block
              icon={<CreditCardOutlined />}
              onClick={handleCheckout}
              disabled={selectedItems.length === 0}
              style={{
                background: '#ff6b35',
                borderColor: '#ff6b35',
                marginTop: '16px',
                height: '48px',
                fontSize: '16px',
                fontWeight: 600
              }}
            >
              Thanh toán ({selectedItems.length})
            </Button>

            <Button
              type="default"
              size="large"
              block
              icon={<ShoppingCartOutlined />}
              onClick={() => navigate('/')}
              style={{ marginTop: '12px', height: '40px' }}
            >
              Tiếp tục mua sắm
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Cart;