
# FILE NÀY DÙNG ĐỂ GÁN HOẶC HAY ĐỔI ROLE CỦA USER THÀNH ADMIN
import os
import environ
import firebase_admin
from firebase_admin import credentials, auth

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

# Gán role
auth.set_custom_user_claims("FIREBASE_UID", {"role": "admin"})