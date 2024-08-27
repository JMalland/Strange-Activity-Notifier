const { Client, GatewayIntentBits, EmbedBuilder, Events, Events: { ClientEvents }, REST, Routes, Collection, PermissionsBitField, DefaultWebSocketManagerOptions } = require('discord.js');
//const client = new Discord.Client();
const config = require("./config.json")
const fs = require('fs');
const path = require('path');
const { encodeBase62, decodeBase62 } = require('./components/Encoder.js')
const { Database } = require('./components/Database.js');
const { Check_Watchlist } = require('./components/CheckWatchlist');

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

// Function to recursively read command files from the 'commands' directory
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

// Set the REST API version
const rest = new REST({ version: '9' }).setToken(config.token);

// Refresh a guild's server-side commands
async function refresh_guild(GuildID) {
    // Reload the command files
    await readCommandFiles('commands');

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

async function Reset_Guild_Data(GuildID) {
    // Reset the guild's data
    console.log("Found existing guild data.");
    await db.update('servers', 'server_id', GuildID, ['time_limit', 'time_unit', 'log_channel_id', 'join_frequency', 'display_order'], ['0', 'seconds', '', '0', ['Account_Age', 'User_Info', 'Join_Frequency']]);
    console.log("Cleared guild's watchlist data.");

    // Reset the guild's user join/leave data
    await db.update('users', 'server_id', GuildID, 'join_count', '');
    console.log("Cleared guild's user join/leave data.");
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log("Ready!");

    // Load all commands
    await readCommandFiles('commands');

    // Create the 'servers' table
    db.createIfAbsent('servers', ['server_id', 'time_limit', 'time_unit', 'log_channel_id', 'join_frequency', 'display_order'])
        .then((status) => {
            if (status) {
                console.log("Created new 'servers' table.");
            }
            else {
                console.log("Using existing 'servers' table.");
            }
        })
        .catch((e) => {
            console.log("Something went wrong creating new 'servers' table.");
        })

    // Create the 'users' table
    db.createIfAbsent('users', ['server_id', 'user_id', 'join_count'])
        .then((status) => {
            if (status) {
                console.log("Created new 'users' table.");
            }
            else {
                console.log("Using existing 'users' table.");
            }
        })
        .catch((e) => {
            console.error("Something went wrong creating new 'users' table.")
        })
});

// Joined a server
client.on('guildCreate', async (guild) => {
    console.log(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);

    // Attempt to retrieve existing guild data -- Shouldn't be any.
    let existing = await db.get('servers', '*', 'server_id', guild.id);

    // The guild has existing data
    if (existing.length > 0) {
        // Reset the guild's data
        await Reset_Guild_Data(guild.id);
    }
    // Need to create a new table row for this guild
    else {
        // Insert a blank row for this guild
        await db.insert('servers', ['server_id', 'time_limit', 'time_unit', 'log_channel_id', 'join_frequency', 'display_order'], [guild.id, '0', 'seconds', '', '0', ['Account_Age', 'User_Info', 'Join_Frequency']]);
        console.log("Created row in table 'servers' for guild: " + guild.id);
    }

    // Try to sync the bot commands with the guild
    await refresh_guild(guild.id);
})

// Left a server
client.on('guildDelete', async (guild) => {
    console.log(`Exited guild: ${guild.name} (ID: ${guild.id})`);

    // Clear the guild's row
    await Reset_Guild_Data(guild.id);
})

// A user was banned
/*client.on('guildBanAdd', async (ban) => {
    console.log(ban);

    console.log("A USER WAS BANNED!");

    // Check to see if the member should be Watchlisted
    Check_Watchlist({ user: user }, 'banned', db);
})*/

// Welcome Event
client.on('guildMemberAdd', async (member) => {
    //const role = member.guild.roles.cache.get(config.roleID)
    //await member.roles.add(role.id)

    // Attempt to retrieve existing guild data -- Shouldn't be any.
    let existing = await db.get('users', '*', ['user_id', 'server_id'], [member.user.id, member.guild.id]);

    // There is no existing data for this user in this guild
    if (existing.length == 0) {
        // Create a row for the user's data
        db.insert('users', ['user_id', 'server_id', 'join_count'], [member.user.id, member.guild.id, '0']);
        console.log(`Created row for user: ${member.user.username} (ID: ${member.user.id}) in guild: ${member.guild.name} (ID: ${member.guild.id})`);
    }

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

    // Attempt to retrieve existing user data.
    let existing = await db.get('users', '*', ['user_id', 'server_id'], [member.user.id, member.guild.id]);

    // There is no existing data for this user in this guild
    if (existing.length == 0) {
        // Create a row for the user's data
        db.insert('users', ['user_id', 'server_id', 'join_count'], [member.user.id, member.guild.id, '1']);
        console.log(`Created row for user: ${member.user.username} (ID: ${member.user.id}) in guild: ${member.guild.name} (ID: ${member.guild.id})`);
    }

    // Only run the Watchlist check if the user IS NOT banned.
    if (!isBanned) {
        // Check to see if the member should be Watchlisted
        Check_Watchlist(member, 'exit');
    }
});

const interaction = require('./events/interactionCreate.js');

client.on(interaction.event, interaction.execute);

// Discord Bot login
client.login(config.token);

module.exports = {
    refresh_guild
}