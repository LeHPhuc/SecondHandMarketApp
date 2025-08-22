import React, { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Row, Col, Image, Button, InputNumber, Tag, Rate,
  Divider, Avatar, Input, Upload, Modal, Empty, Spin, Pagination,
  App // Thêm App để sử dụng message từ context
} from "antd";
import {
  ShopOutlined, HeartOutlined, ShareAltOutlined, ShoppingCartOutlined,
  PlusOutlined, SendOutlined, ArrowLeftOutlined, CameraOutlined,
  EyeOutlined, MessageOutlined, StarOutlined, UserOutlined
} from "@ant-design/icons";
import APIs, { endpoints, authAPIs } from "../configs/APIs";
import { MyUserContext } from "../configs/Context";
import "../css/ProductDetail.css";
import cookie from "react-cookies";

const { TextArea } = Input;

const ProductDetail = () => {
  const { message } = App.useApp(); // Lấy message từ App context
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useContext(MyUserContext);
  
  const [product, setProduct] = useState(null);
  const [comments, setComments] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  
  // Comment states
  const [commentText, setCommentText] = useState("");
  const [commentImages, setCommentImages] = useState([]);
  const [commentRating, setCommentRating] = useState(5);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  // Kiểm tra đăng nhập từ context
  const isLoggedIn = user !== null && user !== undefined && Object.keys(user || {}).length > 0;


  useEffect(() => {
    loadProductDetail();
    loadComments();
  }, [id]);

  useEffect(() => {
    loadComments();
  }, [currentPage]);

  useEffect(() => {
    if (product?.categories?.length > 0) {
      loadRelatedProducts();
    }
  }, [product]);

  const loadProductDetail = async () => {
    try {
      setLoading(true);
      const response = await APIs.get(`${endpoints["product"]}${id}/`);
      setProduct(response.data);
    } catch (error) {
      console.error("Error loading product:", error);
      message.error("Không thể tải thông tin sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      setCommentsLoading(true);
      const response = await APIs.get(`${endpoints["product"]}${id}/comments/?page=${currentPage}`);
      
      setComments(response.data.results || []);
      setTotalComments(response.data.count || 0);
      
      const backendPageSize = response.data.results?.length || pageSize;
      setPageSize(backendPageSize);
      
    } catch (error) {
      console.error("Error loading comments:", error);
      setComments([]);
      setTotalComments(0);
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadRelatedProducts = async () => {
    try {
      const categoryId = product.categories[0]?.id;
      if (categoryId) {
        const response = await APIs.get(`${endpoints["product"]}?category_id=${categoryId}&limit=8`);
        const filtered = response.data.results?.filter(p => p.id !== parseInt(id)) || [];
        setRelatedProducts(filtered.slice(0, 6));
      }
    } catch (error) {
      console.error("Error loading related products:", error);
      setRelatedProducts([]);
    }
  };

  const showLoginModal = () => {
    setLoginModalVisible(true);
  };

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      showLoginModal();
      return;
    }

    if (!product.available_quantity) {
      message.warning("Sản phẩm đã hết hàng");
      return;
    }

    try {
      message.loading({ content: 'Đang thêm vào giỏ hàng...', key: 'addCart' });

      await authAPIs().post(endpoints.addproductcart, {
        product_id: parseInt(id),
        quantity: quantity
      });

      message.success({ 
        content: `Đã thêm ${quantity} sản phẩm vào giỏ hàng`, 
        key: 'addCart' 
      });
      setQuantity(1);

    } catch (error) {
      message.destroy('addCart');
      const errorMsg = error.response?.data?.error;

      if (errorMsg === "Sản phẩm không tồn tại.") {
        message.error("Sản phẩm không tồn tại");
      } else if (errorMsg === "Số lượng vượt quá số lượng sẵn có.") {
        message.warning("Số lượng vượt quá số lượng sẵn có");
        setQuantity(product.available_quantity);
      } else if (errorMsg === "Tổng số lượng vượt quá số lượng sẵn có.") {
        message.warning("Sản phẩm đã có trong giỏ, tổng số lượng vượt quá giới hạn");
      } else if (error.response?.status === 401) {
        message.error("Phiên đăng nhập hết hạn");
        setTimeout(() => navigate('/login'), 1500);
      } else {
        message.error("Có lỗi xảy ra khi thêm vào giỏ hàng");
      }
    }
  };

  const handleBuyNow = () => {
    if (!isLoggedIn) {
      showLoginModal();
      return;
    }
    
    if (product.available_quantity === 0) {
      message.error("Sản phẩm đã hết hàng");
      return;
    }
    
    if (quantity > product.available_quantity) {
      message.error(`Chỉ còn ${product.available_quantity} sản phẩm trong kho`);
      return;
    }
    
    // Tạo object sản phẩm để gửi đến CreateOrder
    const selectedProducts = [{
      product: product,
      quantity: quantity
    }];
    
    // Chuyển đến trang tạo đơn hàng
    navigate('/CreateOrder', { state: { selectedProducts } });
  };

  const handleSubmitComment = async () => {
    // Validation
    if (!commentText.trim()) {
      message.warning("Vui lòng nhập nội dung đánh giá");
      return;
    }

    if (!isLoggedIn) {
      showLoginModal();
      return;
    }

    if (!commentRating) {
      message.warning("Vui lòng chọn số sao đánh giá");
      return;
    }

    try {
      setSubmittingComment(true);
      
      const formData = new FormData();
      formData.append('content', commentText.trim());
      formData.append('rating', commentRating);
      
      commentImages.forEach(file => {
        if (file.originFileObj) {
          formData.append('images', file.originFileObj);
        }
      });

      await authAPIs().post(`${endpoints["product"]}${id}/comments/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Thành công
      setCommentText("");
      setCommentImages([]);
      setCommentRating(5);
      setCurrentPage(1);
      await loadComments();
      message.success("Đã gửi đánh giá thành công!");
      
    } catch (error) {
      const errorMsg = error.response?.data?.error;
      
      if (errorMsg === "Bạn chưa thể đánh giá sản phẩm này") {
        message.warning({
          content: "Bạn chỉ có thể đánh giá sản phẩm sau khi mua hàng và đơn hàng đã hoàn thành.",
          duration: 5
        });
      } else if (errorMsg === "Bạn đã đánh giá sản phẩm này rồi") {
        message.info({
          content: "Bạn đã đánh giá sản phẩm này rồi. Mỗi sản phẩm chỉ có thể đánh giá một lần.",
          duration: 5
        });
      } else if (errorMsg) {
        message.error(errorMsg);
      } else if (error.response?.status === 401) {
        message.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại");
        setTimeout(() => navigate('/login'), 1500);
      } else {
        message.error("Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại");
      }
      
      // Reset form cho các lỗi không thể retry
      if (errorMsg === "Bạn chưa thể đánh giá sản phẩm này" || 
          errorMsg === "Bạn đã đánh giá sản phẩm này rồi") {
        setCommentText("");
        setCommentImages([]);
        setCommentRating(5);
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleImageUpload = ({ fileList }) => {
    setCommentImages(fileList);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    const commentsSection = document.querySelector('.comments-section');
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="product-detail-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return <Empty description="Không tìm thấy sản phẩm" />;
  }

  return (
    <div className="product-detail-container">
      {/* Back Button */}
      <div className="product-detail-header">
        <Link to="/" className="back-btn">
          <ArrowLeftOutlined /> Quay lại trang chủ
        </Link>
      </div>

      <Row gutter={[32, 32]} className="product-detail-content">
        {/* Product Images */}
        <Col xs={24} md={12}>
          <div className="product-images">
            <div className="main-image">
              <Image
                src={product.images?.[selectedImage]?.image || product.image}
                alt={product.name}
                className="product-main-img"
                preview={{
                  visible: imageModalVisible,
                  onVisibleChange: setImageModalVisible
                }}
              />
              <Button 
                className="expand-btn"
                icon={<EyeOutlined />}
                onClick={() => setImageModalVisible(true)}
              >
                Xem ảnh
              </Button>
            </div>
            
            <div className="thumbnail-list">
              {product.images?.map((img, index) => (
                <div 
                  key={img.id}
                  className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={img.image} alt={`${product.name} ${index + 1}`} />
                </div>
              ))}
            </div>
          </div>
        </Col>

        {/* Product Info */}
        <Col xs={24} md={12}>
          <div className="product-info">
            <div className="product-title">
              <h1>{product.name}</h1>
              <div className="product-stats">
                <span className="purchases">Đã bán: {product.purchases}</span>
              </div>
            </div>

            <div className="product-price">
              <span className="current-price">
                {Number(product.price).toLocaleString()}đ
              </span>
            </div>

            <div className="product-categories">
              <span>Danh mục: </span>
              {product.categories?.map(cat => (
                <Tag key={cat.id} color="orange">{cat.name}</Tag>
              ))}
            </div>

            {/* Thêm Product Condition */}
            {product.conditions && (
              <div className="product-condition">
                <span>Tình trạng: </span>
                <Tag 
                  color={
                    product.conditions.name.includes('Excellent') ? 'green' :
                    product.conditions.name.includes('Very Good') ? 'blue' :
                    product.conditions.name.includes('Good') ? 'orange' :
                    product.conditions.name.includes('Fair') ? 'gold' :
                    'red'
                  }
                  style={{ fontSize: '14px', padding: '4px 12px' }}
                >
                  {product.conditions.name}
                </Tag>
                <div className="condition-description">
                  <small style={{ color: '#666', fontStyle: 'italic' }}>
                    {product.conditions.description}
                  </small>
                </div>
              </div>
            )}

            <div className="product-note">
              <h4>Mô tả sản phẩm:</h4>
              <p>{product.note}</p>
            </div>

            <div className="product-quantity">
              <span>Số lượng:</span>
              <InputNumber
                min={1}
                max={product.available_quantity}
                value={quantity}
                onChange={setQuantity}
                className="quantity-input"
              />
              <span className="available">Còn {product.available_quantity} sản phẩm</span>
            </div>

            <div className="product-actions">
              <Button 
                size="large" 
                icon={<ShoppingCartOutlined />}
                onClick={handleAddToCart}
                className="add-to-cart-btn"
                disabled={!product.available_quantity || product.available_quantity === 0}
              >
                {product.available_quantity === 0 ? "Hết hàng" : "Thêm vào giỏ hàng"}
              </Button>
              <Button 
                type="primary" 
                size="large"
                onClick={handleBuyNow}
                className="buy-now-btn"
                disabled={!product.available_quantity || product.available_quantity === 0}
              >
                {product.available_quantity === 0 ? "Hết hàng" : "Mua ngay"}
              </Button>
            </div>

            {/* Store Info */}
            <div className="store-info">
              <div className="store-header">
                <Avatar src={product.store?.avatar} size={50} />
                <div className="store-details">
                  <h4>{product.store?.name}</h4>
                </div>
              </div>
              <Button icon={<ShopOutlined />} className="visit-store-btn">
                Xem cửa hàng
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Comments Section */}
      <div className="comments-section">
        <div className="comments-header">
          <h3>
            <MessageOutlined /> Đánh giá sản phẩm ({totalComments})
          </h3>
        </div>

        {/* Comment Form */}
        {isLoggedIn ? (
          <div className="comment-form">
            <div className="comment-user">
              <Avatar src={user?.avatar} size={40} />
              <span>{user?.name}</span>
            </div>
            
            <div className="rating-input">
              <span>Đánh giá của bạn:</span>
              <Rate 
                value={commentRating} 
                onChange={setCommentRating}
                className="comment-rating"
              />
            </div>

            <TextArea
              placeholder="Chia sẻ đánh giá về sản phẩm..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              className="comment-input"
            />
            
            <div className="comment-actions">
              <Upload
                listType="picture-card"
                fileList={commentImages}
                onChange={handleImageUpload}
                beforeUpload={() => false}
                className="comment-upload"
              >
                {commentImages.length < 4 && (
                  <div>
                    <CameraOutlined />
                    <div>Thêm ảnh</div>
                  </div>
                )}
              </Upload>
              <Button 
                type="primary" 
                icon={!submittingComment && <SendOutlined />}
                onClick={handleSubmitComment}
                loading={submittingComment}
                disabled={submittingComment || !commentText.trim()}
                className="submit-comment-btn"
                size="large"
              >
                {submittingComment ? "Đang gửi..." : "Gửi đánh giá"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="login-prompt">
            <UserOutlined className="login-icon" />
            <p>
              <Link to="/login">Đăng nhập</Link> để viết đánh giá về sản phẩm
            </p>
          </div>
        )}

        {/* Comments List */}
        <div className="comments-list">
          {commentsLoading ? (
            <div className="comments-loading">
              <Spin size="large" />
              <p>Đang tải đánh giá...</p>
            </div>
          ) : comments.length > 0 ? (
            <>
              {comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <Avatar src={comment.user.avatar} size={40} />
                    <div className="comment-user-info">
                      <span className="comment-user-name">{comment.user.name}</span>
                      <div className="comment-meta">
                        <Rate 
                          disabled 
                          value={comment.rating || 0} 
                          size="small"
                          className="comment-rating-display"
                        />
                        <span className="comment-date">
                          {new Date(comment.created_date).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="comment-content">
                    <p>{comment.content}</p>
                    {comment.images?.length > 0 && (
                      <div className="comment-images">
                        {comment.images.map(img => (
                          <Image
                            key={img.id}
                            src={img.image}
                            width={100}
                            height={100}
                            className="comment-img"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Pagination - chỉ hiện khi có nhiều hơn 1 trang */}
              {totalComments > pageSize && (
                <div className="comments-pagination">
                  <Pagination
                    current={currentPage}
                    total={totalComments}
                    pageSize={pageSize}
                    onChange={handlePageChange}
                    className="custom-pagination"
                    responsive={true}
                  />
                </div>
              )}
            </>
          ) : (
            <Empty 
              description="Chưa có đánh giá nào" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="empty-comments"
            />
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="related-products">
          <h3>Sản phẩm cùng danh mục</h3>
          <Row gutter={[16, 16]}>
            {relatedProducts.map(relatedProduct => (
              <Col key={relatedProduct.id} xs={12} sm={8} md={6} lg={4}>
                <Link to={`/product/${relatedProduct.id}`} className="related-product-card">
                  <img src={relatedProduct.image} alt={relatedProduct.name} />
                  <div className="related-product-info">
                    <h4>{relatedProduct.name}</h4>
                    <span className="related-product-price">
                      {Number(relatedProduct.price).toLocaleString()}đ
                    </span>
                  </div>
                </Link>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Login Modal */}
      <Modal
        title={(
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserOutlined style={{ color: '#ff9800', fontSize: '20px' }} />
            <span>Yêu cầu đăng nhập</span>
          </div>
        )}
        open={loginModalVisible}
        onOk={() => {
          setLoginModalVisible(false);
          navigate('/login');
        }}
        onCancel={() => setLoginModalVisible(false)}
        okText="Đăng nhập ngay"
        cancelText="Để sau"
        centered
        zIndex={1000}
        okButtonProps={{
          style: {
            background: '#ff9800',
            borderColor: '#ff9800',
            fontWeight: 600
          }
        }}
        cancelButtonProps={{
          style: {
            borderColor: '#ff9800',
            color: '#ff9800'
          }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ margin: 0, fontSize: '16px' }}>
            Bạn cần đăng nhập để thực hiện chức năng này
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ProductDetail;
