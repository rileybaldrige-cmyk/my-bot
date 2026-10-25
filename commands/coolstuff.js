const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const stamp = ms => Math.floor(ms / 1000);

module.exports = [
  {
    data: new SlashCommandBuilder().setName('ping').setDescription('Check if the bot is alive'),
    async execute(i) {
      await i.reply(`Pong! ${Math.round(i.client.ws.ping)}ms`);
    },
  },

  {
    data: new SlashCommandBuilder().setName('userinfo').setDescription('Info about a user')
      .addUserOption(o => o.setName('user').setDescription('Who?')),
    async execute(i) {
      const user = i.options.getUser('user') || i.user;
      const member = await i.guild.members.fetch(user.id).catch(() => null);
      const embed = new EmbedBuilder()
        .setTitle(user.tag)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'ID', value: user.id, inline: true },
          { name: 'Account made', value: `<t:${stamp(user.createdTimestamp)}:R>`, inline: true },
          { name: 'Joined server', value: member ? `<t:${stamp(member.joinedTimestamp)}:R>` : 'unknown', inline: true },
        );
      await i.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Info about this server'),
    async execute(i) {
      const g = i.guild;
      const embed = new EmbedBuilder()
        .setTitle(g.name)
        .setThumbnail(g.iconURL())
        .addFields(
          { name: 'Members', value: String(g.memberCount), inline: true },
          { name: 'Made', value: `<t:${stamp(g.createdTimestamp)}:R>`, inline: true },
          { name: 'Channels', value: String(g.channels.cache.size), inline: true },
        );
      await i.reply({ embeds: [embed] });
    },
  },

  {
    data: new SlashCommandBuilder().setName('avatar').setDescription("Get someone's avatar")
      .addUserOption(o => o.setName('user').setDescription('Who?')),
    async execute(i) {
      const user = i.options.getUser('user') || i.user;
      await i.reply(user.displayAvatarURL({ size: 1024 }));
    },
  },

  {
    data: new SlashCommandBuilder().setName('poll').setDescription('Yes/no poll')
      .addStringOption(o => o.setName('question').setDescription('What are we voting on?').setRequired(true)),
    async execute(i) {
      await i.reply(`**${i.options.getString('question')}**`);
      const msg = await i.fetchReply();
      await msg.react('👍');
      await msg.react('👎');
    },
  },

  {
    data: new SlashCommandBuilder().setName('remind').setDescription('Remind me later (lost if the bot restarts)')
      .addIntegerOption(o => o.setName('minutes').setDescription('How many minutes').setMinValue(1).setMaxValue(1440).setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Remind me about').setRequired(true)),
    async execute(i) {
      const mins = i.options.getInteger('minutes');
      const text = i.options.getString('message');
      await i.reply({ content: `Ok, I'll ping you in ${mins} minute(s).`, flags: MessageFlags.Ephemeral });
      setTimeout(() => {
        i.channel.send(`<@${i.user.id}> reminder: ${text}`).catch(() => {});
      }, mins * 60 * 1000);
    },
  },

  {
    data: new SlashCommandBuilder().setName('roll').setDescription('Roll a dice')
      .addIntegerOption(o => o.setName('sides').setDescription('Sides (default 6)').setMinValue(2).setMaxValue(1000)),
    async execute(i) {
      const sides = i.options.getInteger('sides') || 6;
      const n = Math.floor(Math.random() * sides) + 1;
      await i.reply(`You rolled a **${n}** (d${sides})`);
    },
  },

  {
    data: new SlashCommandBuilder().setName('8ball').setDescription('Ask the 8 ball')
      .addStringOption(o => o.setName('question').setDescription('Ask away').setRequired(true)),
    async execute(i) {
      const answers = ['Yes.', 'No.', 'Maybe.', 'Definitely.', 'No way.', 'Ask me later.', 'Looks good.', 'Doubtful.'];
      await i.reply('🎱 ' + answers[Math.floor(Math.random() * answers.length)]);
    },
  },
];
