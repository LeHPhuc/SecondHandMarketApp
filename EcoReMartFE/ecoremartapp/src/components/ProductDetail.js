import { Outlet, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Comments from './comment';

const ProductDetail = () => {
    const { id } = useParams();
  return (
    <div>
        <Link to="/">Back to Home</Link>
         <Link to="/product/9/comments">Product Comments</Link>
      <h1>Product Detail: {id}</h1>
      <Outlet />
    </div>
  );
};

export default ProductDetail;
