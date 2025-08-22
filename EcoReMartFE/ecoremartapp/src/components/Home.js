import React, { useState, useEffect, useContext } from "react";
import APIs, { endpoints, authAPIs } from "../configs/APIs";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Input, Card, Row, Col, Button, Spin, Empty, Modal, App } from "antd";
import { MyUserContext } from "../configs/Context";
import "../css/Home.css";
import {
  MenuOutlined,
  SearchOutlined,
  CarOutlined,
  SmileOutlined,
  LaptopOutlined,
  HomeOutlined,
  SkinOutlined,
  CustomerServiceOutlined,
  BookOutlined,
  TrophyOutlined,
  ManOutlined,
  WomanOutlined,
  AppstoreOutlined,
  EyeOutlined,
  ShopOutlined,
  ShoppingCartOutlined, // Thêm icon giỏ hàng
  UserOutlined, // Thêm icon user
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';

const categoryIcons = [
  <CarOutlined />,                // Xe cộ
  <SmileOutlined />,              // Đồ chơi, trò chơi
  <LaptopOutlined />,             // Đồ điện tử
  <HomeOutlined />,               // Đồ dùng nhà cửa
  <SkinOutlined />,               // Đồ làm đẹp
  <CustomerServiceOutlined />,    // Nhạc cụ
  <BookOutlined />,               // Sách
  <TrophyOutlined />,             // Thể thao
  <ManOutlined />,                // Thời trang nam
  <WomanOutlined />,              // Thời trang nữ
  <AppstoreOutlined />            // Khác
];

const Home = () => {
  const { message } = App.useApp(); // Lấy message từ App context
  const navigate = useNavigate();
  const user = useContext(MyUserContext);
  
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [next, setNext] = useState(false);
  const [previous, setPrevious] = useState(false);
  const [productsPerCategory, setProductsPerCategory] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState({}); // State cho loading button
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  // Kiểm tra đăng nhập
  const isLoggedIn = user !== null && user !== undefined && Object.keys(user || {}).length > 0;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [q, page, productsPerCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      let url = `${endpoints["product"]}?page=${page}`;
      if (q) url += `&q=${q}`;
      if (productsPerCategory) url += `&category_id=${productsPerCategory}`;
      const res = await APIs.get(url);
      setProducts(Array.isArray(res.data.results) ? res.data.results : []);
      setNext(res.data.next !== null);
      setPrevious(res.data.previous !== null);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await APIs.get(endpoints["categories"]);
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Hàm thêm vào giỏ hàng
  const handleAddToCart = async (productId, productName) => {
    if (!isLoggedIn) {
      setLoginModalVisible(true);
      return;
    }

    // Kiểm tra sản phẩm có còn hàng không
    const product = products.find(p => p.id === productId);
    if (!product || !product.available_quantity || product.available_quantity === 0) {
      message.warning("Sản phẩm đã hết hàng");
      return;
    }

    setAddingToCart(prev => ({ ...prev, [productId]: true }));

    try {
      await authAPIs().post(endpoints.addproductcart, {
        product_id: productId,
        quantity: 1
      });

      message.success(`Đã thêm "${productName}" vào giỏ hàng`);

    } catch (error) {
      const errorMsg = error.response?.data?.error;

      if (errorMsg === "Sản phẩm không tồn tại.") {
        message.error("Sản phẩm không tồn tại");
      } else if (errorMsg === "Số lượng vượt quá số lượng sẵn có.") {
        message.warning("Số lượng vượt quá số lượng sẵn có");
      } else if (errorMsg === "Tổng số lượng vượt quá số lượng sẵn có.") {
        message.info("Sản phẩm đã có trong giỏ hàng");
      } else if (error.response?.status === 401) {
        message.error("Phiên đăng nhập hết hạn");
        setTimeout(() => navigate('/login'), 1500);
      } else {
        message.error("Có lỗi xảy ra khi thêm vào giỏ hàng");
      }
    } finally {
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.home-menu-toggle') && !e.target.closest('.home-category-dropdown')) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-hero-title">
            Mua sắm thông minh với <span>EcoReMart</span>
          </h1>
          <p className="home-hero-subtitle">
            Khám phá hàng ngàn sản phẩm chất lượng với giá tốt nhất
          </p>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <div className="home-search-section">
        <div className="home-search-container">
          <Button
            className="home-category-btn"
            icon={<MenuOutlined />}
            onClick={() => setShowMenu(!showMenu)}
          >
            Danh mục
          </Button>

          {/* Category Dropdown */}
          <div className={`home-category-dropdown ${showMenu ? 'show' : ''}`}>
            <div className="home-category-header">
              <span>Chọn danh mục</span>
            </div>
            <Menu
              mode="vertical"
              selectedKeys={[productsPerCategory ? productsPerCategory.toString() : "all"]}
              className="home-category-menu"
            >
              <Menu.Item
                key="all"
                icon={<AppstoreOutlined />}
                onClick={() => { setProductsPerCategory(""); setShowMenu(false); }}
              >
                Tất cả sản phẩm
              </Menu.Item>
              {categories.map((category, idx) => (
                <Menu.Item
                  key={category.id}
                  icon={categoryIcons[idx % categoryIcons.length]}
                  onClick={() => { setProductsPerCategory(category.id); setShowMenu(false); }}
                >
                  {category.name}
                </Menu.Item>
              ))}
            </Menu>
          </div>

          <div className="home-search-box">
            <Input
              className="home-search-input"
              placeholder="Tìm kiếm sản phẩm, thương hiệu..."
              value={q}
              onChange={e => setQ(e.target.value)}
              suffix={<SearchOutlined className="home-search-icon" />}
              size="large"
            />
          </div>
        </div>
      </div>

      {/* Products Section */}
      <section className="home-products">
        <div className="home-section-header">
          <h2>Sản phẩm nổi bật</h2>
          <p>Khám phá những sản phẩm hot nhất hiện tại</p>
        </div>

        {loading ? (
          <div className="home-loading">
            <Spin size="large" />
          </div>
        ) : products.length === 0 ? (
          <Empty description="Không tìm thấy sản phẩm nào" />
        ) : (
          <Row gutter={[20, 24]} className="home-products-grid">
            {products.map((product) => (
              <Col key={product.id} xs={12} sm={12} md={8} lg={6} xl={4}>
                <Card
                  className="home-product-card"
                  cover={
                    <div className="home-card-image-wrapper">
                      <img
                        alt={product.name}
                        src={product.image}
                        className="home-card-image"
                      />
                      
                      {/* Cart Button - ở góc trên phải */}
                      <Button 
                        className="home-card-cart-btn"
                        icon={<ShoppingCartOutlined />}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToCart(product.id, product.name);
                        }}
                        loading={addingToCart[product.id]}
                        disabled={!product.available_quantity || product.available_quantity === 0}
                        title={product.available_quantity === 0 ? "Hết hàng" : "Thêm vào giỏ hàng"}
                      />
                      
                      {/* View Overlay - chỉ hiện khi hover */}
                      <div className="home-card-overlay">
                        <Link to={`/product/${product.id}`}>
                          <Button 
                            className="home-card-view-btn"
                            icon={<EyeOutlined />}
                          >
                            Xem chi tiết
                          </Button>
                        </Link>
                      </div>
                    </div>
                  }
                  bodyStyle={{ padding: 0 }}
                >
                  <div className="home-card-content">
                    <h3 className="home-card-title">{product.name}</h3>
                    <div className="home-card-price">
                      {Number(product.price).toLocaleString()} đ
                    </div>
                    <div className="home-card-meta">
                      <span className="home-card-store">
                        <ShopOutlined /> {product.store?.name}
                      </span>
                      <span className="home-card-quantity">
                        Còn: {product.available_quantity}
                      </span>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Pagination */}
        {(previous || next) && (
          <div className="home-pagination" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            marginTop: 40,
            gap: 16
          }}>
            <Button 
              icon={<LeftOutlined />}
              onClick={() => setPage(page - 1)}
              disabled={loading || !previous}
              size="large"
              shape="circle"
              className="home-pagination-btn"
            />
            <span className="home-page-info" style={{ 
              color: '#666', 
              fontWeight: 500, 
              fontSize: '14px' 
            }}>
              {page}
            </span>
            <Button 
              icon={<RightOutlined />}
              onClick={() => setPage(page + 1)}
              disabled={loading || !next}
              size="large"
              shape="circle"
              className="home-pagination-btn"
            />
          </div>
        )}
      </section>

      {/* Login Modal */}
      <Modal
        title={(
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserOutlined style={{ color: '#ff9800', fontSize: '20px' }} />
            <span>Yêu cầu đăng nhập</span>
          </div>
        )}
        open={loginModalVisible}
        onOk={() => {
          setLoginModalVisible(false);
          navigate('/login');
        }}
        onCancel={() => setLoginModalVisible(false)}
        okText="Đăng nhập ngay"
        cancelText="Để sau"
        centered
        zIndex={1000}
        okButtonProps={{
          style: {
            background: '#ff9800',
            borderColor: '#ff9800',
            fontWeight: 600
          }
        }}
        cancelButtonProps={{
          style: {
            borderColor: '#ff9800',
            color: '#ff9800'
          }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ margin: 0, fontSize: '16px' }}>
            Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Home;