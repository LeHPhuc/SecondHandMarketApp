import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Card, Input, Button, Form, message, Typography, 
  Row, Col, Alert 
} from "antd";
import {
  UserOutlined, LockOutlined, MailOutlined, 
  LoginOutlined, EyeInvisibleOutlined, EyeTwoTone, 
  HomeOutlined, ExclamationCircleOutlined, SendOutlined
} from "@ant-design/icons";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import APIs, { endpoints } from "../configs/APIs";
import cookie from "react-cookies";
import { MyDispatchContext } from "../configs/Context";
import "../css/Login.css";

const { Title, Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [sendingVerification, setSendingVerification] = useState(false);
  const navigate = useNavigate();
  const dispatch = useContext(MyDispatchContext);

  const handleLogin = async (values) => {
    const { email, password } = values;
    
    try {
      setLoading(true);
      setError("");
      setShowVerificationAlert(false);
      
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      // Save token
      cookie.save("id_token", idToken);
      
      // Call backend API
      const res = await APIs.post(endpoints.login, {}, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      
      // Save user data
      cookie.save("user", res.data);
      // Update context
      dispatch({ type: "login", payload: res.data });
      
      message.success("Đăng nhập thành công!");
      
      // Redirect to home or previous page
      setTimeout(() => {
        navigate('/');
      }, 1000);
      
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "Đăng nhập thất bại! Vui lòng thử lại.";
      
      // Xử lý lỗi Firebase
      if (error.code === 'auth/invalid-credential') {
        errorMessage = "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "Email này chưa được đăng ký. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Mật khẩu không đúng. Vui lòng kiểm tra lại hoặc đặt lại mật khẩu.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Định dạng email không hợp lệ.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau vài phút.";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "Tài khoản này đã bị vô hiệu hóa.";
      }
      
      // Xử lý lỗi từ backend
      if (error.response?.data?.error === "Email chưa được xác minh") {
        setVerificationEmail(email);
        setShowVerificationAlert(true);
        return; // Không hiển thị error message, hiển thị verification alert thay thế
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setSendingVerification(true);
      
      // Đăng nhập Firebase để lấy user object (không lưu vào context)
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        verificationEmail, 
        form.getFieldValue('password')
      );
      
      // Gửi email xác minh
      await sendEmailVerification(userCredential.user);
      
      message.success("Email xác minh đã được gửi! Vui lòng kiểm tra hộp thư của bạn.");
      
      // Đăng xuất khỏi Firebase (không lưu session)
      await auth.signOut();
      
      setShowVerificationAlert(false);
      
    } catch (error) {
      console.error("Resend verification error:", error);
      
      let errorMessage = "Không thể gửi email xác minh. Vui lòng thử lại.";
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage = "Quá nhiều lần gửi email. Vui lòng thử lại sau vài phút.";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "Mật khẩu không đúng. Vui lòng nhập lại mật khẩu.";
      }
      
      message.error(errorMessage);
    } finally {
      setSendingVerification(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
          <Col xs={22} sm={18} md={14} lg={10} xl={8}>
            <Card className="login-card">
              {/* Header */}
              <div className="login-header">
                <div className="login-logo">
                  <div className="logo-icon">
                    <UserOutlined />
                  </div>
                </div>
                <Title level={2} className="login-title">
                  Đăng nhập EcoReMart
                </Title>
                <Text className="login-subtitle">
                  Chào mừng bạn quay trở lại!
                </Text>
              </div>

              {/* Email Verification Alert */}
              {showVerificationAlert && (
                <Alert
                  message="Email chưa được xác minh"
                  description={
                    <div className="verification-alert-content">
                      <p>
                        Tài khoản <strong>{verificationEmail}</strong> chưa được xác minh. 
                        Vui lòng kiểm tra email và nhấp vào liên kết xác minh.
                      </p>
                      <p>Không nhận được email?</p>
                      <Button
                        type="primary"
                        size="small"
                        icon={<SendOutlined />}
                        loading={sendingVerification}
                        onClick={handleResendVerification}
                        className="resend-verification-btn"
                      >
                        {sendingVerification ? "Đang gửi..." : "Gửi lại email xác minh"}
                      </Button>
                    </div>
                  }
                  type="warning"
                  icon={<ExclamationCircleOutlined />}
                  showIcon
                  closable
                  onClose={() => setShowVerificationAlert(false)}
                  className="verification-alert"
                />
              )}

              {/* Error Alert */}
              {error && !showVerificationAlert && (
                <Alert
                  message={error}
                  type="error"
                  icon={<ExclamationCircleOutlined />}
                  showIcon
                  closable
                  onClose={() => setError("")}
                  className="error-alert"
                />
              )}

              {/* Login Form */}
              <Form
                form={form}
                name="login"
                onFinish={handleLogin}
                autoComplete="off"
                layout="vertical"
                requiredMark={false}
                className="login-form"
                size="large"
              >
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email của bạn!' },
                    { type: 'email', message: 'Vui lòng nhập đúng định dạng email!' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined className="form-icon" />}
                    placeholder="Nhập email của bạn"
                    className="login-input"
                    autoComplete="email"
                  />
                </Form.Item>

                <Form.Item
                  label="Mật khẩu"
                  name="password"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu!' },
                    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="form-icon" />}
                    placeholder="Nhập mật khẩu của bạn"
                    className="login-input"
                    autoComplete="current-password"
                    iconRender={(visible) => 
                      visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                    }
                  />
                </Form.Item>

                <div className="login-options">
                  <Link to="/forgot-password" className="forgot-link">
                    Quên mật khẩu?
                  </Link>
                </div>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    className="login-button"
                    icon={!loading && <LoginOutlined />}
                    block
                  >
                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                  </Button>
                </Form.Item>
              </Form>

              {/* Footer */}
              <div className="login-footer">
                <div className="signup-section">
                  <Text className="signup-text">
                    Chưa có tài khoản? 
                    <Link to="/register" className="signup-link">
                      Đăng ký ngay
                    </Link>
                  </Text>
                </div>
                
                <div className="home-section">
                  <Link to="/" className="home-link">
                    <HomeOutlined /> Về trang chủ
                  </Link>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Login;
