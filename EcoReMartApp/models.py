from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from decimal import Decimal
import uuid
from django.utils.timezone import now
class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Người quản trị'),
        ('CUSTOMER', 'Khách hàng'),
    )
    uid = models.CharField(max_length=128, unique=True,null=True,blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CUSTOMER')
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    avatar = models.ImageField(upload_to='EcoReMartAppAvt/', blank=True, null=True)
    username = models.CharField(max_length=128, unique=True, null=True,blank=True)
    @property
    def is_admin(self):
        return self.role == 'ADMIN'

    @property
    def is_customer(self):
        return self.role == 'CUSTOMER'

    @property
    def is_customer_with_store(self):
        return self.role == 'CUSTOMER' and hasattr(self, 'store')
    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return f"{self.email} - {self.get_role_display()}"


class DeliveryInformation(models.Model):
    name = models.CharField(max_length=45)
    phone_number = models.CharField(max_length=10)
    address = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delivery_infos')
    class Meta:
        unique_together = ('user','name', 'phone_number', 'address'),

    def __str__(self):
        return f"{self.user} - {self.address}"


class Store(models.Model):
    name = models.CharField(max_length=45,unique=True)
    phone_number = models.CharField(max_length=10)
    introduce = models.CharField(max_length=150)
    address = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to='EcoReMartAppAvt/', blank=True, null=True)
    created_date = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='store')

    @property
    def owner(self):
        return self.user

    def __str__(self):
        return self.name


class ProductCondition(models.Model):
    name = models.CharField(max_length=45,unique=True)
    description = models.CharField(max_length=150)

    def __str__(self):
        return f"{self.name} - {self.description}"




class Product(models.Model):
    name = models.CharField(max_length=45)
    note = models.CharField(max_length=100, null=True, blank=True)
    available_quantity = models.IntegerField()
    created_date = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0,verbose_name="Giá bán" )
    purchases = models.PositiveIntegerField(default=0)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    product_condition = models.ForeignKey(ProductCondition, on_delete=models.SET_NULL, null=True)
    class Meta:
        ordering = ['-created_date']

    @property
    def owner(self):
        return self.store.user

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=45,unique=True)
    products = models.ManyToManyField(Product, through='ProductCategory',related_name='categories')

    def __str__(self):
        return self.name


class ProductCategory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.product.name} - {self.category.name}"

class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='product_images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ảnh của {self.product.name}"

class OrderStatus(models.Model):
    status_name = models.CharField(max_length=45)

    def __str__(self):
        return self.status_name


class Order(models.Model):
    order_code = models.CharField(max_length=20, unique=True, blank=True)
    order_date = models.DateTimeField(auto_now_add=True)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    note = models.CharField(max_length=45, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='orders')
    order_status = models.ForeignKey(OrderStatus, on_delete=models.SET_NULL, null=True)
    products = models.ManyToManyField(Product,through='OrderItem')
    voucher = models.ForeignKey('Voucher', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')


    # def calculate_total(self):
    #     total = sum(
    #         item.product.price * item.quantity
    #         for item in self.order_items.all()
    #     )
    #     if self.voucher and self.voucher.discount_percent:
    #         total -= total * (self.voucher.discount_percent / 100)
    #     return round(total, 2)

    # def save(self, *args, **kwargs):
    #     is_new = self.pk is None  # Kiểm tra đây là đơn hàng mới
    #     if not self.order_code:
    #         self.order_code = self.generate_order_code()
    #     super().save(*args, **kwargs)  # Lưu lần đầu để có self.pk
    #     if is_new:
    #         self.total_cost = self.calculate_total()
    #         super().save(update_fields=['total_cost'])  # Cập nhật total_cost

    def generate_order_code(self):
        from django.utils.timezone import now
        base_code = now().strftime("ERM%Y%m%d%H%M%S")
        while Order.objects.filter(order_code=base_code).exists():
            base_code = base_code + str(uuid.uuid4())[:4].upper()
        return base_code

    def save(self, *args, **kwargs):
        if not self.order_code:
            self.order_code = self.generate_order_code()
        super().save(*args, **kwargs)  # Lưu lần đầu để có self.pk

    @property
    def owner(self):
        return self.user
    def __str__(self):
        return self.order_code

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    def __str__(self):
        return f"{self.order.id} - {self.product.name} x {self.quantity}"
class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    products = models.ManyToManyField(Product, through='CartItem',)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"Cart of {self.user.username}"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'product')

    def __str__(self):
        return f"{self.quantity} x {self.product.name} in cart of {self.cart.user.username}"

class Comment(models.Model):
    content = models.TextField()
    created_date = models.DateTimeField(auto_now_add=True)
    rating = models.PositiveSmallIntegerField(
        choices=[(i, str(i)) for i in range(1, 6)],
        default=5,
        help_text="Đánh giá từ 1 đến 5 sao"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='comments')
    class Meta:
        unique_together = ('user', 'product')

    @property
    def owner(self):
        return self.user
    def __str__(self):
        return f"{self.user} - {self.product} - {self.content}"

class CommentImage(models.Model):
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='comment_images/')
    def __str__(self):
        return str(self.id)

class Voucher(models.Model):
    code = models.CharField(max_length=8, unique=True, blank=True, verbose_name="Mã voucher")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả")
    discount_percent = models.PositiveIntegerField(
        blank=True, null=True, verbose_name="Giảm (%)"
    )
    min_order_value = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True, verbose_name="Đơn tối thiểu"
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name="Số lượng")
    used_count = models.PositiveIntegerField(default=0, verbose_name="Đã sử dụng")

    start_date = models.DateTimeField(default=timezone.now, verbose_name="Ngày bắt đầu")
    expiry_date = models.DateTimeField(verbose_name="Ngày hết hạn")

    is_active = models.BooleanField(default=True, verbose_name="Đang hoạt động")

    users_used = models.ManyToManyField(User, blank=True,related_name='vouchers_used')

    def __str__(self):
        return self.code or "(chưa có mã)"

    def save(self, *args, **kwargs):
        if not self.code:
            import string, random
            while True:
                code = ''.join(random.choices(string.ascii_uppercase, k=8))
                if not Voucher.objects.filter(code=code).exists():
                    self.code = code
                    break
        super().save(*args, **kwargs)

    def is_valid(self):
        now = timezone.now()
        return (
                self.is_active and
                self.start_date <= now <= self.expiry_date and
                self.used_count < self.quantity
        )