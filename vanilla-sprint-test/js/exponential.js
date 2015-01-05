angular.module('incremental',[])
    .controller('IncCtrl',['$scope','$document','$interval', '$sce',function($scope,$document,$interval,$sce) { 
		$scope.version = 0.4;
		
		var startPlayer = {
			cashPerClick:1,
			multiplier: 1,
			upgrades: [0,
						0,
						0,
						0,
						0],
			upgradesPrice: [10,
							100,
							1000,
							10000,
							100000],
			currency: new Decimal(0),
			version: $scope.version,
			seconds: 0, 
			minutes: 0, 
			hours: 0
			};
		
		var lastUpdate = 0;
        var upgradeBasePrice = [10,
                                100,
                                1000,
                                10000,
                                100000];
        var upgradePower = [0.0001,
                            0.001,
                            0.01,
                            0.1,
                            1];
        
		$scope.currencyValue = function() {
			return $sce.trustAsHtml(prettifyNumber($scope.player.currency));
		}
		
        $scope.click = function() {
			var tempCurrency = $scope.player.currency.plus($scope.player.cashPerClick);
            $scope.player.currency = checkMaxReached(tempCurrency);
        };
        
        $scope.upgradePrice = function(number) {
			return $scope.player.upgradesPrice[number];
        };
        
        $scope.buyUpgrade = function(number) {
            if ($scope.player.currency.comparedTo($scope.upgradePrice(number)) >= 0) {
                $scope.player.currency = $scope.player.currency.minus($scope.upgradePrice(number));
                $scope.player.multiplier += upgradePower[number];
                $scope.player.upgrades[number]++;
				$scope.player.upgradesPrice[number] = (upgradeBasePrice[number] * Math.pow(1.2,$scope.player.upgrades[number])).toFixed();
            }
        };
        
		$scope.save = function save() {
			localStorage.setItem("playerStored", JSON.stringify($scope.player));
			var d = new Date();
			$scope.lastSave = d.toLocaleTimeString();
		}
		
		$scope.load = function load() {
			$scope.player = JSON.parse(localStorage.getItem("playerStored"));
			$scope.player.currency = new Decimal($scope.player.currency);
		}
		
		$scope.reset = function reset() {
			var confirmation = confirm("Are you sure you want to permanently erase your savefile?");
			if(confirmation === true){
				$scope.player = angular.copy(startPlayer);
				localStorage.removeItem("playerStored");
				clear();
			}
		}
		
		$scope.exportSave = function exportSave() {
			var exportText = btoa(JSON.stringify($scope.player));
			
			document.getElementById("exportSaveContents").style = "display: initial";
			document.getElementById("exportSaveText").value = exportText;
			document.getElementById("exportSaveText").select();
		}
		
		$scope.importSave = function importSave(){
			var importText = prompt("Paste the text you were given by the export save dialog here.\n" +
										"Warning: this will erase your current save!");
			if(importText){
				$scope.player = JSON.parse(atob(importText));
				$scope.player.currency = new Decimal($scope.player.currency);
				versionControl(true);
				save();
				
				clear();
			}
		}
		
        function update() {
            var updateTime = new Date().getTime();
            var timeDiff = (Math.min(1000, Math.max(updateTime - lastUpdate,0))) / 1000;
            lastUpdate = updateTime;
            var updateMultiplier = (1+($scope.player.multiplier-1) * timeDiff).toFixed(15);
			var tempCurrency = $scope.player.currency.times(updateMultiplier);
            $scope.player.currency = checkMaxReached(tempCurrency);
        };
        
		function checkMaxReached(currency){
			checkSprintFinished(currency);
			if(currency.comparedTo($scope.sprintMax[$scope.sprintMax.length-1]) >= 1){
				return $scope.sprintMax[$scope.sprintMax.length-1];
			}
			return currency;
		}
		
		function checkSprintFinished(currency){
			for(var i = 0; i < $scope.sprintMax.length; i++){
				if(currency.comparedTo($scope.sprintMax[i]) >= 1 && $scope.sprintFinished[i] == false){
					if(i == $scope.sprintMax.length-1){
						stop();
					}
					$scope.sprintFinished[i] = true;
					$scope.sprintTime[i] = $scope.padCeroes($scope.player.hours)+":"+$scope.padCeroes($scope.player.minutes)+":"+$scope.padCeroes($scope.player.seconds);
					ga('send', 'event', 'sprint', 'finished', {
					  'goal': $scope.sprintMax[i],
					  'time': $scope.sprintTime[i],
					  'multiplier': $scope.player.multiplier
					});
					
					break;
				}
			}
		};
		
		function prettifyNumber(number){
			if(number.comparedTo(Infinity) == 0){
				return "&infin;";
			}
			if(number.comparedTo(1e21) >= 0){
				// Very ugly way to extract the mantisa and exponent from an exponential string
				var exponential = number.toExponential(15).split("e");
				var exponent = new Decimal(exponential[1].split("+")[1]);
				// And it is displayed in with superscript
				return  exponential[0]+" x 10<sup>"+prettifyNumber(exponent)+"</sup>";
			}
			return number.toString();
		};
		
		function versionControl(ifImport){
			if($scope.player.version < $scope.version || 
				typeof $scope.player.version == 'undefined'){
				$scope.player.version = $scope.version;
			}
		};

		
        $document.ready(function(){
			if(localStorage.getItem("playerStored") != null){
				$scope.load();
			}
			if(typeof $scope.player  === 'undefined'){
				$scope.player = angular.copy(startPlayer);
			}
			if(typeof $scope.lastSave  === 'undefined'){
				$scope.lastSave = "None";
			}
			versionControl(false);
            $interval(update,80);
            $interval($scope.save,60000);
			start();
        });
		
		/* Timing test code. Not to keep in main branch */
		var t;
		$scope.sprintFinished = [false,
								false,
								false,
								false
								];
		$scope.sprintMax = [new Decimal(1e30),
							new Decimal(1e300),
							new Decimal('1e3000'),
							new Decimal('1e30000')
							];
		$scope.sprintTime = ['',
								'',
								'',
								''
								];
		
		function add() {
			$scope.player.seconds++;
			if ($scope.player.seconds >= 60) {
				$scope.player.seconds = 0;
				$scope.player.minutes++;
				if ($scope.player.minutes >= 60) {
					$scope.player.minutes = 0;
					$scope.player.hours++;
				}
			}
		}
		
		function start() {
			if ( angular.isDefined(t) ) return;
			t = $interval(add,1000);
		}
		
		function stop() {
			if (angular.isDefined(t)) {
				$interval.cancel(t);
				t = undefined;
            }
		}
		
		function clear() {
			stop();
			$scope.player.seconds = 0; 
			$scope.player.minutes = 0; 
			$scope.player.hours = 0;
			start();
		}
		
		$scope.padCeroes = function padCeroes(number){
			if(number <= 9){
				return "0"+number;
			}
			return number;
		}
}]);