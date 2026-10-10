from django.urls import path

from shop import views

urlpatterns = [
    path("products/", views.product_list, name="product-list"),
    path("products/bulk/", views.bulk_edit, name="bulk-edit"),
    path("assets/", views.asset_paths, name="asset-paths"),
]
