from django.urls import path

from blog import views

urlpatterns = [
    path("posts/", views.post_list, name="post-list"),
    path("posts/new/", views.post_create, name="post-create"),
]
