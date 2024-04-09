/*Kiln Controller*/

let
	{Gpio} = require('onoff'),
	express = require('express'),
	cors = require('cors'),
	compression = require('compression'),
	app = express(),
	port = 80,
	PID,
	thermometer = require('./thermometers/max6675')(),
	config = {
		active: false,
		p: 7.47,
		i: 0.75,
		d: 65,
		target: 0,
		setpoint: 0,
		input: thermometer.temp,
		output: 0,
		rampSpeed: 3, // C/min
		minimumDutyCycle: 24,
		lastSetpointUpdate: 0,
		timeBetweenActions: 1000
	},


//This is the list of pins that relays/SSRs can be activated on
	relays = {
		a: new Gpio(17, 'out'),
		b: new Gpio(18, 'out'),
		c: new Gpio(21, 'out'),
		d: new Gpio(22, 'out'),
	},


	api = {
		getTemp: () => {
			return thermometer.temp
		},

		setTemp: (temp) => {
			temp = parseFloat(temp)

			if (!isNaN(temp)) {
				setTargetTemp(temp)
			}
		},

		setState: (state) => {

			//Only procede if the new state is different from the current state
			if (config.active != state) {

				//If the new state is true
				if (state) {

					//Reset the setpoint to the current temp
					config.setpoint = thermometer.temp

					//Create a new PID controller
					PID = createPIDController()


				}
				else {

					//Destroy the PID controller
					PID = null

					//Reset the setpoint to 0
					config.setpoint = 0

					//Reset the target to 0
					config.setpoint = 0

					//Set them all low to start
					for (let i in relays) {
						toggleRelay(relays[i], false)
					}

				}

				config.active = state
			}
		}
	}

//Takes a temp in C in
function setTargetTemp(target) {

	//First set the current setpoint to the current temp
	config.setpoint = thermometer.temp

	//Then set the new tart
	config.target = target
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
	//Sync the temp to the thermometer
	config.input = thermometer.temp;

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
		PID.compute();

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

//Serve centralized node_modules
//Served using the 'serve-static' library, as it's performance is noted to be slightly better than the express.static equivalent 
app.use('/node_modules', express.static(`${__dirname}/node_modules`, {
	//Make sure it has an expiry tag
	etags: true,

	//Set the files as immutable, making sure they aren't even etag checked inside the cache window
	immutable: true
}))

//Handle api requests
app.get('/api', (req, res) => {
	let apiRequest
	try {
		apiRequest = JSON.parse(req.query.request)
	}
	catch (e) {
	}

	if (!!apiRequest) {
		if (typeof api[apiRequest.action] == "function") {
			api[apiRequest.action](apiRequest.data, req, res)
			res.sendStatus(200)
		}
		else {
			res.sendStatus(500)
		}
	}

	else {
		res.sendStatus(412)
	}

})

app.use(express.static(`${__dirname}/public`))
//Start the webserver
app.listen(port, () => {
	console.log(`Kiln controller started on port:`, port)

	//Set them all low to start
	for (let i in relays) {
		toggleRelay(relays[i], false)
	}

	//Set the target temp
	api.setState(false)


	//Control loop 
	setInterval(controlLoop, config.timeBetweenActions);


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