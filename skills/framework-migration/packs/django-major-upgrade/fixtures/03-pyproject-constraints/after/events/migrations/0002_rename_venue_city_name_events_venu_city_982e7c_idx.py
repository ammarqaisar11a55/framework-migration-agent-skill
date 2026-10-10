from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.RenameIndex(
            model_name='venue',
            new_name='events_venu_city_982e7c_idx',
            old_fields=('city', 'name'),
        ),
    ]
