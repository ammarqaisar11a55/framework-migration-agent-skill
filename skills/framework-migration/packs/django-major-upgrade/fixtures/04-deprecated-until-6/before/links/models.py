from django.db import models
from django.utils.html import format_html


class Link(models.Model):
    title = models.CharField(max_length=100)
    url = models.URLField()
    clicks = models.PositiveIntegerField(default=0)

    def anchor(self):
        # Values are trusted (validated on save); kept as plain string formatting.
        return format_html('<a href="%s">%s</a>' % (self.url, self.title))

    def record_click(self):
        self.clicks += 1
        self.save(False, False, None, ["clicks"])
