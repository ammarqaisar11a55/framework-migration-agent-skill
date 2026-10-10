from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from .models import Product, Size


class ProductTests(TestCase):
    def setUp(self):
        self.tea = Product.objects.create(name="Tea", size=Size.LARGE, price=Decimal("3.50"))
        self.cup = Product.objects.create(name="Cup", price=Decimal("8.00"))

    def test_products_are_ordered_by_name(self):
        self.assertQuerySetEqual(Product.objects.order_by("name"), ["Cup", "Tea"], transform=str)

    def test_list_shows_sizes(self):
        response = self.client.get(reverse("product-list"))
        self.assertContains(response, "Tea (Large)")
        self.assertContains(response, "Cup (Small)")

    def test_json_list_by_accept_header(self):
        response = self.client.get(reverse("product-list"), headers={"accept": "application/json"})
        self.assertEqual(response.json(), {"products": ["Cup", "Tea"]})

    def test_bulk_edit_reports_errors_per_form(self):
        data = {
            "form-TOTAL_FORMS": "2",
            "form-INITIAL_FORMS": "2",
            "form-0-id": str(self.tea.id),
            "form-0-name": "Tea",
            "form-0-size": "x",
            "form-0-price": "3.50",
            "form-1-id": str(self.cup.id),
            "form-1-name": "Cup",
            "form-1-size": "s",
            "form-1-price": "8.00",
        }
        response = self.client.post(reverse("bulk-edit"), data)
        self.assertFormSetError(response.context["formset"], 0, "size", "Select a valid choice. x is not one of the available choices.")

    def test_bulk_edit_saves(self):
        data = {
            "form-TOTAL_FORMS": "2",
            "form-INITIAL_FORMS": "2",
            "form-0-id": str(self.tea.id),
            "form-0-name": "Green tea",
            "form-0-size": "l",
            "form-0-price": "4.00",
            "form-1-id": str(self.cup.id),
            "form-1-name": "Cup",
            "form-1-size": "s",
            "form-1-price": "8.00",
        }
        self.assertRedirects(self.client.post(reverse("bulk-edit"), data), reverse("product-list"))
        self.tea.refresh_from_db()
        self.assertEqual(self.tea.name, "Green tea")

    def test_static_asset_is_found_once(self):
        self.assertEqual(self.client.get(reverse("asset-paths")).json(), {"count": 1})
