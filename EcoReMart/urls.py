
from django.contrib import admin
from django.urls import path, include
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework.permissions import AllowAny

from EcoReMartApp import permissions

schema_view = get_schema_view(
   openapi.Info(
      title="Snippets API",
      default_version='v1',
      description="EcoReMart API",
      contact=openapi.Contact(email="plehoang641@gmail.com"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
    permission_classes=[AllowAny],
)
urlpatterns = [
    path('', include('EcoReMartApp.urls')),
    path('admin/', admin.site.urls),
    path('swagger<format>/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
