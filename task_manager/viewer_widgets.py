from django.templatetags.static import static
from cartoview.user_engage.viewer_widgets import widgets as user_engage_widgets
widgets = user_engage_widgets + [{
    'title': 'Task Manager',
    'name': 'task_manager',

    'config': {
        'app': 'cartoview.taskManagerConfigApp',
        'directive': 'task-manager-config',
        'js': [
            static("task_manager/js/config/config-directive.js"),
            static("task_manager/js/config/users-selector-directive.js"),

        ],
        "css": [
            static("task_manager/css/config.css"),
            # "https://code.getmdl.io/1.1.3/material.cyan-light_blue.min.css"
        ]
    },
    'view': {
        'app': 'cartoview.taskManagerApp',
        'directive': 'task-manager',
        'js': [
            static("vendor/angular-resource.min.js"),
            static("vendor/angular-resource-tastypie.min.js"),
            static("task_manager/js/view/task-manager.js"),
        ],
        "css": [
            static("task_manager/css/view.css"),
        ]
    },
}]