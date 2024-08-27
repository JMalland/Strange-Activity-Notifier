const { Guild, CommandInteraction } = require('discord.js');
const { Database } = require('./Database.js');

const db = new Database('./watchlist.db');

/**
 * Create a new sqlite table using Database
 * @param {String} table_name 
 * @param {String|String[]} column_names 
 */
function Build_Table(table_name, column_names) {
    // Create the 'servers' table
    db.createIfAbsent(table_name, column_names)
        .then((status) => {
            if (status) {
                console.log(`Created new '${table_name}' table.`);
            }
            else {
                console.log(`Using existing '${table_name}' table.`);
            }
        })
        .catch((e) => {
            console.error(`Something went wrong creating new '${table_name}' table:`, e);
        })
}

/**
 * Reset a guild's Watchlist data
 * @param {String} GuildID 
 */
async function Reset_Watchlist(GuildID) {
    // Reset the guild's server data
    await db.update('servers', 'server_id', GuildID, ['time_limit', 'time_unit', 'join_frequency', 'display_order'], ['0', 'seconds', '0', ['Account_Age', 'User_Info', 'Join_Frequency']]);
    console.log(`(Guild: ${GuildID})\t Reset 'servers' table data.`);
}

/**
 * Reset a guild's Alerts data
 * @param {String} GuildID 
 */
async function Reset_Alerts(GuildID) {
    // Reset the guild's alert data
    await db.update('alerts', 'server_id', GuildID, ['entities', 'channels'], ['', '']);
    console.log(`(Guild: ${GuildID})\t Reset 'alerts' table data.`);
}

/**
 * Reset a guild's user data
 * @param {String} GuildID 
 */
async function Reset_Users(GuildID) {
    // Reset the guild's user join/leave data
    await db.update('users', 'server_id', GuildID, 'join_count', '0');
    console.log(`(Guild: ${GuildID})\t Reset 'users' table data.`);
}

/**
 * Reset a guild's SQL data
 * @param {String} GuildID 
 */
async function Reset_Guild_Data(GuildID) {
    // Reset the guild's server data
    await Reset_Watchlist(GuildID);

    // Reset the guild's alert data
    await Reset_Alerts(GuildID);

    // Reset the guild's user join/leave data
    await Reset_Users(GuildID);
}

/**
 * 
 * @param {String} GuildID
 * @returns A row of data for GuildID, from 'servers' table
 */
async function Get_Watchlist(GuildID) {
    // Retrieve the guild's row from the 'servers' table
    let watchlist = await db.get('servers', '*', 'server_id', GuildID);

    // This shouldn't happen
    if (watchlist.length > 1) {
        console.warn(`(Guild: ${GuildID})\t Found multiple rows in table 'servers' matching guild.`);
        console.warn(`(Guild: ${GuildID})\t Only using first row.`);
    }

    // If there is a row, take the first one
    if (watchlist.length > 0) {
        // Get the first table, and print it
        console.log("Table: " + JSON.stringify(watchlist[0]));
        return(watchlist[0]);
    }
    // There is no watchlist row for this guild
    else {
        // Create a row in 'servers' for the guild
        await db.insert('servers', ['server_id', 'time_limit', 'time_unit', 'display_order'], [GuildID, '0', 'seconds', 'Account_Age|User_Info|Join_Frequency']);
        console.log(`(Guild: ${GuildID})\t Inserted new row in table 'servers' for guild.`);

        // Retrieve and return the updated row
        return(Get_Watchlist(GuildID));
    }
}

/**
 * 
 * @param {String} GuildID
 * @returns A row of data for GuildID, from 'servers' table
 */
async function Get_Alerts(GuildID) {
    // Retrieve the guild's row from the 'servers' table
    let alerts = await db.get('alerts', '*', 'server_id', GuildID);

    // This shouldn't happen
    if (alerts.length > 1) {
        console.warn(`(Guild: ${GuildID})\t Found multiple rows in table 'alerts' matching guild.`);
        console.warn(`(Guild: ${GuildID})\t Only using first row.`);
    }

    // If there is a row, take the first one 
    if (alerts.length > 0) {
        // Get the first table, and print it
        console.log("Table: " + JSON.stringify(alerts[0]));
        return(alerts[0]);
    }
    // There is no alert row for this guild
    else {
        // Create a row in 'alerts' for the guild
        await db.insert('alerts', ['server_id','entities','channels'], [GuildID, '', '']);
        console.log(`(Guild: ${GuildID})\t Inserted new row in table 'alerts' for guild.`);

        // Retrieve and return the updated row
        return(Get_Alerts(GuildID));
    }
}

/**
 * 
 * @param {String} UserID 
 * @param {String} GuildID
 * @returns A row of data for UserID, from 'users' table
 */
