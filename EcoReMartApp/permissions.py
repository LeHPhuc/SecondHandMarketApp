from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        claims = getattr(request, 'firebase_claims', {})
        return claims.get("role") == "admin"

class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        claims = getattr(request, 'firebase_claims', {})
        return claims.get("role") == "customer"

class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return getattr(obj, 'owner', None) == request.user

class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        return (
            getattr(obj, 'owner', None) == request.user
            or getattr(request, 'firebase_claims', {}).get('role') == 'admin'
        )