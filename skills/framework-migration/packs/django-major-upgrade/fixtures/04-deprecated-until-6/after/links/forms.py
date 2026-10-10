from django import forms


class LinkForm(forms.Form):
    title = forms.CharField(max_length=100)
    url = forms.URLField()
