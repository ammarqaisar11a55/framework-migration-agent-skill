from django.urls import path

from links import views

urlpatterns = [
    path("links/new/", views.link_create, name="link-create"),
    path("links/<int:pk>/", views.link_detail, name="link-detail"),
]
