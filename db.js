// tiny json "database" for per-server settings
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'data.json');
let data = {};
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  // first run, no file yet
}

function get(guildId) {
  return data[guildId] || {};
}

function set(guildId, key, value) {
  if (!data[guildId]) data[guildId] = {};
  data[guildId][key] = value;
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// send a line to the server's log channel (if they set one)
async function log(guild, text) {
  const id = get(guild.id).logs;
  if (!id) return;
  const channel = await guild.channels.fetch(id).catch(() => null);
  if (channel) channel.send(text).catch(() => {});
}

module.exports = { get, set, log };
