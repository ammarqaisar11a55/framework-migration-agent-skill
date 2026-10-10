from django.db import IntegrityError
from django.test import TestCase
from django.urls import reverse

from .models import Post


class PostTests(TestCase):
    def test_list_renders_posts_with_badges(self):
        Post.objects.create(title="Hello", author="ada", status=Post.Status.PUBLISHED)
        response = self.client.get(reverse("post-list"))
        self.assertContains(response, "Hello by ada")
        self.assertContains(response, "<b>published</b>", html=True)

    def test_ajax_list_returns_titles(self):
        Post.objects.create(title="One", author="ada")
        Post.objects.create(title="Two", author="bob")
        response = self.client.get(reverse("post-list"), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.content.decode(), "One, Two")

    def test_create_validates_the_title(self):
        response = self.client.post(reverse("post-create"), {"title": "Untitled", "author": "ada", "rating": 1})
        self.assertFormError(response, "form", "title", "Give the post a title.")

    def test_create_saves_and_redirects(self):
        response = self.client.post(reverse("post-create"), {"title": "Fresh", "author": "ada", "rating": 3})
        self.assertRedirects(response, reverse("post-list"))
        self.assertEqual(Post.objects.get().title, "Fresh")

    def test_rating_cannot_be_negative(self):
        with self.assertRaises(IntegrityError):
            Post.objects.create(title="Bad", author="ada", rating=-1)

    def test_created_defaults_to_aware_utc(self):
        post = Post.objects.create(title="Now", author="ada")
        self.assertEqual(post.created.utcoffset().total_seconds(), 0)
