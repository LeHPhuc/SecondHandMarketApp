from payos import PayOS, PaymentData, ItemData
from django.conf import settings
from decimal import Decimal
import json
from datetime import datetime, timedelta
from django.utils import timezone


class PayOSService:
    def __init__(self):
        self.payos = PayOS(
            client_id=settings.PAYOS_CLIENT_ID,
            api_key=settings.PAYOS_API_KEY,
            checksum_key=settings.PAYOS_CHECKSUM_KEY
        )

    def create_payment_link(self, order):
        """
        Tạo payment link cho đơn hàng
        """
        try:
            # Validate order amount
            if order.total_cost <= 0:
                return {
                    "success": False,
                    "error": "Số tiền đơn hàng không hợp lệ"
                }

            # Tạo PayOS ItemData object
            items = [
                ItemData(
                    name=f"Order {order.id}",  # Tối đa 25 ký tự
                    quantity=1,
                    price=int(order.total_cost)
                )
            ]

            # Tạo PayOS PaymentData object
            payment_data = PaymentData(
                orderCode=int(order.id),  # PayOS yêu cầu int
                amount=int(order.total_cost),  # PayOS yêu cầu int, VND
                description=f"DH{order.id}-EcoReMart",  # Tối đa 25 ký tự
                items=items,
                returnUrl=f"{settings.PAYOS_RETURN_URL}/{order.id}",
                cancelUrl=f"{settings.PAYOS_CANCEL_URL}/{order.id}",
                buyerName=order.user.first_name or order.user.username,
                buyerEmail=order.user.email,
                buyerPhone=getattr(order.delivery_info, 'phone_number', ''),
                buyerAddress=getattr(order.delivery_info, 'address', ''),
                expiredAt=int((timezone.now() + timedelta(minutes=15)).timestamp())
            )

            # Tạo payment link
            response = self.payos.createPaymentLink(payment_data)

            return {
                "success": True,
                "payment_url": response.checkoutUrl,
                "payment_data": payment_data,
                "order_code": response.orderCode,
                "qr_code": response.qrCode
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def verify_webhook(self, webhook_data):
        """
        Verify webhook từ PayOS
        """
        try:
            # PayOS sẽ tự verify signature
            verified_data = self.payos.verifyPaymentWebhookData(webhook_data)
            return {
                "success": True,
                "data": verified_data
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    # def get_payment_info(self, order_code):
    #     """
    #     Lấy thông tin thanh toán từ PayOS
    #     """
    #     try:
    #         payment_info = self.payos.getPaymentLinkInformation(order_code)
    #         return {
    #             "success": True,
    #             "data": payment_info
    #         }
    #     except Exception as e:
    #         return {
    #             "success": False,
    #             "error": str(e)
    #         }