
from .models import User
class UserAdmin(admin.ModelAdmin):
        "email",
        "first_name",
        "last_name",
        "is_staff",
    )
    search_fields = ("email", "first_name", "last_name")