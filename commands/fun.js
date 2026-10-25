const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');

const questions = [
  { q: 'What is the capital of Australia?', options: ['Sydney', 'Canberra', 'Melbourne', 'Perth'], answer: 1 },
  { q: 'Which planet is called the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], answer: 1 },
  { q: 'What is the chemical symbol for gold?', options: ['Ag', 'Gd', 'Au', 'Go'], answer: 2 },
  { q: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2 },
  { q: 'Which is the largest ocean?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
  { q: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Leonardo da Vinci', 'Monet'], answer: 2 },
  { q: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], answer: 2 },
  { q: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], answer: 1 },
  { q: 'What is the fastest land animal?', options: ['Lion', 'Horse', 'Cheetah', 'Greyhound'], answer: 2 },
  { q: 'Which gas do plants take in from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], answer: 2 },
  { q: 'What is the capital of Japan?', options: ['Kyoto', 'Osaka', 'Tokyo', 'Nagoya'], answer: 2 },
  { q: 'In what year did humans first land on the Moon?', options: ['1959', '1969', '1979', '1989'], answer: 1 },
];

const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

module.exports = [
  {
    data: new SlashCommandBuilder().setName('trivia').setDescription('Answer a random trivia question'),
    async execute(i) {
      const q = questions[Math.floor(Math.random() * questions.length)];
      const row = new ActionRowBuilder().addComponents(
        q.options.map((text, n) =>
          new ButtonBuilder().setCustomId('trivia_' + n).setLabel(text).setStyle(ButtonStyle.Secondary)
        )
      );

      await i.reply({ content: `**${q.q}**\n20 seconds, go!`, components: [row] });
      const msg = await i.fetchReply();

      // only the person who ran the command can answer
      const collector = msg.createMessageComponentCollector({
        filter: b => b.user.id === i.user.id,
        time: 20000,
        max: 1,
      });

      collector.on('collect', async b => {
        const picked = Number(b.customId.split('_')[1]);
        const result = picked === q.answer ? 'Correct!' : `Nope, it was ${q.options[q.answer]}.`;
        await b.update({ content: `**${q.q}**\n${result}`, components: [] });
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          i.editReply({ content: `**${q.q}**\nTime's up, it was ${q.options[q.answer]}.`, components: [] }).catch(() => {});
        }
      });
    },
  },

  {
    data: new SlashCommandBuilder().setName('rps').setDescription('Rock paper scissors vs the bot')
      .addStringOption(o => o.setName('pick').setDescription('Your pick').setRequired(true)
        .addChoices(
          { name: 'Rock', value: 'rock' },
          { name: 'Paper', value: 'paper' },
          { name: 'Scissors', value: 'scissors' },
        )),
    async execute(i) {
      const mine = i.options.getString('pick');
      const options = Object.keys(beats);
      const bot = options[Math.floor(Math.random() * options.length)];

      let result = 'You win!';
      if (mine === bot) result = "It's a tie.";
      else if (beats[bot] === mine) result = 'I win!';

      await i.reply(`You picked **${mine}**, I picked **${bot}**. ${result}`);
    },
  },

  {
    data: new SlashCommandBuilder().setName('meme').setDescription('Random meme'),
    async execute(i) {
      await i.deferReply();
      try {
        const res = await fetch('https://meme-api.com/gimme');
        const meme = await res.json();
        if (!meme.url || meme.nsfw) return i.editReply('Got a bad one, try again.');
        const embed = new EmbedBuilder().setTitle(meme.title).setImage(meme.url);
        await i.editReply({ embeds: [embed] });
      } catch (err) {
        console.log('meme failed:', err.message);
        await i.editReply("Couldn't get a meme right now.");
      }
    },
  },
];
