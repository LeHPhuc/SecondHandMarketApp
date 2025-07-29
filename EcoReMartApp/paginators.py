from rest_framework.pagination import PageNumberPagination

class ProductPaginator(PageNumberPagination):
    page_size = 2

class CommentPaginator(PageNumberPagination):
    page_size = 2