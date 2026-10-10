// Read once, when the module loads: the environment must be set up before that.
module.exports = {
  greeting: process.env.GREETING || 'Hi',
};
