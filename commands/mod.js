
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ChannelType,
} = require('discord.js');

const db = require('../db');
const ephemeral = MessageFlags.Ephemeral;

async function getMember(i) {
  if (!i.guild) return null;

  const user = i.options.getUser('user');
  if (!user) return null;

  return i.guild.members.fetch(user.id).catch(() => null);
}

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a member')
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption(o =>
        o.setName('user').setDescription('Who').setRequired(true))
      .addStringOption(o =>
        o.setName('reason').setDescription('Why')),

    async execute(i) {
      if (!i.guild) {
        return i.reply({
          content: 'Use this command inside a server.',
          flags: ephemeral,
        });
      }

      const member = await getMember(i);

      if (!member || !member.kickable) {
        return i.reply({
          content: "Can't kick that user. Check the bot's role and permissions.",
          flags: ephemeral,
        });
      }

      const reason = i.options.getString('reason') || 'no reason given';

      await member.kick(reason);
      await i.reply(`Kicked **${member.user.tag}**.`);

      db.log(i.guild, `${i.user.tag} kicked ${member.user.tag} (${reason})`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a member')
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(o =>
        o.setName('user').setDescription('Who').setRequired(true))
      .addStringOption(o =>
        o.setName('reason').setDescription('Why')),

    async execute(i) {
      if (!i.guild) {
        return i.reply({
          content: 'Use this command inside a server.',
          flags: ephemeral,
        });
      }

      const member = await getMember(i);

      if (!member || !member.bannable) {
        return i.reply({
          content: "Can't ban that user. Check the bot's role and permissions.",
          flags: ephemeral,
        });
      }

      const reason = i.options.getString('reason') || 'no reason given';

      await member.ban({ reason });
      await i.reply(`Banned **${member.user.tag}**.`);

      db.log(i.guild, `${i.user.tag} banned ${member.user.tag} (${reason})`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('timeout')
      .setDescription('Timeout a member')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o =>
        o.setName('user').setDescription('Who').setRequired(true))
      .addIntegerOption(o =>
        o.setName('minutes')
          .setDescription('How long')
          .setMinValue(1)
          .setMaxValue(40320)
          .setRequired(true)),

    async execute(i) {
      if (!i.guild) {
        return i.reply({
          content: 'Use this command inside a server.',
          flags: ephemeral,
        });
      }

      const member = await getMember(i);

      if (!member || !member.moderatable) {
        return i.reply({
          content: "Can't timeout that user. Check the bot's role and permissions.",
          flags: ephemeral,
        });
      }

      const mins = i.options.getInteger('minutes');

      await member.timeout(mins * 60 * 1000);
      await i.reply(`Timed out **${member.user.tag}** for ${mins} minute(s).`);

      db.log(i.guild, `${i.user.tag} timed out ${member.user.tag} for ${mins} min`);
    },
  },

  {
    data: new SlashCommandBuilder()
      .setName('purge')
      .setDescription('Delete recent messages')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption(o =>
        o.setName('count')
          .setDescription('1 to 100')
          .setMinValue(1)
          .setMaxValue(100)
          .setRequired(true)),

    async execute(i) {
      if (!i.guild || !i.channel) {
        return i.reply({
          content: 'Use this command inside a server channel.',
          flags: ephemeral,
        });
      }

      const channel = i.channel;

      if (
        !channel.isTextBased() ||
        typeof channel.bulkDelete !== 'function'
      ) {
        return i.reply({
          content: 'This channel does not support bulk message deletion.',
          flags: ephemeral,
        });
      }

      try {
        const count = i.options.getInteger('count');
        const deleted = await channel.bulkDelete(count, true);

        await i.reply({
          content: `Deleted ${deleted.size} message(s). Messages older than 14 days cannot be bulk-deleted.`,
          flags: ephemeral,
        });

        db.log(
          i.guild,
          `${i.user.tag} purged ${deleted.size} messages in <#${i.channelId}>`
        );
      } catch (err) {
        console.error('Purge command error:', err);

        const response = {
          content: 'Could not delete messages. Check the bot has Manage Messages permission.',
          flags: ephemeral,
        };

        if (i.replied || i.deferred) {
          await i.followUp(response).catch(() => {});
        } else {
          await i.reply(response).catch(() => {});
        }
      }
    },
  },
];
