from django.utils.deprecation import MiddlewareMixin

class DisableAuthForSwaggerMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Nếu truy cập swagger hoặc redoc thì tắt xác thực
        if request.path.startswith('/swagger') or request.path.startswith('/redoc') or request.path.startswith('/swagger.json'):
            request._dont_enforce_csrf_checks = True
            request.META['HTTP_AUTHORIZATION'] = ''  # xóa Authorization header (FirebaseAuth sẽ bỏ qua)
