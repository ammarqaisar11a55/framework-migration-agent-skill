from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import get_object_or_404, redirect

from .forms import LinkForm
from .models import Link


def link_create(request):
    form = LinkForm(request.POST)
    if not form.is_valid():
        return HttpResponseBadRequest(form.errors.as_text())
    link = Link.objects.create(**form.cleaned_data)
    return redirect("link-detail", pk=link.pk)


def link_detail(request, pk):
    link = get_object_or_404(Link, pk=pk)
    link.record_click()
    return HttpResponse(f"{link.anchor()} ({link.clicks})")
