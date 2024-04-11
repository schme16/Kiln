/*Kiln Controller*/

let fs = require('fs'),
	{Gpio} = require('onoff'),
	express = require('express'),
	app = express(),
	{createServer} = require("http"),
	{Server} = require("socket.io"),
	httpServer = createServer(app),
	io = new Server(httpServer, { /* options */}),
	cors = require('cors'),
	compression = require('compression'),
	port = 80,

	//Set the thermometer you want to use here (look in the thermometers folder, or create your own binding)
	thermometer = require(`${__dirname}/thermometers/max6675`)(),

	savedConfig = require(`${__dirname}/userConfig.json`),

	//This is the current state of all configurable settings
	config = {

		//Set your preferred measurement system
		displayUnits: savedConfig.displayUnits,
		p: 7.47,
		i: 0.75,
		d: 65,
		output: 0,
		target: 0,
		setpoint: 0,
		rampSpeed: 3, // C/min
		active: false,
		minimumDutyCycle: 24,
		lastSetpointUpdate: 0,
		input: thermometer.temp,
		maxThermometerErrors: 2,
		timeBetweenActions: 1000,
		clientUpdateSpeed: 1000,
		//This is the list of firing presets
		presets: loadFiringPresets(),

		//information about the current firing/preset
		currentFiring: {
			preset: false,
			currentPresetStep: -1,
			tempErrors: 0
		}
	},

	//This is the list of pins that relays/SSRs can be activated on
	relays = {
		a: new Gpio(17, 'out'),
		b: new Gpio(18, 'out'),
		c: new Gpio(21, 'out'),
		d: new Gpio(22, 'out'),
	},

	//This is where all the web services can be called
	api = {

		//Returns the current thermometer temp as a number in degrees C
		getTemp: (data, socket) => {
			if (!!socket) {
				socket.emit('temperature', thermometer.temp)
			}

			return thermometer.temp
		},

		//Sets the current setpoint temp
		//Returns the current config
		setTemp: (temp, socket) => {
			temp = parseFloat(temp)

			if (!isNaN(temp)) {

				//First set the current setpoint to the current temp
				config.setpoint = thermometer.temp

				//Then set the new tart
				config.target = temp
			}

			if (!!socket) {
				socket.emit('config', config)
			}
		},

		//Sets the ramp speed in degrees C/hour
		//Returns the current config
		setRampSpeed: (temp, socket) => {
			temp = parseFloat(temp)

			if (!isNaN(temp)) {
				config.rampSpeed = (temp / 60)
			}

			//If a socket object was handed in
			if (!!socket) {

				//Send the new config state back
				socket.emit('config', config)
			}
		},

		//Sets the heater state (on/off), takes in the bool `state`
		//Returns the current config
		setState: (state, socket) => {
			//Only procede if the new state is different from the current state

			//If the new state is true
			if (state) {

				//Reset the setpoint to the current temp
				config.setpoint = thermometer.temp

				//Create a new PID controller
				config.PID = createPIDController()

			}

				//If the new state is false
			//TODO: create the ability to pause a firing 
			else {

				//Destroy the PID controller
				config.PID = null

				//Remove it from the config entirely
				delete config.PID

				//Reset the setpoint to 0
				config.setpoint = 0

				//Reset the current firing
				config.currentFiring = {
					preset: false,
					currentPresetStep: -1,
					tempErrors: 0
				}

				//Set them all low to start
				for (let i in relays) {

					//Set this relay to off
					toggleRelay(relays[i], false)
				}

			}

			//Set the new active state
			config.active = state

			//If a socket object was handed in
			if (!!socket) {

				//Send the new config state back
				socket.emit('config', config)
			}
		},

		//Returns all saved presets as an array
		getPresets: (data, socket) => {

			//Send the new config state back
			if (!!socket) {
				socket('presets', config.presets)
			}

			return config.presets
		},

		//Starts a given firing preset
		//Returns the current config
		startPreset: (preset, socket) => {

			//Create a new firing object
			let firing = {
				preset: preset,
				currentPresetStep: 0,
				tempErrors: 0
			}

			//Set the firing object to the configs currentFiring
			config.currentFiring = firing;

			//Set the temp to the first firings profile's first temp
			api.setTemp(firing.preset[0])

			//Activate the heaters
			api.setState(true)

			//If a socket object was handed in
			if (!!socket) {

				//Send the new config state back
				socket.emit('config', config)
			}

			return config
		},

		//Returns the current config
		getConfig: (socket) => {

			//If a socket object was handed in
			if (!!socket) {

				//Send the new config state back
				socket.emit('config', config)
			}

			return config
		}
	}

