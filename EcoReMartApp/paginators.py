from rest_framework.pagination import PageNumberPagination

class ProductPaginator(PageNumberPagination):
    page_size = 1

class CommentPaginator(PageNumberPagination):
    page_size = 2