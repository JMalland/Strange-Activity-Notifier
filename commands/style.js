const { SlashCommandBuilder, CommandInteraction, AutocompleteInteraction } = require('discord.js');
const { Database } = require('../components/Database.js');
const { Announce_Changes } = require('../components/WatchlistSQLHandler.js');

// Create the database
let db = new Database('./watchlist.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('style')
        .setDescription('Select a display style for the Watchlist reports.')
        .addStringOption(option =>
            option.setName('first')
                .setDescription('What to display first.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('second')
                .setDescription('What to display second.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('third')
                .setDescription('What to display third.')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    /**
     * Execute the '/style' command
     * @param {CommandInteraction} interaction 
     * @returns Nothing
     */
    async execute(interaction) {
        let options = interaction.options; // Store the options
        let first = options.getString('first') // Get the first display style
        let second = options.getString('second') // Get the second display style
        let third = options.getString('third') // Get the third display style

        // The possible display styles
        let choices = ['Account_Age', 'User_Info', 'Join_Frequency'];

        // There is an invalid option
        if (!choices.includes(first) || !choices.includes(second) || !choices.includes(third)) {
            interaction.reply({ content: `InvalidStyleError: One of the provided options is invalid!`, ephemeral: true });
            return;
        }

        // Array of the display order
        let display = [first, second, third];

        // Insert the table values
        db.update('servers', 'server_id', interaction.guild.id, 'display_order', display.join("|"))
            .then(async () => {
                // Store the update message to be sent
                let update_message = `Updated the Watchlist report display style:\n1. \`${first.replace('_', ' ')}\`\n2. \`${second.replace('_', ' ')}\`\n3. \`${third.replace('_', ' ')}\``;
                // Store the message to be logged
                let log_message = 'Updated Watchlist report display style.';

                // Announce the Watchlist display-style changes
                await Announce_Changes(interaction, update_message, log_message);
            })
    },

    /**
     * Allow command parameters to be autocompleted
     * @param {AutocompleteInteraction} interaction 
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        
        // The possible display styles
        let choices = ['Account_Age', 'User_Info', 'Join_Frequency'];

        // Determine the choices to exclude based on the current focus
        if (focusedOption.name === 'second') {
            choices = choices.filter(choice => choice !== interaction.options.getString('first'));
        }
        else if (focusedOption.name === 'third') {
            choices = choices.filter(choice => choice !== interaction.options.getString('first') && choice !== interaction.options.getString('second'));
        }
        
        // Return the filtered options -- Not case sensitive
        const filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
        await interaction.respond(
            filtered.map(choice => ({ name: choice.replace('_', ' '), value: choice })),
        );
    },
}