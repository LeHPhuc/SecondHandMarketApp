import threading
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string

class EmailThread(threading.Thread):
    def __init__(self, subject, template_name, context, recipient_list):
        self.subject = subject
        self.template_name = template_name
        self.context = context
        self.recipient_list = recipient_list
        threading.Thread.__init__(self)

    def run(self):
        # render nội dung
        text_content = render_to_string(self.template_name, self.context)
        msg = EmailMultiAlternatives(
            self.subject,
            text_content,  # fallback text
            settings.DEFAULT_FROM_EMAIL,
            self.recipient_list,
        )
        msg.attach_alternative(text_content, "text/html")
        msg.send()

def send_async_email(subject, template_name, context, recipient_list):
    EmailThread(subject, template_name, context, recipient_list).start()
