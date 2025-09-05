// StoreOrders.js
import React, { useState, useEffect, useContext } from 'react';
import {
    Tabs, Card, Table, Tag, Button, Space, Descriptions, Divider, Avatar,
    App, Input, Row, Col, Modal, Image, Typography, Alert
} from 'antd';
import {
    EyeOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined,
    CheckOutlined, CloseOutlined, SearchOutlined, ClearOutlined,
    ShoppingOutlined, GiftOutlined, TruckOutlined, LinkOutlined
} from '@ant-design/icons';
import { authAPIs, endpoints } from '../configs/APIs';
import { useNavigate } from 'react-router-dom';
import { MyUserContext } from '../configs/Context';
import '../css/StoreOrders.css';

const { TabPane } = Tabs;
const { Search } = Input;
const { Title, Text } = Typography;

/**
 * Component quản lý đơn hàng của cửa hàng
 * Hiển thị danh sách đơn hàng, chi tiết đơn hàng và cập nhật trạng thái
 */
const StoreOrders = () => {
    // Hooks và state management
    const { message: messageApi, modal } = App.useApp();
    const navigate = useNavigate();
    const user = useContext(MyUserContext);
    const isLoggedIn = user && Object.keys(user).length > 0;
    
    // State quản lý dữ liệu
    const [orders, setOrders] = useState([]);
    const [orderStatuses, setOrderStatuses] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    
    // State quản lý UI
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetailVisible, setOrderDetailVisible] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    
    // State quản lý phân trang
    const [pagination, setPagination] = useState({
        current: 1,
        total: 0,
        pageSize: null, // Sẽ được set từ backend
        showSizeChanger: false, // Tắt tùy chọn thay đổi page size
        showQuickJumper: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn hàng`,
    });

    /**
     * Effect: Kiểm tra đăng nhập và tải dữ liệu ban đầu
     */
    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }
        console.log('Component mounted, loading initial data...');
        loadOrderStatuses();
        loadOrders(); // Load dữ liệu với cấu hình mặc định từ backend
    }, [isLoggedIn, navigate]);

    /**
     * Effect: Debug pagination state  
     */
    useEffect(() => {
        console.log('Pagination state updated:', pagination);
        console.log('Orders length:', orders.length);
        console.log('Filtered orders length:', filteredOrders.length);
        
        // Chỉ validate pagination khi có dữ liệu hợp lệ và không đang loading
        if (!loading && pagination.total > 0 && pagination.pageSize > 0) {
            const maxPages = Math.ceil(pagination.total / pagination.pageSize);
            if (pagination.current > maxPages) {
                console.warn(`Current page ${pagination.current} > max pages ${maxPages}, should be adjusted by loadOrders`);
                // Không tự động điều chỉnh ở đây để tránh vòng lặp, để loadOrders xử lý
            }
        }
    }, [pagination, orders.length, filteredOrders.length, loading]);

    /**
     * Effect: Tải lại dữ liệu khi thay đổi tìm kiếm
     */
    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            console.log(`Search effect triggered: "${searchValue}"`);
            if (searchValue.trim()) {
                // Reset về trang 1 khi tìm kiếm
                setPagination(prev => ({ ...prev, current: 1, total: 0 }));
                loadOrders(activeTab === 'all' ? null : parseInt(activeTab), 1, searchValue.trim());
            } else {
                // Load lại dữ liệu không có search, reset về trang 1
                setPagination(prev => ({ ...prev, current: 1, total: 0 }));
                loadOrders(activeTab === 'all' ? null : parseInt(activeTab), 1);
            }
        }, 500); // Debounce 500ms

        return () => clearTimeout(delayedSearch);
    }, [searchValue, activeTab]); // Thêm activeTab vào dependency

    /**
     * Tải danh sách trạng thái đơn hàng
     */
    const loadOrderStatuses = async () => {
        try {
            const response = await authAPIs().get(endpoints.ordersstatus);
            setOrderStatuses(response.data || []);
        } catch (error) {
            console.error("Error loading order statuses:", error);
            messageApi.error("Không thể tải trạng thái đơn hàng");
        }
    };

    /**
     * Tải danh sách đơn hàng theo trạng thái với phân trang
     * @param {number|null} statusId - ID trạng thái (null = tất cả)
     * @param {number} page - Trang hiện tại
     * @param {string} search - Từ khóa tìm kiếm
     */
    const loadOrders = async (statusId = null, page = 1, search = '') => {
        try {
            setLoading(true);
            
            // Xây dựng URL với các tham số phân trang
            const params = new URLSearchParams();
            
            if (statusId) params.append('status', statusId);
            if (page > 1) params.append('page', page); // Chỉ thêm page nếu > 1
            if (search) params.append('search', search);
            
            const url = `${endpoints.storeorders}${params.toString() ? `?${params.toString()}` : ''}`;
            console.log('Loading orders with URL:', url); // Debug log
            
            const response = await authAPIs().get(url);
            console.log('API Response:', response.data); // Debug log
            
            const data = response.data;
            
            // Xử lý response từ Django REST Framework pagination
            if (data && typeof data === 'object' && data.results) {
                // Response có phân trang theo chuẩn DRF
                setOrders(data.results);
                setFilteredOrders(data.results);
                
                const totalCount = data.count || 0;
                const resultsLength = data.results.length;
                
                // Tính pageSize dựa trên thông tin từ response
                let actualPageSize = pagination.pageSize;
                
                if (!actualPageSize) {
                    // Lần đầu tiên, tính pageSize từ trang đầu
                    if (page === 1 && resultsLength > 0) {
                        actualPageSize = resultsLength;
                    } else {
                        // Fallback nếu không thể xác định
                        actualPageSize = 10;
                    }
                } else if (page === 1 && resultsLength > 0 && resultsLength !== actualPageSize) {
                    // Cập nhật pageSize nếu phát hiện thay đổi từ backend
                    actualPageSize = resultsLength;
                }
                
                // Đảm bảo current page không vượt quá số trang thực tế
                const maxPages = totalCount > 0 ? Math.ceil(totalCount / actualPageSize) : 1;
                
                // Kiểm tra nếu trang yêu cầu vượt quá số trang thực tế
                if (page > maxPages && maxPages > 0) {
                    console.warn(`Requested page ${page} exceeds max pages ${maxPages}, redirecting to page ${maxPages}`);
                    // Gọi lại với trang cuối cùng hợp lệ
                    loadOrders(statusId, maxPages, search);
                    return;
                }
                
                const safePage = Math.min(page, maxPages);
                
                setPagination(prev => ({
                    ...prev,
                    current: safePage,
                    pageSize: actualPageSize,
                    total: totalCount,
                }));
                
                console.log('Paginated data loaded:', {
                    count: totalCount,
                    requestedPage: page,
                    safePage: safePage,
                    maxPages: maxPages,
                    actualPageSize: actualPageSize,
                    resultsLength: resultsLength,
                    isLastPage: page === maxPages,
                    expectedItemsOnLastPage: totalCount % actualPageSize || actualPageSize
                });
                
                // Nếu page được điều chỉnh, cần cập nhật URL
                if (safePage !== page && totalCount > 0) {
                    console.log(`Page adjusted from ${page} to ${safePage}`);
                }
            } else {
                // Response đơn giản (array) - fallback
                const ordersArray = Array.isArray(data) ? data : [];
                setOrders(ordersArray);
                setFilteredOrders(ordersArray);
                setPagination(prev => ({
                    ...prev,
                    current: 1,
                    total: ordersArray.length,
                }));
                console.log('Simple array data loaded:', ordersArray.length);
            }
        } catch (error) {
            console.error("Error loading orders:", error);
            setOrders([]);
            setFilteredOrders([]);
            setPagination(prev => ({ ...prev, total: 0 }));
            messageApi.error("Không thể tải đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Xử lý thay đổi tab
     */
    const handleTabChange = async (key) => {
        console.log(`Changing tab from ${activeTab} to ${key}`);
        setActiveTab(key);
        setSearchValue('');
        
        // Reset pagination hoàn toàn khi chuyển tab
        setPagination(prev => ({ 
            ...prev, 
            current: 1,
            total: 0,
            pageSize: null // Reset page size để tính lại từ đầu
        }));
        
        // Clear data trước khi load mới
        setOrders([]);
        setFilteredOrders([]);
        
        await loadOrders(key === 'all' ? null : parseInt(key), 1);
    };

    /**
     * Lấy danh sách trạng thái có thể cập nhật
     * @param {string} currentStatus - Trạng thái hiện tại
     * @returns {Array} Danh sách trạng thái có thể chuyển đổi
     */
    const getAvailableStatuses = (currentStatus) => {
        const statusObj = orderStatuses.find(s => s.status_name === currentStatus);
        if (!statusObj) return [];

        const statusMap = {
            1: [ // Chờ xác nhận
                { id: 2, name: "Chấp nhận (Chờ lấy hàng)", color: "blue", action: "accept" },
                { id: 5, name: "Từ chối (Huỷ đơn)", color: "red", action: "reject" }
            ],
            2: [ // Chờ lấy hàng
                { id: 3, name: "Chờ giao hàng", color: "cyan", action: "ship" }
            ],
            4: [ // Yêu cầu huỷ đơn hàng
                { id: 2, name: "Từ chối huỷ (Trở về chờ lấy hàng)", color: "blue", action: "reject_cancel" },
                { id: 5, name: "Chấp nhận huỷ (Đã huỷ)", color: "red", action: "accept_cancel" }
            ]
        };

        return statusMap[statusObj.id] || [];
    };

    /**
     * Xử lý thay đổi phân trang
     */
    const handleTableChange = (newPagination, filters, sorter) => {
        console.log('Table change:', { newPagination, filters, sorter }); // Debug log
        
        const { current } = newPagination;
        const requestedPage = current || 1;
        
        // Kiểm tra nếu trang được yêu cầu hợp lệ dựa trên pageSize hiện tại
        if (!pagination.pageSize || pagination.total <= 0) {
            console.warn('No valid pageSize or total, skipping page change');
            return;
        }
        
        const maxPages = Math.ceil(pagination.total / pagination.pageSize);
        const safePage = Math.min(Math.max(1, requestedPage), maxPages);
        
        console.log(`Page change: requested=${requestedPage}, safe=${safePage}, max=${maxPages}, pageSize=${pagination.pageSize}, total=${pagination.total}`);
        
        // Chỉ load nếu trang hợp lệ và khác trang hiện tại
        if (safePage !== pagination.current && safePage >= 1 && safePage <= maxPages) {
            // Cập nhật state pagination
            setPagination(prev => ({ 
                ...prev, 
                current: safePage
            }));
            
            // Load dữ liệu mới
            loadOrders(
                activeTab === 'all' ? null : parseInt(activeTab),
                safePage,
                searchValue.trim()
            );
        } else {
            console.warn(`Invalid or same page requested: ${requestedPage}, current: ${pagination.current}, max: ${maxPages}`);
        }
    };
    /**
     * Cập nhật trạng thái đơn hàng
     */
    const doUpdateStatus = async (orderId, statusId) => {
        try {
            await authAPIs().patch(endpoints.updateorderstatus, {
                order_id: orderId,
                order_status: statusId
            });

            const statusName = orderStatuses.find(s => s.id === statusId)?.status_name;
            messageApi.success(`Đã cập nhật trạng thái đơn hàng thành "${statusName}"`);
            
            // Reload orders for current tab với pagination hiện tại
            await loadOrders(
                activeTab === 'all' ? null : parseInt(activeTab),
                pagination.current,
                searchValue.trim()
            );
        } catch (error) {
            console.error("Error updating status:", error);
            const errorMsg = error.response?.data?.detail || error.response?.data?.message;
            messageApi.error(errorMsg || "Không thể cập nhật trạng thái đơn hàng");
        }
    };

    /**
     * Hiển thị modal xác nhận cập nhật trạng thái
     */
    const showConfirmModal = (order, statusId, statusInfo) => {
        const actionTextMap = {
            accept: 'chấp nhận đơn hàng',
            reject: 'từ chối đơn hàng',
            ship: 'chuyển sang giao hàng',
            accept_cancel: 'chấp nhận huỷ đơn hàng',
            reject_cancel: 'từ chối huỷ đơn hàng'
        };

        modal.confirm({
            title: 'Xác nhận cập nhật trạng thái',
            content: (
                <div>
                    <p><strong>Đơn hàng:</strong> {order.order_code}</p>
                    <p><strong>Khách hàng:</strong> {order.delivery_info?.name || 'N/A'}</p>
                    <p><strong>Hành động:</strong> {actionTextMap[statusInfo.action] || 'cập nhật trạng thái'}</p>
                    <p><strong>Trạng thái mới:</strong> <Tag color={statusInfo.color}>{statusInfo.name}</Tag></p>
                </div>
            ),
            onOk: () => doUpdateStatus(order.id, statusId),
            okText: statusInfo.action.includes('accept') || statusInfo.action === 'ship' ? 'Chấp nhận' : 'Xác nhận',
            cancelText: 'Hủy',
            okButtonProps: {
                type: statusInfo.action.includes('accept') || statusInfo.action === 'ship' ? 'primary' : 'default',
                ...(statusInfo.action.includes('reject') && {
                    style: { backgroundColor: '#ff4d4f', borderColor: '#ff4d4f', color: 'white' }
                })
            }
        });
    };

    /**
     * Render nút cập nhật trạng thái
     */
    const getStatusActionButton = (record) => {
        const availableStatuses = getAvailableStatuses(record.order_status);

        if (!availableStatuses.length) {
            return <Tag color="default">Không thể cập nhật</Tag>;
        }

        const buttonTextMap = {
            accept: 'Chấp nhận',
            reject: 'Từ chối', 
            ship: 'Giao hàng',
            accept_cancel: 'Chấp nhận huỷ',
            reject_cancel: 'Từ chối huỷ'
        };

        const renderButton = (status) => (
            <Button
                key={status.id}
                type={status.action.includes('accept') || status.action === 'ship' ? 'primary' : 'default'}
                size="small"
                icon={status.action.includes('accept') || status.action === 'ship' ? <CheckOutlined /> : <CloseOutlined />}
                onClick={() => showConfirmModal(record, status.id, status)}
                className={status.action.includes('reject') ? 'reject-button' : ''}
            >
                {buttonTextMap[status.action] || 'Cập nhật'}
            </Button>
        );

        return availableStatuses.length === 1 
            ? renderButton(availableStatuses[0])
            : <Space>{availableStatuses.map(renderButton)}</Space>;
    };

    /**
     * Lấy màu sắc cho trạng thái đơn hàng
     */
    const getStatusColor = (statusName) => {
        const status = orderStatuses.find(s => s.status_name === statusName);
        const colorMap = {
            1: 'orange', 2: 'blue', 3: 'cyan', 
            4: 'purple', 5: 'red', 6: 'green'
        };
        return colorMap[status?.id] || 'default';
    };

    /**
     * Tính toán chi tiết tiền đơn hàng
     * @param {Object} order - Thông tin đơn hàng
     * @returns {Object} Chi tiết tính toán
     */
    const calculateOrderDetails = (order) => {
        const subtotal = (order.items || []).reduce((sum, item) => 
            sum + (Number(item.product?.price || 0) * (item.quantity || 0)), 0
        );
        
        const shippingFee = Number(order.ship_fee || 0);
        const beforeDiscount = subtotal + shippingFee;
        const voucherPercent = Number(order.voucher_discount_percent || 0);
        const voucherDiscountAmount = voucherPercent > 0 ? (beforeDiscount * voucherPercent / 100) : 0;
        
        return {
            subtotal,
            shippingFee,
            beforeDiscount,
            voucherPercent,
            voucherDiscountAmount,
            totalCost: Number(order.total_cost || 0)
        };
    };

    /**
     * Điều hướng đến trang chi tiết sản phẩm
     */
    const navigateToProduct = (productId) => {
        if (productId) navigate(`/product/${productId}`);
    };

    /**
     * Render modal chi tiết đơn hàng
     */
    const renderOrderDetailModal = () => {
        if (!selectedOrder) return null;

        const orderDetails = calculateOrderDetails(selectedOrder);

        return (
            <Modal
                title={
                    <div className="modal-title">
                        <ShoppingOutlined className="modal-icon" />
                        <span>Chi tiết đơn hàng {selectedOrder.order_code}</span>
                    </div>
                }
                open={orderDetailVisible}
                onCancel={() => setOrderDetailVisible(false)}
                footer={null}
                width={900}
                bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
                className="order-detail-modal"
            >
                <div className="order-detail-content">
                    {/* Order Status Alert */}
                    <Alert
                        message={`Trạng thái: ${selectedOrder.order_status}`}
                        type={
                            selectedOrder.order_status === 'Đã huỷ' ? 'error' :
                            selectedOrder.order_status === 'Đơn hàng đã hoàn thành' ? 'success' : 'info'
                        }
                        showIcon
                        style={{ marginBottom: 16 }}
                    />

                    {/* Basic Order Information */}
                    <Descriptions 
                        title={
                            <div className="section-title">
                                <ShoppingOutlined />
                                <span>Thông tin đơn hàng</span>
                            </div>
                        } 
                        bordered 
                        column={2}
                        size="small"
                    >
                        <Descriptions.Item label="Mã đơn hàng">
                            <Text strong className="order-code">{selectedOrder.order_code}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày đặt">
                            {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={getStatusColor(selectedOrder.order_status)} className="status-tag">
                                {selectedOrder.order_status}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Phương thức thanh toán">
                            <Tag color={selectedOrder.payment_method === 'online payment' ? 'blue' : 'orange'}>
                                {selectedOrder.payment_method === 'online payment' ? 'Thanh toán online' : 'Tiền mặt'}
                            </Tag>
                        </Descriptions.Item>
                        
                        {/* Voucher Information */}
                        {selectedOrder.voucher_code && (
                            <>
                                <Descriptions.Item label="Mã voucher">
                                    <Space>
                                        <GiftOutlined className="voucher-icon" />
                                        <Tag color="green" className="voucher-tag">
                                            {selectedOrder.voucher_code}
                                        </Tag>
                                        {selectedOrder.voucher_discount_percent && (
                                            <Text type="secondary" className="voucher-percent">
                                                (Giảm {selectedOrder.voucher_discount_percent}%)
                                            </Text>
                                        )}
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="Giảm giá">
                                    <Text strong className="discount-text">
                                        {selectedOrder.voucher_discount_percent || 0}%
                                    </Text>
                                </Descriptions.Item>
                            </>
                        )}
                        
                        {selectedOrder.note && (
                            <Descriptions.Item label="Ghi chú khách hàng" span={2}>
                                <Text italic className="customer-note">"{selectedOrder.note}"</Text>
                            </Descriptions.Item>
                        )}
                    </Descriptions>

                    <Divider />

                    {/* Delivery Information */}
                    {selectedOrder.delivery_info && (
                        <>
                            <Descriptions 
                                title={
                                    <div className="section-title">
                                        <TruckOutlined />
                                        <span>Thông tin giao hàng</span>
                                    </div>
                                } 
                                bordered 
                                column={1}
                                size="small"
                            >
                                <Descriptions.Item label="Người nhận">
                                    <Space>
                                        <UserOutlined className="info-icon user-icon" />
                                        <Text strong>{selectedOrder.delivery_info.name}</Text>
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="Số điện thoại">
                                    <Space>
                                        <PhoneOutlined className="info-icon phone-icon" />
                                        <Text>{selectedOrder.delivery_info.phone_number}</Text>
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="Địa chỉ giao hàng">
                                    <Space>
                                        <EnvironmentOutlined className="info-icon address-icon" />
                                        <Text>{selectedOrder.delivery_info.address}</Text>
                                    </Space>
                                </Descriptions.Item>
                            </Descriptions>
                            <Divider />
                        </>
                    )}

                    {/* Order Items */}
                    <div className="order-items-section">
                        <Title level={4} className="section-title">
                            <ShoppingOutlined className="items-icon" />
                            Sản phẩm đã đặt ({(selectedOrder.items || []).length} sản phẩm)
                        </Title>
                        
                        <Table
                            dataSource={selectedOrder.items || []}
                            columns={[
                                {
                                    title: 'Hình ảnh',
                                    key: 'image',
                                    width: 80,
                                    render: (_, record) => (
                                        <div 
                                            className="product-image-container"
                                            onClick={() => navigateToProduct(record.product?.id)}
                                            title="Click để xem chi tiết sản phẩm"
                                        >
                                            <Image
                                                width={60}
                                                height={60}
                                                src={record.product?.image}
                                                alt={record.product?.name}
                                                className="product-image"
                                                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+1WmtxshHfTurmvJYjIJSGWkiJ7QCJ7Q6Q2O4AiS0HkNhyAIl1KGHFBiVgO0JiO8AJcQW2A5u6k9lJnPGvpz/e0u6b5uvPxGj6HfHgCCf8vVLOr3O/a87vNv3vEuiVEtT8Z/sffxAGIgAhDBAgQoBAEhEEBAE="
                                            />
                                            <div className="product-link-overlay">
                                                <LinkOutlined />
                                            </div>
                                        </div>
                                    ),
                                },
                                {
                                    title: 'Tên sản phẩm',
                                    key: 'product_name',
                                    render: (_, record) => (
                                        <div>
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={() => navigateToProduct(record.product?.id)}
                                                className="product-name-link"
                                                title="Click để xem chi tiết sản phẩm"
                                            >
                                                <LinkOutlined className="product-link-icon" />
                                                {record.product?.name || 'N/A'}
                                            </Button>
                                            <br />
                                            <Text type="secondary" className="product-id">
                                                ID: {record.product?.id || 'N/A'}
                                            </Text>
                                        </div>
                                    ),
                                },
                                {
                                    title: 'Đơn giá',
                                    key: 'unit_price',
                                    render: (_, record) => (
                                        <Text strong className="unit-price">
                                            {Number(record.product?.price || 0).toLocaleString()}đ
                                        </Text>
                                    ),
                                    align: 'right',
                                    width: 100,
                                },
                                {
                                    title: 'Số lượng',
                                    dataIndex: 'quantity',
                                    key: 'quantity',
                                    align: 'center',
                                    width: 80,
                                    render: (quantity) => (
                                        <Tag color="blue" className="quantity-tag">
                                            x{quantity}
                                        </Tag>
                                    ),
                                },
                                {
                                    title: 'Thành tiền',
                                    key: 'total',
                                    render: (_, record) => (
                                        <Text strong className="item-total">
                                            {(Number(record.product?.price || 0) * (record.quantity || 0)).toLocaleString()}đ
                                        </Text>
                                    ),
                                    align: 'right',
                                    width: 120,
                                },
                            ]}
                            pagination={false}
                            size="small"
                            rowKey="id"
                            bordered
                            className="items-table"
                        />
                    </div>

                    <Divider />

                    {/* Order Calculation */}
                    <div className="calculation-section">
                        <Title level={4} className="section-title">
                            <GiftOutlined className="calculation-icon" />
                            Tính toán đơn hàng
                        </Title>
                        
                        <Card size="small" className="calculation-card">
                            <div className="calculation-content">
                                {/* Tiền hàng */}
                                <Row justify="space-between" align="middle" className="calculation-row">
                                    <Col><Text>Tiền hàng:</Text></Col>
                                    <Col>
                                        <Text strong className="subtotal-amount">
                                            {orderDetails.subtotal.toLocaleString()}đ
                                        </Text>
                                    </Col>
                                </Row>

                                {/* Phí vận chuyển */}
                                <Row justify="space-between" align="middle" className="calculation-row">
                                    <Col><Text>Phí vận chuyển:</Text></Col>
                                    <Col>
                                        <Text strong className="shipping-amount">
                                            {orderDetails.shippingFee.toLocaleString()}đ
                                        </Text>
                                    </Col>
                                </Row>

                                {/* Voucher giảm giá */}
                                {selectedOrder.voucher_code && orderDetails.voucherPercent > 0 && (
                                    <Row justify="space-between" align="middle" className="calculation-row voucher-row">
                                        <Col>
                                            <Space>
                                                <GiftOutlined className="voucher-calc-icon" />
                                                <Text>Voucher giảm giá ({orderDetails.voucherPercent}%):</Text>
                                            </Space>
                                        </Col>
                                        <Col>
                                            <Text strong className="discount-amount">
                                                -{orderDetails.voucherDiscountAmount.toLocaleString()}đ
                                            </Text>
                                        </Col>
                                    </Row>
                                )}

                                {/* Tổng thanh toán */}
                                <Row justify="space-between" align="middle" className="calculation-row total-row">
                                    <Col>
                                        <Text strong className="total-label">Tổng thanh toán:</Text>
                                    </Col>
                                    <Col>
                                        <Text strong className="total-amount">
                                            {orderDetails.totalCost.toLocaleString()}đ
                                        </Text>
                                    </Col>
                                </Row>
                            </div>
                        </Card>

                        {/* Công thức tính toán */}
                        <Alert
                            message="Chi tiết tính toán"
                            description={
                                <div className="formula-description">
                                    {selectedOrder.voucher_code && orderDetails.voucherPercent > 0 ? (
                                        <div>
                                            <Text>
                                                Tiền hàng ({orderDetails.subtotal.toLocaleString()}đ) + 
                                                Phí ship ({orderDetails.shippingFee.toLocaleString()}đ) - 
                                                Voucher {orderDetails.voucherPercent}% ({orderDetails.voucherDiscountAmount.toLocaleString()}đ) = 
                                            </Text>
                                            <Text strong className="formula-result">
                                                {orderDetails.totalCost.toLocaleString()}đ
                                            </Text>
                                            <div className="celebration-message">
                                                <Text className="celebration-text">
                                                    🎉 Tiết kiệm {orderDetails.voucherDiscountAmount.toLocaleString()}đ với voucher {selectedOrder.voucher_code}!
                                                </Text>
                                            </div>
                                        </div>
                                    ) : (
                                        <Text>
                                            Tiền hàng ({orderDetails.subtotal.toLocaleString()}đ) + 
                                            Phí ship ({orderDetails.shippingFee.toLocaleString()}đ) = 
                                            <Text strong className="formula-result">
                                                {orderDetails.totalCost.toLocaleString()}đ
                                            </Text>
                                        </Text>
                                    )}
                                </div>
                            }
                            type="info"
                            showIcon
                            className="calculation-formula"
                        />
                    </div>
                </div>
            </Modal>
        );
    };

    // Cấu hình cột cho bảng đơn hàng
    const columns = [
        {
            title: 'Mã đơn hàng',
            dataIndex: 'order_code',
            key: 'order_code',
            width: 150,
            render: (code) => <strong className="order-code-table">{code}</strong>
        },
        {
            title: 'Khách hàng',
            key: 'customer',
            width: 150,
            render: (record) => (
                <Space>
                    <Avatar icon={<UserOutlined />} size="small" />
                    <span>{record.delivery_info?.name || 'N/A'}</span>
                </Space>
            )
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
                <strong className="total-cost-table">
                    {Number(amount).toLocaleString()}đ
                </strong>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'order_status',
            key: 'order_status',
            width: 150,
            render: (status) => (
                <Tag color={getStatusColor(status)} className="status-tag-table">
                    {status}
                </Tag>
            ),
        },
        {
            title: 'Thanh toán',
            dataIndex: 'payment_method',
            key: 'payment_method',
            width: 120,
            render: (method) => (
                <Tag color={method === 'online payment' ? 'blue' : 'orange'}>
                    {method === 'online payment' ? 'Online' : 'Tiền mặt'}
                </Tag>
            ),
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
                        className="view-detail-btn"
                    >
                        Xem chi tiết
                    </Button>
                    {getStatusActionButton(record)}
                </Space>
            ),
        },
    ];

    return (
        <div className="store-orders">
            {/* Search Section */}
            <Card className="search-card">
                <Row gutter={16} align="middle">
                    <Col flex="auto">
                        <Search
                            placeholder="Tìm kiếm theo mã đơn hàng..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onSearch={(value) => {
                                console.log('Search triggered:', value);
                                setSearchValue(value);
                            }}
                            className="search-input"
                            allowClear
                            enterButton={<SearchOutlined />}
                            loading={loading}
                        />
                    </Col>
                    {searchValue && (
                        <Col>
                            <Button
                                icon={<ClearOutlined />}
                                onClick={() => setSearchValue('')}
                                className="clear-filter-btn"
                            >
                                Xóa bộ lọc
                            </Button>
                        </Col>
                    )}
                </Row>
                {searchValue && (
                    <div className="search-result-info">
                        Tìm thấy {pagination.total} đơn hàng với mã "{searchValue}"
                    </div>
                )}
                {/* Debug info */}
                <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                    Debug: Trang {pagination.current}/{Math.ceil(pagination.total / (pagination.pageSize || 1))} | 
                    Tổng: {pagination.total} đơn hàng | 
                    Hiển thị: {filteredOrders.length} đơn hàng | 
                    PageSize: {pagination.pageSize || 'auto'} |
                    Tab: {activeTab}
                </div>
            </Card>

            {/* Orders Table with Tabs */}
            <Card className="orders-table-card">
                <Tabs activeKey={activeTab} onChange={handleTabChange} className="orders-tabs">
                    <TabPane tab="Tất cả đơn hàng" key="all">
                        <Table
                            dataSource={filteredOrders}
                            columns={columns}
                            loading={loading}
                            rowKey="id"
                            pagination={{
                                current: pagination.current,
                                total: pagination.total,
                                pageSize: pagination.pageSize,
                                showSizeChanger: false,
                                showQuickJumper: false,
                                hideOnSinglePage: pagination.total <= (pagination.pageSize || 0),
                                showTotal: (total, range) => {
                                    if (total === 0) return 'Không có đơn hàng';
                                    return `${range[0]}-${range[1]} của ${total} đơn hàng`;
                                }
                            }}
                            onChange={handleTableChange}
                            scroll={{ x: 1000 }}
                            size="middle"
                            className="orders-table"
                        />
                    </TabPane>

                    {orderStatuses.map((status) => (
                        <TabPane
                            tab={status.status_name}
                            key={status.id.toString()}
                        >
                            <Table
                                dataSource={filteredOrders}
                                columns={columns}
                                loading={loading}
                                rowKey="id"
                                pagination={{
                                    current: pagination.current,
                                    total: pagination.total,
                                    pageSize: pagination.pageSize,
                                    showSizeChanger: false,
                                    showQuickJumper: false,
                                    hideOnSinglePage: pagination.total <= (pagination.pageSize || 0),
                                    showTotal: (total, range) => {
                                        if (total === 0) return 'Không có đơn hàng';
                                        return `${range[0]}-${range[1]} của ${total} đơn hàng`;
                                    }
                                }}
                                onChange={handleTableChange}
                                scroll={{ x: 1000 }}
                                size="middle"
                                className="orders-table"
                            />
                        </TabPane>
                    ))}
                </Tabs>
            </Card>

            {/* Order Detail Modal */}
            {renderOrderDetailModal()}
        </div>
    );
};

export default StoreOrders;