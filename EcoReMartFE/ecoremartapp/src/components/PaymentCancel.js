import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authAPIs, endpoints } from '../configs/APIs';
import '../css/PaymentResult.css';

const PaymentCancel = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [loading, setLoading] = useState(true);
    const [orderDetails, setOrderDetails] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCancelledPayment = async () => {
            try {
                setLoading(true);
                
                const currentOrderId = orderId || localStorage.getItem('current_order_id');
                
                if (currentOrderId) {
                    try {
                        // Lấy thông tin order trước khi xóa
                        const orderResponse = await authAPIs().get(`${endpoints.order}${currentOrderId}/`);
                        const existingOrder = orderResponse.data;
                        
                        // Lưu thông tin để hiển thị
                        setOrderDetails(existingOrder);
                        
                        // Xóa đơn hàng khỏi hệ thống
                        await authAPIs().delete(`${endpoints.order}${currentOrderId}/`);
                        
                        // Dọn dẹp localStorage
                        localStorage.removeItem('current_order_id');
                        localStorage.removeItem('payos_order_code');
                        
                    } catch (orderError) {
                        console.error('Error handling order deletion:', orderError);
                        
                        if (orderError.response?.status === 404) {
                            setError('Đơn hàng không tồn tại hoặc đã được xóa.');
                        } else {
                            setError('Không thể xóa đơn hàng. Vui lòng liên hệ hỗ trợ.');
                        }
                        
                        // Vẫn dọn dẹp localStorage
                        localStorage.removeItem('current_order_id');
                        localStorage.removeItem('payos_order_code');
                    }
                } else {
                    setError('Không tìm thấy thông tin đơn hàng cần hủy.');
                }
                
            } catch (error) {
                console.error('Payment cancellation error:', error);
                setError('Đã xảy ra lỗi khi xử lý hủy thanh toán.');
            } finally {
                setLoading(false);
            }
        };

        handleCancelledPayment();
    }, [orderId]);

    if (loading) {
        return (
            <div className="payment-result-container">
                <div className="payment-result-content">
                    <div className="payment-result-icon loading">
                        <div className="spinner"></div>
                    </div>
                    <h2>Đang xử lý hủy thanh toán...</h2>
                    <p>Vui lòng đợi trong giây lát.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="payment-result-container">
                <div className="payment-result-content error">
                    <div className="payment-result-icon">
                        ⚠️
                    </div>
                    <h2>Có lỗi xảy ra</h2>
                    <p className="error-message">{error}</p>
                    <div className="payment-result-actions">
                        <button onClick={() => navigate('/')} className="btn-secondary">
                            Về trang chủ
                        </button>
                        <button onClick={() => navigate('/cart')} className="btn-primary">
                            Quay lại giỏ hàng
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-result-container">
            <div className="payment-result-content cancel">
                <div className="payment-result-icon">
                    ❌
                </div>
                <h2>Thanh toán đã bị hủy</h2>
                <p>Đơn hàng đã được xóa khỏi hệ thống. Bạn có thể thử lại hoặc chọn thanh toán COD.</p>
                
                <div className="payment-result-actions">
                    <button onClick={() => navigate('/')} className="btn-primary">
                        Về trang chủ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentCancel;
