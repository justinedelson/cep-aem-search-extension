(function() {
    require('angular')
    angular.module('ngEnter', []).
        constant('ENTER_KEY', 13).
        directive('ngEnter', ['ENTER_KEY', function (ENTER_KEY) {
        return function($scope, element, attrs) {
            element.bind("keydown keypress", function(event) {
                if (event.which === ENTER_KEY) {
                    $scope.$apply(function() {
                        $scope.$eval(attrs.ngEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    }]);;
}());
