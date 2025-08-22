import React, { useState, useEffect, useContext } from 'react';
import { 
  Tabs, Card, Table, Tag, Button, Space, Descriptions, Divider, Avatar, 
  App, Input, Row, Col, Modal, Typography, Image
} from 'antd';
import { 
  EyeOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, 
  CheckOutlined, CloseOutlined, SearchOutlined, ClearOutlined, ShopOutlined,
  LinkOutlined, LeftOutlined, RightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPIs, endpoints } from '../configs/APIs';
import { MyUserContext } from '../configs/Context';

const { TabPane } = Tabs;
const { Search } = Input;
const { Text } = Typography;

const MyOrders = () => {
  const navigate = useNavigate();
  const user = useContext(MyUserContext);
  const { message: messageApi, modal } = App.useApp();
  
  // States
  const [orders, setOrders] = useState([]);
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  // Pagination states - giống như Home.js
  const [page, setPage] = useState(1);
  const [next, setNext] = useState(false);
  const [previous, setPrevious] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Kiểm tra đăng nhập
  useEffect(() => {
    if (!user || Object.keys(user).length === 0) {
      navigate('/');
      return;
    }
    loadOrderStatuses();
  }, [user, navigate, messageApi]);

  // Load orders khi tab, page hoặc search thay đổi - giống Home.js
  useEffect(() => {
    if (user && Object.keys(user).length > 0) {
      loadOrders();
    }
  }, [activeTab, page, searchValue]);

  // API calls
  const loadOrderStatuses = async () => {
    try {
      const response = await authAPIs().get(endpoints.ordersstatus);
      setOrderStatuses(response.data || []);
    } catch (error) {
      handleApiError(error, "Không thể tải trạng thái đơn hàng");
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      let url = `${endpoints.myorders}?page=${page}`;
      
      // Thêm filter theo status nếu không phải tab "all"
      const statusId = activeTab === 'all' ? null : parseInt(activeTab);
      if (statusId) {
        url += `&status=${statusId}`;
      }
      
      // Thêm search nếu có
      if (searchValue.trim()) {
        url += `&search=${encodeURIComponent(searchValue.trim())}`;
      }
      
      const response = await authAPIs().get(url);
      const data = response.data;
      
      console.log('Load orders response:', { page, activeTab, searchValue, data });
      
      // Xử lý response giống Home.js
      setOrders(Array.isArray(data.results) ? data.results : []);
      setNext(data.next !== null);
      setPrevious(data.previous !== null);
      setTotalCount(data.count || 0);
      
    } catch (error) {
      handleApiError(error, "Không thể tải đơn hàng");
      setOrders([]);
      setNext(false);
      setPrevious(false);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const doUpdateOrderStatus = async (orderId, statusId) => {
    try {
      const url = endpoints.updatecustomerorderstatus.replace('{id}', orderId);
      const response = await authAPIs().patch(url, { order_status: statusId });

      const statusName = orderStatuses.find(s => s.id === statusId)?.status_name;
      messageApi.success(response.data.message || `Đã cập nhật trạng thái đơn hàng thành "${statusName}"`);
      
      // Reload current data
      loadOrders();
    } catch (error) {
      handleApiError(error, "Không thể cập nhật trạng thái đơn hàng");
    }
  };

  // Handle search - giống Home.js, reset về trang 1
  // Helper functions
  const handleApiError = (error, defaultMessage) => {
    console.error("API Error:", error);
    if (error.response?.status === 401) {
      messageApi.error("Phiên đăng nhập hết hạn");
      setTimeout(() => navigate('/'), 1500);
      return;
    }
    const errorMsg = error.response?.data?.detail || error.response?.data?.message;
    messageApi.error(errorMsg || defaultMessage);
  };

  // Handle search - giống Home.js, reset về trang 1
  const handleSearch = (value) => {
    setSearchValue(value);
    setPage(1); // Reset về trang 1 khi search
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1); // Reset về trang 1 khi đổi tab
    setSearchValue(''); // Clear search khi đổi tab
  };

  const handleViewProduct = (productId) => {
    const productUrl = endpoints.productDetail.replace('{id}', productId);
    window.open(productUrl, '_blank');
  };

  const calculateSubtotal = (order) => {
    if (!order.items) return 0;
    return order.items.reduce((total, item) => 
      total + (Number(item.product?.price || 0) * (item.quantity || 0)), 0
    );
  };

  const getAvailableActionsForCustomer = (currentStatus) => {
    const statusObj = orderStatuses.find(s => s.status_name === currentStatus);
    if (!statusObj) return [];

    const actions = {
      1: [{ id: 4, name: "Yêu cầu huỷ đơn hàng", color: "red", action: "cancel_request" }],
      2: [{ id: 4, name: "Yêu cầu huỷ đơn hàng", color: "red", action: "cancel_request" }],
      3: [{ id: 6, name: "Xác nhận đã nhận hàng", color: "green", action: "complete" }]
    };
    
    return actions[statusObj.id] || [];
  };

  const showConfirmModal = (order, statusId, statusInfo) => {
    const actionText = {
      'cancel_request': 'yêu cầu huỷ đơn hàng',
      'complete': 'xác nhận đã nhận hàng'
    }[statusInfo.action] || 'cập nhật trạng thái';

    modal.confirm({
      title: 'Xác nhận cập nhật trạng thái',
      content: (
        <div>
          <p><strong>Đơn hàng:</strong> {order.order_code}</p>
          <p><strong>Cửa hàng:</strong> {order.store_name}</p>
          <p><strong>Hành động:</strong> {actionText}</p>
          <p><strong>Trạng thái mới:</strong> <Tag color={statusInfo.color}>{statusInfo.name}</Tag></p>
        </div>
      ),
      onOk: () => doUpdateOrderStatus(order.id, statusId),
      okText: statusInfo.action === 'complete' ? 'Xác nhận' : 'Gửi yêu cầu',
      cancelText: 'Hủy',
      okButtonProps: {
        type: statusInfo.action === 'complete' ? 'primary' : 'default',
        style: statusInfo.action === 'cancel_request' ? {
          backgroundColor: '#ff4d4f',
          borderColor: '#ff4d4f',
          color: 'white'
        } : undefined
      }
    });
  };

  const getStatusColor = (statusName) => {
    const status = orderStatuses.find(s => s.status_name === statusName);
    const colorMap = {
      1: 'orange', 2: 'blue', 3: 'cyan', 4: 'purple', 5: 'red', 6: 'green'
    };
    return colorMap[status?.id] || 'default';
  };

  const renderActionButton = (record) => {
    const availableActions = getAvailableActionsForCustomer(record.order_status);
    
    if (availableActions.length === 0) {
      return <Tag color="default">Không thể thao tác</Tag>;
    }

    return availableActions.map(action => (
      <Button 
        key={action.id}
        type={action.action === 'complete' ? 'primary' : 'default'}
        size="small" 
        icon={action.action === 'complete' ? <CheckOutlined /> : <CloseOutlined />}
        onClick={() => showConfirmModal(record, action.id, action)}
        style={{ 
          backgroundColor: action.action === 'cancel_request' ? '#ff4d4f' : undefined,
          borderColor: action.action === 'cancel_request' ? '#ff4d4f' : undefined,
          color: action.action === 'cancel_request' ? 'white' : undefined,
          marginRight: 8
        }}
      >
        {action.action === 'cancel_request' ? 'Yêu cầu huỷ' : 'Đã nhận hàng'}
      </Button>
    ));
  };

  // Table columns
  const columns = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'order_code',
      key: 'order_code',
      width: 150,
      render: (code) => <strong style={{ color: '#1890ff' }}>{code}</strong>
    },
    {
      title: 'Cửa hàng',
      key: 'store',
      width: 150,
      render: (record) => (
        <Space>
          <Avatar icon={<ShopOutlined />} size="small" />
          <span>{record.store_name || 'N/A'}</span>
        </Space>
      )
    },
    {
      title: 'Sản phẩm',
      key: 'products',
      width: 120,
      render: (record) => <Text>{record.items?.length || 0} sản phẩm</Text>
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 120,
      align: 'right',
      render: (amount) => (
        <strong style={{ color: '#52c41a' }}>
          {Number(amount).toLocaleString()}đ
        </strong>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'order_status',
      key: 'order_status',
      width: 150,
      render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedOrder(record);
              setOrderDetailVisible(true);
            }}
          >
            Xem chi tiết
          </Button>
          {renderActionButton(record)}
        </Space>
      ),
    },
  ];

  const renderOrderSummary = () => {
    if (!selectedOrder) return null;
    
    const subtotal = calculateSubtotal(selectedOrder);
    const shipFee = Number(selectedOrder.ship_fee || 0);
    const totalCost = Number(selectedOrder.total_cost);
    const beforeDiscount = subtotal + shipFee;
    const discountAmount = beforeDiscount - totalCost;
    const discountPercent = beforeDiscount > 0 ? (discountAmount / beforeDiscount) * 100 : 0;

    return (
      <Row justify="end">
        <Col span={8}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row justify="space-between">
              <Text>Tạm tính:</Text>
              <Text>{subtotal.toLocaleString()}đ</Text>
            </Row>
            <Row justify="space-between">
              <Text>Phí ship:</Text>
              <Text type="warning">{shipFee.toLocaleString()}đ</Text>
            </Row>
            {selectedOrder.voucher_code && discountAmount > 0 && (
              <Row justify="space-between">
                <Text>Giảm giá ({selectedOrder.voucher_code}):</Text>
                <Text type="success">
                  -{discountPercent.toFixed(1)}% (-{discountAmount.toLocaleString()}đ)
                </Text>
              </Row>
            )}
            <Divider style={{ margin: '8px 0' }} />
            <Row justify="space-between">
              <Text strong style={{ fontSize: '16px' }}>Tổng cộng:</Text>
              <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                {totalCost.toLocaleString()}đ
              </Text>
            </Row>
          </Space>
        </Col>
      </Row>
    );
  };

  return (
    <div className="my-orders">
      {/* Search Section */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="Tìm kiếm theo mã đơn hàng hoặc tên cửa hàng..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={handleSearch}
              style={{ maxWidth: 400 }}
              allowClear
              enterButton={<SearchOutlined />}
            />
          </Col>
          {searchValue && (
            <Col>
              <Button 
                icon={<ClearOutlined />} 
                onClick={() => handleSearch('')}
              >
                Xóa bộ lọc
              </Button>
            </Col>
          )}
        </Row>
        
        {/* Thông tin phân trang */}
        <div style={{ marginTop: 8, color: '#666', fontSize: '13px' }}>
          <div>Trang {page} • Tổng cộng {totalCount} đơn hàng</div>
          {searchValue && (
            <div>Đang tìm kiếm: "{searchValue}"</div>
          )}
        </div>
      </Card>

      {/* Orders Table with Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane tab="Tất cả đơn hàng" key="all">
            <Table
              dataSource={orders}
              columns={columns}
              loading={loading}
              rowKey="id"
              pagination={false} // Không dùng pagination của Table
              scroll={{ x: 1000 }}
              size="middle"
            />
            
            {/* Custom Pagination - chỉ có mũi tên */}
            {(previous || next) && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                marginTop: 24,
                gap: 16
              }}>
                <Button 
                  icon={<LeftOutlined />}
                  onClick={() => setPage(page - 1)}
                  disabled={loading || !previous}
                  size="large"
                  shape="circle"
                />
                <span style={{ color: '#666', fontWeight: 500, fontSize: '14px' }}>
                  {page}
                </span>
                <Button 
                  icon={<RightOutlined />}
                  onClick={() => setPage(page + 1)}
                  disabled={loading || !next}
                  size="large"
                  shape="circle"
                />
              </div>
            )}
          </TabPane>
          
          {orderStatuses.map((status) => (
            <TabPane 
              tab={status.status_name}
              key={status.id.toString()}
            >
              <Table
                dataSource={orders}
                columns={columns}
                loading={loading}
                rowKey="id"
                pagination={false} // Không dùng pagination của Table
                scroll={{ x: 1000 }}
                size="middle"
              />
              
              {/* Custom Pagination - chỉ có mũi tên */}
              {(previous || next) && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  marginTop: 24,
                  gap: 16
                }}>
                  <Button 
                    icon={<LeftOutlined />}
                    onClick={() => setPage(page - 1)}
                    disabled={loading || !previous}
                    size="large"
                    shape="circle"
                  />
                  <span style={{ color: '#666', fontWeight: 500, fontSize: '14px' }}>
                    {page}
                  </span>
                  <Button 
                    icon={<RightOutlined />}
                    onClick={() => setPage(page + 1)}
                    disabled={loading || !next}
                    size="large"
                    shape="circle"
                  />
                </div>
              )}
            </TabPane>
          ))}
        </Tabs>
      </Card>

      {/* Order Detail Modal */}
      <Modal
        title={`Chi tiết đơn hàng ${selectedOrder?.order_code}`}
        open={orderDetailVisible}
        onCancel={() => setOrderDetailVisible(false)}
        footer={null}
        width={900}
      >
        {selectedOrder && (
          <div>
            <Descriptions title="Thông tin đơn hàng" bordered column={2} size="small">
              <Descriptions.Item label="Mã đơn hàng">{selectedOrder.order_code}</Descriptions.Item>
              <Descriptions.Item label="Ngày đặt">
                {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
              </Descriptions.Item>
              <Descriptions.Item label="Cửa hàng">
                <Space>
                  <ShopOutlined />
                  {selectedOrder.store_name}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={getStatusColor(selectedOrder.order_status)}>
                  {selectedOrder.order_status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức thanh toán">
                <Tag color={selectedOrder.payment_method === 'online payment' ? 'blue' : 'orange'}>
                  {selectedOrder.payment_method === 'online payment' ? 'Thanh toán online' : 'Tiền mặt'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Phí ship">
                <Text type="warning">
                  {Number(selectedOrder.ship_fee || 0).toLocaleString()}đ
                </Text>
              </Descriptions.Item>
              {selectedOrder.voucher_code && (
                <Descriptions.Item label="Voucher" span={2}>
                  <Tag color="green">{selectedOrder.voucher_code}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Tổng tiền" span={2}>
                <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                  {Number(selectedOrder.total_cost).toLocaleString()}đ
                </Text>
              </Descriptions.Item>
              {selectedOrder.note && (
                <Descriptions.Item label="Ghi chú" span={2}>
                  <Text italic>{selectedOrder.note}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            {/* Delivery Information */}
            {selectedOrder.delivery_info && (
              <>
                <Descriptions title="Thông tin giao hàng" bordered column={1} size="small">
                  <Descriptions.Item label="Người nhận">
                    <Space>
                      <UserOutlined />
                      <Text strong>{selectedOrder.delivery_info.name}</Text>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">
                    <Space>
                      <PhoneOutlined />
                      <Text copyable>{selectedOrder.delivery_info.phone_number}</Text>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ">
                    <Space>
                      <EnvironmentOutlined />
                      <Text>{selectedOrder.delivery_info.address}</Text>
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
                <Divider />
              </>
            )}

            {/* Order Items */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: '16px' }}>
                Sản phẩm đã đặt ({selectedOrder.items?.length || 0} sản phẩm):
              </Text>
            </div>
            <Table
              dataSource={selectedOrder.items || []}
              columns={[
                {
                  title: 'Hình ảnh',
                  key: 'image',
                  width: 80,
                  render: (_, record) => (
                    <Image
                      width={60}
                      height={60}
                      src={record.product?.image}
                      alt={record.product?.name}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+1WmtxshHfTurmvJYjIJSGWkiJ7QCJ7Q6Q2O4AiS0HkNhyAIl1KGHFBiVgO0JiO8AJcQW2A5u6k9lJnPGvpz/e0u6b5uvPxGj6HfHgCCf8vVLOr3O/a87vNv3vEuiVEtT8Z/sffxAGIgAhDBAgQoBAEhEEBAE="
                    />
                  ),
                },
                {
                  title: 'Tên sản phẩm',
                  key: 'product_name',
                  render: (_, record) => (
                    <Space direction="vertical" size={4}>
                      <Button
                        type="link"
                        icon={<LinkOutlined />}
                        onClick={() => handleViewProduct(record.product?.id)}
                        style={{ padding: 0, height: 'auto', textAlign: 'left' }}
                      >
                        <Text strong>{record.product?.name}</Text>
                      </Button>
                      <Text type="secondary">
                        Cửa hàng: {record.product?.store?.name}
                      </Text>
                    </Space>
                  ),
                },
                {
                  title: 'Số lượng',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  align: 'center',
                  width: 100,
                  render: (quantity) => <Tag color="blue">{quantity}</Tag>
                },
                {
                  title: 'Đơn giá',
                  key: 'price',
                  render: (_, record) => (
                    <Text>{Number(record.product?.price || 0).toLocaleString()}đ</Text>
                  ),
                  align: 'right',
                  width: 120,
                },
                {
                  title: 'Thành tiền',
                  key: 'total',
                  render: (_, record) => (
                    <Text strong style={{ color: '#52c41a' }}>
                      {(Number(record.product?.price || 0) * (record.quantity || 0)).toLocaleString()}đ
                    </Text>
                  ),
                  align: 'right',
                  width: 120,
                },
              ]}
              pagination={false}
              size="small"
              rowKey={(record) => `${selectedOrder.id}-${record.product?.id}`}
              scroll={{ x: 600 }}
            />

            <Divider />
            {renderOrderSummary()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyOrders;