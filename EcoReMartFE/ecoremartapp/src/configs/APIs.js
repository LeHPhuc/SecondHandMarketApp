import axios from "axios";

const BASE_URL = " http://127.0.0.1:8000/";
export const endpoints = {
  product: "product/",
  categories: "category/",
  store: "store/",
  order: "order/",
  productCreate: "product-create/",
};

export default axios.create({
  baseURL: BASE_URL
});
