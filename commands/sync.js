const { SlashCommandBuilder, CommandInteraction } = require('discord.js');
const { Reload_Guild_Commands } = require('../index.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription('Resync the server-side commands. (Probably won\'t change anything)'),
    /**
     * Execute the '/sync' command
     * @param {CommandInteraction} interaction 
     * @returns Nothing
     */
    async execute(interaction) {
        // Refresh the server-side commands for the guild
        Reload_Guild_Commands(interaction.guild.id)
        .then(() => {
                interaction.reply({ content: `Successfully reloaded bot commands.`, ephemeral: true });
            })
            .catch(() => {
                interaction.reply({ content: `Failed to reload bot commands.`, ephemeral: true });
            })
        }
}