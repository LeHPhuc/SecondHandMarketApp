# from django.contrib import admin, messages
# from django import forms
# from django.db.models import Sum, Avg, Count
# from django.urls import path, reverse
# from django.template.response import TemplateResponse
# from django.shortcuts import get_object_or_404, redirect
# from django.utils import timezone
# from django.utils.html import format_html
# from django.utils.safestring import mark_safe
#
# from .models import (
#     User, Store, Product, ProductCondition, Category, ProductCategory,
#     ProductImage, Order, OrderItem, OrderStatus, Cart, CartItem,
#     Comment, CommentImage, Voucher, DeliveryInformation
# )
#
# # ================== CẤU HÌNH ==================
# COMPLETED_ORDER_STATUS_ID = 6    # ID trạng thái đơn hoàn thành (chỉnh nếu khác)
# TOP_LIMIT = 100
# THUMB_SIZE = 60                  # Kích thước thumbnail chuẩn
#
# # ================== HÀM TIỆN ÍCH ==================
# def render_cloudinary_thumb(field, size=THUMB_SIZE):
#     """
#     Trả về HTML <img> thu nhỏ nếu field có URL (Cloudinary/FileField).
#     """
#     try:
#         if not field:
#             return ""
#         url = getattr(field, "url", None)
#         if not url:
#             return ""
#         return format_html(
#             '<img src="{}" style="width:{}px;height:{}px;object-fit:cover;border-radius:4px;" />',
#             url, size, size
#         )
#     except Exception:
#         return ""
#
# # ================== INLINE ==================
# class ProductInline(admin.TabularInline):
#     model = Product
#     extra = 0
#     fields = ("name", "price", "available_quantity", "active", "created_date")
#     readonly_fields = ("created_date",)
#     show_change_link = True
#
# class ProductImageInline(admin.TabularInline):
#     model = ProductImage
#     extra = 0
#     readonly_fields = ("image_thumb", "uploaded_at")
#     fields = ("image_thumb", "image")
#
#     def image_thumb(self, obj):
#         return render_cloudinary_thumb(getattr(obj, "image", None), 70)
#     image_thumb.short_description = "Image"
#
# # ================== ACTIONS ==================
# @admin.action(description="Duyệt (active=True) các sản phẩm đã chọn")
# def approve_products(modeladmin, request, queryset):
#     updated = queryset.filter(active=False).update(active=True)
#     messages.success(request, f"Đã duyệt {updated} sản phẩm.")
#
# @admin.action(description="Xóa các sản phẩm đã chọn")
# def delete_products(modeladmin, request, queryset):
#     count = queryset.count()
#     queryset.delete()
#     messages.warning(request, f"Đã xóa {count} sản phẩm.")
#
# # ================== USER ADMIN ==================
# @admin.register(User)
# class UserAdmin(admin.ModelAdmin):
#     list_display = ("id", "avatar_thumb", "email", "username", "role", "is_active", "is_staff")
#     search_fields = ("email", "username", "uid")
#     list_filter = ("role", "is_active", "is_staff")
#     ordering = ("id",)
#     readonly_fields = ("avatar_preview",)
#
#     def avatar_thumb(self, obj):
#         return mark_safe(render_cloudinary_thumb(getattr(obj, "avatar", None)))
#     avatar_thumb.short_description = "Avatar"
#
#     def avatar_preview(self, obj):
#         return self.avatar_thumb(obj)
#     avatar_preview.short_description = "Avatar Preview"
#
# # ================== STORE ADMIN ==================
# @admin.register(Store)
# class StoreAdmin(admin.ModelAdmin):
#     list_display = (
#         "id", "avatar_thumb", "name", "user_email", "phone_number",
#         "created_date", "product_count", "view_revenue"
#     )
#     search_fields = ("name", "user__email")
#     inlines = [ProductInline]
#     readonly_fields = ("avatar_preview",)
#
#     def user_email(self, obj):
#         return obj.user.email
#     user_email.short_description = "User Email"
#
#     def product_count(self, obj):
#         return obj.products.count()
#     product_count.short_description = "Số SP"
#
#     def avatar_thumb(self, obj):
#         return render_cloudinary_thumb(getattr(obj, "avatar", None))
#     avatar_thumb.short_description = "Avatar"
#
#     def avatar_preview(self, obj):
#         return self.avatar_thumb(obj)
#     avatar_preview.short_description = "Avatar Preview"
#
#     def view_revenue(self, obj):
#         url = reverse("admin:top_stores_report")
#         return format_html('<a href="{}?store_id={}">Xem</a>', url, obj.id)
#     view_revenue.short_description = "Doanh thu (tháng)"
#
# # ================== PRODUCT CONDITION ==================
# @admin.register(ProductCondition)
# class ProductConditionAdmin(admin.ModelAdmin):
#     list_display = ("id", "name", "description")
#     search_fields = ("name",)
#
# # ================== VOUCHER ==================
# @admin.register(Voucher)
# class VoucherAdmin(admin.ModelAdmin):
#     list_display = ("id", "code", "discount_percent", "quantity", "used_count",
#                     "is_active", "start_date", "expiry_date")
#     search_fields = ("code",)
#     list_filter = ("is_active", "start_date", "expiry_date")
#
# # ================== ORDER STATUS ==================
# @admin.register(OrderStatus)
# class OrderStatusAdmin(admin.ModelAdmin):
#     list_display = ("id", "status_name")
#     search_fields = ("status_name",)
#
#
# # ================== PRODUCT ADMIN ==================
# @admin.register(Product)
# class ProductAdmin(admin.ModelAdmin):
#     list_display = (
#         "id", "thumb", "name", "store", "price", "available_quantity",
#         "active", "created_date", "purchases", "avg_rating_display"
#     )
#     list_filter = ("active", "store", "product_condition", "created_date")
#     search_fields = ("name", "store__name")
#     autocomplete_fields = ("store", "product_condition")
#     actions = [approve_products, delete_products]
#     date_hierarchy = "created_date"
#     inlines = [ProductImageInline]
#     readonly_fields = ("first_image_preview",)
#
#     def get_queryset(self, request):
#         qs = super().get_queryset(request)
#         return qs.annotate(_avg_rating=Avg("comments__rating"), _rating_count=Count("comments"))
#
#     def first_image(self, obj):
#         img = obj.images.first()
#         return getattr(img, "image", None) if img else None
#
#     def thumb(self, obj):
#         return render_cloudinary_thumb(self.first_image(obj)) or "—"
#     thumb.short_description = "Ảnh"
#
#     def first_image_preview(self, obj):
#         return self.thumb(obj)
#     first_image_preview.short_description = "Ảnh đại diện"
#
#     def avg_rating_display(self, obj):
#         if getattr(obj, "_avg_rating", None):
#             return f"{obj._avg_rating:.2f} ({obj._rating_count})"
#         return "-"
#     avg_rating_display.short_description = "Rating TB (SL)"
#
#
# # ================== CÁC MODEL KHÁC ==================
# @admin.register(Category)
# class CategoryAdmin(admin.ModelAdmin):
#     list_display = ("id", "name")
#     search_fields = ("name",)
#
#
#
#
#
#
#
#
#
# # ================== FORM FILTER BÁO CÁO ==================
# class MonthFilterForm(forms.Form):
#     month = forms.ChoiceField(
#         choices=[(m, f"{m:02d}") for m in range(1, 13)],
#         required=True,
#         label="Tháng"
#     )
#     year = forms.ChoiceField(choices=[], required=True, label="Năm")
#
#     def __init__(self, *args, **kwargs):
#         super().__init__(*args, **kwargs)
#         years = Order.objects.dates("order_date", "year")
#         if years:
#             self.fields["year"].choices = [(d.year, d.year) for d in years]
#         else:
#             y = timezone.now().year
#             self.fields["year"].choices = [(y, y)]
#
# # ================== TRUY VẤN BÁO CÁO ==================
# def build_top_stores_queryset(month, year,
#                               order_status_id=COMPLETED_ORDER_STATUS_ID,
#                               limit=TOP_LIMIT, store_id=None):
#     base_qs = (
#         Order.objects.filter(
#             order_date__year=year,
#             order_date__month=month,
#             order_status_id=order_status_id
#         )
#         .values("store__id", "store__name")
#         .annotate(
#             revenue=Sum("total_cost"),
#             orders_count=Count("id"),
#         )
#     )
#     data = []
#     for row in base_qs:
#         oc = row["orders_count"] or 0
#         row["avg_order_value"] = (row["revenue"] / oc) if oc else 0
#         data.append(row)
#
#     if store_id:
#         data = [r for r in data if str(r["store__id"]) == str(store_id)]
#
#     data.sort(key=lambda x: x["revenue"] or 0, reverse=True)
#     return data[:limit]
#
# def build_top_products_queryset(limit=TOP_LIMIT):
#     return (
#         Product.objects.filter(active=True)
#         .annotate(
#             avg_rating=Avg("comments__rating"),
#             rating_count=Count("comments__id"),
#         )
#         .filter(rating_count__gt=0)
#         .order_by("-avg_rating", "-rating_count")[:limit]
#     )
#
# # ================== CUSTOM VIEWS ==================
# def top_stores_view(request):
#     context = admin.site.each_context(request)
#     context["title"] = "Top 100 Cửa hàng theo doanh thu"
#     form = MonthFilterForm(request.GET or None)
#     data = []
#     month = year = None
#     store_id = request.GET.get("store_id") or None
#     if form.is_valid():
#         month = int(form.cleaned_data["month"])
#         year = int(form.cleaned_data["year"])
#         data = build_top_stores_queryset(month, year, store_id=store_id)
#     context.update({
#         "form": form,
#         "data": data,
#         "selected_month": month,
#         "selected_year": year,
#     })
#     return TemplateResponse(request, "admin/reports/top_stores.html", context)
#
# def top_products_view(request):
#     context = admin.site.each_context(request)
#     context["title"] = "Top 100 Sản phẩm theo rating trung bình"
#     context["products"] = build_top_products_queryset()
#     return TemplateResponse(request, "admin/reports/top_products.html", context)
#
# def pending_products_view(request):
#     qs = Product.objects.filter(active=False).order_by("-created_date")
#     context = admin.site.each_context(request)
#     context.update({
#         "title": "Duyệt sản phẩm chưa active",
#         "products": qs
#     })
#     return TemplateResponse(request, "admin/moderation/pending_products.html", context)
#
# def approve_product_view(request, pk):
#     product = get_object_or_404(Product, pk=pk, active=False)
#     product.active = True
#     product.save(update_fields=["active"])
#     messages.success(request, f"Đã duyệt sản phẩm {product.name}.")
#     return redirect("admin:pending_products")
#
# def delete_product_view(request, pk):
#     product = get_object_or_404(Product, pk=pk, active=False)
#     name = product.name
#     product.delete()
#     messages.warning(request, f"Đã xóa sản phẩm {name}.")
#     return redirect("admin:pending_products")
#
# def media_gallery_view(request):
#     context = admin.site.each_context(request)
#     context["title"] = "Media Gallery"
#     users = User.objects.exclude(avatar="").exclude(avatar__isnull=True)[:200]
#     stores = Store.objects.exclude(avatar="").exclude(avatar__isnull=True)[:200]
#     product_images = ProductImage.objects.select_related("product", "product__store")[:400]
#     context.update({
#         "users_with_avatar": users,
#         "stores_with_avatar": stores,
#         "product_images": product_images,
#     })
#     return TemplateResponse(request, "admin/media/gallery.html", context)
#
# # ================== URL PATCH ==================
# def get_custom_admin_urls(original_get_urls):
#     def custom_urls():
#         urls = original_get_urls()
#         custom = [
#             path("reports/top-stores/", admin.site.admin_view(top_stores_view), name="top_stores_report"),
#             path("reports/top-products/", admin.site.admin_view(top_products_view), name="top_products_report"),
#             path("moderation/pending-products/", admin.site.admin_view(pending_products_view), name="pending_products"),
#             path("moderation/approve-product/<int:pk>/", admin.site.admin_view(approve_product_view), name="approve_product"),
#             path("moderation/delete-product/<int:pk>/", admin.site.admin_view(delete_product_view), name="delete_product"),
#             path("media/gallery/", admin.site.admin_view(media_gallery_view), name="media_gallery"),
#         ]
#         return custom + urls
#     return custom_urls
#
# if not getattr(admin.site, "_custom_urls_patched", False):
#     admin.site.get_urls = get_custom_admin_urls(admin.site.get_urls)
#     admin.site._custom_urls_patched = True

