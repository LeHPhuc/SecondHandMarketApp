from multiprocessing.resource_tracker import register
from django.urls import path,include
from  . import  views
from rest_framework import routers

r= routers.DefaultRouter()
r.register('category', views.CategoryViewSet)
r.register('product', views.ProductViewSet)
r.register(r'product-create', views.ProductCreateViewSet, basename='product-create')
r.register('user', views.UserViewSet)
r.register('store', views.StoreViewSet)
r.register('order', views.OrderViewSet)
urlpatterns = [
    path('', include(r.urls)),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('current-user/', views.CurrentUserView.as_view(), name='current-user'),
    path('add-productCart/', views.AddToCartView.as_view(), name='add-productCart'),
    path('my-cart/', views.CartGroupedView.as_view(), name='my-cart'),
    path('addQuantity-productCart/', views.UpdateCartItemView.as_view(), name='addQuantity-productCart'),
    path('delete-productCart/', views.RemoveCartItemView.as_view(), name='delete-productCart'),
]