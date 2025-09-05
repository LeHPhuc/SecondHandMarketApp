from email.policy import default
from itertools import product

from cloudinary.utils import cloudinary_url
from django.http import HttpResponse
from rest_framework import viewsets,permissions,generics,status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from EcoReMartApp.models import *
from EcoReMartApp.permissions import IsAdmin,  IsOwner, IsOwnerOrAdmin
from EcoReMartApp.serializers import CategorySerializer, ProductSerializer, ProductDetailSerializer, CommentSerializer, \
    UserSerializer, StoreSerializer, StoreDetailSerializer, CartItemsSerializer, OrderSerializer, \
    OrderStatusUpdateSerializer, OrderStatusSerializer, DeliveryInformationSerializer, VoucherSerializer
from EcoReMartApp.paginators import ProductPaginator, CommentPaginator, OrderPaginator
from firebase_admin import auth as firebase_auth
import re
from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError
from collections import defaultdict
from decimal import Decimal
from EcoReMartApp.location import get_directions_distance,ship_fee_cost
from EcoReMart import settings
import pandas as pd
from django.utils import timezone
from datetime import datetime
from .payos_service import PayOSService
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")
DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dxouh8fmh/image/upload/v1754149807/avt_bvs35c.png"

class UserViewSet(viewsets.ViewSet, generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id, is_active=True)

    def get_object(self):
        return self.request.user

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='me')
    def current_user(self, request):
        user = request.user
        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = UserSerializer
    def post(self, request, *args, **kwargs):
        id_token = request.data.get('idToken')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        phone_number = request.data.get('phone_number')
        avatar_file = request.FILES.get('avatar')
        password = request.data.get("password")

        if not id_token:
            return Response({"error": "Thiếu idToken từ Firebase"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
        except Exception as e:
            return Response({"error": "Token không hợp lệ", "details": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        if not decoded_token.get("email_verified", False):
            return Response({"error": "Email chưa được xác minh"}, status=status.HTTP_403_FORBIDDEN)
        if not first_name:
            return Response({"error": "Thiếu First Name"}, status=status.HTTP_400_BAD_REQUEST)
        if not last_name:
            return Response({"error": "Thiếu Last Name"}, status=status.HTTP_400_BAD_REQUEST)
        if not phone_number:
            return Response({"error": "Thiếu số điện thoại"}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({"error": "Thiếu số mật khẩu"}, status=status.HTTP_400_BAD_REQUEST)
        if not re.match(r"^\d{10}$", phone_number):
            return Response({"error": "Số điện thoại phải có 10 chữ số"}, status=status.HTTP_400_BAD_REQUEST)

        uid = decoded_token["uid"]
        email = decoded_token.get("email")

        user = User.objects.filter(uid=uid).first()
        if user:
            return Response({"error": "Người dùng đã đăng ký rồi"}, status=status.HTTP_400_BAD_REQUEST)

        # Tạo đối tượng user mới
        user = User(
            uid=uid,
            email=email,
            first_name=first_name or "",
            last_name=last_name or "",
            phone_number=phone_number,
            role="customer"
        )

        # Gán avatar (CloudinaryField sẽ xử lý upload)
        if avatar_file:
            user.avatar = avatar_file
        else:
            user.avatar = DEFAULT_AVATAR_URL  # URL string
        if password:
            user.set_password(password)
        try:
            user.save()
        except (IntegrityError, ValidationError) as e:
            return Response({"error": "Lưu người dùng thất bại", "details": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.serializer_class(user, context={'request': request})
        return Response(serializer.data, status= status.HTTP_200_OK)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = UserSerializer
    def post(self, request):
        # id_token = request.data.get('idToken')
        # if not id_token:
        #     return Response({"error": "Thiếu idToken"}, status=status.HTTP_400_BAD_REQUEST)
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header or not auth_header.startswith("Bearer "):
            return Response({"error": "Thiếu Authorization header hoặc sai định dạng"},
                            status=status.HTTP_400_BAD_REQUEST)

        id_token = auth_header.split(" ")[1]  # Lấy phần token sau "Bearer"
        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
        except Exception as e:
            return Response({"error": "Token không hợp lệ", "details": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        # if not decoded_token.get("email_verified", False):
        #     return Response({"error": "Email chưa được xác minh"}, status=status.HTTP_403_FORBIDDEN)
        uid = decoded_token.get("uid")
        if not uid:
            return Response({"error": "Token không có uid"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            user = User.objects.get(uid=uid)
        except User.DoesNotExist:
            return Response({"error": "Người dùng chưa đăng ký"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CategoryViewSet(viewsets.ModelViewSet):
        queryset = Category.objects.all()
        serializer_class = CategorySerializer
        def get_permissions(self):
            if self.action in ['list']:
                return [permissions.AllowAny()]
            return [IsAdmin]


class ProductViewSet(viewsets.ViewSet,generics.ListAPIView,generics.RetrieveAPIView):
    queryset = Product.objects.prefetch_related('categories').filter(active=True,available_quantity__gt=0)
    pagination_class = ProductPaginator

    def get_serializer_class(self):
        if self.action == 'retrieve'or self.action in ['update_my_product']:
            return ProductDetailSerializer
        return ProductSerializer

    def get_queryset(self):
        query = self.queryset
        q=self.request.query_params.get('q')
        category_id = self.request.query_params.get('category_id')
        if q:
            query=query.filter(name__icontains=q)
        if category_id:
            query = query.filter(categories__id=category_id)
        return query

    def get_permissions(self):
        if self.action.__eq__('get_comments') and self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        if self.action in ['my_products', 'update_my_product', 'delete_my_product']:
            return [permissions.IsAuthenticated()]
        if self.action in ['update_my_product', 'delete_my_product']:
            return [permissions.IsAuthenticated(),IsOwner()]
        return [permissions.AllowAny()]

    @action(detail=True, methods=['get','post'],url_path='comments')
    def get_comments(self, request, pk):
        if request.method.__eq__('POST'):
            user = request.user
            content = request.data.get('content')
            product = self.get_object()
            rating = request.data.get('rating')
            if not content:
                return Response({"error": "Thiếu content"}, status=status.HTTP_400_BAD_REQUEST)
            if not rating:
                return Response({"error": "Thiếu rating"}, status=status.HTTP_400_BAD_REQUEST)
            if Comment.objects.filter(product=product, user=request.user).exists():
                return Response({"error": "Bạn đã đánh giá sản phẩm này rồi"}, status=status.HTTP_400_BAD_REQUEST)
            # Kiểm tra đơn hàng của user với trạng thái "Đơn hàng đã hoàn thành"
            completed_orders = Order.objects.filter(
                user=user,
                order_status__status_name="Đơn hàng đã hoàn thành"
            )

            # Lấy danh sách sản phẩm trong các đơn hàng này
            product_ids_in_completed_orders = OrderItem.objects.filter(
                order__in=completed_orders
            ).values_list('product_id', flat=True)

            if int(product.id) not in product_ids_in_completed_orders:
                return Response(
                    {"error": "Bạn chưa thể đánh giá sản phẩm này"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            c = Comment.objects.create(content=content, product=product, rating=rating,
                                       user=request.user)
            images = request.FILES.getlist('images')
            for img in images:
                CommentImage.objects.create(comment=c, image=img)
            return Response (CommentSerializer(c).data,status=status.HTTP_201_CREATED)
        else:
            comments= self.get_object().comments.select_related('user').all().order_by('-id')
            p=CommentPaginator()
            page=p.paginate_queryset(comments,request)
            if page:
                s=CommentSerializer(page,many=True,context={'request':request})
                return p.get_paginated_response(s.data)
            else:
                return Response(CommentSerializer(comments, many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='my-products')
    def my_products(self, request):
        user_store = getattr(request.user, 'store', None)
        if not user_store:
            return Response({'error': 'User chưa có store'}, status=status.HTTP_400_BAD_REQUEST)
        products = Product.objects.filter(store=user_store)
        p = ProductPaginator()
        page = p.paginate_queryset(products, request)
        if page:
            s = ProductSerializer(page, many=True, context={'request': request})
            return p.get_paginated_response(s.data)
        else:
            serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    # @action(detail=True, methods=['get'], url_path='my-products')
    # def retrieve_my_product(self, request, pk=None):
    #     user_store = getattr(request.user, 'store', None)
    #     if not user_store:
    #         return Response({'error': 'User chưa có store'}, status=status.HTTP_400_BAD_REQUEST)
    #
    #     try:
    #         product = Product.objects.get(pk=pk, store=user_store)
    #     except Product.DoesNotExist:
    #         return Response({'error': 'Không tìm thấy sản phẩm hoặc không thuộc store của bạn'}, status=404)
    #
    #     serializer = ProductDetailSerializer(product, context={'request': request})
    #     return Response(serializer.data)

    @action(detail=True, methods=['put', 'patch'], url_path='update-my-product')
    def update_my_product(self, request, pk=None):
        user_store = getattr(request.user, 'store', None)
        if not user_store:
            return Response({'error': 'Bạn không có quyền chỉnh sửa sản phẩm này!'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(pk=pk, store=user_store)
        except Product.DoesNotExist:
            return Response({'error': 'Không tìm thấy sản phẩm hoặc không thuộc store của bạn'}, status=404)

        # Cập nhật các trường cơ bản
        serializer = ProductDetailSerializer(product, data=request.data, partial=(request.method == 'PATCH'),
                                             context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Cập nhật categories (nếu có)
        category_ids = request.data.getlist('categories') or request.data.get('categories', [])
        if category_ids:
            product.categories.set(category_ids)  # Thay thế toàn bộ danh sách

        # Cập nhật images (nếu có)
        images = request.FILES.getlist('images')
        if images:
            product.images.all().delete()
            for img in images:
                ProductImage.objects.create(product=product, image=img)

        return Response(ProductDetailSerializer(product, context={'request': request}).data)

    @action(detail=True, methods=['delete'], url_path='delete-my-product')
    def delete_my_product(self, request, pk=None):
        user_store = getattr(request.user, 'store', None)
        if not user_store:
            return Response({'error': 'Ba Không có quyền xoá sản phẩm này!'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(pk=pk, store=user_store)
        except Product.DoesNotExist:
            return Response({'error': 'Không tìm thấy sản phẩm hoặc không thuộc store của bạn'}, status=404)

        product.delete()
        return Response({'message': 'Đã xoá sản phẩm'}, status=status.HTTP_204_NO_CONTENT)


class ProductCreateViewSet(viewsets.ViewSet, generics.CreateAPIView):
    serializer_class = ProductDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        name = request.data.get('name')
        note = request.data.get('note')
        available_quantity = request.data.get('available_quantity')
        price = request.data.get('price')
        product_condition_id = request.data.get('product_condition')
        category_ids = request.data.getlist('categories')
        image_files = request.FILES.getlist('images')

        # Validate cửa hàng
        try:
            store = request.user.store
        except Store.DoesNotExist:
            return Response({'error': 'Người dùng chưa có cửa hàng'}, status=400)

        # Validate dữ liệu
        if not name:
            return Response({'error': 'Thiếu name'}, status=400)
        if not available_quantity:
            return Response({'error': 'Thiếu available_quantity'}, status=400)
        if not price:
            return Response({'error': 'Thiếu price'}, status=400)
        if not product_condition_id:
            return Response({'error': 'Thiếu product_condition'}, status=400)
        if not category_ids:
            return Response({'error': 'Thiếu categories'}, status=400)
        if not image_files:
            return Response({'error': 'Thiếu images'}, status=400)

        try:
            # Lấy điều kiện sản phẩm
            product_condition = ProductCondition.objects.get(id=product_condition_id)

            # Ép kiểu
            available_quantity = int(available_quantity)
            price = float(price)

            # Tạo sản phẩm
            product = Product.objects.create(
                name=name,
                price=price,
                available_quantity=available_quantity,
                note=note,
                store=store,
                product_condition=product_condition
            )

            # Gán danh mục
            for cat_id in category_ids:
                ProductCategory.objects.create(product=product, category_id=cat_id)

            # Gán ảnh
            for img in image_files:
                ProductImage.objects.create(product=product, image=img)

            # Trả về thông tin chi tiết
            serializer = self.get_serializer(product, context={'request': request})
            return Response(serializer.data, status=201)

        except ProductCondition.DoesNotExist:
            return Response({'error': 'product_condition không tồn tại'}, status=400)
        except Exception as e:
            return Response({'error': 'Lỗi tạo sản phẩm', 'details': str(e)}, status=400)

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreDetailSerializer
    permission_classes = [permissions.AllowAny]
    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOwner()]
        elif self.action in ['my_store', 'my_products']:
            return [permissions.IsAuthenticated()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return StoreDetailSerializer
        return StoreSerializer
    def get_queryset(self):
        query = self.queryset
        q = self.request.query_params.get('q')
        if q:
            query = query.filter(name__icontains=q)
        return query
    # xem product của một store bất kì không cần đăng nhập
    @action(detail=True, methods=['get'], url_path='products')
    def products(self, request, pk=None):
        store = self.get_object()
        products = Product.objects.filter(store=store)
        paginator = ProductPaginator()
        page = paginator.paginate_queryset(products, request)
        if page is not None:
            serializer = ProductSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    @action(detail=False, methods=['get'], url_path='my-store',)
    def my_store(self, request):
        store = getattr(request.user, 'store', None)
        if not store:
            return Response({'detail': 'Người dùng chưa có cửa hàng.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StoreDetailSerializer(store, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-products', permission_classes=[permissions.IsAuthenticated])
    def my_products(self, request):
        store = getattr(request.user, 'store', None)
        if not store:
            return Response({'detail': 'Người dùng chưa có cửa hàng.'}, status=status.HTTP_404_NOT_FOUND)
        products = Product.objects.filter(store=store)
        paginator = ProductPaginator()
        page = paginator.paginate_queryset(products, request)
        serializer = ProductSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-orders-store', permission_classes=[permissions.IsAuthenticated])
    def my_orders(self, request):
        store = getattr(request.user, 'store', None)
        if not store:
            return Response({'detail': 'Người dùng chưa có cửa hàng.'}, status=status.HTTP_404_NOT_FOUND)

        # Lấy orders của store
        orders = Order.objects.filter(store=store).select_related(
            'user', 'order_status', 'delivery_info', 'voucher'
        ).prefetch_related('order_items__product')

        # Filter theo status nếu có
        status_filter = request.query_params.get('status')
        if status_filter:
            try:
                status_id = int(status_filter)
                orders = orders.filter(order_status_id=status_id)
            except (ValueError, TypeError):
                pass

        # Sắp xếp theo ngày tạo (mới nhất trước)
        orders = orders.order_by('-created_at')

        # Phân trang
        paginator = OrderPaginator()
        page = paginator.paginate_queryset(orders, request)

        if page is not None:
            serializer = OrderSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        serializer = OrderSerializer(orders, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='orders-of-status', permission_classes=[permissions.IsAuthenticated])
    def orders_stats(self, request):
        """
        Thống kê đơn hàng theo status cho store
        """
        store = getattr(request.user, 'store', None)
        if not store:
            return Response({'detail': 'Người dùng chưa có cửa hàng.'}, status=status.HTTP_404_NOT_FOUND)

        # Đếm số lượng đơn hàng theo từng status
        stats = []
        order_statuses = OrderStatus.objects.all().order_by('id')

        for status_obj in order_statuses:
            count = Order.objects.filter(store=store, order_status=status_obj).count()
            stats.append({
                'status_id': status_obj.id,
                'status_name': status_obj.status_name,
                'count': count
            })

        # Tổng số đơn hàng
        total_orders = Order.objects.filter(store=store).count()

        # Thống kê doanh thu
        total_revenue = Order.objects.filter(
            store=store,
            order_status__status_name="Đơn hàng đã hoàn thành"
        ).aggregate(
            total=models.Sum('total_cost')
        )['total'] or 0

        return Response({
            'total_orders': total_orders,
            'total_revenue': total_revenue,
            'stats': stats
        })

    @action(detail=False, methods=['patch'], url_path='update-order-status',
            permission_classes=[permissions.IsAuthenticated])
    def update_order_status(self, request):
        """
        Cập nhật trạng thái đơn hàng
        Body: {
            "order_id": 123,
            "order_status": 2
        }
        """
        store = getattr(request.user, 'store', None)
        if not store:
            return Response({'detail': 'Người dùng chưa có cửa hàng.'}, status=status.HTTP_404_NOT_FOUND)

        order_id = request.data.get('order_id')
        new_status_id = request.data.get('order_status')

        if not order_id or not new_status_id:
            return Response({'detail': 'Thiếu order_id hoặc order_status.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Kiểm tra order thuộc về store
            order = Order.objects.get(id=order_id, store=store)

            # Kiểm tra status hợp lệ
            new_status = OrderStatus.objects.get(id=new_status_id)

            # Cập nhật status
            order.order_status = new_status
            order.save()

            serializer = OrderSerializer(order, context={'request': request})
            return Response({
                'message': f'Đã cập nhật trạng thái đơn hàng thành "{new_status.status_name}"',
                'order': serializer.data
            })

        except Order.DoesNotExist:
            return Response({'detail': 'Đơn hàng không tồn tại hoặc không thuộc về cửa hàng này.'},
                            status=status.HTTP_404_NOT_FOUND)
        except OrderStatus.DoesNotExist:
            return Response({'detail': 'Trạng thái đơn hàng không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)

class CartGroupedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = request.user.cart
        cart_items = cart.items.select_related('product__store').order_by('-updated_at')

        grouped = defaultdict(list)
        store_latest_update = {}

        for item in cart_items:
            store = item.product.store
            grouped[store.id].append(item)
            store_latest_update[store.id] = max(
                store_latest_update.get(store.id, item.updated_at),
                item.updated_at
            )

        sorted_store_ids = sorted(store_latest_update, key=lambda x: store_latest_update[x], reverse=True)

        result = []
        for store_id in sorted_store_ids:
            store = grouped[store_id][0].product.store
            result.append({
                "store": {
                    "id": store.id,
                    "name": store.name,
                    "avatar": cloudinary_url(str(store.avatar))[0] if store.avatar else None
                },
                "products": CartItemsSerializer(grouped[store_id], many=True).data
            })

        return Response(result)

class AddToCartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        try:
            product = Product.objects.get(pk=product_id, active=True)
        except Product.DoesNotExist:
            return Response({"error": "Sản phẩm không tồn tại."}, status=404)

        if quantity > product.available_quantity:
            return Response({"error": "Số lượng vượt quá số lượng sẵn có."}, status=400)

        cart, _ = Cart.objects.get_or_create(user=request.user)

        cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
        if not created:
            if cart_item.quantity + quantity > product.available_quantity:
                return Response({"error": "Tổng số lượng vượt quá số lượng sẵn có."}, status=400)
            cart_item.quantity += quantity
        else:
            cart_item.quantity = quantity
        cart_item.save()

        return Response({"message": "Đã thêm sản phẩm vào giỏ hàng."})

class UpdateCartItemView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity'))

        if not product_id:
            return Response({"error": "Thiếu product_id"}, status=400)

        try:
            product = Product.objects.get(pk=product_id)
            cart_item = CartItem.objects.get(cart__user=request.user, product=product)
        except Product.DoesNotExist:
            return Response({"error": "Sản phẩm không tồn tại."}, status=404)
        except CartItem.DoesNotExist:
            return Response({"error": "Sản phẩm chưa có trong giỏ hàng."}, status=404)
        new_quantity = cart_item.quantity + quantity
        if new_quantity > product.available_quantity:
            return Response({"error": "Số lượng vượt quá giới hạn sẵn có."}, status=400)

        cart_item.quantity = new_quantity
        cart_item.save()
        return Response({"message": f"Đã tăng số lượng lên {new_quantity}."}, status=200)
class RemoveCartItemView(APIView):
    permission_classes = [IsAuthenticated]
    def delete(self, request):
        product_ids = request.data.get('product_ids')

        if not product_ids or not isinstance(product_ids, list):
            return Response({"error": "Yêu cầu danh sách product_ids là một mảng."}, status=400)

        deleted_count = 0
        for product_id in product_ids:
            try:
                cart_item = CartItem.objects.get(cart__user=request.user, product__id=product_id)
                cart_item.delete()
                deleted_count += 1
            except CartItem.DoesNotExist:
                continue  # bỏ qua sản phẩm không tồn tại

        return Response({"message": f"Đã xoá {deleted_count} sản phẩm khỏi giỏ hàng."}, status=200)



class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    def get_serializer_class(self):
        # Nếu là PATCH -> dùng serializer riêng cho cập nhật trạng thái
        if self.action == 'partial_update':
            return OrderStatusUpdateSerializer
        return super().get_serializer_class()
    def create(self, request, *args, **kwargs):
        user = request.user
        items_data = request.data.get('items', [])
        voucher_id = request.data.get('voucher')
        note = request.data.get('note', '')
        payment_method=request.data.get('payment_method')
        delivery_info_id = request.data.get('delivery_info_id')
        try:
            delivery_info = DeliveryInformation.objects.get(id=delivery_info_id, user=user)
        except DeliveryInformation.DoesNotExist:
            return Response({"error": "Địa chỉ giao hàng không hợp lệ"}, status=status.HTTP_400_BAD_REQUEST)
        if not items_data:
            return Response({"error": "Danh sách sản phẩm không được để trống."}, status=400)

        # Lấy store từ sản phẩm đầu tiên
        first_product_id = items_data[0].get('product')
        try:
            first_product = Product.objects.get(id=first_product_id)
        except Product.DoesNotExist:
            return Response({"error": f"Sản phẩm đầu tiên không tồn tại."}, status=404)

        store_id = first_product.store_id

        total_cost = 0
        order_items = []

        # Kiểm tra từng sản phẩm
        for item in items_data:
            product_id = item.get('product')
            quantity = item.get('quantity')

            if not product_id or quantity is None:
                return Response({"error": "Thiếu product_id hoặc quantity trong items."}, status=400)

            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                return Response({"error": f"Sản phẩm {product_id} không tồn tại."}, status=404)

            if product.store_id != store_id:
                return Response({"error": "Tất cả sản phẩm phải thuộc cùng một cửa hàng."}, status=400)

            if product.available_quantity < quantity:
                return Response({"error": f"Sản phẩm '{product.name}' không đủ số lượng."}, status=400)

            total_cost += product.price * quantity
            order_items.append((product, quantity))

        # Tính khoảng cách và phí ship
        store = Store.objects.get(id=store_id)
        start_address = store.address
        end_address = delivery_info.address
        if not end_address:
            return Response({"error": "Người dùng chưa có thông tin giao hàng"}, status=404)
        distance = get_directions_distance(start_address, end_address, settings.MAPBOX_API_KEY)
        ship_fee = ship_fee_cost(distance)
        total_cost += ship_fee
        # Kiểm tra và áp dụng voucher
        voucher = None
        if voucher_id:
            try:
                voucher = Voucher.objects.get(id=voucher_id)

                if not voucher.is_valid():
                    return Response({"error": "Voucher không hợp lệ, đã hết hạn hoặc đã hết lượt sử dụng."}, status=400)

                if total_cost < voucher.min_order_value:
                    return Response({"error": "Không đủ điều kiện sử dụng voucher."}, status=400)

                discount = Decimal(voucher.discount_percent or 0) / Decimal('100')
                total_cost *= (Decimal('1') - discount)

            except Voucher.DoesNotExist:
                return Response({"error": "Không tìm thấy voucher."}, status=404)

        # Lấy OrderStatus mặc định có id=1
        try:
            order_status = OrderStatus.objects.get(id=1)
        except OrderStatus.DoesNotExist:
            return Response({"error": "Trạng thái đơn hàng mặc định (id=1) không tồn tại."}, status=500)

        # Tạo đơn hàng
        with transaction.atomic():
            order = Order.objects.create(
                user=user,
                store_id=store_id,
                ship_fee=ship_fee,
                total_cost=total_cost,
                voucher=voucher,
                order_status=order_status,
                note=note,
                delivery_info=delivery_info,
                payment_method=payment_method,
            )

            for product, quantity in order_items:
                OrderItem.objects.create(order=order, product=product, quantity=quantity)
                product.available_quantity -= quantity
                product.purchases+= quantity
                product.save()

            if voucher:
                voucher.used_count += 1
                voucher.order_used.add(order)
                voucher.save()
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='my-orders', permission_classes=[IsAuthenticated])
    def my_orders(self, request):
        user = request.user
        # Lấy orders của user
        orders = Order.objects.filter(user=user).select_related(
            'store', 'order_status', 'delivery_info', 'voucher'
        ).prefetch_related('order_items__product')

        # Filter theo status nếu có
        status_filter = request.query_params.get('status')
        if status_filter:
            try:
                status_id = int(status_filter)
                orders = orders.filter(order_status_id=status_id)
            except (ValueError, TypeError):
                pass

        # Sắp xếp theo ngày tạo (mới nhất trước)
        orders = orders.order_by('-created_at')

        # Phân trang
        from EcoReMartApp.paginators import ProductPaginator
        paginator = OrderPaginator()
        page = paginator.paginate_queryset(orders, request)

        if page is not None:
            serializer = OrderSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        serializer = OrderSerializer(orders, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='update-status', permission_classes=[IsAuthenticated])
    def update_order_status_customer(self, request, pk=None):
        try:
            order = Order.objects.get(id=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Đơn hàng không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

        new_status_id = request.data.get('order_status')
        if not new_status_id:
            return Response({'detail': 'Thiếu order_status.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_status = OrderStatus.objects.get(id=new_status_id)
        except OrderStatus.DoesNotExist:
            return Response({'detail': 'Trạng thái không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)

        current_status_id = order.order_status.id if order.order_status else None

        # Kiểm tra quy tắc cập nhật cho khách hàng
        if current_status_id in [1, 2] and new_status_id == 4:  # Chờ xác nhận/lấy hàng -> Yêu cầu huỷ
            order.order_status = new_status
            order.save()

            serializer = OrderSerializer(order, context={'request': request})
            return Response({
                'message': f'Đã gửi yêu cầu huỷ đơn hàng {order.order_code}',
                'order': serializer.data
            })

        elif current_status_id == 3 and new_status_id == 6:  # Chờ giao hàng -> Đã hoàn thành
            order.order_status = new_status
            order.save()

            serializer = OrderSerializer(order, context={'request': request})
            return Response({
                'message': f'Đã xác nhận hoàn thành đơn hàng {order.order_code}',
                'order': serializer.data
            })
        else:
            return Response({
                'detail': 'Không thể cập nhật trạng thái này.'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='create-payos-payment')
    def create_payos_payment(self, request, pk=None):
        """
        API tạo PayOS payment link
        """
        try:
            order = self.get_object()

            # Kiểm tra quyền sở hữu
            if order.user != request.user:
                return Response({'error': 'Không có quyền truy cập đơn hàng này'},
                                status=status.HTTP_403_FORBIDDEN)

            # Kiểm tra đã thanh toán chưa
            if order.is_paid:
                return Response({'error': 'Đơn hàng đã được thanh toán'},
                                status=status.HTTP_400_BAD_REQUEST)

            # Tạo PayOS payment
            payos_service = PayOSService()
            result = payos_service.create_payment_link(order)

            if result['success']:
                # Lưu thông tin PayOS vào database
                order.payos_order_code = result['order_code']
                order.payos_payment_url = result['payment_url']
                order.payos_qr_code = result.get('qr_code', '')
                order.payos_status = 'pending'
                order.save()

                return Response({
                    'success': True,
                    'order_code': order.order_code,
                    'payment_url': result['payment_url'],
                    'qr_code': result.get('qr_code', ''),
                    'amount': float(order.total_cost),
                    'payos_order_code': result['order_code'],
                    'expires_in': 15,  # 15 phút
                    'instructions': [
                        'Click vào "Thanh toán ngay" để mở PayOS',
                        'Chọn ngân hàng và phương thức thanh toán',
                        'Hoặc quét mã QR bằng app ngân hàng',
                        'Xác nhận thanh toán',
                        'Hệ thống sẽ tự động cập nhật trạng thái'
                    ]
                })
            else:
                return Response({'error': result['error']},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # @action(detail=True, methods=['get'], url_path='check-payment-status')
    # def check_payment_status(self, request, pk=None):
    #     """
    #     API kiểm tra trạng thái thanh toán
    #     """
    #     try:
    #         order = self.get_object()
    #
    #         if order.user != request.user:
    #             return Response({'error': 'Không có quyền truy cập'},
    #                             status=status.HTTP_403_FORBIDDEN)
    #
    #         if not order.payos_order_code:
    #             return Response({'error': 'Đơn hàng chưa có PayOS payment'},
    #                             status=status.HTTP_400_BAD_REQUEST)
    #
    #         # Lấy thông tin từ PayOS
    #         payos_service = PayOSService()
    #         result = payos_service.get_payment_info(order.payos_order_code)
    #
    #         if result['success']:
    #             payment_data = result['data']
    #
    #             # Cập nhật trạng thái nếu đã thanh toán
    #             if payment_data.status == 'PAID' and not order.is_paid:
    #                 order.is_paid = True
    #                 order.paid_at = timezone.now()
    #                 order.payos_status = 'paid'
    #                 order.payos_transaction_id = payment_data.transactions[
    #                     0].reference if payment_data.transactions else ''
    #                 order.payos_paid_at = timezone.now()
    #
    #                 # Tính hoa hồng
    #                 order.calculate_commission()
    #
    #             return Response({
    #                 'success': True,
    #                 'is_paid': order.is_paid,
    #                 'payos_status': order.payos_status,
    #                 'payment_info': {
    #                     'amount': payment_data.amount,
    #                     'status': payment_data.status,
    #                     'created_at': payment_data.createdAt,
    #                     'paid_at': order.payos_paid_at.isoformat() if order.payos_paid_at else None
    #                 }
    #             })
    #         else:
    #             return Response({'error': result['error']},
    #                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    #
    #     except Exception as e:
    #         return Response({'error': str(e)},
    #                         status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='update-payos-status')
    def update_payos_status(self, request, pk=None):
        """
        API cập nhật trạng thái PayOS cho order
        """
        try:
            order = self.get_object()

            if order.user != request.user:
                return Response({'error': 'Không có quyền truy cập'},
                                status=status.HTTP_403_FORBIDDEN)

            # Cập nhật các field PayOS
            order.is_paid = request.data.get('is_paid', False)
            if request.data.get('paid_at'):
                order.paid_at = request.data.get('paid_at')
            if request.data.get('payos_status'):
                order.payos_status = request.data.get('payos_status')
            if request.data.get('payos_paid_at'):
                order.payos_paid_at = request.data.get('payos_paid_at')
            if request.data.get('payos_transaction_id'):
                order.payos_transaction_id = request.data.get('payos_transaction_id')
            if request.data.get('payos_order_code'):
                order.payos_order_code = request.data.get('payos_order_code')

            order.save()

            # Tính hoa hồng nếu đã thanh toán
            if order.is_paid:
                order.calculate_commission()

            serializer = OrderSerializer(order, context={'request': request})
            return Response({
                'success': True,
                'message': 'Cập nhật trạng thái PayOS thành công',
                'order': serializer.data
            })

        except Exception as e:
            return Response({'error': str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OrderStausViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OrderStatus.objects.all()
    serializer_class = OrderStatusSerializer

class DeliveryInformationViewSet(viewsets.ViewSet, generics.CreateAPIView,generics.ListAPIView,generics.UpdateAPIView,generics.RetrieveAPIView,generics.DestroyAPIView):
    serializer_class = DeliveryInformationSerializer
    queryset = DeliveryInformation.objects.all()
    permission_classes = [IsAuthenticated,IsOwner]

    def get_queryset(self):
        return DeliveryInformation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class VoucherViewSet(viewsets.ViewSet, generics.CreateAPIView,generics.ListAPIView,generics.DestroyAPIView):
    serializer_class = VoucherSerializer
    queryset = Voucher.objects.all()
    def get_permissions(self):
        if self.action in ['list']:
            return [permissions.IsAuthenticated()]
        return [IsAdmin]


class ShipFeeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Tính phí ship dựa trên delivery_info_id và 1 product_id (vì tất cả sản phẩm cùng store)
        """
        delivery_info_id = request.data.get("delivery_info_id")
        product_id = request.data.get("product_id")  # Chỉ cần 1 product_id

        if not delivery_info_id:
            return Response(
                {"error": "Thiếu delivery_info_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not product_id:
            return Response(
                {"error": "Thiếu product_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Lấy thông tin giao hàng của user
            delivery_info = DeliveryInformation.objects.get(
                id=delivery_info_id,
                user=request.user
            )
            end_address = delivery_info.address

            # Lấy sản phẩm để xác định store
            product = Product.objects.get(id=product_id)
            store = product.store
            start_address = store.address

            if not start_address or not end_address:
                return Response(
                    {"error": "Thiếu thông tin địa chỉ cửa hàng hoặc địa chỉ giao hàng"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except DeliveryInformation.DoesNotExist:
            return Response(
                {"error": "Thông tin giao hàng không tồn tại hoặc không thuộc về bạn"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Product.DoesNotExist:
            return Response(
                {"error": "Sản phẩm không tồn tại"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Tính khoảng cách
        api_key = settings.MAPBOX_API_KEY
        distance_km = get_directions_distance(start_address, end_address, api_key)

        if distance_km is None:
            return Response(
                {"error": "Không tính được khoảng cách, vui lòng thử lại"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tính phí ship
        fee = ship_fee_cost(distance_km)

        return Response(
            {
                "ship_fee": fee,
                "distance_km": round(distance_km, 2)
            },
            status=status.HTTP_200_OK,
        )
#
# # PayOS Webhook endpoint
# @csrf_exempt
# def payos_webhook(request):
#     """
#     Webhook endpoint để nhận thông báo từ PayOS
#     """
#     if request.method != 'POST':
#         return JsonResponse({'error': 'Method not allowed'}, status=405)
#
#     try:
#         webhook_data = json.loads(request.body)
#
#         # Verify webhook
#         payos_service = PayOSService()
#         verify_result = payos_service.verify_webhook(webhook_data)
#
#         if not verify_result['success']:
#             return JsonResponse({'error': 'Invalid webhook'}, status=400)
#
#         # Lấy thông tin từ webhook
#         payment_data = verify_result['data']
#         order_code = payment_data.orderCode
#
#         # Tìm order
#         try:
#             order = Order.objects.get(payos_order_code=order_code)
#         except Order.DoesNotExist:
#             return JsonResponse({'error': 'Order not found'}, status=404)
#
#         # Cập nhật trạng thái thanh toán
#         if payment_data.code == '00':  # Thành công
#             order.is_paid = True
#             order.paid_at = timezone.now()
#             order.payos_status = 'paid'
#             order.payos_transaction_id = payment_data.data.transactionDateTime
#             order.payos_paid_at = timezone.now()
#
#             # Tính hoa hồng
#             order.calculate_commission()
#
#         elif payment_data.code == '01':  # Hủy
#             order.payos_status = 'cancelled'
#
#         order.save()
#
#         return JsonResponse({'success': True})
#
#     except Exception as e:
#         return JsonResponse({'error': str(e)}, status=500)