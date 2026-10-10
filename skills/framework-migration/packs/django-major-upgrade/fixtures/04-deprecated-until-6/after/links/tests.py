from django.test import TestCase
from django.urls import reverse

from .models import Link


class LinkTests(TestCase):
    def test_create_keeps_the_scheme_given(self):
        response = self.client.post(reverse("link-create"), {"title": "Docs", "url": "https://example.com/docs"})
        link = Link.objects.get()
        self.assertRedirects(response, reverse("link-detail", args=[link.pk]), fetch_redirect_response=False)
        self.assertEqual(link.url, "https://example.com/docs")

    def test_create_adds_http_to_a_bare_domain(self):
        self.client.post(reverse("link-create"), {"title": "Home", "url": "example.org"})
        self.assertEqual(Link.objects.get().url, "http://example.org")

    def test_create_rejects_a_bad_url(self):
        response = self.client.post(reverse("link-create"), {"title": "Bad", "url": "not a url"})
        self.assertEqual(response.status_code, 400)

    def test_detail_renders_the_anchor_and_counts_clicks(self):
        link = Link.objects.create(title="Docs", url="https://example.com/docs")
        self.assertEqual(self.client.get(reverse("link-detail", args=[link.pk])).content.decode(), '<a href="https://example.com/docs">Docs</a> (1)')
        self.assertEqual(self.client.get(reverse("link-detail", args=[link.pk])).content.decode(), '<a href="https://example.com/docs">Docs</a> (2)')

    def test_record_click_saves_only_the_counter(self):
        link = Link.objects.create(title="Docs", url="https://example.com/docs")
        Link.objects.filter(pk=link.pk).update(title="Renamed")
        link.record_click()
        link.refresh_from_db()
        self.assertEqual((link.title, link.clicks), ("Renamed", 1))
