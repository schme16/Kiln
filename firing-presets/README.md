# Firing Presets
Firing presets are the firing programs you can run with your kiln,
they allow accurate firing of your pottery, with the ability to set:
- Desired temperature 
- Ramp in degrees C/hour
- Hold time in minutes

## Creating a new preset
You can create a new preset but copying one of the existing presets,
giving the file a new name, and editing the parameters inside the new file.

They are declared in the following format:
```json
{
	"title": "Bisque ({firingTime}hrs)",
	"setPoints": [
		[120, 50, 0],
		[550, 300, 0],
		[600, 210, 0],
		[930, 220, 0],
		[1062, 150, 0],
		[0, 300, 0]
	]
}
```
Where `title` is the name you want for your preset, and `setPoints` is an array of arrays,
in the format `[desired temperature, ramp in degrees C/hour, hold time in minutes]`.

## Special codes:
- `-800` in the temperature is the code for "current setpoint".
- `-1` in the hold duration is the code for indefinite.
- `{firingTime}` in the title will be replaced with the calculated firing time,
rounded to the nearest whole hour (e.g. `16.35` == `16`, `25.9` == `26`).