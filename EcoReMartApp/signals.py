from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Cart

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_cart_for_user(sender, instance, created, **kwargs):
    if created:
        print("🛒 Signal fired - creating cart for", instance.username)
        Cart.objects.get_or_create(user=instance)
