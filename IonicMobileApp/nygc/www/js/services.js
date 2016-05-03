angular.module('nygc.services', ['ngCordovaBluetoothLE'])
.factory('Socket', [function() {
	var socket;
  var initted = false;
	
  return {
    init: function() {
      // io included as global from socket.io import
      console.log("Initializing socket.");
      socket = io.connect('http://jacobschieber.com:8085');
      //socket = io.connect('http://localhost:8085');
      initted = true;
    },
    initted: function() {
      return initted;
    },
		on : function(eventName, callback) {
      /*
				If you are applying a change to scope you neet to use $rootScope.$apply(function() {})
				callback should be called with 1 parameter, data, which contains the socket response.
			*/
			socket.on(eventName, callback);
		},
		emit : function(eventName, data) {
			socket.emit(eventName, data);
		}
  }
}])
.factory('Bluetooth', ['$cordovaBluetoothLE', function($cordovaBluetoothLE) {
  var connected = false;
  var currentConnectedAddress;
  
  return {
    // initializes the bluetooth connection.
    init: function() {
      return new Promise(function(resolve, reject){
        $cordovaBluetoothLE.initialize({
          request: true,
        }).then(null, function(obj) {
          // fail
          reject(null);
        }, function(obj) {
          // success, returns a boolean denoting whether the connection worked
          // false when the bluetooth is disabled.
          resolve(obj.status && obj.status != "disabled");
        });
      });
    },
    // scan the bluetooth environment for available connections
    /**
     * This does not return a promise, what this does utilize though is a callback function which can be
     * called when the designated network is found...
     * 
     * WARNING: I believe that we should proably stop the scan before starting another, I dont know if this
     * callback can end up being discovered more than once?...
     * 
     * PARAMS: device address that we are looking for.
     */
    scanForDevice: function(address) {
      var vm = this;
      var params = {
        services:[],
        allowDuplicates: false,
        scanTimeout: 10000,
      };
      if (window.cordova) {
        params.scanMode = bluetoothle.SCAN_MODE_LOW_POWER;
        params.matchMode = bluetoothle.MATCH_MODE_STICKY;
        params.matchNum = bluetoothle.MATCH_NUM_ONE_ADVERTISEMENT;
        //params.callbackType = bluetoothle.CALLBACK_TYPE_FIRST_MATCH;
      }
      // Note this will resolve when the requested device has been found. Else will reject on timeout.
      return new Promise(function(resolve, reject) {
        /*
          DOCS: 
          The success callback is called each time a peripheral is discovered. 
          Scanning will continue until stopScan is called.
        */
        $cordovaBluetoothLE.startScan(params).then(function(obj) {
          console.log("Start Scan Auto Stop");
  
          // stop scan after time out. Verify that this works?
          // NOTE: We should attach to the timeout stop scan on successfull find.
          vm.stopScan()
            .then(function(resp) {
              console.log("Timeout reached, scan stopped with success: " + resp);
            })
            .catch(function() {
              console.log("Oops, scan coult ntot be stopped");
            });
          
          // fail the promise
          reject("Timeout reached.");
        }, function(obj) {
          // console.log("Start Scan Error : " + JSON.stringify(obj));
        }, function(device) {
          console.log("Start Scan Success : " + JSON.stringify(device));
          /* RETURN FORMAT:   
            {  
              "status":"scanResult",
              "advertisement":{  
                  "serviceUuids":[  
                    "FFF0"
                  ],
                  "manufacturerData":"SEMtMDgAAAAAAAAAAAAAAAAAAAAAAA==",
                  "txPowerLevel":4,
                  "overflowServiceUuids":[  

                  ],
                  "isConnectable":true,
                  "solicitedServiceUuids":[  

                  ],
                  "serviceData":{  

                  },
                  "localName":"HC-08"
              },
              "rssi":-54,
              "name":"HC-08",
              "address":"2140E6E4-2D57-DDA1-9264-1899B8B1CE0D"
            }
          */
          // NOTE: "4EA6303D-99E5-1BD4-497F-70D21D6A1177" LED_SPHERE 1
          // NOTE: "8D2C3F7E-1B92-0EFB-40E4-E0269D28F767" LED SPHERE 2
          
          
          // this callback is occurring twice....
          if(device.address == address) {
            console.log("NYGC device has been found.");
            
            // NOTE: we dont need to really do this.
            vm.stopScan()
              .then(function(resp) {
                console.log("Requested Device found and scan halted");
              })
              .catch(function() {
                console.log("Oops, scan could not be stopped @ this time");
              });
              
            // success the promise
            resolve(device);
          } // else this is not the device that we care about... 
        });
      });
    },
    /**
     * Returns a promise to the services for the current device.
     * NOTE: Does not attempt to validate the return object
     */
    getCurrentServices: function() {
       return $cordovaBluetoothLE
                .services({
                  address: currentConnectedAddress, // "2140E6E4-2D57-DDA1-9264-1899B8B1CE0D"
                  services: null //[]               
                });
    },
    stopScan: function() {
      return new Promise(function(resolve, reject) {
        $cordovaBluetoothLE.stopScan(function(resp) {
          // resolve on success callback but resp will only be true if scanStopped is returned
          resolve(resp.status && resp.status == "scanStopped");
        }, function(err) {
          reject(err);
        })  
      });
    },
    /**
     * Returns a promise to the connection created between app and the addressed specified
     * in the parameters. 
     */
    connect: function(address) {
      return new Promise(function(resolve, reject) {
        var params = {
          address: address,
          timeout: 10000
        };
        $cordovaBluetoothLE.connect(params).then(null, function(err) {
          // WARNING!!!!! This code is not implemented yet.
          // $rootScope.close(address); //Best practice is to close on connection error
          reject(err);
        }, function(resp) {
          
          // NOTE: On device disconnect this will be called again with  "status": "disconnected"
          // so we cannot immediately just jump into saying that it is connected.
          
          // successfully connected
          console.log("Connect Success : " + JSON.stringify(resp));
          connected = true;
          currentConnectedAddress = address;
          resolve(resp);
        });
      });
    },
    /**
     * Returns a promise denoting whether we able to disconnect from the bluetooth.
     */
    disconnect: function() {
      // TODO: We can use the API to determine if this is connected, we do not need to have a local variable.
      
      var vm = this;
      return new Promise(function(resolve, reject){
        if(!vm.isConnected()) {
          // resolve, but we do not return true because we were never connected to begin with.
          resolve(false);
        }
        var params = {
          address: vm.connectedTo()
        };
        $cordovaBluetoothLE.disconnect(params).then(function(obj) {
          connected = false;
          resolve(true);
        }, function(err) {
          reject(err)
        });  
      });
    },
    /**
     * returns the address of the device which we are currently connected to.
     * Null returned if not connected to anything.
     */
    connectedTo: function() {
      if(!this.isConnected()) {
        return null;
      }
      return currentConnectedAddress;
    },
    isConnected: function() {
      return connected;
    },
    isScanning: function() {
      
    }
  };
}]);