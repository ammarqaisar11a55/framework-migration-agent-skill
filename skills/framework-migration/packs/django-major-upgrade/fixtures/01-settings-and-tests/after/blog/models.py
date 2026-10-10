import datetime as dt
from datetime import datetime

from django.db import models
from django.utils.html import format_html


def now_utc():
    return datetime.now(tz=dt.timezone.utc)


class Post(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    title = models.CharField(max_length=200)
    author = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    rating = models.IntegerField(default=0)
    created = models.DateTimeField(default=now_utc)

    class Meta:
        indexes = [models.Index(fields=["author", "status"])]
        constraints = [
            models.CheckConstraint(condition=models.Q(rating__gte=0), name="rating_not_negative"),
        ]

    def badge(self):
        return format_html("<b>{}</b>", self.status)