io.on("connection", (socket) => {
	// ...
});


//Takes in decimal time in hours
//Returns a string of "{days}:{hours}:{minutes}"
function decimalTimetoHoursMinutes(time) {
	let n = new Date(0, 0)

	n.setMinutes(time * 60)

	return `${(n.getDate() - 1).toString().padStart(2, '0')}:${(n.getHours()).toString().padStart(2, '0')}:${(n.getMinutes()).toString().padStart(2, '0')}`
}

//Loads all of the presets in the `firing-presets` folder
//Returns an array with all of the presets
function loadFiringPresets() {
	let presets = []
	fs.readdirSync(`${__dirname}/firing-presets`).filter(fn => fn.endsWith('.json')).forEach(item => {

		//Wrap the import in a try/catch so that a borked preset won't break everything 
		try {

			//Load in the preset
			let preset = require(`${__dirname}/firing-presets/${item}`)

			//Calculate the total firing time, with the default starting temp
			preset.time = calcuatePresetFiringTime(preset)

			//If the calculated time IS a number, and isn't larger than the length of the universe
			if (preset.time != Infinity && !isNaN(preset.time)) {

				//Get a clock style time string
				preset.timeString = decimalTimetoHoursMinutes(preset.time)

				//Replace the firing time match string with the calculated firing time, rounded to the nearest hour
				preset.title = preset.title.replace('{firingTime}', Math.round(preset.time))
			}
			else {
				//Replace the firing time match string with a `unknown` 
				preset.title.replace('{firingTime}', 'Unknown')
			}
			
			preset.id = `${preset.title}_${new Date().getTime() * Math.random()}`

			presets.push(preset)
		}

			//Catch borked presets
		catch (e) {
			console.trace(`There was an issue importing the preset "${item}":`, e)
		}
	})


	return presets.sort((a, b) => a.title.localeCompare(b.title))
}

//Calculates a given preset's total firing time, allowing you to specify the estimated beginning/ending ambient temp
//Default ambient temp is 21 degrees/C
//Returns the firing time in decimal hours
function calcuatePresetFiringTime(preset, ambient = 21) {
	let time = 0,
		lastTemp = ambient

	for (let i in preset.setPoints) {
		let temp = preset.setPoints[i][0],
			rate = preset.setPoints[i][1],
			hold = preset.setPoints[i][2]

		time += Math.abs((temp - lastTemp) / rate)

		if (!!hold && !isNaN(hold) && hold > 0) {
			time += (hold / 60)
		}

		lastTemp = temp
	}

	return time
}


//Simplifies the way to toggle a relay's state, and lets you release them as well
function toggleRelay(relay, state, release) {
	relay.write(!!state ? Gpio.HIGH : Gpio.LOW, () => {
		if (release) {
			relays.unexport()
		}
	})
}

//Handles stopping everything when the program exits, or errors
function exitHandler(exitType, a, b) {
	for (let i in relays) {
		toggleRelay(relays[i], false, true)
	}

	process.exit()
}

