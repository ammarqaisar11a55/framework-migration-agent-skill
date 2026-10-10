from django.urls import path

from events import views

urlpatterns = [
    path("events/<int:pk>/", views.event_detail, name="event-detail"),
]
