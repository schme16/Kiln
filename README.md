# Kiln Manager

### Attention: Although many base features are finished, the UI is still a little ways off, but this is being worked on quite rapidly, so be sure to star and check back later!

A PID based kiln manager, written in Javascript (NodeJS), designed for deployment to Raspberry Pis.

## Features:

- [ ] Clean web based UI, designed with 5" & 7" touch screens in mind
- [x] Heating device agnostic, allowing the use of mechanical relays, mosfets, igbts, SSRs, etc (You could even use a electronic gas valve on a gas kiln!)
- [x] Modulare thermometer design, allowing you to easily integrate wehatever temperature sensors you want
- [x] Adjustable PID control to keep the kiln temps rock steady
- [x] Ability to add soak times
- [ ] Ability to schedule firings
- [ ] Temperature/hr ramp profiles (default is 180C/hr)
- [ ] Per firing temperature logging, with a clear and readable chart
- [x] Built in bisque, and glaze profiles, as well as the ability to add new ones.
- [x] Open source, so new features can be suggested and and even provided!

## Recommended Hardware

- MAX31855 + K Type thermocouple
- SSR-40 DA + relay/mosfet to drive the input
- Raspberry Pi 3+

## Notes:

- Although you can change the web interface's temperature units (between F, and C), please note that all units used by the server side (aka "back end") are in degrees celcius.
  This simplifies the back end structure significantly, while still catering to those not used to SI units ;)

## Want to help me make this software great?

I'm always happy to take PRs, but more specifically I'm looking for any help I can get
with writing a PID auto-tune function, so that non-tech folks can get the parameters for
their kilns rock-solid, without having to research how PID loops work.