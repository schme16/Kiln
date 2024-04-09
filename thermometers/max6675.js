module.exports = (cs = 4, sck = 24, so = 25, units = 1) => {

	let config = {//Set up the thermocouple
			max6675: new (require("max6675-raspi"))(cs, sck, so, units),

			//This is the minimum time between reading the temp
			//Read your thermocouple readers datasheet to get this value
			msBetweenTempMeasurements: 750,

			//Used to make sure that the thermcouple only 
			lastTempMeasurementTimestamp: 0,

			//This is the temp as last measured
			//Starts at the error/undefined value of -999
			temp: -999
		},

		//This is just used for skipping the first few unstable temps when the 
		//thermocouple is first started
		counter = 0

	config.temp = parseFloat(config.max6675.readTemp().temp[0] || -999)

	//Start a timer that keeps parsing the temp and setting it to the temp variable above
	setInterval(() => {

		//Read the value from the chip, and attempt to parse it as a float, falling back to the -999 error value
		config.temp = parseFloat(config.max6675.readTemp().temp[0] || -999)

		//Tell the chip to sleep, allowing it to accumulate
		config.max6675.sleep(config.msBetweenTempMeasurements).then(() => {
		})

	}, config.msBetweenTempMeasurements)

	return config
}