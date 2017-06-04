/**
 * Created by kamal on 10/15/16.
 */
var taskManagerApp = angular.module('cartoview.taskManagerApp', ['cartoview.mapViewerApp', 'ngResourceTastypie' ,'cartoview.userInfo','cartoview.userEngage']);
taskManagerApp.config(function($tastypieProvider, $httpProvider, urlsHelper) {
  // $tastypieProvider.add('cartoview', {url: urlsHelper.rest});
  // $tastypieProvider.add('geonode', {url: urlsHelper.geonodeRest});
  // $tastypieProvider.setDefault('cartoview');
  $tastypieProvider.setResourceUrl(urlsHelper.geonodeRest);
  $tastypieProvider.add('cartoview', {
    url: urlsHelper.rest + "../rest/"
  });
  $httpProvider.defaults.xsrfCookieName = 'csrftoken';
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
});
taskManagerApp.controller('cartoview.taskManagerApp.MainController',
  function($scope, mapService, identifyService, $mdSidenav, $mdMedia, $mdDialog, appConfig, taskManagerService) {
    $scope.appConfig = appConfig;

    $scope.toggleSidenav = function() {
      return $mdSidenav('left').toggle();
    };
    $scope.map = mapService.map;
    $scope.identifyService = identifyService;
    $scope.service = taskManagerService;
  });

taskManagerApp.service('taskManagerService', function(urlsHelper, mapService, appConfig,
  $rootScope, $http, identifyService, $tastypieResource, CURRENT_USER_ID) {
  var getWMSLayer = function(name) {
    var wmsLayer = null;
    angular.forEach(mapService.map.overlays, function(layer) {
      if (layer.getLayers) {
        wmsLayer = getWMSLayer(name, layer.getLayers());
      } else {
        var layerSource = layer.get('source');
        if (layerSource && layerSource.getParams) {
          var params = layerSource.getParams();
          if (params && params.LAYERS == name) {
            wmsLayer = layer;
          }
        }
      }
      if (wmsLayer) {
        return false
      }
    });
    return wmsLayer;
  };

  var service = this;

  var profileResource = new $tastypieResource("profiles");
  service.profiles = [];
  profileResource.objects.$find().then(function() {

    service.profiles = profileResource.page.objects;
  });
  service.appConfig = appConfig;
  service.currentUserId = CURRENT_USER_ID;
  service.isDispatcher = appConfig.taskManager.dispatchers.indexOf(service.currentUserId) != -1;

  service.states = [{
      value: 1,
      label: "Open"
    },
    {
      value: 2,
      label: "In Progress"
    },
    {
      value: 3,
      label: "Finished"
    },
    {
      value: 4,
      label: "Closed"
    }
  ];
  service.getStatusLabel = function(value) {
    var label = "";
    angular.forEach(service.states, function(status) {
      if (status.value == value) {
        label = status.label;
        return false;
      }

    });
    return label;
  };

  service.getProfile = function(id) {
    var profile;
    angular.forEach(service.profiles, function(p) {
      if (p.id == id) {
        profile = p;
        return false;
      }

    });
    return profile;
  };
  service.canEdit = function() {
    return service.selected && (service.isDispatcher ||
      (service.task.assigned_to && service.task.assigned_to.indexOf(service.currentUserId) != -1))
  };

  var taskResource = new $tastypieResource("../rest/task", null, "cartoview");

  $rootScope.$watch(function() {
    return identifyService.selected;
  }, function() {
    service.selected = identifyService.selected;
    if (service.selected) {
      service.task = taskResource.objects.$create();
      service.task.feature_identifier = service.selected.getId();
      service.task.status = 1; // open
      taskResource.objects.$find({
        feature_identifier: service.selected.getId(),
        order_by: "-created_at"
      }).then(function() {
        service.history = taskResource.page.objects;
        if (taskResource.page.objects.length > [0]) {
          var lastTask = taskResource.page.objects[0];
          service.task.status = lastTask.status;
          service.task.assigned_to = lastTask.surveyors || [];
          service.task.due_date = lastTask.due_date;
        }
      })

    } else {

    }

  });
  var config = appConfig.taskManager;
  var featureType = config.layer.split(":")[1];
  var featureNS, geometryName = 'the_geom';
  var formatWFS = new ol.format.WFS();
  var getWFSInfo = function(callback) {
    var params = {
      service: "wfs",
      version: "2.0.0",
      request: "DescribeFeatureType",
      typeNames: config.layer,
      outputFormat: "application/json"
    };

    $http.get(urlsHelper.cartoviewGeoserverProxy + "wfs", {
      params: params
    }).then(function(res) {
      if (res.status != 200) {
        alert("Error");
        return;
      }
      featureNS = res.data.targetNamespace;
      res.data.featureTypes.forEach(function(type) {
        if (type.typeName == featureType) {
          type.properties.forEach(function(property) {
            if (property.type.indexOf('gml') == 0) {
              geometryName = property.name;
              return false; //break type.properties.forEach
            }
          });
          return false; //break res.data.featureTypes.forEach
        }
      });
      callback();
    });

  };

  var save = function() {
    var formatGMLOptions = {
      featureNS: featureNS,
      //gmlOptions: {srsName: mapService.map.olMap.getView().getProjection().getCode()},
      featureType: featureType
    };

    service.task.$save().then(function(result) {
        var feature = new ol.Feature();
        feature.setProperties({
          status: service.task.status
        });
        feature.setId(identifyService.selected.getId());
        var node = formatWFS.writeTransaction(null, [feature], null, formatGMLOptions);
        var s = new XMLSerializer();
        var str = s.serializeToString(node);
        service.status = "Saving Data";
        $http({
          method: 'POST',
          url: urlsHelper.cartoviewGeoserverProxy + "wfs",
          data: str,
          headers: {
            "Content-Type": 'application/xml'
          }
        }).then(function(data) {
          // featureListService.refresh();
          service.status = "Data Saved";
          service.busy = false;
          getWMSLayer(config.layer).get('source').updateParams({
            "time": Date.now()
          });
        });
      },
      function(error) {
        // console.log(error);
      });

  };
  this.save = function() {
    service.busy = true;
    if (featureNS) {
      save()
    } else {
      getWFSInfo(save);
    }

  };
});

