from multiprocessing.resource_tracker import register
from django.urls import path,include
from  . import  views
from rest_framework import routers

r= routers.DefaultRouter()
r.register('category', views.CategoryViewSet)
r.register('product', views.ProductViewSet)
r.register('user', views.UserViewSet)
urlpatterns = [
    path('', include(r.urls)),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('current-user/', views.CurrentUserView.as_view(), name='current-user'),
]