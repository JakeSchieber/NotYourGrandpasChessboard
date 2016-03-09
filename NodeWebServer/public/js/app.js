angular.module('nygc', ['ngRoute', 'controllers', 'services', 'routes'])

.run(function(Socket) {
  Socket.init();
});