from django.contrib import admin, messages
from django import forms
from django.db.models import Sum, Avg, Count
from django.urls import path, reverse
from django.template.response import TemplateResponse
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import (
    User, Store, Product, ProductCondition, Category,
    ProductImage,  # cần cho inline + gallery
    Order, OrderStatus, Voucher
)

# ================== CẤU HÌNH ==================
COMPLETED_ORDER_STATUS_ID = 6
TOP_LIMIT = 100
THUMB_SIZE = 60

# ================== TIỆN ÍCH ==================
def render_cloudinary_thumb(field, size=THUMB_SIZE):
    try:
        if not field:
            return ""
        url = getattr(field, "url", None)
        if not url:
            return ""
        return format_html(
            '<img src="{}" style="width:{}px;height:{}px;object-fit:cover;border-radius:4px;" />',
            url, size, size
        )
    except Exception:
        return ""

# ================== INLINES ==================
class ProductInline(admin.TabularInline):
    model = Product
    extra = 0
    # THÊM cột ảnh đầu tiên của sản phẩm
    fields = ("first_image_thumb", "name", "price", "available_quantity", "active", "created_date")
    readonly_fields = ("first_image_thumb", "created_date")
    show_change_link = True

    def first_image_thumb(self, obj):
        img = obj.images.first()
        if img and getattr(img, "image", None):
            return render_cloudinary_thumb(img.image, 50)
        return "—"
    first_image_thumb.short_description = "Ảnh"

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    readonly_fields = ("image_thumb", "uploaded_at")
    fields = ("image_thumb", "image")

    def image_thumb(self, obj):
        return render_cloudinary_thumb(getattr(obj, "image", None), 70)
    image_thumb.short_description = "Image"

