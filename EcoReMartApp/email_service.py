from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

def send_order_success_email(user_email, context):
    subject = f"Xác nhận đơn hàng #{context['order_code']}"
    from_email = settings.DEFAULT_FROM_EMAIL

    text_content = f"""
    Xin chào {context['username']},
    Cảm ơn bạn đã đặt hàng. 
    Mã đơn: {context['order_code']}
    Tổng tiền: {context['total_cost']} VND
    """
    html_content = render_to_string("emails/order_success.html", context)

    msg = EmailMultiAlternatives(subject, text_content, from_email, [user_email])
    msg.attach_alternative(html_content, "text/html")
    msg.send()

def send_order_notification_to_store(store_email, context):
    subject = f"Đơn hàng mới #{context['order_code']}"
    from_email = settings.DEFAULT_FROM_EMAIL

    text_content = f"""
    Xin chào {context['store_name']},
    Bạn có đơn hàng mới.
    Mã đơn: {context['order_code']}
    Khách hàng: {context['username']} - {context['user_email']}
    Tổng tiền: {context['total_cost']} VND
    """
    html_content = render_to_string("emails/order_notify_store.html", context)

    msg = EmailMultiAlternatives(subject, text_content, from_email, [store_email])
    msg.attach_alternative(html_content, "text/html")
    msg.send()