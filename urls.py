from django.conf.urls import patterns, url,include
import views
from . import APP_NAME
from .rest import TaskResource
from tastypie.api import Api
geo_api = Api(api_name='geotasks')
from cartoview.app_manager.api import rest_api
geo_api.register(TaskResource())
urlpatterns = patterns('',
   url(r'^(?P<instance_id>\d+)/view/$', views.view_map, name='%s.view' % APP_NAME),
   url(r'^new/$', views.new, name='%s.new' % APP_NAME),
   url(r'^api/', include(geo_api.urls)),
   url(r'^(?P<instance_id>\d+)/edit/$', views.edit, name='%s.edit' % APP_NAME),
)
