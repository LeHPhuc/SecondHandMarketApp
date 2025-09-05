from rest_framework.pagination import PageNumberPagination

class ProductPaginator(PageNumberPagination):
    page_size = 15

class CommentPaginator(PageNumberPagination):
    page_size = 6

class OrderPaginator(PageNumberPagination):
    page_size = 4