from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from .models import Event


def event_detail(request, pk):
    event = get_object_or_404(Event, pk=pk)
    return HttpResponse(f"{event.label()} on {event.starts_utc()} UTC")
