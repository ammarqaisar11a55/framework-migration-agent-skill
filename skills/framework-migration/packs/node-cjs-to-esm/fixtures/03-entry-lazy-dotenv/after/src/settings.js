// Read once, when the module loads: the environment must be set up before that.
export default {
  greeting: process.env.GREETING || 'Hi',
};
