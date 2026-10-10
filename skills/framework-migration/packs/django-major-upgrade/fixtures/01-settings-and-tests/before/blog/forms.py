from django import forms

from .models import Post


class PostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ["title", "author", "rating"]

    def clean_title(self):
        title = self.cleaned_data["title"]
        if title.lower() == "untitled":
            raise forms.ValidationError("Give the post a title.")
        return title