async function Get_Userdata(UserID, GuildID) {
    // Retrieve the user's guild data from the 'users' table
    let userdata = await db.get('users', '*', ['user_id', 'server_id'], [UserID, GuildID]);

    // Seriously, this shouldn't be possible
    if (userdata.length > 1) {
        console.warn(`(Guild: ${GuildID})\t Found multiple rows in table 'users' matching user: ${UserID} in guild.`);
        console.warn(`(Guild: ${GuildID})\t Only using first row.`);
    }

    // If there is a row, take the first one
    if (userdata.length > 0) {
        // Get the first table, and print it.
        console.log("Table: " + JSON.stringify(userdata[0]));
        return(userdata[0]);
    }
    // There is no data for this user, in this guild
    else {
        // Create a row for the user's data
        await db.insert('users', ['user_id', 'server_id', 'join_count'], [UserID, GuildID, '0']);
        console.log(`(Guild: ${GuildID})\t Created row in table 'users' for user: ${UserID} in guild.`);
        
        // Retrieve and return the updated row
        return(Get_Userdata(UserID, GuildID));
    }
}

/**
 * Attempt to get all log channels from the guild
 * @param {Guild} guild 
 * @param {String[]} log_channel_ids
 * @returns Guild channels that match the channel IDs
 */
async function Get_Log_Channels(guild, log_channel_ids) {
    // There are no channel IDs left
    if (log_channel_ids.length == 0) {
        // Return an empty array
        return([]);
    }

    // Store the log_channel ID
    let channel_id = log_channel_ids.shift();

    // Try to retrieve the log channel from the guild
    let log_channel = await guild.channels.fetch(channel_id)
        // Catch errors if Watchlist log_channel was never configured
        .catch((e) => {
            // Log the channel retrieval failure
            console.log(`(Guild: ${guild.id})\t The log channel could not be retrieved!`);
            // Log whether the Watchlist log_channel_id is invalid
            if (channel_id != '') console.log(`(Guild: ${guild.id})\t The configured Watchlist log_channel_id seems to be invalid!`);
        });

    // There are more log channels to retrieve
    if (log_channel_ids.length > 1) {
        // Return a list of log channels, recursively
        return([log_channel, ...Get_Log_Channels(guild, log_channel_ids)])
    }

    // Return the last log channel
    return([log_channel]);
}

/**
 * Announce bot changes in the server
 * @param {CommandInteraction} interaction
 * @param {String} update_msg Inform user of changes
 * @param {String} log_msg Status message to log
 * @returns Nothing
 */
async function Announce_Changes(interaction, update_msg, log_msg) {
    // Retrieve the guild's Watchlist-Alert data
    let alerts = await Get_Alerts(interaction.guild.id);

    // Store the log channel IDs in an array
    let log_channel_ids = alerts.channels.split("|").filter(item => item !== '');

    // Get the Watchlist-Alert channels from the guild
    let log_channels = await Get_Log_Channels(interaction.guild, log_channel_ids);

    // The Watchlist has no log channels set
    if (log_channels.length == 0) {        
        // Inform the user of completion, privately
        interaction.reply({ content: `${update_msg}\n**NOTE:** No Watchlist log channels are configured!`, ephemeral: true });
        return;
    }

    // Send the updated message to all log channels
    for (channel of log_channels) {
        // The log_channel doesn't exist
        if (!channel) {
            // A reply has yet to be sent
            if (!interaction.replied) {
                // Inform the user of completion, privately
                await interaction.reply({ content: `${update_msg}\nError: The configured Watchlist log channel (ID: ${channel.id}) doesn't seem to exist.`, ephemeral: true });
            }
            else {
                // Inform the user of completion, privately
                await interaction.followUp({ content: `Error: The configured Watchlist log channel (ID: ${channel.id}) doesn't seem to exist.`, ephemeral: true });
            }

            // Skip to the next channel in the list
            continue;
        }

        // The interaction channel is the same as the looped channel
        if (interaction.channel.id == channel.id) {
            // Reply to the message in the originating Watchlist-Alert channel
            await interaction.reply({ content: `${update_msg}` });

            // Skip updating this channel
            continue;
        }

        // Send the update message to the Watchlist log channel
        await channel.send({ content: `${update_msg}` });
    }

    
    // A reply has yet to be sent
    if (!interaction.replied) {
        // Reply to conclude the interaction
        // Keep the reply private because it is not necessarily a private channel.
        await interaction.reply({ content: "Done!", ephemeral: true });
    }

    // Log the changes
    console.log(`(Guild: ${interaction.guild.id})\t ${log_msg}`);
}

module.exports = {
    Announce_Changes,
    Build_Table,
    Get_Alerts,
    Get_Log_Channels,
    Get_Userdata,
    Get_Watchlist,
    Reset_Guild_Data
}