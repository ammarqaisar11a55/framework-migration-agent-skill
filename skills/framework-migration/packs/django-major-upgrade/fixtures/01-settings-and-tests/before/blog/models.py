from datetime import datetime

from django.db import models
from django.utils.html import format_html
from django.utils.timezone import utc


def now_utc():
    return datetime.now(tz=utc)


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
        index_together = [["author", "status"]]
        constraints = [
            models.CheckConstraint(check=models.Q(rating__gte=0), name="rating_not_negative"),
        ]

    def badge(self):
        return format_html("<b>{}</b>".format(self.status))
