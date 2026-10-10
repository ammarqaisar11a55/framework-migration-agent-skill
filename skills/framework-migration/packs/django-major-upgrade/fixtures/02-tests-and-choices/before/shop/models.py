from django.db import models


class Size(models.TextChoices):
    SMALL = "s", "Small"
    LARGE = "l", "Large"


class Product(models.Model):
    name = models.CharField(max_length=100)
    size = models.CharField(max_length=1, choices=Size.choices, default=Size.SMALL)
    price = models.DecimalField(max_digits=8, decimal_places=2)

    def __str__(self):
        return self.name
