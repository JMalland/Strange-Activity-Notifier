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
