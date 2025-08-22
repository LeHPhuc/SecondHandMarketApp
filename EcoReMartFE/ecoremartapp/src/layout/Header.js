
import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { 
  ShopOutlined, ShoppingCartOutlined, UserOutlined, 
  BellOutlined, HeartOutlined, MenuOutlined, LogoutOutlined,
  SettingOutlined, ProfileOutlined
} from "@ant-design/icons";
import { Badge, Drawer, Dropdown, Avatar } from "antd";
import "../css/Header.css";
import { MyUserContext,MyDispatchContext } from "../configs/Context";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Giả sử trạng thái đăng nhập (thay bằng context/redux thực tế)
  const user = useContext(MyUserContext);
  const dispatch = useContext(MyDispatchContext);
  const isLoggedIn = user !== null && user !== undefined && Object.keys(user || {}).length > 0;

  // Menu dropdown cho user đã đăng nhập
  const userMenuItems = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: <Link to="/profile">Thông tin cá nhân</Link>,
    },
    {
      key: 'orders',
      icon: <ShopOutlined />,
      label: <Link to="/myorders">Đơn hàng của tôi</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">Cài đặt tài khoản</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: () =>  dispatch({ type: "logout" }),
      danger: true,
    },
  ];

  return (
    <header className="ere-header">
      <div className="ere-container">
        {/* Logo */}
        <div className="ere-header-left">
          <Link to="/" className="ere-logo">
            <span className="ere-logo-text">
              Eco<span className="ere-logo-highlight">ReMart</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="ere-header-nav">
          <Link to="/mystore" className="ere-nav-link">
            <ShopOutlined />
            <span>Cửa hàng</span>
          </Link>
          <Link to="/wishlist" className="ere-nav-link">
            <HeartOutlined />
            <span>Yêu thích</span>
          </Link>
          <Link to="/notifications" className="ere-nav-link">
            <Badge count={0} size="small">
              <BellOutlined />
            </Badge>
            <span>Thông báo</span>
          </Link>
          <Link to="/cart" className="ere-nav-link ere-cart">
            <Badge count={0} size="small">
              <ShoppingCartOutlined />
            </Badge>
            <span>Giỏ hàng</span>
          </Link>
        </nav>

        {/* User Actions */}
        <div className="ere-header-actions">
          {!isLoggedIn ? (
            // Chưa đăng nhập
            <>
              <Link to="/login" className="ere-btn ere-btn-outline">
                <UserOutlined style={{ marginRight: 6 }} />
                Đăng nhập
              </Link>
              <Link to="/register" className="ere-btn ere-btn-primary">
                Đăng ký
              </Link>
            </>
          ) : (
            // Đã đăng nhập
            <div className="ere-user-section">
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={['click']}
                overlayClassName="ere-user-dropdown"
              >
                <div className="ere-user-info">
                  <Avatar 
                    src={user.avatar} 
                    icon={<UserOutlined />}
                    className="ere-user-avatar"
                  />
                  <div className="ere-user-details">
                    <span className="ere-user-name">{user.name}</span>
                    <span className="ere-user-greeting">Xin chào!</span>
                  </div>
                </div>
              </Dropdown>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="ere-mobile-menu-btn"
          onClick={() => setMobileMenuOpen(true)}
        >
          <MenuOutlined />
        </button>
      </div>

      {/* Mobile Drawer */}
      <Drawer
        title={
          <div className="ere-mobile-header">
            <div className="ere-logo">
              <div className="ere-logo-icon">
                <svg viewBox="0 0 100 100" className="ere-logo-svg">
                  <path d="M20 25 L30 25 L35 45 L75 45 L80 25 L90 25" 
                        stroke="#ff9800" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <circle cx="40" cy="55" r="3" fill="#ff9800"/>
                  <circle cx="70" cy="55" r="3" fill="#ff9800"/>
                  <path d="M60 15 Q70 10, 75 20 Q70 30, 60 25 Q65 20, 60 15" 
                        fill="#ff9800" opacity="0.9"/>
                </svg>
              </div>
              <span style={{ color: '#ff9800', fontWeight: 700 }}>EcoReMart</span>
            </div>
          </div>
        }
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        className="ere-mobile-drawer"
        width={300}
      >
        <div className="ere-mobile-menu">
          {isLoggedIn && (
            <div className="ere-mobile-user">
              <Avatar src={user.avatar} icon={<UserOutlined />} size={50} />
              <div>
                <div className="ere-mobile-user-name">{user.name}</div>
                <div className="ere-mobile-user-email">{user.email}</div>
              </div>
            </div>
          )}
          
          <Link to="/mystore" className="ere-mobile-link">
            <ShopOutlined /> Cửa hàng
          </Link>
          <Link to="/wishlist" className="ere-mobile-link">
            <HeartOutlined /> Yêu thích
          </Link>
          <Link to="/cart" className="ere-mobile-link">
            <ShoppingCartOutlined /> Giỏ hàng
          </Link>
          
          {!isLoggedIn ? (
            <>
              <Link to="/login" className="ere-mobile-link">
                <UserOutlined /> Đăng nhập
              </Link>
              <Link to="/register" className="ere-mobile-link">
                <UserOutlined /> Đăng ký
              </Link>
            </>
          ) : (
            <>
              <Link to="/profile" className="ere-mobile-link">
                <ProfileOutlined /> Thông tin cá nhân
              </Link>
              <Link to="/myorders" className="ere-mobile-link">
                <ShopOutlined /> Đơn hàng của tôi
              </Link>
              <Link to="/settings" className="ere-mobile-link">
                <SettingOutlined /> Cài đặt
              </Link>
              <button 
                className="ere-mobile-link ere-logout-btn"
                onClick={() => dispatch({ type: "logout" })}
              >
                <LogoutOutlined /> Đăng xuất
              </button>
            </>
          )}
        </div>
      </Drawer>
    </header>
  );
};

export default Header;