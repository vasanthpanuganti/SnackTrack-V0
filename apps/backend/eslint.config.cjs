// .cjs because this package is type:module but the shared config is CommonJS
const base = require("@snacktrack/config-eslint");

module.exports = [...base];
