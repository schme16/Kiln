angular.module('Kiln Manager', [])

	/*The master controller*/
	.controller('master', ($scope, $sce) => {
		m = $scope

		m.$root.page = 'home'

		m.trustAsHtml = $sce.trustAsHtml

		m.loading = true

		m.presets = []

		m.socket = io()

		m.socket.on('connect', () => {

			m.loading = false

			m.socket.on('config', (data) => {
				m.config = data

				let newPresetIDs = [],
					oldPresetIDs = []
				for (let i in m.config.presets) {
					newPresetIDs.push(m.config.presets[i].id)
				}

				if (m.presets.length > 0) {

					for (let i in m.presets) {
						if (newPresetIDs.indexOf(m.presets[i].id) == -1) {
							m.presets.splice(i, 1)
						}
						else {
							oldPresetIDs.push(m.presets[i].id)
						}
					}

					for (let i in m.config.presets) {
						if (oldPresetIDs.indexOf(m.config.presets[i].id) == -1) {
							m.presets.push(m.config.presets[i])
						}
						else {
							oldPresetIDs.push(m.presets[i].id)
						}
					}
				}
				else {
					m.presets = m.config.presets
				}


				m.temp = Math.floor(m.config.input)
				m.$applyAsync()
			})
		})


		m.api = (action, data) => {
			return m.socket.emit('api', {action: action, data: data})
		}

		m.fToC = (f) => {
			return (f - 32) * 5 / 9
		}

		m.cToF = (c) => {
			return (c * 9 / 5) + 32
		}


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