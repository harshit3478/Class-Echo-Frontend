const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withCleartextTraffic(config) {
  // Write network_security_config.xml that explicitly permits cleartext HTTP
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml',
      );
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(xmlDir, 'network_security_config.xml'),
        [
          '<?xml version="1.0" encoding="utf-8"?>',
          '<network-security-config>',
          '  <base-config cleartextTrafficPermitted="true">',
          '    <trust-anchors>',
          '      <certificates src="system" />',
          '    </trust-anchors>',
          '  </base-config>',
          '</network-security-config>',
        ].join('\n'),
      );
      return config;
    },
  ]);

  // Reference the file in AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
      // Keep usesCleartextTraffic as belt-and-suspenders
      app.$['android:usesCleartextTraffic'] = 'true';
    }
    return config;
  });

  return config;
}

module.exports = withCleartextTraffic;
