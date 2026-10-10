from datetime import datetime, timedelta, timezone

from django.db import IntegrityError
from django.test import TestCase
from django.urls import reverse

from .models import Event, Venue


class EventTests(TestCase):
    def setUp(self):
        self.venue = Venue.objects.create(name="Hall A", city="Leeds")
        self.start = datetime(2026, 5, 1, 18, 0, tzinfo=timezone(timedelta(hours=2)))

    def test_detail_shows_label_and_utc_start(self):
        event = Event.objects.create(title="Talk", venue=self.venue, starts=self.start, ends=self.start + timedelta(hours=1), capacity=50)
        response = self.client.get(reverse("event-detail", args=[event.pk]))
        self.assertEqual(response.content.decode(), "<strong>Talk</strong> at Hall A on 2026-05-01 16:00 UTC")

    def test_event_must_end_after_it_starts(self):
        with self.assertRaises(IntegrityError):
            Event.objects.create(title="Bad", venue=self.venue, starts=self.start, ends=self.start, capacity=1)

    def test_venues_by_city(self):
        Venue.objects.create(name="Arena", city="Leeds")
        self.assertEqual(list(Venue.objects.filter(city="Leeds").order_by("name").values_list("name", flat=True)), ["Arena", "Hall A"])

    def test_capacity_cannot_be_negative(self):
        with self.assertRaises(IntegrityError):
            Event.objects.create(title="Neg", venue=self.venue, starts=self.start, ends=self.start + timedelta(hours=1), capacity=-1)

    def test_missing_event_is_404(self):
        self.assertEqual(self.client.get(reverse("event-detail", args=[999])).status_code, 404)
