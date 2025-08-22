import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Steps, Form, Input, Button, Upload, Card, Row, Col, notification, App } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, LockOutlined, UploadOutlined } from "@ant-design/icons";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import APIs, { endpoints } from "../configs/APIs";

const { Step } = Steps;

const Register = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [userData, setUserData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    avatar: null
  });
  const [avatarPreview, setAvatarPreview] = useState(null);

  const steps = [
    {
      title: 'Thông tin tài khoản',
      description: 'Email và mật khẩu',
      icon: <MailOutlined />
    },
    {
      title: 'Thông tin cá nhân',
      description: 'Tên và số điện thoại',
      icon: <UserOutlined />
    },
    {
      title: 'Xác minh email',
      description: 'Xác nhận đăng ký',
      icon: <LockOutlined />
    }
  ];

  // Bước 1: Thông tin tài khoản
  const AccountInfoStep = () => (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <h3 style={{ textAlign: 'center', marginBottom: 24 }}>Thông tin tài khoản</h3>
      <Form.Item
        name="email"
        rules={[
          { required: true, message: 'Vui lòng nhập email!' },
          { type: 'email', message: 'Email không hợp lệ!' }
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="Email"
          size="large"
        />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[
          { required: true, message: 'Vui lòng nhập mật khẩu!' },
          { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Mật khẩu"
          size="large"
        />
      </Form.Item>
      <Form.Item
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Xác nhận mật khẩu"
          size="large"
        />
      </Form.Item>
    </div>
  );

  // Bước 2: Thông tin cá nhân
  const PersonalInfoStep = () => (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <h3 style={{ textAlign: 'center', marginBottom: 24 }}>Thông tin cá nhân</h3>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="first_name"
            rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
          >
            <Input
              placeholder="Tên"
              size="large"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="last_name"
            rules={[{ required: true, message: 'Vui lòng nhập họ!' }]}
          >
            <Input
              placeholder="Họ"
              size="large"
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        name="phone_number"
        rules={[
          { required: true, message: 'Vui lòng nhập số điện thoại!' },
          { pattern: /^\d{10}$/, message: 'Số điện thoại phải có 10 chữ số!' }
        ]}
      >
        <Input
          prefix={<PhoneOutlined />}
          placeholder="Số điện thoại (10 chữ số)"
          size="large"
        />
      </Form.Item>
      <Form.Item name="avatar" label="Ảnh đại diện (tùy chọn)">
        <Upload
          beforeUpload={() => false}
          onChange={(info) => {
            if (info.file) {
              setUserData(prev => ({...prev, avatar: info.file}));
              // Tạo URL preview cho ảnh
              const reader = new FileReader();
              reader.onload = (e) => setAvatarPreview(e.target.result);
              reader.readAsDataURL(info.file);
            }
          }}
          maxCount={1}
          accept="image/*"
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />}>Chọn ảnh đại diện</Button>
        </Upload>
        {avatarPreview && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <img
              src={avatarPreview}
              alt="Avatar preview"
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #d9d9d9'
              }}
            />
          </div>
        )}
      </Form.Item>
    </div>
  );

  // Bước 3: Xác minh email
  const VerificationStep = () => (
    <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
      <h3>Xác minh email</h3>
      <p>Chúng tôi đã gửi email xác minh đến:</p>
      <p style={{ fontWeight: 'bold', color: '#1890ff' }}>{userData.email}</p>
      <p>Vui lòng kiểm tra email và nhấp vào liên kết xác minh để hoàn tất đăng ký.</p>
      
      <div style={{ marginTop: 24 }}>
        <Button 
          type="primary" 
          onClick={handleCompleteRegistration} 
          loading={loading}
          style={{ marginRight: 16 }}
        >
          Tôi đã xác minh email
        </Button>
        
        <Button 
          onClick={handleResendEmail}
          disabled={loading}
        >
          Gửi lại email xác minh
        </Button>
      </div>
      
      <p style={{ marginTop: 16, fontSize: '12px', color: '#888' }}>
        Không nhận được email? Kiểm tra thư mục spam hoặc nhấp "Gửi lại email xác minh"
      </p>
    </div>
  );

  const next = async () => {
    try {
      const values = await form.validateFields();
      
      if (current === 0) {
        // Bước 1: Tạo tài khoản Firebase
        setLoading(true);
        try {
          setUserData(prev => ({
            ...prev,
            email: values.email,
            password: values.password
          }));
          
          const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
          await sendEmailVerification(userCredential.user);
          message.success("Email xác minh đã được gửi!");
          notification.success({
            message: 'Thành công',
            description: 'Email xác minh đã được gửi!',
            placement: 'topRight',
          });
          setCurrent(current + 1);
        } catch (error) {
          // Xử lý các lỗi Firebase cụ thể
          let errorMessage = "";
          
          if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.";
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Email không hợp lệ. Vui lòng kiểm tra lại.";
          } else if (error.code === 'auth/weak-password') {
            errorMessage = "Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.";
          } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = "Đăng ký bằng email/mật khẩu chưa được kích hoạt.";
          } else if (error.code === 'auth/too-many-requests') {
            errorMessage = "Quá nhiều yêu cầu. Vui lòng thử lại sau.";
          } else {
            errorMessage = "Lỗi tạo tài khoản: " + (error.message || "Đã xảy ra lỗi không xác định.");
          }
          
          message.error(errorMessage);
          notification.error({
            message: 'Lỗi đăng ký',
            description: errorMessage,
            placement: 'topRight',
            duration: 4.5,
          });
        } finally {
          setLoading(false);
        }
      } else if (current === 1) {
        // Bước 2: Lưu thông tin cá nhân và chuyển đến xác minh
        setUserData(prev => ({
          ...prev,
          first_name: values.first_name,
          last_name: values.last_name,
          phone_number: values.phone_number
        }));
        setCurrent(current + 1);
      }
    } catch (error) {
      message.error("Vui lòng kiểm tra lại thông tin!");
    }
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const handleCompleteRegistration = async () => {
    setLoading(true);
    try {
      // Lấy ID token từ Firebase
      const user = auth.currentUser;
      if (!user) {
        message.error("Không tìm thấy thông tin người dùng!");
        return;
      }

      // Làm mới thông tin người dùng để cập nhật trạng thái xác minh
      await user.reload();
      
      if (!user.emailVerified) {
        message.warning("Vui lòng xác minh email trước khi tiếp tục!");
        return;
      }

      // Validate dữ liệu trước khi gửi API
      if (!userData.first_name || !userData.last_name || !userData.phone_number || !userData.email || !userData.password) {
        message.error("Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại!");
        return;
      }

      if (!/^\d{10}$/.test(userData.phone_number)) {
        message.error("Số điện thoại phải có đúng 10 chữ số!");
        return;
      }

      // Lấy ID token mới sau khi xác minh email
      const idToken = await user.getIdToken(true);

      // Tạo FormData để gửi file
      const formData = new FormData();
      formData.append('idToken', idToken);
      formData.append('first_name', userData.first_name);
      formData.append('last_name', userData.last_name);
      formData.append('phone_number', userData.phone_number);
      formData.append('password', userData.password);
      
      if (userData.avatar) {
        formData.append('avatar', userData.avatar);
      }

      // Gọi API đăng ký
      const response = await APIs.post(endpoints.register, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      message.success("Đăng ký thành công!");
      notification.success({
        message: 'Đăng ký thành công!',
        description: 'Chào mừng bạn đến với EcoReMart! Đang chuyển đến trang đăng nhập...',
        placement: 'topRight',
      });
      
      // Chuyển đến trang đăng nhập sau khi đăng ký thành công
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error) {
      
      let errorMessage = "Đã xảy ra lỗi khi đăng ký.";
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        
        // Hiển thị chi tiết lỗi nếu có
        if (error.response.data.details) {
          errorMessage += ` Chi tiết: ${error.response.data.details}`;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Hiển thị lỗi cụ thể cho các trường hợp thường gặp
      if (errorMessage.includes("Lưu người dùng thất bại")) {
        // Kiểm tra lỗi duplicate email
        if (error.response?.data?.details && error.response.data.details.includes("Duplicate entry") && error.response.data.details.includes("email")) {
          errorMessage = "Email này đã được đăng ký trong hệ thống. Vui lòng sử dụng email khác hoặc đăng nhập.";
        } else {
          errorMessage = "Không thể lưu thông tin người dùng. Vui lòng kiểm tra lại thông tin và thử lại.";
        }
      } else if (errorMessage.includes("Duplicate entry") && errorMessage.includes("email")) {
        errorMessage = "Email này đã được đăng ký trong hệ thống. Vui lòng sử dụng email khác hoặc đăng nhập.";
      }
      
      message.error("Lỗi đăng ký: " + errorMessage);
      notification.error({
        message: 'Lỗi đăng ký',
        description: errorMessage,
        placement: 'topRight',
        duration: 6,
      });

      // Nếu là lỗi email trùng lặp, cho phép user quay lại bước đầu
      if (errorMessage.includes("Email này đã được đăng ký")) {
        setTimeout(() => {
          if (window.confirm("Bạn có muốn quay lại và thử với email khác không?")) {
            setCurrent(0);
            form.resetFields();
            setUserData({
              email: "",
              password: "",
              first_name: "",
              last_name: "",
              phone_number: "",
              avatar: null
            });
            setAvatarPreview(null);
          }
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        message.error("Không tìm thấy thông tin người dùng!");
        return;
      }

      await sendEmailVerification(user);
      message.success("Email xác minh đã được gửi lại!");
      notification.success({
        message: 'Thành công',
        description: 'Email xác minh đã được gửi lại! Vui lòng kiểm tra hộp thư.',
        placement: 'topRight',
      });
    } catch (error) {
      let errorMessage = "Không thể gửi lại email xác minh.";
      if (error.code === 'auth/too-many-requests') {
        errorMessage = "Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.";
      }
      
      message.error(errorMessage);
      notification.error({
        message: 'Lỗi',
        description: errorMessage,
        placement: 'topRight',
      });
    }
  };

  const renderStepContent = () => {
    switch (current) {
      case 0:
        return <AccountInfoStep />;
      case 1:
        return <PersonalInfoStep />;
      case 2:
        return <VerificationStep />;
      default:
        return <AccountInfoStep />;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <h1 style={{ textAlign: 'center', marginBottom: 32 }}>Đăng ký tài khoản</h1>
        
        <Steps current={current} style={{ marginBottom: 32 }}>
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              icon={step.icon}
            />
          ))}
        </Steps>

        <Form form={form} layout="vertical">
          {renderStepContent()}
        </Form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          {current > 0 && current < 2 && (
            <Button style={{ margin: '0 8px' }} onClick={prev}>
              Quay lại
            </Button>
          )}
          {current < 2 && (
            <Button type="primary" onClick={next} loading={loading}>
              {current === 0 ? 'Tạo tài khoản' : 'Tiếp theo'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Register;
