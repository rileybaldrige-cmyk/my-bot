
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

for (const name of ['.env', 'env.env', 'env.txt']) {
  const file = path.join(__dirname, name);

  if (fs.existsSync(file)) {
    dotenv.config({ path: file });
    console.log(`Loaded environment file: ${name}`);
    break;
  }
}

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Events,
  Collection,
  MessageFlags,
} = require('discord.js');

const tickets = require('./tickets');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID in your .env file.');
  process.exit(1);
}

function enabled(name) {
  return String(process.env[name] || '').trim().toLowerCase() === 'true';
}

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildVoiceStates,
];

if (enabled('MEMBERS_INTENT')) {
  intents.push(GatewayIntentBits.GuildMembers);
}

if (enabled('MESSAGES_INTENT')) {
  intents.push(GatewayIntentBits.GuildMessages);
}

if (enabled('MESSAGE_CONTENT_INTENT')) {
  intents.push(GatewayIntentBits.MessageContent);
}

const client = new Client({ intents });
const commands = new Collection();
const commandDir = path.join(__dirname, 'commands');

if (!fs.existsSync(commandDir)) {
  console.error('The commands folder is missing.');
  process.exit(1);
}

try {
  const files = fs.readdirSync(commandDir)
    .filter(file => file.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(commandDir, file);

    // Load each command file.
    delete require.cache[require.resolve(filePath)];
    const loaded = require(filePath);

    if (!Array.isArray(loaded)) {
      throw new Error(
        `${file} must export an array of { data, execute } commands.`
      );
    }

    for (const command of loaded) {
      if (
        !command ||
        !command.data ||
        typeof command.data.toJSON !== 'function' ||
        typeof command.execute !== 'function'
      ) {
        throw new Error(`${file} contains an invalid command.`);
      }

      const commandName = command.data.name;

      if (commands.has(commandName)) {
        throw new Error(`Duplicate command name: ${commandName}`);
      }

      commands.set(commandName, command);
    }
  }
} catch (error) {
  console.error('Failed to load commands:', error);
  process.exit(1);
}

client.once(Events.ClientReady, async readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log('Guild voice-state intent: ENABLED');

  try {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    const body = commands.map(command => command.data.toJSON());

    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      : Routes.applicationCommands(CLIENT_ID);

    const hashFile = path.join(__dirname, '.commands-hash');
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify([CLIENT_ID, GUILD_ID || '', body]))
      .digest('hex');

    let oldHash = '';

    try {
      oldHash = fs.readFileSync(hashFile, 'utf8').trim();
    } catch {
      // The hash file does not exist yet.
    }

    if (hash !== oldHash) {
      await rest.put(route, { body });
      fs.writeFileSync(hashFile, hash, 'utf8');
      console.log(`Registered ${body.length} slash commands.`);
    } else {
      console.log(`${body.length} slash commands already registered.`);
    }

    console.log('Bot started successfully.');
  } catch (error) {
    console.error('Slash-command registration failed:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);

    if (!command) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          content: 'That command could not be found.',
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      return;
    }

    try {
      // Acknowledge /play immediately. music.js must use editReply()
      // for this command instead of calling deferReply() a second time.
      if (
        interaction.commandName === 'play' &&
        !interaction.deferred &&
        !interaction.replied
      ) {
        await interaction.deferReply();
      }

      await command.execute(interaction);
    } catch (error) {
      console.error(
        `Interaction error (${interaction.commandName}):`,
        error
      );

      const message = {
        content: `Command failed: ${String(error.message || error).slice(0, 800)}`,
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(message).catch(() => {});
      } else {
        await interaction.reply(message).catch(() => {});
      }
    }

    return;
  }

  if (
    interaction.isButton() &&
    interaction.customId.startsWith('ticket_')
  ) {
    try {
      await tickets.handleButton(interaction);
    } catch (error) {
      console.error('Ticket button error:', error);

      const message = {
        content: 'The ticket action failed. Please try again.',
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(message).catch(() => {});
      } else {
        await interaction.reply(message).catch(() => {});
      }
    }
  }
});

client.on(Events.Error, error => {
  console.error('Discord client error:', error);
});

client.login(DISCORD_TOKEN).catch(error => {
  console.error('Discord login failed:', error);
  process.exit(1);
});
