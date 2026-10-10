from django.http import HttpResponse
from django.shortcuts import redirect, render

from .forms import PostForm
from .models import Post


def post_list(request):
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        return HttpResponse(", ".join(Post.objects.values_list("title", flat=True)))
    return render(request, "blog/list.html", {"posts": Post.objects.order_by("id")})


def post_create(request):
    form = PostForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        form.save()
        return redirect("post-list")
    return render(request, "blog/form.html", {"form": form})
