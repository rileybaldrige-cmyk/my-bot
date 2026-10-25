const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType,
  PermissionFlagsBits, EmbedBuilder, MessageFlags,
} = require('discord.js');

function panel() {
  const embed = new EmbedBuilder()
    .setTitle('Support tickets')
    .setDescription('Need help? Press the button and a private channel will be made for you.');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_open').setLabel('Open a ticket').setStyle(ButtonStyle.Primary)
  );
  return { embeds: [embed], components: [row] };
}

async function openTicket(i) {
  // topic holds the owner's id so we can find their ticket again
  const old = i.guild.channels.cache.find(c => c.topic === i.user.id && c.name.startsWith('ticket-'));
  if (old) {
    return i.reply({ content: `You already have a ticket open: ${old}`, flags: MessageFlags.Ephemeral });
  }

  const cleanName = i.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  const P = PermissionFlagsBits;
  const channel = await i.guild.channels.create({
    name: 'ticket-' + cleanName,
    type: ChannelType.GuildText,
    topic: i.user.id,
    permissionOverwrites: [
      { id: i.guild.id, deny: [P.ViewChannel] },
      { id: i.user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] },
      { id: i.client.user.id, allow: [P.ViewChannel, P.SendMessages, P.ManageChannels] },
    ],
  });

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close ticket').setStyle(ButtonStyle.Danger)
  );
  await channel.send({ content: `Hi ${i.user}, tell us what you need and someone will be with you.`, components: [closeRow] });
  await i.reply({ content: `Your ticket is ready: ${channel}`, flags: MessageFlags.Ephemeral });
}

async function closeTicket(i) {
  if (!i.channel.name.startsWith('ticket-')) {
    return i.reply({ content: "This isn't a ticket channel.", flags: MessageFlags.Ephemeral });
  }
  await i.reply('Closing this ticket in 5 seconds...');
  setTimeout(() => i.channel.delete().catch(() => {}), 5000);
}

async function handleButton(i) {
  if (i.customId === 'ticket_open') return openTicket(i);
  if (i.customId === 'ticket_close') return closeTicket(i);
}

module.exports = { panel, handleButton };