# ================== ACTIONS ==================
@admin.action(description="Duyệt (active=True) các sản phẩm đã chọn")
def approve_products(modeladmin, request, queryset):
    updated = queryset.filter(active=False).update(active=True)
    messages.success(request, f"Đã duyệt {updated} sản phẩm.")

@admin.action(description="Xóa các sản phẩm đã chọn")
def delete_products(modeladmin, request, queryset):
    count = queryset.count()
    queryset.delete()
    messages.warning(request, f"Đã xóa {count} sản phẩm.")

# ================== USER ==================
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "avatar_thumb", "email", "username", "role", "is_active", "is_staff")
    search_fields = ("email", "username", "uid")
    list_filter = ("role", "is_active", "is_staff")
    ordering = ("id",)
    readonly_fields = ("avatar_preview",)

    def avatar_thumb(self, obj):
        return mark_safe(render_cloudinary_thumb(getattr(obj, "avatar", None)))
    avatar_thumb.short_description = "Avatar"

    def avatar_preview(self, obj):
        return self.avatar_thumb(obj)
    avatar_preview.short_description = "Avatar Preview"

    # Tất cả field readonly (bao gồm khi thêm mới)
    def get_readonly_fields(self, request, obj=None):
        base = [f.name for f in self.model._meta.fields]
        return list(set(base + ["avatar_preview", "avatar_thumb"]))

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return True

