from django.contrib.gis.db import models
from django.conf import settings
UserModel = settings.AUTH_USER_MODEL


class Task(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(UserModel, related_name="tasks_creators")
    assigned_to = models.ManyToManyField(UserModel, related_name="tasks_surveyors")
    description = models.TextField(blank=True, null=True)
    feature_identifier = models.CharField(max_length=256)
    status = models.IntegerField(default=1)
    due_date = models.DateTimeField(null=True, blank=True)
