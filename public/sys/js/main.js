angular.module('Kiln Manager', [])

	/*The master controller*/
	.controller('master', ($scope, $sce) => {
		m = $scope

		m.$root.page = 'home'

		//Trust a string as rendereable HTML
		m.trustAsHtml = $sce.trustAsHtml

	})

	/*Turns off the ng-scope, et al. debug classes*/
	.config([
		'$compileProvider',
		($compileProvider) => {
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