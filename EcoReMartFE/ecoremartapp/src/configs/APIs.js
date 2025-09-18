import axios from "axios";
import cookie from "react-cookies";  
import ProductDetail from "../components/ProductDetail";

const BASE_URL = "http://127.0.0.1:8000/";
export const endpoints = {
  login:"/login/",
  register: "/register/",
  
  // USER PROFILE
  currentuser: "/users/me/",                                 // Lấy thông tin user hiện tại
  updateprofile: "/user/{id}/",                             
  
  categories: "category/",
  product: "product/",
  productDetail: "/product/{id}/",
  productComments: "/product/{id}/comments/",
  
  addproductcart:"/add-productCart/",
  mycart:"/my-cart/",
  deleteproductcart:"/delete-productCart/",
  addquantityproductcart:"/addQuantity-productCart/",

  // order: "order/",
  order: "order/",    
  deleteOrder:"order/{id}/",  
  updateOrder:"order/{id}/",                         // Cập nhật đơn hàng
  myorders: "order/my-orders/",              // Xem đơn hàng của customer
  updatecustomerorderstatus: "order/{id}/update-status/", // Customer cập nhật trạng thái

  // STORE
  store: "/store/",
  mystore:"/store/my-store/", //lấy thông tin cửa hàng của cửa hàng
  productmystore:"/store/my-products/", //lấy sản phẩm của cửa hàng
  storeorders: "/store/my-orders-store/", // lấy thông tin đơn hàng của cửa hàng
  // storeordersstatus: "store/orders-of-status/",   
  updateorderstatus: "store/update-order-status/", 
  productCreate: "product-create/",//tạo sản phẩm
  productUpdate: "/product/{id}/update-my-product/",//cập nhật sản phẩm
  ordersstatus:"/order-status/",
  updatesstore: "store/{id}/",
  voucher: "/voucher/",
  deliveryInfo:"/delivery-information/",
  updateDeliveryInfo: "/delivery-information/{id}/",
  calculateShipFee:"/shipfee/",
  
  // PayOS Payment endpoints
  createPayOSPayment: "order/{id}/create-payos-payment/",
  updatePayOSStatus: "order/{id}/update-payos-status/",
  sendOrderMail: "/send-online-mail/{order_id}/"
  
};

export const authAPIs = ()  => {
  return axios.create({
    baseURL: BASE_URL, 
    headers: {
      Authorization: `Bearer ${cookie.load("id_token")}`,
    },
  });
};

export default axios.create({
  baseURL: BASE_URL
});
