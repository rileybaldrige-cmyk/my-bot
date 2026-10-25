const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
} = require('discord.js');
const db = require('../db');
const tickets = require('../tickets');

const membersOn = () => process.env.MEMBERS_INTENT === 'true';
const needsIntent = '\nNote: this needs MEMBERS_INTENT=true in your .env (and the Server Members Intent switched on) before it does anything.';

module.exports = [
  {
    data: new SlashCommandBuilder().setName('setup').setDescription('Server settings')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(s => s.setName('welcome').setDescription('Channel for welcome messages')
        .addChannelOption(o => o.setName('channel').setDescription('Which channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
      .addSubcommand(s => s.setName('autorole').setDescription('Role given to new members')
        .addRoleOption(o => o.setName('role').setDescription('Which role').setRequired(true)))
      .addSubcommand(s => s.setName('logs').setDescription('Channel for the log')
        .addChannelOption(o => o.setName('channel').setDescription('Which channel').addChannelTypes(ChannelType.GuildText).setRequired(true))),
    async execute(i) {
      const sub = i.options.getSubcommand();

      if (sub === 'welcome') {
        const channel = i.options.getChannel('channel');
        db.set(i.guild.id, 'welcome', channel.id);
        return i.reply({ content: `Welcome messages will go to ${channel}.` + (membersOn() ? '' : needsIntent), flags: MessageFlags.Ephemeral });
      }

      if (sub === 'autorole') {
        const role = i.options.getRole('role');
        db.set(i.guild.id, 'autorole', role.id);
        // bot can't hand out a role that sits above its own
        const note = role.position >= i.guild.members.me.roles.highest.position
          ? '\nHeads up: move my role above that role in Server Settings > Roles or I cannot give it.'
          : '';
        return i.reply({ content: `New members will get ${role.name}.` + note + (membersOn() ? '' : needsIntent), flags: MessageFlags.Ephemeral });
      }

      if (sub === 'logs') {
        const channel = i.options.getChannel('channel');
        db.set(i.guild.id, 'logs', channel.id);
        return i.reply({ content: `Logs will go to ${channel}.`, flags: MessageFlags.Ephemeral });
      }
    },
  },

  {
    data: new SlashCommandBuilder().setName('ticketpanel').setDescription('Post the "open a ticket" button here')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(i) {
      await i.channel.send(tickets.panel());
      await i.reply({ content: 'Panel posted.', flags: MessageFlags.Ephemeral });
    },
  },
];
