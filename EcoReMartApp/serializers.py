from itertools import product

from cloudinary.utils import cloudinary_url
from django.contrib.admin.templatetags.admin_list import pagination
from django.template.context_processors import request
from rest_framework import serializers
from EcoReMartApp.location import is_valid_address
from EcoReMartApp.models import *
from EcoReMartApp.paginators import ProductPaginator
from EcoReMart import settings
class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField()
    store= serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id','email','first_name', 'last_name','phone_number','avatar','store']
        extra_kwargs = {
            'id': {
                'read_only': True,
            }
        }

    def get_avatar(self, obj):
        if obj.avatar:
            url, options = cloudinary_url(obj.avatar.url)
            return url
    def get_store(self, obj):
        try:
            store = obj.store  # Nếu không có store, dòng này sẽ raise exception
            return {
                "id": store.id,
                "name": store.name,
                "avatar": store.avatar.url if store.avatar else None
            }
        except Store.DoesNotExist:
            return None
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id','name')

class CategoryInProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id','name']

class ProductSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    store = serializers.SerializerMethodField()
    class Meta:
        model = Product
        fields = ['id','name','available_quantity','price','image','store', 'purchases','active']
        extra_kwargs = {
            'active': {
                'read_only': True,
            },
        }

    def get_image(self, obj):
        first_image = obj.images.first()
        if first_image and first_image.image:
            url, options = cloudinary_url(first_image.image.url)
            return url
        return None

    def get_store(self, obj):
        store = obj.store
        avatar_url = None
        if store.avatar:
            avatar_url, _ = cloudinary_url(str(store.avatar))
        return {
            "id": store.id,
            "name": store.name,
            "avatar": avatar_url
        }

class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'uploaded_at']

    def get_image(self, obj):
        if obj.image:
            url, options = cloudinary_url(obj.image.url)
            return url

class ProductConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCondition
        fields = '__all__'

class ProductDetailSerializer(ProductSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    categories = CategoryInProductSerializer(many=True, read_only=True)
    conditions = ProductConditionSerializer(source='product_condition', read_only=True)
    comments_count = serializers.SerializerMethodField()
    def get_comments_count(self,obj):
        return obj.comments.all().count()
    class Meta:
        model = ProductSerializer.Meta.model
        fields = list(ProductSerializer.Meta.fields) + ['categories','images','note','conditions','comments_count']
    extra_kwargs = {
        'store': {
            'read_only': True,
        },
        'id': {
            'read_only': True,
        }
    }

class CommentImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    class Meta:
        model = CommentImage
        fields = '__all__'

    def get_image(self, obj):
        if obj.image:
            url, options = cloudinary_url(obj.image.url)
            return url

class CommentSerializer(serializers.ModelSerializer):
    images=CommentImageSerializer(many=True, read_only=True)
    def to_representation(self, comment):
        req=super().to_representation(comment)
        avatar_url = None
        if comment.user.avatar and hasattr(comment.user.avatar, 'url'):
            avatar_url = comment.user.avatar.url

        req['user']={
            'name': f"{comment.user.first_name} {comment.user.last_name}".strip(),
            'avatar':avatar_url,
        }
        return req
    class Meta:
        model = Comment
        fields = ['id','user','rating', 'content','created_date','images']
class StoreSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField()
    class Meta:
        model = Store
        fields = ('id','name','address','avatar')
        extra_kwargs = {
            'id': {
                'read_only': True,
            }
        }
    def get_avatar(self, obj):
        if obj.avatar:
            url, options = cloudinary_url(obj.avatar.url)
            return url

class StoreDetailSerializer(StoreSerializer):
    class Meta:
        model = StoreSerializer.Meta.model
        fields = list(StoreSerializer.Meta.fields) + ['phone_number','introduce','user','created_date']
        extra_kwargs = {
            'user': {
                'read_only': True,
            },
            'created_date': {
                'read_only': True,
            },

        }
    def validate_phone_number(self, value):
        if not value.startswith('0'):
            raise serializers.ValidationError("Số điện thoại phải bắt đầu bằng số 0.")
        if not value.isdigit():
            raise serializers.ValidationError("Số điện thoại chỉ được chứa chữ số.")
        if len(value) != 10:
            raise serializers.ValidationError("Số điện thoại phải gồm đúng 10 chữ số.")
        return value

    def validate_address(self, value):
        api_key = settings.MAPBOX_API_KEY
        if not is_valid_address(value, api_key):
            raise serializers.ValidationError("Địa chỉ không tồn tại hoặc không hợp lệ.")
        return value
class CartItemsSerializer(serializers.ModelSerializer):
    product = ProductSerializer()
    class Meta:
        model = CartItem
        fields = ['product', 'quantity', 'updated_at']
class OrderItemInputSerializer(serializers.Serializer):
    product = ProductSerializer(read_only=True)
    quantity = serializers.IntegerField(min_value=1)
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity']

class DeliveryInformationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryInformation
        fields = ['id', 'name', 'phone_number', 'address']
    def validate_address(self, value):
        api_key = settings.MAPBOX_API_KEY
        if not is_valid_address(value, api_key):
            raise serializers.ValidationError("Địa chỉ không tồn tại hoặc không hợp lệ.")
        return value

class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    store_name = serializers.CharField(source='store.name', read_only=True)
    voucher_code = serializers.CharField(source='voucher.code', read_only=True)
    voucher_discount_percent = serializers.CharField(source='voucher.discount_percent', read_only=True)
    order_status=serializers.CharField(source='order_status.status_name', read_only=True)
    delivery_info=DeliveryInformationSerializer(read_only=True)
    class Meta:
        model = Order
        fields = ['id','user','delivery_info','order_code', 'store', 'store_name', 'voucher', 'voucher_code','voucher_discount_percent',
                  'order_status', 'note','ship_fee', 'total_cost', 'created_at', 'items','payment_method']

    def get_items(self, obj):
        order_items = OrderItem.objects.filter(order=obj)
        return OrderItemInputSerializer(order_items, many=True).data

class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['order_status']
class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatus
        fields = '__all__'

class VoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voucher
        fields = '__all__'