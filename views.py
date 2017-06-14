import json
import uuid
from decimal import Decimal

import logging

import geoserver
from django.conf import settings
from django.utils.translation import ugettext as _
import requests
from django.shortcuts import render, HttpResponse, redirect, HttpResponseRedirect
from geonode import GeoNodeException
from geonode.geoserver.helpers import ogc_server_settings, get_store, get_sld_for
from geonode.utils import set_attributes
from geoserver.catalog import Catalog, FailedRequestError
from geonode.layers.models import Layer
from . import APP_NAME
from cartoview_map_viewer import views as viewer_views
from .viewer_widgets import widgets
from django.contrib.auth.decorators import login_required
from django.db import connections

from .models import Task

logger = logging.getLogger(__name__)
VIEW_MAP_TPL = "%s/view.html" % APP_NAME
NEW_EDIT_TPL = "%s/new.html" % APP_NAME
username, password = ogc_server_settings.credentials
gs_catalog = Catalog(ogc_server_settings.internal_rest, username, password)


@login_required
def view_map(request, instance_id):
    layer_name = "geotasks_{0}".format(instance_id)
    resource = gs_catalog.get_resource(layer_name)
    if not resource:
        create_table(layer_name)
        layer_resource = create_geoserver_layer(layer_name, request.user, 4326, title=layer_name)
        create_geonode_layer(layer_resource, request.user)
        set_style(layer_name)
    context = dict(widgets=widgets)
    return viewer_views.view_app(request, instance_id, template="%s/view.html" % APP_NAME, context=context)


@login_required
def new(request):
    context = dict(widgets=widgets)
    return viewer_views.new(request, app_name=APP_NAME, context=context)


@login_required
def edit(request, instance_id):
    context = dict(widgets=widgets)
    return viewer_views.edit(request, instance_id, context=context)


def create_geonode_layer(resource, owner):
    name = resource.name
    the_store = resource.store
    workspace = the_store.workspace
    layer, created = Layer.objects.get_or_create(name=name, defaults={
        "workspace": workspace.name,
        "store": the_store.name,
        "storeType": the_store.resource_type,
        "typename": "%s:%s" % (workspace.name.encode('utf-8'), resource.name.encode('utf-8')),
        "title": resource.title or 'No title provided',
        "abstract": resource.abstract or unicode(_('No abstract provided')).encode('utf-8'),
        "owner": owner,
        "uuid": str(uuid.uuid4()),
        "bbox_x0": Decimal(resource.latlon_bbox[0]),
        "bbox_x1": Decimal(resource.latlon_bbox[1]),
        "bbox_y0": Decimal(resource.latlon_bbox[2]),
        "bbox_y1": Decimal(resource.latlon_bbox[3])
    })
    # recalculate the layer statistics
    # set_attributes(layer, overwrite=True)
    layer.set_default_permissions()


def create_feature_store(cat, workspace):
    dsname = ogc_server_settings.DATASTORE
    ds_exists = False
    try:
        ds = get_store(cat, dsname, workspace=workspace)
        ds_exists = True
    except FailedRequestError:
        ds = cat.create_datastore(dsname, workspace=workspace)
    db = ogc_server_settings.datastore_db
    db_engine = 'postgis' if 'postgis' in db['ENGINE'] else db['ENGINE']
    ds.connection_parameters.update({
        'validate connections': 'true',
        'max connections': '10',
        'min connections': '1',
        'fetch size': '1000',
        'host': db['HOST'],
        'port': db['PORT'] if isinstance(db['PORT'], basestring) else str(db['PORT']) or '5432',
        'database': db['NAME'],
        'user': db['USER'],
        'passwd': db['PASSWORD'],
        'dbtype': db_engine
    })

    if ds_exists:
        ds.save_method = "PUT"

    cat.save(ds)
    return get_store(cat, dsname, workspace=workspace)


def create_style():
    r = requests.post(ogc_server_settings.public_url + 'rest/styles',
                      data="<style><name>geotasks_style</name><filename>geotasks.sld</filename></style>",
                      headers={"Content-type": "text/xml"}, auth=('admin', 'geoserver'))
    if r.status_code >= 200 and r.status_code < 299:
        import os
        style_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'geotasks.sld')
        print style_path
        r = requests.put(ogc_server_settings.public_url + 'rest/styles/geotasks_style',
                         data=open(style_path, 'rb').read(), auth=('admin', 'geoserver'),
                         headers={"Content-type": "application/vnd.ogc.sld+xml"})
        if r.status_code >= 200 and r.status_code < 299:
            pass
        else:
            print "create style error {}".format(r.status_code)
    else:
        pass


