import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, Typography, Spin, Button, Modal, Form, Input, Upload, 
  Tabs, Table, Space, Select, Tag, Tooltip,
  Avatar, Image, Empty, Row, Col, Popconfirm, InputNumber, App
} from 'antd';
import { 
  EditOutlined, DeleteOutlined, PlusOutlined, CameraOutlined, 
  ShopOutlined, ShoppingCartOutlined,
  LeftOutlined, RightOutlined, EyeOutlined, EnvironmentOutlined,
  PhoneOutlined, ProductOutlined, FileTextOutlined, SaveOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { authAPIs, endpoints } from '../configs/APIs';
import StoreOrders from '../components/StoreOrders';
import { MyUserContext } from '../configs/Context';
import '../css/MyStore.css';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const MyStore = () => {
  // === HOOKS & CONTEXT - Khởi tạo các hook cần thiết ===
  const { message: messageApi } = App.useApp();
  const navigate = useNavigate();
  const user = useContext(MyUserContext);
  const isLoggedIn = user && typeof user === 'object' && Object.keys(user).length > 0;

  // === STATE MANAGEMENT - Quản lý trạng thái component ===
  
  // Store & Products data states
  const [storeInfo, setStoreInfo] = useState(null); // Thông tin cửa hàng
  const [hasStore, setHasStore] = useState(false); // Kiểm tra user có cửa hàng không
  const [storeCheckComplete, setStoreCheckComplete] = useState(false); // Đã check store xong chưa
  const [products, setProducts] = useState([]); // Danh sách sản phẩm
  const [categories, setCategories] = useState([]); // Danh sách category
  
  // Loading states
  const [loading, setLoading] = useState(true); // Loading chính
  const [productsLoading, setProductsLoading] = useState(false); // Loading khi load products
  
  // UI control states  
  const [activeTab, setActiveTab] = useState('products'); // Tab hiện tại
  
  // Pagination states - Quản lý phân trang
  const [page, setPage] = useState(1); // Trang hiện tại
  const [next, setNext] = useState(false); // Có trang tiếp theo không
  const [previous, setPrevious] = useState(false); // Có trang trước không
  const [totalProducts, setTotalProducts] = useState(0); // Tổng số sản phẩm

  // Modal control states - Quản lý hiển thị các modal
  const [editStoreVisible, setEditStoreVisible] = useState(false);
  const [editProductVisible, setEditProductVisible] = useState(false);
  const [createProductVisible, setCreateProductVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Upload states - Quản lý upload ảnh tùy chỉnh (không dùng Antd default)
  const [selectedStoreAvatar, setSelectedStoreAvatar] = useState(null);
  const [selectedProductImages, setSelectedProductImages] = useState([]);

  // Form instances - Quản lý các form instance
  const [storeForm] = Form.useForm();
  const [productForm] = Form.useForm();
  const [createForm] = Form.useForm();

  // === CONSTANTS - Các hằng số sử dụng trong component ===
  const productConditions = [
    { id: 1, name: 'Like New(90-100%)-Gần như chưa sử dụng,hình thức và chức năng như hàng mới' },
    { id: 2, name: 'Excellent (75-89%)-Đã dùng nhẹ, xướt một vài vết nhỏ, hoạt động hoàn hảo' },
    { id: 3, name: 'Good (60-74%)-Sử dụng đều ổn định, có dấu hiệu hao mòn nhẹ, dùng tốt' },
    { id: 4, name: 'Fair (40-59%)-Dùng lâu, có lỗi nhẹ, có thể sữa chữa hoặc bảo trì' },
    { id: 5, name: 'Poor (20-39%)-Hư hỏng nhiều, xuống cấp, cần sửa chữa, thay linh kiện' }
  ];

  // === EFFECTS - Quản lý lifecycle của component ===
  
  /**
   * Effect chính: Kiểm tra authentication và load dữ liệu ban đầu
   * Dependencies: [isLoggedIn, navigate, messageApi]
   * Trigger: Khi user login/logout hoặc component mount
   */
  useEffect(() => {
    if (!isLoggedIn) {
      messageApi.warning('Vui lòng đăng nhập để xem cửa hàng');
      navigate('/login');
      return;
    }
    loadInitialData();
  }, [isLoggedIn, navigate, messageApi]);

  /**
   * Effect load sản phẩm: Tự động load khi có điều kiện thỏa mãn
   * Dependencies: [activeTab, page, isLoggedIn, storeCheckComplete, hasStore]
   * Trigger: Khi chuyển tab, đổi trang, hoặc store data sẵn sàng
   */
  useEffect(() => {
    if (activeTab === 'products' && isLoggedIn && storeCheckComplete && hasStore) {
      loadProducts();
    }
  }, [activeTab, page, isLoggedIn, storeCheckComplete, hasStore]);

  // === DATA LOADING FUNCTIONS - Các hàm load dữ liệu từ API ===
  
  /**
   * Load dữ liệu ban đầu: thông tin store và categories
   * Được gọi khi component mount và user đã đăng nhập
   */
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const storeExists = await loadStoreData();
      if (storeExists) await loadCategories(); // Chỉ load categories nếu có store
      setStoreCheckComplete(true);
    } catch (error) {
      console.error("Lỗi khi load dữ liệu ban đầu:", error);
      messageApi.error("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load thông tin cửa hàng của user hiện tại
   * @returns {Promise<boolean>} True nếu có cửa hàng, false nếu chưa có
   */
  const loadStoreData = async () => {
    try {
      const response = await authAPIs().get(endpoints.mystore);
      setStoreInfo(response.data);
      setHasStore(true);
      return true;
    } catch (error) {
      console.error("Lỗi khi load thông tin cửa hàng:", error);
      setHasStore(false);
      setStoreInfo(null);
      
      // Xử lý lỗi cụ thể
      if (error.response?.status === 404) {
        messageApi.info("Bạn chưa có cửa hàng. Hãy tạo cửa hàng để bắt đầu bán hàng!");
      } else {
        messageApi.error("Không thể tải thông tin cửa hàng");
      }
      return false;
    }
  };

  /**
   * Load danh sách sản phẩm với phân trang
   * Kiểm tra điều kiện trước khi gọi API để tránh call không cần thiết
   */
  const loadProducts = async () => {
    if (!hasStore || !storeCheckComplete) return;

    try {
      setProductsLoading(true);
      const response = await authAPIs().get(`${endpoints.productmystore}?page=${page}`);
      const data = response.data;
      
      // Cập nhật state với dữ liệu từ API
      setProducts(data.results || []);
      setTotalProducts(data.count || 0);
      setNext(data.next !== null);
      setPrevious(data.previous !== null);
    } catch (error) {
      console.error("Lỗi khi load sản phẩm:", error);
      if (hasStore) messageApi.error("Không thể tải danh sách sản phẩm");
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  /**
   * Load danh sách categories cho dropdown sản phẩm
   */
  const loadCategories = async () => {
    try {
      const response = await authAPIs().get(endpoints.categories);
      setCategories(response.data || []);
    } catch (error) {
      console.error("Lỗi khi load categories:", error);
      messageApi.error("Không thể tải danh mục sản phẩm");
      setCategories([]);
    }
  };

  // === STORE MANAGEMENT FUNCTIONS - Các hàm quản lý cửa hàng ===
  
  /**
   * Mở modal chỉnh sửa cửa hàng và fill dữ liệu hiện tại
   */
  const handleEditStore = () => {
    if (!storeInfo) return;
    
    // Reset upload state
    setSelectedStoreAvatar(null);
    
    // Fill form với dữ liệu hiện tại
    storeForm.setFieldsValue({
      name: storeInfo.name,
      address: storeInfo.address,
      phone_number: storeInfo.phone_number,
      introduce: storeInfo.introduce,
    });
    setEditStoreVisible(true);
  };

  /**
   * Xử lý cập nhật thông tin cửa hàng
   * @param {Object} values - Dữ liệu từ form
   */
  const handleUpdateStore = async (values) => {
    try {
      const formData = new FormData();
      
      // Thêm các field text vào FormData
      ['name', 'address', 'phone_number', 'introduce'].forEach(field => {
        if (values[field] !== undefined && values[field] !== null) {
          formData.append(field, values[field] || '');
        }
      });

      // Xử lý upload avatar mới nếu có
      if (selectedStoreAvatar?.file) {
        formData.append('avatar', selectedStoreAvatar.file);
      }
      
      // Gửi request cập nhật store
      const updateUrl = endpoints.updatesstore.replace('{id}', storeInfo.id);
      const response = await authAPIs().patch(updateUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });
      
      // Cập nhật state local và đóng modal
      setStoreInfo(response.data);
      closeModal('store');
      messageApi.success("Cập nhật thông tin cửa hàng thành công!");
      
    } catch (error) {
      console.error("Update store error:", error);
      
      let errorMessage = "Không thể cập nhật thông tin cửa hàng";
      
      // Xử lý error response từ server
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Xử lý lỗi avatar upload cụ thể
        if (error.response.status === 400 && errorData.avatar) {
          const avatarError = Array.isArray(errorData.avatar) 
            ? errorData.avatar.join(', ') 
            : errorData.avatar;
          errorMessage = `Lỗi avatar: ${avatarError}`;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else {
          // Hiển thị tất cả lỗi validation của các fields
          const errors = [];
          Object.entries(errorData).forEach(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages.join(', ') : messages;
            errors.push(`${field}: ${msg}`);
          });
          if (errors.length > 0) {
            errorMessage = errors.join(' | ');
          }
        }
      }
      
      messageApi.error(errorMessage);
    }
  };

  // === PRODUCT MANAGEMENT FUNCTIONS - Các hàm quản lý sản phẩm ===
  
  /**
   * Mở modal chỉnh sửa sản phẩm và fill dữ liệu hiện tại
   * @param {Object} product - Sản phẩm cần chỉnh sửa
   */
  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    
    // Fill form với dữ liệu sản phẩm hiện tại
    productForm.setFieldsValue({
      name: product.name,
      price: parseFloat(product.price),
      available_quantity: parseInt(product.available_quantity),
      note: product.note,
      categories: product.categories?.map(cat => cat.id) || []
    });
    
    setEditProductVisible(true);
  };

  /**
   * Xử lý cập nhật sản phẩm với FormData upload
   * @param {Object} values - Dữ liệu từ form
   */
  const handleUpdateProduct = async (values) => {
    try {
      // Tạo FormData cho multipart upload
      const formData = createProductFormData(values);

      // Gửi request cập nhật sản phẩm
      await authAPIs().patch(
        endpoints.productUpdate.replace('{id}', selectedProduct.id),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // Đóng modal và reload dữ liệu
      closeModal('product');
      messageApi.success("Cập nhật sản phẩm thành công!");
      loadProducts();
      
    } catch (error) {
      console.error("Error updating product:", error);
      messageApi.error(getErrorMessage(error, "Không thể cập nhật sản phẩm"));
    }
  };

  /**
   * Xử lý tạo sản phẩm mới với validation và upload
   * @param {Object} values - Dữ liệu từ form
   */
  const handleCreateProduct = async (values) => {
    try {
      // Validate có ít nhất 1 hình ảnh
      if (selectedProductImages.length === 0) {
        messageApi.error('Vui lòng chọn ít nhất 1 hình ảnh');
        return;
      }

      // Tạo FormData với dữ liệu sản phẩm
      const formData = createProductFormData(values);
      
      // Gửi request tạo sản phẩm mới
      await authAPIs().post(endpoints.productCreate, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Đóng modal, hiển thị thông báo và về trang đầu
      closeModal('create');
      messageApi.success("Tạo sản phẩm thành công!");
      setPage(1); // Về trang đầu để thấy sản phẩm mới
      
    } catch (error) {
      console.error("Error creating product:", error);
      messageApi.error(getErrorMessage(error, "Không thể tạo sản phẩm"));
    }
  };

  /**
   * Xử lý xóa sản phẩm với confirm
   * @param {number} productId - ID sản phẩm cần xóa
   */
  const handleDeleteProduct = async (productId) => {
    try {
      // Gọi API xóa sản phẩm
      await authAPIs().delete(`/product/${productId}/delete-my-product/`);
      
      // Thông báo thành công và reload
      messageApi.success("Xóa sản phẩm thành công!");
      loadProducts();
      
    } catch (error) {
      console.error("Error deleting product:", error);
      messageApi.error(getErrorMessage(error, "Không thể xóa sản phẩm"));
    }
  };

  // === UTILITY FUNCTIONS - Các hàm tiện ích ===
  
  /**
   * Tạo FormData cho multipart upload sản phẩm
   * @param {Object} values - Dữ liệu sản phẩm từ form
   * @returns {FormData} - FormData đã được format
   */
  const createProductFormData = (values) => {
    const formData = new FormData();
    
    // Append các field text vào FormData
    ['name', 'note'].forEach(field => {
      if (values[field]) formData.append(field, values[field]);
    });

    // Append các field số với type conversion
    if (values.price !== undefined && values.price !== null) {
      formData.append('price', parseFloat(values.price).toString());
    }
    if (values.available_quantity !== undefined && values.available_quantity !== null) {
      formData.append('available_quantity', parseInt(values.available_quantity).toString());
    }

    // Append product condition cho sản phẩm mới
    if (values.product_condition !== undefined) {
      formData.append('product_condition', values.product_condition.toString());
    }

    // Append danh sách categories
    if (values.categories?.length > 0) {
      values.categories.forEach(catId => {
        formData.append('categories', catId.toString());
      });
    }

    // Append files từ selectedProductImages
    if (selectedProductImages.length > 0) {
      selectedProductImages.forEach(imageItem => {
        if (imageItem.file) {
          formData.append('images', imageItem.file);
        }
      });
    }

    return formData;
  };

  /**
   * Extract thông báo lỗi từ error response
   * @param {Object} error - Error object từ API call
   * @param {string} defaultMsg - Thông báo mặc định nếu không có detail
   * @returns {string} - Thông báo lỗi để hiển thị
   */
  const getErrorMessage = (error, defaultMsg) => {
    return error.response?.data?.detail || error.response?.data?.error || defaultMsg;
  };

  /**
   * Đóng modal và reset state tương ứng
   * @param {string} type - Loại modal: 'store', 'product', 'create'
   */
  const closeModal = (type) => {
    const modalActions = {
      // Đóng modal chỉnh sửa store
      store: () => {
        setEditStoreVisible(false);
        storeForm.resetFields();
        setSelectedStoreAvatar(null);
      },
      // Đóng modal chỉnh sửa product  
      product: () => {
        setEditProductVisible(false);
        productForm.resetFields();
        setSelectedProduct(null);
        setSelectedProductImages([]);
      },
      // Đóng modal tạo product mới
      create: () => {
        setCreateProductVisible(false);
        createForm.resetFields();
        setSelectedProductImages([]);
      }
    };
    
    // Execute action tương ứng
    modalActions[type]?.();
  };

  // === RENDER COMPONENTS - Các component render UI ===
  
  /**
   * Render avatar cửa hàng với fallback icon
   */
  const renderStoreAvatar = () => {
    return storeInfo?.avatar ? (
      <Avatar size={100} src={storeInfo.avatar} className="store-avatar" />
    ) : (
      <Avatar size={100} icon={<ShopOutlined />} className="store-avatar store-avatar-fallback" />
    );
  };

  /**
   * Render header thông tin cửa hàng với layout compact
   */
  const renderStoreHeader = () => {
    return (
      <Card className="store-header-card">
        <div className="store-header-wrapper">
          {/* Avatar section với spacing tối ưu */}
          <div className="store-avatar-section">
            {renderStoreAvatar()}
            <div className="avatar-edit-overlay">
              <CameraOutlined />
            </div>
          </div>

          {/* Simplified Info Section */}
          <div className="store-info-compact">
            <div className="store-title-row">
              <Title level={3} className="store-name">{storeInfo.name}</Title>
              <div className="store-badges-compact">
                <Tag color="success" size="small">Hoạt động</Tag>
                <Text type="secondary" className="join-year">
                  Từ {new Date(storeInfo.created_date).getFullYear()}
                </Text>
              </div>
            </div>

            <div className="store-details-compact">
              <div className="info-item">
                <EnvironmentOutlined className="info-icon" />
                <Text className="info-text">{storeInfo.address}</Text>
              </div>
              <div className="info-item">
                <PhoneOutlined className="info-icon" />
                <Text className="info-text">{storeInfo.phone_number}</Text>
              </div>
              <div className="info-item">
                <ShoppingCartOutlined className="info-icon" />
                <Text className="info-text">{totalProducts} sản phẩm</Text>
              </div>
            </div>

            {storeInfo.introduce && (
              <div className="store-description-compact">
                <Text type="secondary" italic>"{storeInfo.introduce}"</Text>
              </div>
            )}
          </div>

          {/* Compact Action Section */}
          <div className="store-actions-compact">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              className="edit-btn-compact"
              onClick={handleEditStore}
              size="small"
            >
              Chỉnh sửa
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  /**
   * Component phân trang tùy chỉnh
   */
  const EnhancedPagination = () => {
    if (!previous && !next && products.length === 0) return null;

    return (
      <div className="pagination-wrapper">
        <div className="pagination-controls">
          <Button
            type="text"
            icon={<LeftOutlined />}
            className={`pagination-btn prev-btn ${!previous ? 'disabled' : ''}`}
            onClick={() => previous && !productsLoading && setPage(page - 1)}
            disabled={!previous || productsLoading}
          >
            Trước
          </Button>

          <div className="page-indicator">
            <span className="current-page">{page}</span>
            <div className="page-dots">
              {Array.from({ length: Math.min(5, Math.ceil(totalProducts / Math.max(products.length, 1))) }, (_, i) => (
                <div 
                  key={i} 
                  className={`page-dot ${i + 1 === page ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                />
              ))}
            </div>
          </div>

          <Button
            type="text"
            className={`pagination-btn next-btn ${!next ? 'disabled' : ''}`}
            onClick={() => next && !productsLoading && setPage(page + 1)}
            disabled={!next || productsLoading}
          >
            Tiếp
            <RightOutlined />
          </Button>
        </div>

        {productsLoading && (
          <div className="pagination-loading">
            <Spin size="small" />
          </div>
        )}
      </div>
    );
  };

  // === TABLE CONFIGURATION ===
  /**
   * Cấu hình cột cho bảng sản phẩm
   */
  const productColumns = [
    {
      title: 'Hình ảnh',
      key: 'image',
      width: 100,
      render: (_, record) => (
        <Image
          width={60}
          height={60}
          src={record.image}
          alt={record.name}
          className="product-image"
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+1WmtxshHfTurmvJYjIJSGWkiJ7QCJ7Q6Q2O4AiS0HkNhyAIl1KGHFBiVgO0JiO8AJcQW2A5u6k9lJnPGvpz/e0u6b5uvPxGj6HfHgCCf8vVLOr3O/a87vNv3vEuiVEtT8Z/sffxAGIgAhDBAgQoBAEhEEBAE="
        />
      ),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong className="product-name">{text}</Text>
          <br />
          <Text type="secondary" className="product-id">ID: {record.id}</Text>
        </div>
      )
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: 130,
      align: 'right',
      render: (price) => (
        <Text strong className="product-price">{Number(price).toLocaleString()}đ</Text>
      )
    },
    {
      title: 'Số lượng',
      dataIndex: 'available_quantity',
      key: 'quantity',
      width: 100,
      align: 'center',
      render: (quantity) => (
        <Tag color={quantity > 0 ? 'green' : 'red'} className="quantity-tag">{quantity}</Tag>
      )
    },
    {
      title: 'Đã bán',
      dataIndex: 'purchases',
      key: 'purchases',
      width: 80,
      align: 'center',
      render: (purchases) => <Text>{purchases || 0}</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      key: 'active',
      width: 110,
      align: 'center',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'} className="status-tag">
          {active ? 'Hoạt động' : 'Đợi xét duyệt'}
        </Tag>
      )
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small" 
              className="action-btn"
              onClick={() => navigate(`/product/${record.id}`)} 
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small" 
              className="action-btn"
              onClick={() => handleEditProduct(record)} 
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Bạn có chắc muốn xóa sản phẩm này?"
              onConfirm={() => handleDeleteProduct(record.id)}
              okText="Xóa" 
              cancelText="Hủy" 
              okType="danger"
            >
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                size="small" 
                className="action-btn" 
                danger 
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // === RENDER CONDITIONAL STATES ===
  
  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <div className="loading-text">Đang tải thông tin cửa hàng...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="empty-container">
        <Empty description="Vui lòng đăng nhập để xem cửa hàng">
          <Button type="primary" onClick={() => navigate('/login')}>Đăng nhập</Button>
        </Empty>
      </div>
    );
  }

  if (!hasStore || !storeInfo) {
    return (
      <div className="empty-container">
        <Empty description="Bạn chưa có cửa hàng" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button 
            type="primary" 
            icon={<ShopOutlined />}
            onClick={() => navigate('/create-store')}
          >
            Tạo cửa hàng ngay
          </Button>
        </Empty>
      </div>
    );
  }

  // === MAIN RENDER ===
  return (
    <div className="my-store-container">
      {renderStoreHeader()}
      
      {/* Main Content Tabs */}
      <Card className="main-content-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={<span className="tab-title"><ProductOutlined />Sản phẩm ({totalProducts})</span>} 
            key="products"
          >
            <div className="products-section">
              <div className="products-header-compact">
                <div className="products-info">
                  <Title level={4} className="section-title">Sản phẩm của tôi</Title>
                  <Text type="secondary" className="products-count">
                    {totalProducts} sản phẩm • Trang {page}
                  </Text>
                </div>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setCreateProductVisible(true)}
                  className="add-product-btn-compact"
                >
                  Thêm sản phẩm
                </Button>
              </div>
              
              <Table
                dataSource={products} 
                columns={productColumns} 
                loading={productsLoading}
                rowKey="id" 
                pagination={false} 
                scroll={{ x: 900 }} 
                size="small"
                className="products-table-compact"
              />
              
              <EnhancedPagination />
            </div>
          </TabPane>

          <TabPane 
            tab={<span className="tab-title"><FileTextOutlined />Đơn hàng</span>} 
            key="orders"
          >
            <StoreOrders />
          </TabPane>
        </Tabs>
      </Card>

      {renderModals()}
    </div>
  );

  /**
   * Render tất cả modals
   */
  function renderModals() {
    return (
      <>
        {/* Store Edit Modal */}
        <Modal
          title={<div className="modal-title"><EditOutlined />Chỉnh sửa thông tin cửa hàng</div>}
          open={editStoreVisible}
          onCancel={() => closeModal('store')}
          footer={null} width={700}
        >
          <Form form={storeForm} layout="vertical" onFinish={handleUpdateStore}>
            <div className="form-section">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="name" label="Tên cửa hàng" 
                    rules={[{ required: true, message: 'Vui lòng nhập tên cửa hàng' }]}>
                    <Input placeholder="Nhập tên cửa hàng" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone_number" label="Số điện thoại"
                    rules={[
                      { required: true, message: 'Vui lòng nhập số điện thoại' },
                      { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ' }
                    ]}>
                    <Input placeholder="Nhập số điện thoại" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="address" label="Địa chỉ"
                rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}>
                <TextArea rows={3} placeholder="Nhập địa chỉ cửa hàng" />
              </Form.Item>

              <Form.Item name="introduce" label="Giới thiệu">
                <TextArea rows={4} placeholder="Giới thiệu về cửa hàng của bạn" />
              </Form.Item>

              {/* Avatar Upload - Custom Layout */}
              <Form.Item name="avatar" label="Ảnh đại diện cửa hàng">
                <div className="upload-container-custom">
                  {/* Upload section */}
                  <div className="upload-section">
                    <Upload
                      showUploadList={false}
                      beforeUpload={(file) => {
                        const isImage = file.type.startsWith('image/');
                        if (!isImage) {
                          messageApi.error('Chỉ có thể upload file hình ảnh!');
                          return Upload.LIST_IGNORE;
                        }
                        
                        const isLt5M = file.size / 1024 / 1024 < 5;
                        if (!isLt5M) {
                          messageApi.error('Kích thước file phải nhỏ hơn 5MB!');
                          return Upload.LIST_IGNORE;
                        }
                        
                        // Create preview URL
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setSelectedStoreAvatar({
                            file: file,
                            preview: e.target.result,
                            name: file.name
                          });
                        };
                        reader.readAsDataURL(file);
                        
                        // Update form value
                        storeForm.setFieldsValue({ 
                          avatar: { 
                            fileList: [{ 
                              originFileObj: file, 
                              name: file.name,
                              status: 'done'
                            }] 
                          } 
                        });
                        
                        return false; // Prevent auto upload
                      }}
                      accept="image/*"
                    >
                      <div style={{ 
                        width: 120, 
                        height: 120, 
                        border: '1px dashed #d9d9d9', 
                        borderRadius: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#fafafa'
                      }}>
                        <CameraOutlined style={{ fontSize: 24, color: '#999', marginBottom: 4 }} />
                        <div className="upload-text">Chọn ảnh</div>
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                          JPG, PNG - Tối đa 5MB
                        </div>
                      </div>
                    </Upload>
                    <div className="upload-label">Chọn ảnh mới</div>
                  </div>
                  
                  {/* Selected avatar preview */}
                  {selectedStoreAvatar && (
                    <div className="selected-images-section">
                      <div style={{ position: 'relative' }}>
                        <Image
                          width={120}
                          height={120}
                          src={selectedStoreAvatar.preview}
                          alt="Selected avatar"
                          style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
                        />
                        <button
                          className="selected-image-remove"
                          onClick={() => {
                            setSelectedStoreAvatar(null);
                            storeForm.setFieldsValue({ avatar: { fileList: [] } });
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div className="upload-label">Ảnh đã chọn</div>
                    </div>
                  )}
                  
                  {/* Current avatar display */}
                  {storeInfo?.avatar && (
                    <div className="current-image-section">
                      <Image
                        width={120}
                        height={120}
                        src={storeInfo.avatar}
                        alt="Current avatar"
                        style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
                      />
                      <div className="upload-label">Ảnh hiện tại</div>
                    </div>
                  )}
                </div>
              </Form.Item>
            </div>

            <Form.Item className="form-actions">
              <Space>
                <Button size="large" className="cancel-btn" onClick={() => closeModal('store')}>
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large" className="submit-btn">
                  Lưu thay đổi
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Product Edit Modal */}
        <Modal
          title={<div className="modal-title"><EditOutlined />Chỉnh sửa sản phẩm</div>}
          open={editProductVisible}
          onCancel={() => closeModal('product')}
          footer={null} width={700}
        >
          <Form form={productForm} layout="vertical" onFinish={handleUpdateProduct}>
            {renderProductForm(false)}
          </Form>
        </Modal>

        {/* Product Create Modal */}
        <Modal
          title={<div className="modal-title"><PlusOutlined />Thêm sản phẩm mới</div>}
          open={createProductVisible}
          onCancel={() => closeModal('create')}
          footer={null} width={700}
        >
          <Form form={createForm} layout="vertical" onFinish={handleCreateProduct}>
            {renderProductForm(true)}
          </Form>
        </Modal>
      </>
    );
  }

  /**
   * Render form sản phẩm (dùng chung cho edit và create)
   * @param {boolean} isCreate - True nếu là form tạo mới
   */
  function renderProductForm(isCreate) {
    return (
      <div className="form-section">
        <Form.Item name="name" label="Tên sản phẩm"
          rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}>
          <Input placeholder="Nhập tên sản phẩm" size="large" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="price" label="Giá (đ)"
              rules={[
                { required: true, message: 'Vui lòng nhập giá' },
                { type: 'number', min: 0, message: 'Giá phải lớn hơn 0' }
              ]}>
              <InputNumber placeholder="Nhập giá sản phẩm" size="large" style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="available_quantity" label="Số lượng"
              rules={[
                { required: true, message: 'Vui lòng nhập số lượng' },
                { type: 'number', min: isCreate ? 1 : 0, message: `Số lượng phải lớn hơn ${isCreate ? 0 : -1}` }
              ]}>
              <InputNumber placeholder="Nhập số lượng" size="large" style={{ width: '100%' }}
                min={isCreate ? 1 : 0} />
            </Form.Item>
          </Col>
        </Row>

        {isCreate && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categories" label="Danh mục"
                rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 danh mục' }]}>
                <Select mode="multiple" placeholder="Chọn danh mục sản phẩm" allowClear size="large">
                  {categories.map(cat => <Option key={cat.id} value={cat.id}>{cat.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="product_condition" label="Tình trạng"
                rules={[{ required: true, message: 'Vui lòng chọn tình trạng sản phẩm' }]}>
                <Select placeholder="Chọn tình trạng sản phẩm" size="large">
                  {productConditions.map(condition => 
                    <Option key={condition.id} value={condition.id}>{condition.name}</Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        {!isCreate && (
          <Form.Item name="categories" label="Danh mục">
            <Select mode="multiple" placeholder="Chọn danh mục sản phẩm" allowClear size="large">
              {categories.map(cat => <Option key={cat.id} value={cat.id}>{cat.name}</Option>)}
            </Select>
          </Form.Item>
        )}

        <Form.Item name="note" label="Mô tả sản phẩm"
          rules={isCreate ? [{ required: true, message: 'Vui lòng nhập mô tả sản phẩm' }] : []}>
          <TextArea rows={4} placeholder="Mô tả chi tiết về sản phẩm" />
        </Form.Item>

        <Form.Item name="images" label="Hình ảnh sản phẩm"
          rules={isCreate ? [{ required: true, message: 'Vui lòng chọn ít nhất 1 hình ảnh' }] : []}>
          <div className="upload-container-custom">
            {/* Upload section */}
            <div className="upload-section">
              <Upload 
                showUploadList={false}
                multiple
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) {
                    messageApi.error('Chỉ có thể upload file hình ảnh!');
                    return Upload.LIST_IGNORE;
                  }
                  
                  if (selectedProductImages.length >= 5) {
                    messageApi.error('Tối đa 5 hình ảnh!');
                    return Upload.LIST_IGNORE;
                  }
                  
                  // Create preview URL
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const newImage = {
                      file: file,
                      preview: e.target.result,
                      name: file.name,
                      id: Date.now() + Math.random()
                    };
                    setSelectedProductImages(prev => [...prev, newImage]);
                  };
                  reader.readAsDataURL(file);
                  
                  return false; // Prevent auto upload
                }}
                accept="image/*"
              >
                <div style={{ 
                  width: 120, 
                  height: 120, 
                  border: '1px dashed #d9d9d9', 
                  borderRadius: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#fafafa'
                }}>
                  <UploadOutlined style={{ fontSize: 24, color: '#999', marginBottom: 4 }} />
                  <div className="upload-text">Chọn ảnh</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    Tối đa 5 ảnh
                  </div>
                </div>
              </Upload>
              <div className="upload-label">Chọn ảnh mới</div>
            </div>
            
            {/* Selected images preview */}
            {selectedProductImages.length > 0 && (
              <div className="selected-images-section">
                <div className="selected-images-grid">
                  {selectedProductImages.map((image, index) => (
                    <div key={image.id} className="selected-image-item">
                      <Image
                        width={58}
                        height={58}
                        src={image.preview}
                        alt={`Selected ${index + 1}`}
                        style={{ borderRadius: '6px' }}
                      />
                      <button
                        className="selected-image-remove"
                        onClick={() => {
                          setSelectedProductImages(prev => 
                            prev.filter(img => img.id !== image.id)
                          );
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="upload-label">Ảnh đã chọn ({selectedProductImages.length})</div>
              </div>
            )}
            
            {/* Hiển thị ảnh hiện tại nếu đang edit */}
            {!isCreate && selectedProduct?.image && (
              <div className="current-image-section">
                <Image
                  width={120}
                  height={120}
                  src={selectedProduct.image}
                  alt="Current product"
                  style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
                />
                <div className="upload-label">Ảnh hiện tại</div>
              </div>
            )}
          </div>
        </Form.Item>

        <Form.Item className="form-actions">
          <Space>
            <Button size="large" className="cancel-btn" 
              onClick={() => closeModal(isCreate ? 'create' : 'product')}>Hủy</Button>
            <Button type="primary" htmlType="submit" 
              icon={isCreate ? <PlusOutlined /> : <SaveOutlined />} size="large" className="submit-btn">
              {isCreate ? 'Tạo sản phẩm' : 'Cập nhật sản phẩm'}
            </Button>
          </Space>
        </Form.Item>
      </div>
    );
  }
};

export default MyStore;