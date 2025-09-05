import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authAPIs, endpoints } from '../configs/APIs';
import '../css/PaymentResult.css';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [loading, setLoading] = useState(true);
    const [orderDetails, setOrderDetails] = useState(null);
    const [error, setError] = useState('');
    const processedRef = useRef(false);

    useEffect(() => {
        const handleSuccessfulPayment = async () => {
            if (processedRef.current) return;
            
            processedRef.current = true;
            
            try {
                setLoading(true);
                
                const currentOrderId = orderId || localStorage.getItem('current_order_id');
                const payosOrderCode = localStorage.getItem('payos_order_code');
                
                if (currentOrderId) {
                    // Lấy thông tin order hiện tại
                    const orderResponse = await authAPIs().get(`${endpoints.order}${currentOrderId}/`);
                    const existingOrder = orderResponse.data;
                    
                    // Cập nhật thông tin PayOS
                    const updateData = {
                        is_paid: true,
                        paid_at: new Date().toISOString(),
                        payos_status: 'paid',
                        payos_paid_at: new Date().toISOString(),
                        payos_transaction_id: payosOrderCode || `PAYOS_${Date.now()}`,
                        payos_order_code: parseInt(payosOrderCode || existingOrder.id)
                    };
                    
                    try {
                        // Thử custom PayOS action trước
                        const payosUpdateEndpoint = `order/${currentOrderId}/update-payos-status/`;
                        const updateResponse = await authAPIs().post(payosUpdateEndpoint, updateData);
                        
                        if (updateResponse.data && updateResponse.data.order) {
                            setOrderDetails(updateResponse.data.order);
                        } else {
                            throw new Error('Custom action failed');
                        }
                    } catch (customActionError) {
                        // Fallback: merge existingOrder + updateData
                        const completeOrderDetails = {
                            ...existingOrder,
                            ...updateData
                        };
                        setOrderDetails(completeOrderDetails);
                    }
                    
                    // Dọn dẹp localStorage
                    localStorage.removeItem('current_order_id');
                    localStorage.removeItem('payos_order_code');
                    
                } else {
                    setError('Không tìm thấy thông tin đơn hàng để cập nhật thanh toán. Vui lòng kiểm tra lại.');
                }
                
            } catch (err) {
                let errorMessage = 'Có lỗi xảy ra khi cập nhật thông tin thanh toán';
                if (err.response?.data?.detail) {
                    errorMessage = err.response.data.detail;
                } else if (err.response?.data?.error) {
                    errorMessage = err.response.data.error;
                } else if (err.message) {
                    errorMessage = err.message;
                }
                
                setError(`Lỗi cập nhật đơn hàng: ${errorMessage}`);
            } finally {
                setLoading(false);
            }
        };

        handleSuccessfulPayment();
    }, [orderId]);

    const handleContinue = () => {
        navigate('/myorders');
    };

    const handleBackToHome = () => {
        navigate('/');
    };

    if (loading) {
        return (
            <div className="payment-result-container">
                <div className="payment-result-card success">
                    <div className="result-icon">
                        <div className="loading-spinner"></div>
                    </div>
                    <h2>Đang xử lý thanh toán...</h2>
                    <p className="payment-message">Vui lòng chờ trong giây lát...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="payment-result-container">
                <div className="payment-result-card error">
                    <div className="result-icon">❌</div>
                    <h2>Có lỗi xảy ra</h2>
                    <p className="payment-message">{error}</p>
                    <div className="payment-actions">
                        <button onClick={() => navigate('/CreateOrder')} className="btn-primary">
                            Thử đặt hàng lại
                        </button>
                        <button onClick={handleBackToHome} className="btn-secondary">
                            Về trang chủ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-result-container">
            <div className="payment-result-card success">
                <div className="result-icon">✅</div>
                <h2>Thanh toán thành công!</h2>
                <p className="payment-message">
                    Đơn hàng của bạn đã được tạo và thanh toán thành công.
                </p>
                
                {orderDetails && (
                    <div className="order-summary">
                        <h3>📋 Thông tin đơn hàng</h3>
                        <div className="summary-item">
                            <span className="label">Mã đơn hàng:</span>
                            <span className="value">{orderDetails.order_code}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Tổng tiền:</span>
                            <span className="value total-amount">
                                {orderDetails.total_cost?.toLocaleString() || 'N/A'} VND
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Phương thức thanh toán:</span>
                            <span className="value">PayOS Online</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Trạng thái:</span>
                            <span className="value status-paid">✅ Đã thanh toán</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Thời gian thanh toán:</span>
                            <span className="value">
                                {orderDetails.payos_paid_at 
                                    ? new Date(orderDetails.payos_paid_at).toLocaleString('vi-VN')
                                    : new Date().toLocaleString('vi-VN')
                                }
                            </span>
                        </div>
                        {orderDetails.payos_order_code && (
                            <div className="summary-item">
                                <span className="label">Mã PayOS:</span>
                                <span className="value">{orderDetails.payos_order_code}</span>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="payment-actions">
                    <button onClick={handleContinue} className="btn-primary">
                        Xem đơn hàng của tôi
                    </button>
                    <button onClick={handleBackToHome} className="btn-secondary">
                        Về trang chủ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
