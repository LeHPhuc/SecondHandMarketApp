from django.template.context_processors import request
from rest_framework import serializers
from EcoReMartApp.models import *



class UserSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user
    class Meta:
        model = User
        fields = ['id','email','password','first_name', 'last_name','phone_number','avatar']
        extra_kwargs = {
            'password': {
                'write_only': True,
            }
        }

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    class Meta:
        model = Product
        fields = ['id','name','available_quantity','price','image']
    def get_image(self,obj):
        first_image = obj.images.first()
        if first_image and first_image.image:
            request = self.context.get('request')
            image_url = first_image.image.url
            if request is not None:
                return request.build_absolute_uri(f'/static{image_url}')
            return image_url
        return None

class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'uploaded_at']

    def get_image(self, obj):
        request = self.context.get('request')
        if request and obj.image:
            image_url = request.build_absolute_uri(f'/static{obj.image.url}')
            return image_url

class ProductConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCondition
        fields = '__all__'

class ProductDetailSerializer(ProductSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    conditions = ProductConditionSerializer(read_only=True)
    comments_count = serializers.SerializerMethodField()
    def get_comments_count(self,obj):
        return obj.comments.all().count()
    class Meta:
        model = ProductSerializer.Meta.model
        fields = list(ProductSerializer.Meta.fields) + ['categories','images','note','conditions','comments_count']


class CommentImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    class Meta:
        model = CommentImage
        fields = '__all__'

    def get_image(self, obj):
        request = self.context.get('request')
        if request and obj.image:
            image_url = request.build_absolute_uri(f'/static{obj.image.url}')
            return image_url

class CommentSerializer(serializers.ModelSerializer):
    images=CommentImageSerializer(many=True, read_only=True)
    def to_representation(self, comment):
        req=super().to_representation(comment)
        avatar_url = None
        if comment.user.avatar and hasattr(comment.user.avatar, 'url'):
            request = self.context.get('request')
            avatar_url = request.build_absolute_uri(f'/static{comment.user.avatar.url}') if request else comment.user.avatar.url

        req['user']={
            'username':comment.user.username,
            'avatar':avatar_url,
        }
        return req
    class Meta:
        model = Comment
        fields = ['id','user', 'content','created_date','images']