def set_style(layer_name):
    resource = gs_catalog.get_resource(layer_name)
    r = requests.put(
        ogc_server_settings.public_url + 'rest/layers/{}:{}'.format(resource.workspace.name, resource.name),
        data="<layer><defaultStyle><name>geotasks_style</name></defaultStyle></layer>", auth=('admin', 'geoserver'),
        headers={"Content-type": "text/xml"})
    if r.status_code >= 200 and r.status_code < 299:
        pass
    else:
        print "set style error {} asdasd".format(r.status_code)


def create_geoserver_layer(name, user, srid,
                           overwrite=False,
                           title=None,
                           abstract=None,
                           charset='UTF-8'):
    if "geonode.geoserver" in settings.INSTALLED_APPS:

        _user, _password = ogc_server_settings.credentials
        #

        # Step 2. Check that it is uploading to the same resource type as
        # the existing resource
        logger.info('>>> Step 2. Make sure we are not trying to overwrite a '
                    'existing resource named [%s] with the wrong type', name)
        the_layer_type = "vector"

        # Get a short handle to the gsconfig geoserver catalog
        cat = Catalog(ogc_server_settings.internal_rest, _user, _password)

        workspace = cat.get_default_workspace()
        # Check if the store exists in geoserver
        try:
            store = get_store(cat, name, workspace=workspace)

        except FailedRequestError as e:
            # There is no store, ergo the road is clear
            pass
        else:
            # If we get a store, we do the following:
            resources = store.get_resources()

            # If the store is empty, we just delete it.
            if len(resources) == 0:
                cat.delete(store)
            else:
                # If our resource is already configured in the store it needs
                # to have the right resource type
                for resource in resources:
                    if resource.name == name:
                        msg = 'Name already in use and overwrite is False'
                        assert overwrite, msg
                        existing_type = resource.resource_type
                        if existing_type != the_layer_type:
                            msg = ('Type of uploaded file %s (%s) '
                                   'does not match type of existing '
                                   'resource type '
                                   '%s' % (name, the_layer_type, existing_type))
                            logger.info(msg)
                            raise GeoNodeException(msg)

        logger.debug('Creating vector layer: [%s]', name)
        ds = create_feature_store(cat, workspace)
        gs_resource = gs_catalog.publish_featuretype(name, ds, "EPSG:" + str(srid))

        # # Step 7. Create the style and assign it to the created resource
        # # FIXME: Put this in gsconfig.py
        logger.info('>>> Step 7. Creating style for [%s]' % name)
        publishing = cat.get_layer(name)
        create_style()
        sld = get_sld_for(gs_catalog, publishing)

        style = None
        if sld is not None:
            try:
                cat.create_style(name, sld)
                style = cat.get_style(name)
            except geoserver.catalog.ConflictingDataError as e:
                msg = ('There was already a style named %s in GeoServer, '
                       'try to use: "%s"' % (name + "_layer", str(e)))
                logger.warn(msg)
                e.args = (msg,)
                try:
                    cat.create_style(name + '_layer', sld)
                    style = cat.get_style(name + "_layer")
                except geoserver.catalog.ConflictingDataError as e:
                    style = cat.get_style('point')
                    msg = ('There was already a style named %s in GeoServer, '
                           'cannot overwrite: "%s"' % (name, str(e)))
                    logger.error(msg)
                    e.args = (msg,)

            # FIXME: Should we use the fully qualified typename?
            publishing.default_style = style
            cat.save(publishing)
        return gs_resource


def create_table(layer_name):
    connection = connections["datastore"]
    cursor = connection.cursor()
    cursor.execute("""\
CREATE SEQUENCE public.{0}_fid_seq
  INCREMENT 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  START 1
  CACHE 1;
ALTER TABLE public.{0}_fid_seq
  OWNER TO postgres;
CREATE TABLE public.{0}
(
  fid integer NOT NULL DEFAULT nextval('{0}_fid_seq'::regclass),
  the_geom geometry(Point,4326),
  id bigint,
  status character varying(100),
  CONSTRAINT {0}_pkey PRIMARY KEY (fid)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE public.{0}
  OWNER TO postgres;

CREATE INDEX spatial_{0}_the_geom
  ON public.{0}
  USING gist
  (the_geom);

    """.format(layer_name))
