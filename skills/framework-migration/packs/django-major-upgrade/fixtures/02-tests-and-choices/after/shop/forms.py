from django import forms

from .models import Product

ProductFormSet = forms.modelformset_factory(Product, fields=["name", "size", "price"], extra=0)
