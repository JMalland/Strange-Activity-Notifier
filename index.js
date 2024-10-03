const { Get_Watchlist, Get_Alerts, Get_Userdata, Get_Log_Channels, Build_Table, Reset_Guild_Data } = require('./components/WatchlistSQLHandler.js');
const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const { Create_Embed, Filter_Report_Type } = require('./components/WatchlistEmbed.js');
const { Database } = require('./components/Database.js');
const config = require("./config.json")
const fs = require('fs');
const path = require('path');

// Set the REST API version
const rest = new REST({ version: '9' }).setToken(config.token);


// Create the watchlist database
const db = new Database('./watchlist.db');

// Create a new Discord client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences, // To track member presence
    ]
});

// Create a collection to store command files
client.commands = new Collection();

/**
 * Function to recursively read command files from the 'commands' directory
 * @param {String} dir 
 */
async function readCommandFiles(dir) {
    const files = await fs.promises.readdir(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.promises.stat(filePath);

        if (stat.isDirectory()) {
            await readCommandFiles(filePath);
        }
        else if (file.endsWith('.js')) {
            console.log("File: " + filePath);
            const command = require('./' + filePath);
            if (command.data == undefined) { // No specified command data
                continue;
            }
            client.commands.set(command.data.name, command);
        }
    }
}

/**
 * Refresh a guild's server-side commands
 * @param {String} GuildID 
 */
async function Reload_Guild_Commands(GuildID) {
    // Update the server-side commands
    try {
        console.log(`(Guild: ${GuildID})\t Started refreshing guild commands.`);

        await rest.put(
            Routes.applicationGuildCommands(config.clientId, GuildID),
            { body: client.commands.map(command => command.data.toJSON()) },
        );

        console.log(`(Guild: ${GuildID})\t Successfully reloaded guild commands.`);
    }
    catch (error) {
        console.error(`(Guild: ${GuildID})\t Error while refreshing guild commands:`, error);
    }
}

/**
 * Checks whether the user should be logged in the Watchlist.
 * @param {GuildMember} member 
 * @param {String} type
 * @returns Nothing
 */
