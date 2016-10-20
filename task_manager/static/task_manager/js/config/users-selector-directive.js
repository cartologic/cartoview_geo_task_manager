/**
 * Created by kamal on 10/15/16.
 */

angular.module('cartoview.viewer.editor').directive('usersSelector', function (urlsHelper) {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            selected: '=ngModel'
        },
        templateUrl: urlsHelper.static + "task_manager/angular-templates/users-selector.html?" + new Date().getTime(),
        controller: function ($scope, $attrs, $tastypieResource) {
            var profileResource = new $tastypieResource("profiles", null, "geonode");

            profileResource.objects.$find().then(function () {
                $scope.profiles = profileResource.page.objects;
            });
            $scope.label = $attrs.label;

            $scope.selected = $scope.selected || [];

            $scope.toggle = function (id) {
                var idx = $scope.selected.indexOf(id);
                if (idx > -1) {
                    $scope.selected.splice(idx, 1);
                }
                else {
                    $scope.selected.push(id);
                }
            };

            $scope.exists = function (id) {
                return $scope.selected.indexOf(id) > -1;
            };

            $scope.isIndeterminate = function () {
                return ($scope.profiles && $scope.selected.length !== 0 && $scope.selected.length !== $scope.profiles.length);
            };
            $scope.isAllChecked = function () {
                return $scope.profiles && $scope.selected.length === $scope.profiles.length;
            };
            $scope.toggleAll = function () {
                if ($scope.selected.length === $scope.profiles.length) {
                    $scope.selected = [];
                } else if ($scope.selected.length === 0 || $scope.selected.length > 0) {
                    $scope.selected = [];
                    angular.forEach($scope.profiles, function (profile) {
                        $scope.selected.push(profile.id)
                    });
                }
            };
        }
    }
});