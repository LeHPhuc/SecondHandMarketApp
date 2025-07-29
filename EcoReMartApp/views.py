from email.policy import default
from itertools import product

from django.http import HttpResponse
from rest_framework import viewsets,permissions,generics,status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from EcoReMartApp.models import *
from EcoReMartApp.permissions import IsAdmin, IsCustomerWithStore, IsOwner, IsOwnerOrAdmin
from EcoReMartApp.serializers import CategorySerializer,ProductSerializer,ProductDetailSerializer,CommentSerializer,UserSerializer
from EcoReMartApp.paginators import ProductPaginator,CommentPaginator
import cloudinary.uploader
from firebase_admin import auth as firebase_auth
import re
from django.db import IntegrityError
from rest_framework.exceptions import ValidationError
def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")
DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dxouh8fmh/image/upload/v1753796806/store-icon_hu2tv9.webp"
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer
    permission_classes = (IsAdmin,)
#
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
        print("Avatar nhận được:", avatar_file)
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

        # Upload avatar nếu có
        avatar_url = None
        if avatar_file:
            try:
                uploaded = cloudinary.uploader.upload(avatar_file)
                avatar_url = uploaded.get("secure_url")
                print("Avatar upload thành công:", avatar_url)
            except Exception as e:
                print("Lỗi upload Cloudinary:", str(e))
                return Response({"error": "Upload thất bại", "details": str(e)}, status=500)
        else:
            avatar_url = DEFAULT_AVATAR_URL
        # Get or create user
        user, created = User.objects.get_or_create(uid=uid)

        # Update user info
        user.email = email
        user.first_name = first_name or ""
        user.last_name = last_name or ""
        user.phone_number = phone_number
        user.avatar = avatar_url
        user.role = "customer"


        if password:
            user.set_password(password)
        try:
            user.save()
        except (IntegrityError, ValidationError) as e:
            return Response({"error": "Lưu người dùng thất bại", "details": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.serializer_class(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = UserSerializer
    def post(self, request):
        id_token = request.data.get('idToken')
        if not id_token:
            return Response({"error": "Thiếu idToken"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
        except Exception as e:
            return Response({"error": "Token không hợp lệ", "details": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        uid = decoded_token.get("uid")
        if not uid:
            return Response({"error": "Token không có uid"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            user = User.objects.get(uid=uid)
        except User.DoesNotExist:
            return Response({"error": "Người dùng chưa đăng ký"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]  # đảm bảo user đã đăng nhập
    serializer_class = UserSerializer
    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CategoryViewSet(viewsets.ViewSet, generics.ListAPIView):
        queryset = Category.objects.all()
        serializer_class = CategorySerializer
        @action(detail=True, methods=['get'], url_path='products', permission_classes=[permissions.AllowAny])
        def get_products(self, request, pk):
            products = self.get_object().products.filter(active=True).order_by('-created_date')
            p = ProductPaginator()
            page = p.paginate_queryset(products, request)
            if page:
                s = ProductSerializer(page, many=True, context={'request': request})
                return p.get_paginated_response(s.data)
            else:
                return Response(ProductSerializer(products, many=True).data, status=status.HTTP_200_OK)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.prefetch_related('categories').filter(active=True)
    # serializer_class = ProductDetailSerializer
    pagination_class = ProductPaginator
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer  # GET /product/<id>/
        return ProductSerializer  # GET /product/

    def get_queryset(self):
        query = self.queryset
        q=self.request.query_params.get('q')
        if q:
            query=query.filter(name__icontains=q)
        return query

    def get_permissions(self):
        if self.action.__eq__('get_comments') and self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        if self.request.method in ['PUT', 'PATCH']:
            return [permissions.IsAuthenticated(),IsCustomerWithStore(),IsOwner()]
        if self.request.method in ['POST']:
            return [permissions.IsAuthenticated(),IsCustomerWithStore()]
        if self.request.method in ['DELETE']:
            return [permissions.IsAuthenticated(), IsCustomerWithStore(), IsOwnerOrAdmin()]
        return [permissions.AllowAny()]

    @action(detail=True, methods=['get','post'],url_path='comments')
    def get_comments(self, request, pk):
        if request.method.__eq__('POST'):
            content = request.data.get('content')
            product = self.get_object()
            rating = request.data.get('rating')
            if not content:
                return Response({"error": "Thiếu content"}, status=status.HTTP_400_BAD_REQUEST)
            if not rating:
                return Response({"error": "Thiếu rating"}, status=status.HTTP_400_BAD_REQUEST)
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