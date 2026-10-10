from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0001_initial'),
    ]

    operations = [
        migrations.RenameIndex(
            model_name='post',
            new_name='blog_post_author_f0c04b_idx',
            old_fields=('author', 'status'),
        ),
    ]
