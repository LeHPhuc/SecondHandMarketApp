
import React, { useState, useEffect } from "react";
import APIs, { endpoints } from "../configs/APIs";
import { Link } from "react-router-dom";
const Home = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [next, isNext] = useState(false);
  const [previous, isPrevious] = useState(false);
  const [productsPerCategory, setProductsPerCategory] = useState([]);
    useEffect(() => {
    loadCategories();
  }, []);
  useEffect(() => {
    loadProducts();
  }, [q,page,previous,productsPerCategory]);
  const loadProducts = async () => {
    try {
      let url = `${endpoints["product"]}?page=${page}`;
      if(q) {
        url = `${url}&q=${q}`;
      }
      if(productsPerCategory) {
        url = `${url}&category_id=${productsPerCategory}`;
      }
      const res = await APIs.get(url);
      setProducts([...res.data.results]);
      isNext(res.data.next !== null);
      isPrevious(res.data.previous !== null);
    }catch (error) {
      console.error("Error fetching products:", error);
    }
  }
  const loadCategories = async () => {
    try {
      const response = await APIs.get(endpoints["categories"]);
      console.log("Categories data:", response.data);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

const search = (e,setState) => {
  setPage(1);
  setState(e.target.value);

}

  return (
    <div>
      <h1>Categories</h1>
     <ul>
      {categories.map((category) => (
        <li key={category.id}>{category.id}:{category.name}</li>
      ))}
     </ul>

      <h1>Products</h1>
      <input type="text" placeholder="Search products..." value={q} onChange={e => search(e,setQ)} />
      <input type="number" placeholder="Category ID" value={productsPerCategory} onChange={e => search(e,setProductsPerCategory)} />
      <ul>
        {products.map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul> 
      {next && 
        <button onClick={() => setPage(page + 1)}>Next</button>
      }
      {previous && 
        <button onClick={() => setPage(page - 1)}>Previous</button>
      }
      <Link to="/product/9">Product Detail</Link>
    </div>
  );
};

export default Home;