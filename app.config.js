const isLocal = process.env.EXPO_PUBLIC_DATA_SOURCE === 'local';

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    package: isLocal ? 'com.cashen.local' : 'com.cashen.app',
  },
});
