const { SlashCommandBuilder, CommandInteraction, AutocompleteInteraction, User, Role } = require('discord.js');
const { Database } = require('../components/Database.js');
const { Announce_Changes, Get_Alerts } = require('../components/WatchlistSQLHandler.js');
const { Check_Watchlist } = require('../components/WatchlistEmbed.js');

// Create/connect to the database
const db = new Database('./watchlist.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('watchlist')
        .setDescription('Initialize different setup configurations.')
        .addSubcommand(subcommand =>
            subcommand.setName('accounts')
                .setDescription('Configure Watchlist settings for users with relatively \'new\' accounts.')
                .addNumberOption(option =>
                    option.setName('time_range')
                        .setDescription('The amount of time after a user\'s account creation to watchlist them.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('time_unit')
                        .setDescription('The unit of time measurement. (Years, Months, Days, Hours, Minutes, Seconds)')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('pingers')
                .setDescription('Configure Watchlist settings for users who have a high tendency to leave/rejoin the server.')
                .addNumberOption(option => 
                    option.setName('join_frequency')
                        .setDescription('The number of times a user may rejoin the server before being watchlisted.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand => 
            subcommand.setName('alert')
                .setDescription('Choose what entities are alerted to Watchlist updates.')
                .addStringOption(option => 
                    option.setName('action')
                        .setDescription('How to use the provided Watchlist-Alert entity. (Add/Remove)')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to be utilized.')
                        .setRequired(false)
                )
                .addMentionableOption(option => 
                    option.setName('entity')
                        .setDescription('The Watchlist-Alert entity to be utilized.')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand => 
            subcommand.setName('demo')
                .setDescription('Send a demonstration report to the Watchlist-Alert channels.')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('What type of report will be send? (Join, Exit, Banned)')
                        .setRequired(false)
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('Which user should be displayed in the fake Watchlist report?')
                        .setRequired(false)
                )
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The specific channel to send the fake report.')
                        .setRequired(false)
                )
        ),
    
    /**
     * Execute the '/watchlist' command
     * @param {CommandInteraction} interaction 
     */
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'accounts') {
            await handleAccountSetup(interaction);
        }
        else if (subcommand === 'pingers') {
            await handleJoinFrequencySetup(interaction);
        }
        else if (subcommand === 'alert') {
            await handleAlertSetup(interaction);
        }
        else if (subcommand === 'demo') {
            await handleDemoReport(interaction);
        }
    },

    /**
     * Allow command parameters to be autocompleted
     * @param {AutocompleteInteraction} interaction 
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const subcommand = interaction.options.getSubcommand(true);
        let choices;

        // Parse the subcommand to determine the right autocomplete choices
        switch(subcommand) {
            case('accounts'):
                // The possible units of time measurement
                choices = ['Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years'];
                break;
            case('alert'):
                // The types of alert actions
                choices = ['Add', 'List', 'Remove'];
                break;
            case('type'):
                // The types of report events
                choices = ['Join', 'Exit', 'Banned'];
                break;
        }

        // Return the filtered options -- Not case sensitive
        const filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));
        await interaction.respond(
            filtered.map(choice => ({ name: choice.replace('_', ' '), value: choice })),
        );
    },
};

/**
 * Execute the '/watchlist accounts' command
 * @param {CommandInteraction} interaction 
 * @returns 
 */
async function handleAccountSetup(interaction) {
    // Get the time_limit
    const time_limit = interaction.options.getNumber('time_range');
    // Get the time_unit and make it singular
    const time_unit = interaction.options.getString('time_unit').toLowerCase().slice(0, -1);

    // Validate time unit
    const validUnits = ['year', 'month', 'day', 'hours', 'minute', 'second'];
    if (!validUnits.includes(time_unit)) {
        await interaction.reply({ content: `UnitValueError: The value \`time_unit: ${time_unit}\` is invalid!`, ephemeral: true });
        console.error(`(Guild: ${interaction.guild.id}) The value time_unit: ${time_unit} is invalid!`);
        return;
    }

    // Insert table values
    db.update('servers', 'server_id', interaction.guild.id, ['time_limit', 'time_unit'], [time_limit, time_unit + 's'])
        .then(async () => {
            // Store the update message to be sent
            let update_message = `- I will begin watching for user accounts younger than ${time_limit} ${time_unit}s.`;
            // Store the message to be logged
            let log_message = 'Set up user account Watchlist parameters.';

            // Announce the Watchlist account-monitoring changes
            Announce_Changes(interaction, update_message, log_message);
        });
}

/**
 * Execute the '/watchlist pingers' commands
 * @param {CommandInteraction} interaction 
 */
async function handleJoinFrequencySetup(interaction) {
    const join_frequency = interaction.options.getNumber('join_frequency');
    
    // Insert table values
    db.update('servers', 'server_id', interaction.guild.id, 'join_frequency', join_frequency)
        .then(async () => {
            // Store the update message to be sent
            let update_message = `- I will begin watching for users who frequently leave and rejoin more than ${join_frequency} time${(join_frequency > 1 ? 's' : '')}.`;
            // Store the message to be logged
            let log_message = 'Set up join frequency Watchlist parameters.';

            // Announce the Watchlist account-monitoring changes
            await Announce_Changes(interaction, update_message, log_message);
        })
}

/**
 * Execute the '/watchlist pingers' commands
 * @param {CommandInteraction} interaction 
 */
async function handleAlertSetup(interaction) {
    // Get the type of action applied to the entity
    const action = interaction.options.getString('action');
    // Get the channel being used
    const channel = interaction.options.getChannel('channel');
    // Get the entity being used
    const entity = interaction.options.getMentionable('entity');

    // List of Watchlist-Alert actions
    let choices = ['Add', 'List', 'Remove'];

    // The provided action is invalid
    if (!choices.includes(action)) {
        await interaction.reply({ content: `ActionValueError: The provided value \`action: ${action}\` is invalid!`, ephemeral: true });
        return;
    }
    // There was no entity provided
    else if (!channel && !entity && action != 'List') {
        await interaction.reply({ content: `NonOptionalFieldError: No channel or mentionable entity was provided!`, ephemeral: true });
        return;
    }
    // Both an entity and a channel were provided
    else if (channel && entity) {
        await interaction.reply({ content: `FieldCountError: You can only provide one selection at a time!`, ephemeral: true });
        return;
    }

    // Get the guild's row from the 'servers' table
    let alerts = await Get_Alerts(interaction.guild.id);

    // Pre-Initialize the selection variables
    let selection_type, selection_id, selector;

    // A channel was provided
    if (channel) {
        // Store the channel's ID
        selection_id = channel.id;
        selection_type = 'channel';
        selector = '#';
    }
    // An entity was provided
    else if (action != 'List') {
        // Store the entity's ID
        selection_id = entity.id;

        // The provided type is a Role
        if (entity instanceof Role) {
            selection_type = 'role';
            selector = '@&';
        }
        // The provided type is a User
        else {
            selection_type = 'user';
            selector = '@';
        }
    }


    /* Allows array to exclude '' elements: // array.filter(item => item !== '') */
    // Get the list of Watchlist-Alert channels
    let log_channel_ids = alerts.channels.split("|").filter(item => item !== '');
    // Get the list of entities
    let entity_ids = alerts.entities.split("|").filter(item => item !== '');

    switch(action) {
        // Add the selection to the Watchlist-Alert list
        case('Add'):
            if (channel) log_channel_ids.push(channel.id);
            if (entity) entity_ids.push(entity.id);
            break;
        // Remove the selection from the Watchlist-Alert list
        case('Remove'):
            if (channel) log_channel_ids.splice(log_channel_ids.indexOf(channel.id));
            if (entity) entity_ids.splice(entity_ids.indexOf(entity.id));
            break;
        case('List'):
            let roles = "";
            let users = "";
            let channels = "";

            // List all entities
            for (let entity of entity_ids) {
                // Check if ID belongs to a role
                const role = await interaction.guild.roles.fetch(entity).catch(() => null);

                // The entity is a role
                if (role) {
                    // Add to the role list
                    roles += `     <@&${entity}>\n`;
                }
                // The entity is a user
                else {
                    // Add to the user list
                    users += `     <@${entity}>\n`;
                }
            }
            
            // List all channels
            for (let channel of log_channel_ids) {
                // Add to the channel list
                channels += `     <#${channel}>\n`;
            }

            // Format the role list
            if (roles.trim() != "") {
                roles = "**Roles:**\n" + roles + "\n"; // Add extra spacer newline
            }
            // There is no role list
            else {
                roles = "";
            }

            // Format the user list
            if (users.trim() != "") {
                users = "**Users:**\n" + users + "\n"; // Add extra spacer newline
            }
            // There is no user list
            else {
                users = "";
            }

            // Format the channel list
            if (channels.trim() != "") {
                channels = "**Channels:**\n" + channels;
            }
            // There is no channel list
            else {
                channels = "";
            }

            // Send the alert-list to the executor
            await interaction.reply({ content: `${users}${roles}${channels}`, ephemeral: true });
            return;
    }

    // Insert table values
    db.update('alerts', 'server_id', interaction.guild.id, ['entities', 'channels'], [entity_ids.join("|"), log_channel_ids.join("|")])
        .then(async () => {
            // Store the update message to be sent
            let update_message = `- ${action == 'Add' ? action : action.slice(0, -1)}ed ${selection_type}: <${selector + selection_id}> ${action == 'Add' ? 'to' : 'from'} Watchlist-Alert list.`;
            // Store the message to be logged
            let log_message = `${action == 'Add' ? action : action.slice(0, -1)}ed ${selection_id} ${action == 'Add' ? 'to' : 'from'} guild Watchlist-Alert ${selection_type}s.`;

            // Announce the Watchlist-Alert changes
            await Announce_Changes(interaction, update_message, log_message);
        })
}

/**
 * Execute the '/watchlist demo' command
 * @param {CommandInteraction} interaction 
 * @returns 
 */
async function handleDemoReport(interaction) {
    // Get the entity being used
    const user = interaction.options.getMentionable('entity');
    // Get the type of report
    const type = interaction.options.getString('type');
    // Get the channel being used (if any)
    const channel = interaction.options.getChannel('channel');

    // User Can Be Null
    // Need to Move Check_Watchlist() command from index.js
    // Move to WatchlistEmbed.js
    // Also need to add require('Database.js') to WatchlistEmbed.js

    if (user == null) {
        // Create a "default" user (use the Bot's user info).
        // user = BotInfo 
    }

    // Send out a Watchlist Check -- Demonstration
    Check_Watchlist(user, type, false);
}