async function Check_Watchlist(member, type) {
    // Get the watchlist data
    let watchlist = await Get_Watchlist(member.guild.id);
    // Get the alerts data
    let alerts = await Get_Alerts(member.guild.id);
    // Get the user's data
    let userdata = await Get_Userdata(member.user.id, member.guild.id);
    
    // The member just joined the guild
    if (type == 'join' || ((type == 'exit' || type == 'banned') && userdata.join_count == '0')) {
        // Increment the user's guild-join counter.
        db.update('users', ['user_id', 'server_id'], [member.user.id, member.guild.id], 'join_count', parseInt(userdata.join_count) + 1);
        console.log(`(Guild: ${member.guild.id})\t Incremented join counter for user: ${member.user.id} in guild.`);
    }
    
    // Update the stored userdata
    userdata = await Get_Userdata(member.user.id, member.guild.id);
    
    // Save stored variables
    let join_frequency = parseInt(watchlist.join_frequency);
    let time_limit = parseInt(watchlist.time_limit);
    let join_count = parseInt(userdata.join_count);
    let time_unit = watchlist.time_unit;

    // Save the display_order
    let display_order = watchlist.display_order.split("|");

    // The join frequency is being watched, and the user has exceeded the limit
    let exceeded_rejoin_limit = join_frequency > 0 && join_count > join_frequency;

    // Calculate the account creation time difference
    const accountCreatedTimestamp = member.user.createdAt.getTime();
    const currentTimestamp = Date.now();
    const timeDifference = currentTimestamp - accountCreatedTimestamp; // Difference in milliseconds

    // Convert milliseconds to various units
    const seconds = timeDifference / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;
    const months = days / 30.437; // Average days in a month (30.44)
    const years = months / 12; // Using 365.25 to approximate leap years

    // Parse for the type of message to display
    var filter = Filter_Report_Type(type);
    var message = filter.message;
    var color = filter.message;

    // Value to compare with Watchlist account time_limit
    let determinant_value;

    // Determine which time_unit to used
    if (time_unit == 'seconds') {       // Seconds
        determinant_value = seconds;
    }
    else if (time_unit == 'minutes') {  // Minutes
        determinant_value = minutes;
    }
    else if (time_unit == 'hours') {    // Hours
        determinant_value = hours;
    }
    else if (time_unit == 'days') {     // Days
        determinant_value = days;
    }
    else if (time_unit == 'months') {   // Months
        determinant_value = months;
    }
    else {                              // Years
        determinant_value = years;
    }

    // Store the log channels
    let log_channel_list = await Get_Log_Channels(member.guild, alerts.channels.split("|"));
    
    // Record any suspicious members in the Watchlist-Alert channels
    for (log_channel of log_channel_list) {
        // String value to add user/role mentions to
        let mentions = "";
        // Add the user/role mentions
        for (entity of alerts.entities.split("|").filter(item => item !== '')) {
            // Check if ID belongs to a role
            const role = await member.guild.roles.fetch(entity).catch(() => null);

            // Add the entity to the mentions
            mentions += `<@${role ? '&' : ''}${entity}> `;
        }

        // The user was banned from the server, or meets the Watchlist requirements
        if (type == 'banned' || exceeded_rejoin_limit || determinant_value < time_limit) {
            // Send the Embed in the Watchlist-Alerts log channel
            log_channel.send({ content: mentions, embeds: [Create_Embed(display_order, member.user, determinant_value.toFixed(2), time_unit, userdata.join_count, message, color)] });
        }
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log("Ready!");

    // Load all commands
    await readCommandFiles('commands');

    // Create the 'servers' table
    Build_Table('servers', ['server_id', 'time_limit', 'time_unit', 'join_frequency', 'display_order']);

    // Create the 'users' table
    Build_Table('users', ['server_id', 'user_id', 'join_count']);
    
    // Create the 'alerts' table
    Build_Table('alerts', ['server_id', 'entities', 'channels']);
});

// Joined a server
client.on('guildCreate', async (guild) => {
    console.log(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);

    // Retrieve watchlist data for guild.
    // If none, it initializes the default values
    await Get_Watchlist(guild.id);

    // Retrieve alerts data for guild.
    // If none, it initializes the default values
    await Get_Alerts(guild.id);

    // Try to sync the bot commands with the guild
    await Reload_Guild_Commands(guild.id);
})

// Left a server
client.on('guildDelete', async (guild) => {
    console.log(`Exited guild: ${guild.name} (ID: ${guild.id})`);

    // Clear the guild's row
    await Reset_Guild_Data(guild.id);
})

// Welcome Event
client.on('guildMemberAdd', async (member) => {
    // Retrieve user data for guild.
    // If none, it initializes the default values
    await Get_Userdata(member.user.id, member.guild.id);

    // Check to see if the member should be Watchlisted
    Check_Watchlist(member, 'join');
});

// Leave Event
client.on('guildMemberRemove', async (member) => {
    // Ignore bots leaving -- Includes self
    if (member.user.bot) {
        return;
    }

    // Fetch the list of banned users
    const bans = await member.guild.bans.fetch();
    // Check if the user is in the list of banned users
    const isBanned = bans.has(member.user.id);

    // Retrieve user data for guild.
    // If none, it initializes the default values
    await Get_Userdata(member.user.id, member.guild.id);

    // Check to see if the member should be Watchlisted
    Check_Watchlist(member, (isBanned ? 'banned' : 'exit'));
});

const interaction = require('./events/interactionCreate.js');

client.on(interaction.event, interaction.execute);

// Discord Bot login
client.login(config.token);

module.exports = {
    Reload_Guild_Commands
}