//Manages the setpoint ramping, computing the pid, and syncing the thermometer temp to the config
function controlLoop() {

	//TODO: disable the heaters if the temp comes back invalid (aka: -999)

	//Valid temps
	if (thermometer.temp !== -999) {

		//Sync the temp to the thermometer
		config.input = thermometer.temp;
	}

	//Invalid temps
	else {

		//Count up the temp error variable
		config.currentFiring.tempErrors++

		//If there's been more than the allowed temp errors, disable the heaters
		if (config.currentFiring.tempErrors > config.maxThermometerErrors) {
			api.setState(false)
			console.trace(`The heaters have been disabled due to too many temp sensor errors, please check the themometer wiring before restarting.`)
		}

		//Do not process this tick
		return
	}

	//If the kiln is active (AKA "firing") 
	if (config.active) {

		//Get the current time
		let time = new Date().getTime()

		//If the current target does not match the current setpoint , and the interpolation time has elapsed
		if (config.target !== config.setpoint && time - config.lastSetpointUpdate > 60000) {

			//If the target is great than the setpoint
			if (config.target > config.setpoint) {

				//Increment the setpoint up by the rampSpeed value, capped at setpoint == target
				config.setpoint = Math.min(config.target, config.setpoint += config.rampSpeed)
			}

			//Target is less than setpoint
			else if (config.target > config.setpoint) {

				//Decrement the setpoint up by the rampSpeed value, capped at setpoint == target
				config.setpoint = Math.max(config.target, config.setpoint -= config.rampSpeed)
			}

			//Update the lastSetpointUpdate value to the current time 
			config.lastSetpointUpdate = time
		}

		//Compute the next PID output value
		config.PID.compute();

		//Helps with overshoots
		//TODO: Evalutate if this is still needed now that ramps have been enabled
		if (config.input > config.setpoint + 1) {
			config.output = 0
		}

	}
	else {
		config.output = 0
	}

	//Update the heaters with the latest pid power
	updateHeaters(config.output)

	//console.log(`Temp: ${config.input} - Setpoint: ${config.setpoint} - Target: ${config.target} - Active: ${config.active} - PID: ${config.output}`)
}

//Updates the heaters to the given "power", aka cycle time
function updateHeaters(power) {

	if (power > 0) {
		power = Math.max(config.minimumDutyCycle, power)

		toggleRelay(relays.d, true)
		if (power <= config.timeBetweenActions) {
			setTimeout(() => {
				toggleRelay(relays.d, false)

			}, Math.max(0, power))
		}

	}

}

//Creates a new pid controller
//Useful for when you start new firings, so that the old PID output values are cleared
function createPIDController() {
	let PID = require('pid-controller')

	//Set up the PID controller
	PID.setup(config, config.p, config.i, config.d, PID.P_ON.E, PID.Direction.DIRECT);
	PID.setSampleTime(config.timeBetweenActions)
	PID.setOutputLimits(0, 500)
	PID.setMode(PID.Mode.AUTOMATIC)

	return PID
}


//Compress data passing through
app.use(compression({level: 9}))

//Add the CORS headers
app.use(cors())

//Serve node_modules
app.use('/node_modules', express.static(`${__dirname}/node_modules`, {
	//Make sure it has an expiry tag
	etags: true,

	//Set the files as immutable, making sure they aren't even etag checked inside the cache window
	immutable: true
}))

//Serve the public files
app.use(express.static(`${__dirname}/public`))


//Start the webserver
httpServer.listen(port, () => {
	console.log(`Kiln controller started on port:`, port)

	//Set the state to off
	api.setState(false)

	toggleRelay(relays.d, true)


	//Control loop 
	setInterval(controlLoop, config.timeBetweenActions);


	//Listen for websocket connections
	io.on("connection", (socket) => {

		//Listen for API calls
		socket.on('api', (data) => {
			if (!!data && !!data.action) {
				if (typeof api[data.action] == "function") {
					api[data.action](data.data, socket)
				}
				else {
					socket.emit('error', {title: "API Error", message: `No API exists called "${data.action}"`})
				}
			}

			else {
				socket.emit('error', {title: "API Error", message: "No data was provided"})
			}
		})
		socket.loop = setInterval(() => {
			if (!!socket) {
				console.log(config.input)
				api.getConfig(socket)
			}
		}, config.clientUpdateSpeed)

		socket.on('disconnect', () => {
			clearInterval(socket.loop)
		})
	})

})

/*Catch fatal errors and process exits and run the cleanup/exit process function (disabled heaters etc)*/
;[
	`exit`,
	`SIGINT`,
	`SIGUSR1`,
	`SIGUSR2`,
	`uncaughtException`,
	`SIGTERM`
].forEach((eventType) => {
	process.stdin.resume(); // so the program will not close instantly
	process.on(eventType, exitHandler.bind(null, eventType));
})