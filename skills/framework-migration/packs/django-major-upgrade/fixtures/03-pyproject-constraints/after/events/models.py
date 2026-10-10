import datetime as dt
from django.db import models
from django.utils import timezone
from django.utils.html import format_html


class Venue(models.Model):
    name = models.CharField(max_length=100)
    city = models.CharField(max_length=100)

    class Meta:
        indexes = [models.Index(fields=("city", "name"))]


class Event(models.Model):
    title = models.CharField(max_length=200)
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE)
    starts = models.DateTimeField()
    ends = models.DateTimeField()
    capacity = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(ends__gt=models.F("starts")), name="ends_after_start"),
        ]

    def label(self):
        return format_html("<strong>{}</strong> at {}", self.title, self.venue.name)

    def starts_utc(self):
        return self.starts.astimezone(dt.timezone.utc).strftime("%Y-%m-%d %H:%M")
