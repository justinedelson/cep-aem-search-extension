(function() {
    require('angular')
    require('ngStorage');

    var app = angular.module('SearchAEM', [ 'ngStorage', 'ngEnter' ]);

    app.factory('request', function() {
        return require('request');
    });

    app.factory('opener', function() {
        return require('opener');
    });

    app.factory('_', function() {
        return require('underscore');
    });

    app.factory('_s', function() {
        return require('underscore.string');
    });

    app.factory('cs', function() {
        return new CSInterface();
    });

    app.constant('SEARCH_DEFAULTS', {
        'path': "/content/dam",
        'type': 'dam:Asset',
        'orderby': '@jcr:content/jcr:lastModified',
        'orderby.sort': 'desc',
        'p.hits': 'full',
        'p.nodedepth': 2,
        'p.limit': 25,
        'p.offset': 0
    });

    app.factory('aem', ['request', '_', '$localStorage', 'SEARCH_DEFAULTS',
        function(request, _, $localStorage, SEARCH_DEFAULTS) {
        
        return {
            login: function(username, password, url, success, error) {
                $localStorage.baseUrl = url;
                request.post({
                    url : url + "/j_security_check",
                    form: {
                        j_username : username,
                        j_password : password,
                        j_validate : true
                    }
                }, function(err, response, body) {
                    if (response.statusCode === 200) {
                        $localStorage.tokenCookie = response.headers['set-cookie'][0].split(' ')[0];
                        success();
                    } else {
                        error();
                    }
                });
            },
            search: function(term, callback) {
                request.post({
                    url : $localStorage.baseUrl + "/bin/querybuilder.json",
                    form : _.extend({
                            'fulltext' : term
                        }, SEARCH_DEFAULTS),
                    headers : {
                        'Cookie' : $localStorage.tokenCookie
                    }
                }, function(err, response, body) {
                    var results = JSON.parse(response.body);
                    callback(results.hits);
                })
            },
            getTokenizedUrl : function(path) {
                return $localStorage.baseUrl + path + "?j_login_token=" + $localStorage.tokenCookie.split('=')[1].slice(0, -1);
            },
            logout : function() {
                delete $localStorage.tokenCookie;
                delete $localStorage.baseUrl;
            },
            isLoggedIn : function() {
                var loggedIn = !(_.isUndefined($localStorage.baseUrl) || _.isUndefined($localStorage.tokenCookie));
                return loggedIn;
            }
        };
    }]);

    app.controller('search-assets', [ '$scope', 'aem', '_', 'cs', '_s', 'opener',
        function ($scope, aem, _, cs, _s, opener) {
            $scope.damHost = "http://localhost:4502";
            $scope.showLogin = !aem.isLoggedIn();

            $scope.login = function() {
                if (!$scope.username || !$scope.password || !$scope.damHost) {
                    alert("Enter credentials");
                    return;
                }

                if (_s.endsWith($scope.damHost, "/")) {
                    $scope.damHost = $scope.damHost.slice(0, -1);
                }

                aem.login($scope.username, $scope.password, $scope.damHost, function() {
                    $scope.$apply(function() {
                        $scope.showLogin = false;
                    });
                }, function() {
                    $scope.$apply(function() {
                        alert("Invalid Credentials");
                        $scope.showLogin = true;
                    });
                });
            };


            $scope.search = function () {
                if (!$scope.term) {
                    alert("Enter search term");
                    return;
                }

                $scope.results = [];

                var mapHit = function(hit) {
                    var path = hit["jcr:path"];
                    return {
                        name : path.substring(path.lastIndexOf("/") + 1),
                        pathWithinDam : path.replace("/content/dam", ""),
                        imgPath : aem.getTokenizedUrl(path + "/jcr:content/renditions/cq5dam.thumbnail.140.100.png")
                    };
                };

                aem.search($scope.term, function(hits) {
                    $scope.$apply(function() {
                        $scope.results = _.map(hits, mapHit);
                    });
                });
            };

            $scope.open = function(result){
                var path = "aem-asset:" + result.pathWithinDam + "?action=open";
                opener(path);
            };
            
            $scope.logout = function() {
                aem.logout();
                $scope.showLogin = !aem.isLoggedIn();
            }
    }]);
}());
