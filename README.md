# Kiln

A PID based kiln manager, written in Javascript (NodeJS), designed for deployment to Raspberry Pis.


It features:

- Clean web based UI, designed with 5" & 7" touch screens in mind
- Heating device agnostic, allowing the use of mechanical relays, mosfets, igbts, SSRs, etc
- Modulare thermometer design, allowing you to easily integrate wehatever temperature sensors you want
- Adjustable PID control to keep the kiln temps rock steady
- Ability to specify
- Temperature/hr ramp profiles (default is 180C/hr)
- Built in bisque, and glaze profiles, as well as the ability to add new ones.