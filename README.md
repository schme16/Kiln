# Kiln

### Note: Although many base features are finished, the UI is still a little ways off, but this is being worked on quite rapidly, so be sure to star and check back later!

A PID based kiln manager, written in Javascript (NodeJS), designed for deployment to Raspberry Pis.

## Features:

- [ ] Clean web based UI, designed with 5" & 7" touch screens in mind
- [ ] Heating device agnostic, allowing the use of mechanical relays, mosfets, igbts, SSRs, etc
- [x] Modulare thermometer design, allowing you to easily integrate wehatever temperature sensors you want
- [x] Adjustable PID control to keep the kiln temps rock steady
- [ ] Ability to add soak times
- [ ] Ability to schedule firings
- [ ] Temperature/hr ramp profiles (default is 180C/hr)
- [ ] Built in bisque, and glaze profiles, as well as the ability to add new ones.
- [x] Open source, so new features can be suggested and and even provided!

## Recommended Hardware

- MAX31855 + K Type thermocouple
- SSR-40 DA + relay/mosfet to drive the input
- Raspberry Pi 3+