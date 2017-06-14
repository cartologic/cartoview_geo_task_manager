from cartoview.app_manager.resources import BaseModelResource, FileUploadResource
from tastypie.resources import Resource, ModelResource
from .models import *
from tastypie.constants import ALL_WITH_RELATIONS, ALL
from tastypie.authorization import Authorization
from tastypie import fields
from avatar.templatetags.avatar_tags import avatar_url


class TaskResource(ModelResource):
    user = fields.DictField(readonly=True)
    surveyors = fields.ListField()

    class Meta:
        queryset = Task.objects.all()
        filtering = {"feature_identifier": ALL}
        can_edit = True
        authorization = Authorization()
        ordering = ['created_at']

    def save(self, bundle, skip_errors=False):
        user_model = Task.assigned_to.field.rel.to
        assigned_to = user_model.objects.filter(
            id__in=bundle.data["assigned_to"])
        bundle.obj.created_by = bundle.request.user

        res = super(TaskResource, self).save(bundle, skip_errors)
        bundle.obj.assigned_to = assigned_to
        bundle.obj.save()
        return res

    def dehydrate_surveyors(self, bundle):
        return [item["id"] for item in bundle.obj.assigned_to.values("id")]

    def dehydrate_user(self, bundle):
        return dict(name=bundle.obj.created_by.username, avatar=avatar_url(bundle.obj.created_by, 60))
