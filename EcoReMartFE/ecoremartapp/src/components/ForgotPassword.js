import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Card, Input, Button, Form, message, Typography, 
  Row, Col, Alert, Steps
} from "antd";
import {
  MailOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, HomeOutlined
} from "@ant-design/icons";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

const { Title, Text } = Typography;
const { Step } = Steps;

const ForgotPassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();

  const handleSendResetEmail = async (values) => {
    const { email } = values;
    
    try {
      setLoading(true);
      
      // Gửi email reset password qua Firebase
      await sendPasswordResetEmail(auth, email);
      
      setResetEmail(email);
      setEmailSent(true);
      
      message.success("Email đặt lại mật khẩu đã được gửi!");
      
    } catch (error) {
      console.error("Reset password error:", error);
      
      let errorMessage = "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "Email này chưa được đăng ký. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Định dạng email không hợp lệ.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.";
      }
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, resetEmail);
      message.success("Email đã được gửi lại!");
    } catch (error) {
      message.error("Không thể gửi lại email. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="login-container">
        <div className="login-content">
          <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
            <Col xs={22} sm={18} md={14} lg={10} xl={8}>
              <Card className="login-card">
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <CheckCircleOutlined 
                    style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} 
                  />
                  <Title level={2}>Email đã được gửi!</Title>
                  <Text type="secondary">
                    Chúng tôi đã gửi liên kết đặt lại mật khẩu đến:
                  </Text>
                  <div style={{ margin: '16px 0' }}>
                    <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
                      {resetEmail}
                    </Text>
                  </div>
                </div>

                <Alert
                  message="Hướng dẫn"
                  description={
                    <div>
                      <p>1. Kiểm tra hộp thư email của bạn</p>
                      <p>2. Nhấp vào liên kết "Đặt lại mật khẩu"</p>
                      <p>3. Tạo mật khẩu mới</p>
                      <p>4. Đăng nhập với mật khẩu mới</p>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 24 }}
                />

                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <Text type="secondary">
                    Không nhận được email? Kiểm tra thư mục spam hoặc
                  </Text>
                  <Button 
                    type="link" 
                    onClick={handleResendEmail}
                    loading={loading}
                    style={{ padding: '0 4px' }}
                  >
                    gửi lại
                  </Button>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Button 
                    type="primary" 
                    onClick={() => navigate('/login')}
                    style={{ marginRight: 8 }}
                  >
                    Về trang đăng nhập
                  </Button>
                  <Link to="/">
                    <Button icon={<HomeOutlined />}>
                      Trang chủ
                    </Button>
                  </Link>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
          <Col xs={22} sm={18} md={14} lg={10} xl={8}>
            <Card className="login-card">
              {/* Header */}
              <div className="login-header">
                <Button 
                  type="text" 
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/login')}
                  style={{ marginBottom: 16 }}
                >
                  Quay lại
                </Button>
                
                <Title level={2} className="login-title">
                  Đặt lại mật khẩu?
                </Title>
                <Text className="login-subtitle">
                  Nhập email của bạn để nhận liên kết đặt lại mật khẩu
                </Text>
              </div>

              {/* Steps */}
              <Steps current={0} size="small" style={{ marginBottom: 32 }}>
                <Step title="Nhập email" />
                <Step title="Kiểm tra email" />
                <Step title="Đặt lại mật khẩu" />
              </Steps>

              {/* Reset Form */}
              <Form
                form={form}
                name="forgot-password"
                onFinish={handleSendResetEmail}
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
                    placeholder="Nhập email đã đăng ký"
                    className="login-input"
                    autoComplete="email"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    className="login-button"
                    block
                  >
                    {loading ? "Đang gửi..." : "Gửi email đặt lại mật khẩu"}
                  </Button>
                </Form.Item>
              </Form>

              {/* Footer */}
              <div className="login-footer">
                <div style={{ textAlign: 'center' }}>
                  <Text className="signup-text">
                    Nhớ lại mật khẩu? 
                    <Link to="/login" className="signup-link">
                      Đăng nhập
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

export default ForgotPassword;
