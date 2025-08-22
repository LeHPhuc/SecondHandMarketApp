import React from "react";
import { Link } from "react-router-dom";
import { 
  FacebookOutlined, TwitterOutlined, InstagramOutlined, YoutubeOutlined,
  PhoneOutlined, MailOutlined, EnvironmentOutlined 
} from "@ant-design/icons";
import "../css/Footer.css";

const Footer = () => {
  return (
    <footer className="ere-footer">
      <div className="ere-footer-content">
        <div className="ere-footer-section">
          <div className="ere-footer-brand">
            <h3 className="ere-footer-logo">
              Eco<span>ReMart</span>
            </h3>
            <p className="ere-footer-desc">
              Nền tảng thương mại điện tử hàng đầu Việt Nam, 
              mang đến trải nghiệm mua sắm tuyệt vời cho mọi người.
            </p>
            <div className="ere-footer-social">
              <a href="#" className="ere-social-link">
                <FacebookOutlined />
              </a>
              <a href="#" className="ere-social-link">
                <TwitterOutlined />
              </a>
              <a href="#" className="ere-social-link">
                <InstagramOutlined />
              </a>
              <a href="#" className="ere-social-link">
                <YoutubeOutlined />
              </a>
            </div>
          </div>
        </div>

        <div className="ere-footer-section">
          <h4 className="ere-footer-title">Về chúng tôi</h4>
          <ul className="ere-footer-links">
            <li><Link to="/about">Giới thiệu</Link></li>
            <li><Link to="/careers">Tuyển dụng</Link></li>
            <li><Link to="/news">Tin tức</Link></li>
            <li><Link to="/investors">Nhà đầu tư</Link></li>
          </ul>
        </div>

        <div className="ere-footer-section">
          <h4 className="ere-footer-title">Hỗ trợ</h4>
          <ul className="ere-footer-links">
            <li><Link to="/help">Trung tâm hỗ trợ</Link></li>
            <li><Link to="/safety">An toàn mua bán</Link></li>
            <li><Link to="/terms">Điều khoản sử dụng</Link></li>
            <li><Link to="/privacy">Chính sách bảo mật</Link></li>
          </ul>
        </div>

        <div className="ere-footer-section">
          <h4 className="ere-footer-title">Liên hệ</h4>
          <div className="ere-footer-contact">
            <div className="ere-contact-item">
              <PhoneOutlined />
              <span>1900 1234</span>
            </div>
            <div className="ere-contact-item">
              <MailOutlined />
              <span>support@ecoremart.com</span>
            </div>
            <div className="ere-contact-item">
              <EnvironmentOutlined />
              <span>123 Nguyễn Văn A, Q.1, TP.HCM</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ere-footer-bottom">
        <div className="ere-footer-bottom-content">
          <p>&copy; 2024 EcoReMart. Tất cả quyền được bảo lưu.</p>
          <div className="ere-footer-bottom-links">
            <Link to="/terms">Điều khoản</Link>
            <Link to="/privacy">Bảo mật</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
