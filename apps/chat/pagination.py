from rest_framework.pagination import PageNumberPagination


class ChatRoomPagination(PageNumberPagination):
    """
    Pagination for chat rooms
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class MessagePagination(PageNumberPagination):
    """
    Pagination for messages
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200
