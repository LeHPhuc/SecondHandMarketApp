from django.apps import AppConfig


class EcoremartappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'EcoReMartApp'

    def ready(self):
        import EcoReMartApp.signals