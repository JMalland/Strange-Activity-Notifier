const { GuildMember } = require('discord.js');
const { Database } = require('./Database.js');
const { Create_Embed } = require('./WatchlistEmbed.js');

// Create/connect to the Watchlist database
const db = new Database('./watchlist.db');

/**
 * Checks whether the user should be logged in the Watchlist.
 * @param {GuildMember} member 
 * @param {String} type
 * @returns 
 */
async function Check_Watchlist(member, type) {
    // Get the watchlist data
    let watchlist = await Get_Watchlist(member.guild.id);
    // Get the alerts data
    let alerts = await Get_Alerts(member.guild.id);
    // Get the user's data
    let userdata = await Get_Userdata(member.user.id, member.guild.id);

    // The member just joined the guild
    if (type == 'join') {
        // Increment the user's guild-join counter.
        db.update('users', ['user_id', 'server_id'], [member.user.id, member.guild.id], 'join_count', parseInt(userdata.join_count) + 1);
    }

    // Update the stored userdata
    userdata = await Get_Userdata(member.user.id, member.guild.id);

    // Save stored variables
    let time_limit = parseInt(watchlist.time_limit);
    let time_unit = watchlist.time_unit;

    // Save the display_order
    let display_order = watchlist.display_order.split("|");

    // The join frequency is being watched, and the user has exceeded the limit
    let exceeded_rejoin_limit = watchlist.join_frequency > 0 && userdata.join_count > watchlist.join_frequency;

    // Calculate the account creation time difference
    const accountCreatedTimestamp = member.user.createdAt.getTime();
    const currentTimestamp = Date.now();
    const timeDifference = currentTimestamp - accountCreatedTimestamp; // Difference in milliseconds

    // Convert milliseconds to various units
    const seconds = Math.floor(timeDifference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor((days % 365.25) / 30.44); // Average days in a month (30.44)
    const years = Math.floor(days / 365.25); // Using 365.25 to approximate leap years

    // Parse for the type of message to display
    switch(type) {
        case('join'):
            var message = '𝑱𝒐𝒊𝒏𝒆𝒅 𝑻𝒉𝒆 𝑺𝒆𝒓𝒗𝒆𝒓';
            var color = '#1b901b';
            break;
        case('exit'):
            var message = '𝑳𝒆𝒇𝒕 𝑻𝒉𝒆 𝑺𝒆𝒓𝒗𝒆𝒓';
            var color = '#921c1c';
            break;
        case('banned'):
            var message = '𝑩𝒂𝒏𝒏𝒆𝒅 𝑭𝒓𝒐𝒎 𝑺𝒆𝒓𝒗𝒆𝒓';
            var color = '#000000';
            break;
        //case('kicked'):
        //    var message = '𝑲𝒊𝒄𝒌𝒆𝒅 𝑭𝒓𝒐𝒎 𝑺𝒆𝒓𝒗𝒆𝒓';
        //    var color = '#925b1c';
        //    break;
    }

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
    
    // Record any suspicious members in the Watchlist-Alert channels
    for (log_channel in Get_Log_Channels(member.guild, alerts.channels.split("|"))) {
        // String value to add user/role mentions to
        let mentions = "";
        // Add the user/role mentions
        alerts.entities.split("|").forEach((entity) => { mentions += `<@${entity}> `; });
        // Trim the string
        //mentions = mentions.trim();

        // The user was banned from the server, or meets the Watchlist requirements
        if (type == 'banned' || exceeded_rejoin_limit || determinant_value < time_limit) {
            // Send the Embed in the Watchlist-Alerts log channel
            log_channel.send({ content: mentions, embeds: [Create_Embed(display_order, member.user, determinant_value, time_unit, userdata.join_count, message, color)] });
        }
    }
}

module.exports = {
    Check_Watchlist
}