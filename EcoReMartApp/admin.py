from django.contrib import admin
from django.utils.html import mark_safe
from .models import User, DeliveryInformation, Store, ProductCondition, Product, ProductCategory, \
    Category, OrderItem, Order, OrderStatus, Comment, Voucher, ProductImage,CommentImage,CartItem,Cart

admin.site.register(DeliveryInformation)
admin.site.register(ProductCondition)
admin.site.register(ProductCategory)
admin.site.register(OrderItem)
admin.site.register(OrderStatus)
admin.site.register(Voucher)

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 1
    autocomplete_fields = ['product']
class CartAdmin(admin.ModelAdmin):
    inlines = [CartItemInline]
    list_display = ('id','user')
    search_fields = ['id']
admin.site.register(Cart, CartAdmin)

class OrderItemInline(admin.TabularInline):  # hoặc admin.StackedInline nếu muốn giao diện khác
    model = OrderItem
    extra = 1  # Số dòng trống mặc định
    autocomplete_fields = ['product']  # Tùy chọn: giúp tìm nhanh sản phẩm

class OrderAdmin(admin.ModelAdmin):
    inlines = [OrderItemInline]
    list_display = ('order_code', 'user', 'order_date', 'total_cost')
    search_fields =['order_code']
admin.site.register(Order, OrderAdmin)

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    readonly_fields = ['my_image']

    def my_image(self, obj):
        if obj.image:
            return mark_safe(f"<img src='/static/{obj.image.name}' width='100%' height='100'>")

class ProductCategoryInline(admin.TabularInline):
    model = ProductCategory
    extra = 1
    autocomplete_fields = ['product', 'category']

class ProductAdmin(admin.ModelAdmin):
    search_fields = ['name']
    list_display = ('id','name','price','active')
    inlines = [ProductImageInline, ProductCategoryInline]
admin.site.register(Product, ProductAdmin)

class CommentImageInline(admin.TabularInline):
    model = CommentImage
    extra = 1
    autocomplete_fields = ['comment']
class CommentAdmin(admin.ModelAdmin):
    search_fields = ['id']
    inlines = [CommentImageInline]
admin.site.register(Comment,CommentAdmin)
class UserAdmin(admin.ModelAdmin):
    readonly_fields = ['Avatar']
    search_fields = ['username']

    def Avatar(self,user):
        if user:
            return mark_safe(f"<img src='/static/{user.avatar.name}' width='100%' height='100'>")
admin.site.register(User, UserAdmin)

class StoreAdmin(admin.ModelAdmin):
    readonly_fields = ['Avatar']
    search_fields = ['name']
    def Avatar(self, user):
        if user:
            return mark_safe(f"<img src='/static/{user.avatar.name}' width='100%' height='100'>")
admin.site.register(Store, UserAdmin)

class CategoryAdmin(admin.ModelAdmin):
    search_fields = ['name']
admin.site.register(Category, CategoryAdmin)