# ================== STORE ==================
@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ("id", "avatar_thumb", "name", "user_email", "phone_number",
                    "created_date", "product_count", "view_revenue")
    search_fields = ("name", "user__email")
    inlines = [ProductInline]
    readonly_fields = ("avatar_preview",)

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "User Email"

    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = "Số SP"

    def avatar_thumb(self, obj):
        return render_cloudinary_thumb(getattr(obj, "avatar", None))
    avatar_thumb.short_description = "Avatar"

    def avatar_preview(self, obj):
        return self.avatar_thumb(obj)
    avatar_preview.short_description = "Avatar Preview"

    # Link tự điền tháng/năm hiện tại + store_id
    def view_revenue(self, obj):
        now = timezone.now()
        url = reverse("admin:top_stores_report")
        return format_html(
            '<a href="{}?store_id={}&month={}&year={}">Xem</a>',
            url, obj.id, now.month, now.year
        )
    view_revenue.short_description = "Doanh thu (tháng)"

    # Readonly tất cả field
    def get_readonly_fields(self, request, obj=None):
        fields = [f.name for f in self.model._meta.fields]
        return list(set(fields + ["avatar_preview", "avatar_thumb"]))

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return True

# ================== PRODUCT CONDITION ==================
@admin.register(ProductCondition)
class ProductConditionAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description")
    search_fields = ("name",)