taskManagerApp.directive('taskManager', function(urlsHelper, identifyService, appConfig, taskManagerService) {
  return {
    restrict: 'E',
    replace: true,
    templateUrl: urlsHelper.static + "cartoview_geo_task_manager/angular-templates/task-manager.html",
    controller: function($scope) {

      $scope.identify = identifyService;
      $scope.config = appConfig.taskManager;
      $scope.service = taskManagerService;



    }
  }
});

taskManagerApp.directive('taskManagerDynamicTemplate', function() {
  return {
    restrict: 'A',
    scope: {
      feature: '=',
      template: '='
    },
    controller: function($scope, $element, $compile) {
      $scope.$watch(function() {
        return $scope.feature;
      }, function() {
        if ($scope.feature) {
          $element.html($scope.template);
          angular.extend($scope, $scope.feature.getProperties());
          $compile($element.contents())($scope);
        }
      });
    }
  }
});

taskManagerApp.directive('usersSelector', function(urlsHelper, appConfig, taskManagerService) {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      selected: '=ngModel'
    },
    templateUrl: urlsHelper.static + "cartoview_geo_task_manager/angular-templates/users-selector.html?" + new Date().getTime(),
    controller: function($scope, $attrs, $tastypieResource) {
      var profileResource = new $tastypieResource("profiles");

      profileResource.objects.$find().then(function() {
        $scope.profiles = [];
        angular.forEach(profileResource.page.objects, function(profile) {
          if (appConfig.taskManager.surveyors.indexOf(profile.id) != -1) {
            $scope.profiles.push(profile)
          }
        });


      });
      $scope.label = $attrs.label;
      $scope.selected = $scope.selected || [];

      $scope.toggle = function(id) {
        var idx = $scope.selected.indexOf(id);
        if (idx > -1) {
          $scope.selected.splice(idx, 1);
        } else {
          $scope.selected.push(id);
        }
      };

      $scope.exists = function(id) {
        return $scope.selected.indexOf(id) > -1;
      };

      $scope.isIndeterminate = function() {
        return ($scope.profiles && $scope.selected.length !== 0 && $scope.selected.length !== $scope.profiles.length);
      };
      $scope.isAllChecked = function() {
        return $scope.profiles && $scope.selected.length === $scope.profiles.length;
      };
      $scope.toggleAll = function() {
        if ($scope.selected.length === $scope.profiles.length) {
          $scope.selected = [];
        } else if ($scope.selected.length === 0 || $scope.selected.length > 0) {
          $scope.selected = [];
          angular.forEach($scope.profiles, function(profile) {
            $scope.selected.push(profile.id)
          });
        }
      };
    }
  }
});
