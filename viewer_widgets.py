from django.templatetags.static import static
from cartoview.user_engage.viewer_widgets import widgets as user_engage_widgets
from . import APP_NAME
widgets = user_engage_widgets + [{
    'title': 'Task Manager',
    'name': 'task_manager',

    'config': {
        'app': 'cartoview.taskManagerConfigApp',
        'directive': 'task-manager-config',
        'js': [
            static("%s/js/config/config-directive.js" % APP_NAME),
            static("%s/js/config/users-selector-directive.js" % APP_NAME),

        ],
        "css": [
            static("%s/css/config.css" % APP_NAME),
            # "https://code.getmdl.io/1.1.3/material.cyan-light_blue.min.css"
        ]
    },
    'view': {
        'app': 'cartoview.taskManagerApp',
        'directive': 'task-manager',
        'js': [
            static("vendor/angular-resource/angular-resource.min.js"),
            static("vendor/angular-resource-tastypie/src/angular-resource-tastypie.min.js"),
            static("%s/js/view/task-manager.js" % APP_NAME),
        ],
        "css": [
            static("%s/css/view.css" % APP_NAME),
        ]
    },
}]