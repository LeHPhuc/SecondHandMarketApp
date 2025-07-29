import os
import environ
import firebase_admin
from firebase_admin import credentials, auth
from rest_framework import authentication, exceptions
from django.contrib.auth import get_user_model
from django.utils import timezone
from .exceptions import NoAuthToken, InvalidAuthToken, FirebaseError

env = environ.Env()
environ.Env.read_env(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
# Load service account
cred = credentials.Certificate({
    "type": env("FIREBASE_TYPE"),
    "project_id": env("FIREBASE_PROJECT_ID"),
    "private_key_id": env("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": env("FIREBASE_PRIVATE_KEY").replace('\\n', '\n'),
    "client_email": env("FIREBASE_CLIENT_EMAIL"),
    "client_id": env("FIREBASE_CLIENT_ID"),
    "auth_uri": env("FIREBASE_AUTH_URI"),
    "token_uri": env("FIREBASE_TOKEN_URI"),
    "auth_provider_x509_cert_url": env("FIREBASE_AUTH_PROVIDER_CERT_URL"),
    "client_x509_cert_url": env("FIREBASE_CLIENT_CERT_URL"),
    "universe_domain": env("FIREBASE_UNIVERSE_DOMAIN"),
})

firebase_admin.initialize_app(cred)

User = get_user_model()

class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None

        id_token = auth_header.split(" ").pop()
        try:
            decoded_token = auth.verify_id_token(id_token)
        except Exception:
            raise InvalidAuthToken("Invalid auth token")

        uid = decoded_token.get("uid")
        if not uid:
            raise FirebaseError()

        # Tạo hoặc lấy user theo UID từ Firebase
        user, _ = User.objects.get_or_create(uid=uid, defaults={'username': uid})
        user.last_login = timezone.now()
        user.save()
        request.firebase_claims = decoded_token  # Gắn claim để phân quyền
        return (user, None)