# ================== VOUCHER ==================
@admin.register(Voucher)
class VoucherAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "discount_percent", "quantity", "used_count",
                    "is_active", "start_date", "expiry_date")
    search_fields = ("code",)
    list_filter = ("is_active", "start_date", "expiry_date")

# ================== ORDER STATUS ==================
@admin.register(OrderStatus)
class OrderStatusAdmin(admin.ModelAdmin):
    list_display = ("id", "status_name")
    search_fields = ("status_name",)

# ================== PRODUCT ==================
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "thumb", "name", "store", "price", "available_quantity",
                    "active", "created_date", "purchases", "avg_rating_display")
    list_filter = ("active", "store", "product_condition", "created_date")
    search_fields = ("name", "store__name")
    autocomplete_fields = ("store", "product_condition")
    actions = [approve_products, delete_products]
    date_hierarchy = "created_date"
    inlines = [ProductImageInline]
    readonly_fields = ("first_image_preview",)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(_avg_rating=Avg("comments__rating"), _rating_count=Count("comments"))

    def first_image(self, obj):
        img = obj.images.first()
        return getattr(img, "image", None) if img else None

    def thumb(self, obj):
        return render_cloudinary_thumb(self.first_image(obj)) or "—"
    thumb.short_description = "Ảnh"

    def first_image_preview(self, obj):
        return self.thumb(obj)
    first_image_preview.short_description = "Ảnh đại diện"

    def avg_rating_display(self, obj):
        if getattr(obj, "_avg_rating", None):
            return f"{obj._avg_rating:.2f} ({obj._rating_count})"
        return "-"
    avg_rating_display.short_description = "Rating TB (SL)"

    # Chỉ cho phép chỉnh 'active'
    def get_readonly_fields(self, request, obj=None):
        all_fields = [f.name for f in self.model._meta.fields]
        keep_editable = {"active"}
        ro = [f for f in all_fields if f not in keep_editable]
        return list(set(ro + ["first_image_preview", "thumb"]))

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return True

# ================== CATEGORY ==================
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)

# ================== FORM LỌC BÁO CÁO ==================
class MonthFilterForm(forms.Form):
    month = forms.ChoiceField(choices=[(m, f"{m:02d}") for m in range(1, 13)], required=True, label="Tháng")
    year = forms.ChoiceField(choices=[], required=True, label="Năm")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        years = Order.objects.dates("order_date", "year")
        if years:
            self.fields["year"].choices = [(d.year, d.year) for d in years]
        else:
            y = timezone.now().year
            self.fields["year"].choices = [(y, y)]

# ================== TRUY VẤN BÁO CÁO ==================
def build_top_stores_queryset(month, year, order_status_id=COMPLETED_ORDER_STATUS_ID,
                              limit=TOP_LIMIT, store_id=None):
    base_qs = (
        Order.objects.filter(
            order_date__year=year,
            order_date__month=month,
            order_status_id=order_status_id
        )
        .values("store__id", "store__name")
        .annotate(revenue=Sum("total_cost"), orders_count=Count("id"))
    )
    data = []
    for row in base_qs:
        oc = row["orders_count"] or 0
        row["avg_order_value"] = (row["revenue"] / oc) if oc else 0
        data.append(row)
    if store_id:
        data = [r for r in data if str(r["store__id"]) == str(store_id)]
    data.sort(key=lambda x: x["revenue"] or 0, reverse=True)
    return data[:limit]

