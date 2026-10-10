from django.contrib.staticfiles import finders
from django.http import JsonResponse
from django.shortcuts import redirect, render

from .forms import ProductFormSet
from .models import Product


def product_list(request):
    products = Product.objects.order_by("name")
    if request.headers.get("accept") == "application/json":
        return JsonResponse({"products": [p.name for p in products]})
    return render(request, "shop/list.html", {"products": products})


def bulk_edit(request):
    formset = ProductFormSet(request.POST or None, queryset=Product.objects.order_by("id"))
    if request.method == "POST" and formset.is_valid():
        formset.save()
        return redirect("product-list")
    return render(request, "shop/bulk.html", {"formset": formset})


def asset_paths(request):
    found = finders.find("css/site.css", find_all=True)
    return JsonResponse({"count": len(found)})
