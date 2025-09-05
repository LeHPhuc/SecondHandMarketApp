import React, { useReducer } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout, ConfigProvider, App as AntdApp } from 'antd'; // Thêm ConfigProvider và App
import viVN from 'antd/locale/vi_VN'; // Thêm locale tiếng Việt
import './App.css';
import Header from './layout/Header';
import Footer from './layout/Footer';
import Home from './components/Home';
import ProductDetail from './components/ProductDetail';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Cart from './components/Cart';
import CreateOrder from './components/CreateOrder';
import MyStore from './components/MyStore';
import MyOrders from './components/MyOrders';
import StoreOrders from './components/StoreOrders';
import CreateStore from './components/CreateStore';
import MyUserReducer from './reducers/MyUserReducer'
import Profile from './components/Profile';
import { MyUserContext, MyDispatchContext } from './configs/Context';
import cookie from "react-cookies";  
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';

const { Content } = Layout;

function App() {  
  const [user, dispatch] = useReducer(MyUserReducer, cookie.load("user") || null);

  return (
    <ConfigProvider 
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#ff9800',
        }
      }}
    >
      <AntdApp> {/* Bọc bằng AntdApp để message hoạt động */}
        <MyUserContext.Provider value={user}>
          <MyDispatchContext.Provider value={dispatch}>
            <Layout className="app-layout">
              <Header />
              <Content className="app-content">
                <Routes>
                  <Route path='/' element={<Home />} />
                  <Route path='/product/:id' element={<ProductDetail />}>
                  </Route>
                  <Route path='/login' element={<Login />} />
                  <Route path='/register' element={<Register />} />
                  <Route path='/forgot-password' element={<ForgotPassword />} />
                  <Route path='/cart' element={<Cart />} />
                  <Route path='/CreateOrder' element={<CreateOrder />} />
                  <Route path='/myorders' element={<MyOrders />} />
                  <Route path='/mystore' element={<MyStore />} />
                  <Route path='/storeorders' element={<StoreOrders />} />
                  <Route path='/create-store' element={<CreateStore />} />
                  <Route path='/profile' element={<Profile />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/payment-success/:orderId" element={<PaymentSuccess />} />
                  <Route path="/payment-cancel" element={<PaymentCancel />} />
                  <Route path="/payment-cancel/:orderId" element={<PaymentCancel />} />
                  {/* Thêm các route khác nếu cần */}
                </Routes>
              </Content>
              <Footer /> 
            </Layout>
          </MyDispatchContext.Provider>
        </MyUserContext.Provider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