def build_top_products_queryset(limit=TOP_LIMIT):
    return (
        Product.objects.filter(active=True)
        .annotate(
            avg_rating=Avg("comments__rating"),
            rating_count=Count("comments__id"),
        )
        .filter(rating_count__gt=0)
        .order_by("-avg_rating", "-rating_count")[:limit]
    )

# ================== VIEWS ==================
def top_stores_view(request):
    context = admin.site.each_context(request)
    context["title"] = "Top 100 Cửa hàng theo doanh thu"
    store_id = request.GET.get("store_id") or None

    # Tự điền tháng/năm hiện tại nếu click từ link Xem
    if store_id and (not request.GET.get("month") or not request.GET.get("year")):
        now = timezone.now()
        month = now.month
        year = now.year
        form = MonthFilterForm(initial={"month": f"{month}", "year": f"{year}"})
        data = build_top_stores_queryset(month, year, store_id=store_id)
    else:
        form = MonthFilterForm(request.GET or None)
        data = []
        month = year = None
        if form.is_valid():
            month = int(form.cleaned_data["month"])
            year = int(form.cleaned_data["year"])
            data = build_top_stores_queryset(month, year, store_id=store_id)

    store_obj = None
    if store_id:
        store_obj = Store.objects.filter(pk=store_id).first()

    context.update({
        "form": form,
        "data": data,
        "selected_month": month,
        "selected_year": year,
        "store_obj": store_obj,
    })
    return TemplateResponse(request, "admin/reports/top_stores.html", context)

def top_products_view(request):
    context = admin.site.each_context(request)
    context["title"] = "Top 100 Sản phẩm theo rating trung bình"
    context["products"] = build_top_products_queryset()
    return TemplateResponse(request, "admin/reports/top_products.html", context)

def pending_products_view(request):
    qs = Product.objects.filter(active=False).order_by("-created_date")
    context = admin.site.each_context(request)
    context.update({"title": "Duyệt sản phẩm chưa active", "products": qs})
    return TemplateResponse(request, "admin/moderation/pending_products.html", context)

def approve_product_view(request, pk):
    product = get_object_or_404(Product, pk=pk, active=False)
    product.active = True
    product.save(update_fields=["active"])
    messages.success(request, f"Đã duyệt sản phẩm {product.name}.")
    return redirect("admin:pending_products")

def delete_product_view(request, pk):
    product = get_object_or_404(Product, pk=pk, active=False)
    name = product.name
    product.delete()
    messages.warning(request, f"Đã xóa sản phẩm {name}.")
    return redirect("admin:pending_products")

def media_gallery_view(request):
    context = admin.site.each_context(request)
    context["title"] = "Media Gallery"
    users = User.objects.exclude(avatar="").exclude(avatar__isnull=True)[:200]
    stores = Store.objects.exclude(avatar="").exclude(avatar__isnull=True)[:200]
    product_images = ProductImage.objects.select_related("product", "product__store")[:400]
    context.update({
        "users_with_avatar": users,
        "stores_with_avatar": stores,
        "product_images": product_images,
    })
    return TemplateResponse(request, "admin/media/gallery.html", context)

# ================== URL PATCH ==================
def get_custom_admin_urls(original_get_urls):
    def custom_urls():
        urls = original_get_urls()
        custom = [
            path("reports/top-stores/", admin.site.admin_view(top_stores_view), name="top_stores_report"),
            path("reports/top-products/", admin.site.admin_view(top_products_view), name="top_products_report"),
            path("moderation/pending-products/", admin.site.admin_view(pending_products_view), name="pending_products"),
            path("moderation/approve-product/<int:pk>/", admin.site.admin_view(approve_product_view), name="approve_product"),
            path("moderation/delete-product/<int:pk>/", admin.site.admin_view(delete_product_view), name="delete_product"),
        ]
        return custom + urls
    return custom_urls

if not getattr(admin.site, "_custom_urls_patched", False):
    admin.site.get_urls = get_custom_admin_urls(admin.site.get_urls)