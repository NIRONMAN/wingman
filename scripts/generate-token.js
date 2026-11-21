#!/usr/bin/env node
/**
 * Wingman & Hermes Secure Token Generator
 * Generates cryptographically secure 256-bit (32 bytes) authentication tokens
 * to protect WebSocket connections and MCP actuator calls between Wingman and Hermes.
 *
 * Usage:
 *   node scripts/generate-token.js [--write-env] [--json]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateToken(prefix = 'wm_sec_', bytes = 32) {
  return `${prefix}${crypto.randomBytes(bytes).toString('hex')}`;
}

const args = process.argv.slice(2);
const writeEnv = args.includes('--write-env');
const isJson = args.includes('--json');

const token = generateToken();

if (isJson) {
  console.log(JSON.stringify({
    token,
    type: 'bearer',
    entropyBits: 256,
    prefix: 'wm_sec_',
    createdAt: new Date().toISOString(),
  }, null, 2));
} else {
  console.log('================================================================');
  console.log('       Wingman & Hermes Secure Authentication Token');
  console.log('================================================================');
  console.log(`\n🔑 Secure Token:\n   ${token}\n`);
  console.log('Entropy: 256 bits (32 cryptographically secure random bytes)');
  console.log('Format : Bearer / URL query (?token=...) / X-Auth-Token header\n');
  console.log('Configuration instructions:');
  console.log('1. In your Hermes Gateway host (.env):');
  console.log(`   WINGMAN_AUTH_TOKEN=${token}`);
  console.log(`   HERMES_GATEWAY_TOKEN=${token}`);
  console.log('\n2. In the Wingman Mobile App (Settings):');
  console.log(`   Auth Bearer Token: ${token}`);
  console.log('================================================================\n');
}

if (writeEnv) {
  const envPath = path.resolve(__dirname, '../.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('WINGMAN_AUTH_TOKEN=')) {
      content = content.replace(/WINGMAN_AUTH_TOKEN=.*$/m, `WINGMAN_AUTH_TOKEN=${token}`);
    } else {
      content += `\nWINGMAN_AUTH_TOKEN=${token}`;
    }
    if (content.includes('HERMES_GATEWAY_TOKEN=')) {
      content = content.replace(/HERMES_GATEWAY_TOKEN=.*$/m, `HERMES_GATEWAY_TOKEN=${token}`);
    } else {
      content += `\nHERMES_GATEWAY_TOKEN=${token}`;
    }
  } else {
    content = `# Hermes & Wingman Gateway Environment Configuration\nPORT=8765\nHERMES_BIN=/home/u0_a205/.local/bin/hermes\nWINGMAN_AUTH_TOKEN=${token}\nHERMES_GATEWAY_TOKEN=${token}\n`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
  console.log(`✅ Saved secure token directly to: ${envPath}`);
}
