angular.module('Sample ILAR', [])

/*The master controller*/
.controller('master', ($scope, $sce) => {
	m = $scope

	//Trust a string as rendereable HTML
	m.trustAsHtml = $sce.trustAsHtml

	//App name
	m.app = 'Sample ILAR'

	m.initialize = () => {
		//Put the stuff you want to be run when initializing the client side app here

		reportAnalytics('Sample ILAR', 'Sample', 'loaded', {
			user: m.user,
			activity: m.activity
		})
	}

	//fetch the session data
	fetchActivity((err, data) => {
		if (!err) {
			m.user = data.user
			m.activity = data.activity
			m.initialize()
		}
		else {
			console.log(err)
		}
	})
})

/*Turns off the ng-scope, et al. debug classes*/
.config([
	'$compileProvider', ($compileProvider) => {
		$compileProvider.debugInfoEnabled(false)
	}
])


/*Sample directive*/
/*.directive('sampleDirective', () => {
	return {
		restrict: 'A',
		scope: true,
		link: (scope, element, attrs) => {
		
		}
	}
})*/