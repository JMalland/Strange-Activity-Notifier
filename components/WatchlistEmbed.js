const { EmbedBuilder, User } = require('discord.js');
const { Database } = require('Database.js');

// Create the Watchlist Database
const db = new Database('./watchlist.db');

/**
 * Creates an Account_Age block
 * @param {Number} age 
 * @param {String} unit 
 * @returns JSON representation of an EmbedBuilder Field
 */
function Account_Age(age, unit) {
    return({
        name: `**__Account Age:__ \`${age} ${unit}\`**`,
        value: " ",
        inline: false
    })
}

/**
 * Creates an array of the User_Info blocks
 * @param {User} user 
 * @returns JSON representation of an EmbedBuilder Field
 */
function User_Info(user) {
    return([
        {
            name: "__Display Name__   ",
            value: `<@${user.displayName}>`,
            inline: true
        },
        {
            name: "__Username__   ",
            value: `\`${user.username}\``,
            inline: true
        },
        {
            name: "__User ID__",
            value: `\`${user.id}\``,
            inline: true
        }
    ])
}

/**
 * Creates a Join_Frequency block
 * @param {Number} join_count 
 * @returns JSON representation of an EmbedBuilder Field
 */
function Join_Frequency(join_count) {
    // Return the Join_Frequency block
    return({
        name: `**__Number of Joins:__ \`${join_count}\`**`,
        value: " ",
        inline: false
    })
}

/**
 * Creates an empty field block
 * @returns JSON representation of an EmbedBuilder Field
 */
function Empty_Block() {
    return({
        name: "** **",
        value: " ",
        inline: false,
    });
}

/**
 * Creates the field blocks for when the display starts with Account_Age
 * @param {User} user 
 * @param {Number} join_count 
 * @param {Array} display_order 
 * @returns An array of EmbedBuilder Fields
 */
function Starts_With_Account_Age(user, join_count, display_order) {
    // List to hold the five embed fields
    const Field_List = [];

    // Starts with an empty block
    Field_List.push(Empty_Block());

    // The display order puts User_Info in the middle
    if (display_order[1] == 'User_Info') {
        // Add User_Info to the middle
        Field_List.push(...User_Info(user));
        // Add a spacer block
        Field_List.push(Empty_Block());
        // Add Join_Frequency to the end
        Field_List.push(Join_Frequency(join_count));
    }
    // The display order puts Join_Frequency in the middle
    else {
        // Add Join_Frequency to the middle
        Field_List.push(Join_Frequency(join_count));
        // Add a spacer block
        Field_List.push(Empty_Block());
        // Add User_Info to the end
        Field_List.push(...User_Info(user));
    }

    // Return the field list
    return(Field_List);
}

/**
 * Creates the field blocks for when the display starts with User_Info
 * @param {User} user 
 * @param {Number} age 
 * @param {String} unit 
 * @param {Number} join_count 
 * @param {Array} display_order 
 * @returns An array of EmbedBuilder Fields
 */
function Starts_With_User_Info(user, age, unit, join_count, display_order) {
    // List to hold the five embed fields
    const Field_List = [];

    // Starts with an empty block
    Field_List.push(Empty_Block());

    // Add User_Info to the start
    Field_List.push(...User_Info(user));

    // Add a spacer block
    Field_List.push(Empty_Block());

    // The display order puts Account_Age in the middle
    if (display_order[1] == 'Account_Age') {
        // Add Account_Age to the middle
        Field_List.push(Account_Age(age, unit));
        // Add Join_Frequency to the end
        Field_List.push(Join_Frequency(join_count));
    }
    // The display order puts Join_Frequency in the middle
    else {
        // Add Join_Frequency to the middle
        Field_List.push(Join_Frequency(join_count));
        // Add Account_Age to the end
        Field_List.push(Account_Age(age, unit));
    }


    // Return the field list
    return(Field_List);
}

function Get_Action_Icon(type) {
    switch(type) {
        case ('𝑱𝒐𝒊𝒏𝒆𝒅 𝑻𝒉𝒆 𝑺𝒆𝒓𝒗𝒆𝒓'):
            return(':inbox_tray:');
        case ('𝑳𝒆𝒇𝒕 𝑻𝒉𝒆 𝑺𝒆𝒓𝒗𝒆𝒓'):
            return(':outbox_tray:');
        case ('𝑩𝒂𝒏𝒏𝒆𝒅 𝑭𝒓𝒐𝒎 𝑺𝒆𝒓𝒗𝒆𝒓'):
            return(':skull_crossbones:');
    }
}

/**
 * Creates the field blocks for when the display starts with Join_Frequency
 * @param {User} user 
 * @param {Number} age 
 * @param {String} unit 
 * @param {Array} display_order 
 * @returns An array of EmbedBuilder Fields
 */
function Starts_With_Join_Frequency(user, age, unit, display_order) {
    // List to hold the five embed fields
    const Field_List = [];

    // Starts with an empty block
    Field_List.push(Empty_Block());

    // The display order puts Account_Age in the middle
    if (display_order[1] == 'Account_Age') {
        // Add Account_Age to the middle
        Field_List.push(Account_Age(age, unit));
        // Add a spacer block
        Field_List.push(Empty_Block());
        // Add User_Info to the end
        Field_List.push(...User_Info(user));
    }
    // The display order puts User_Info in the middle
    else {
        // Add User_Info to the middle
        Field_List.push(...User_Info(user));
        // Add a spacer block
        Field_List.push(Empty_Block());
        // Add Account_Age to the end
        Field_List.push(Account_Age(age, unit));
    }

    // Return the field list
    return(Field_List);
}

/**
 * Creates the Watchlist embed beginning with Account_Age or Join_Frequency.
 * @param {*} user 
 * @param {Number} age 
 * @param {String} unit 
 * @param {Number} join_count
 * @param {String} action 
 * @param {Array} display_order 
 * @returns EmbedBuilder
 */
function Embed_With_Title(user, age, unit, join_count, action, display_order) {
    // The report displays the Account_Age first
    if (display_order[0] == 'Account_Age') {
        var title = 'Account Age'; 
        var value = `${age} ${unit}`

        // Create the field blocks for the report
        var fields = Starts_With_Account_Age(user, join_count, display_order);
    }
    // The report displays the Join_Frequency first
    else {
        var title = 'Number of Joins';
        var value = join_count;

        // Create the field blocks for the report
        var fields = Starts_With_Join_Frequency(user, age, unit, display_order);
    }

    let embed = new EmbedBuilder()
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL(),
        })
        .setTitle(`${Get_Action_Icon(action)}  \`${action}\`\n\n__${title}:__  \`${value}\`\n`)
        .addFields(...fields)
        .setThumbnail(user.displayAvatarURL())
        .setFooter({
            text: "Watchlist Report",
        })
        .setTimestamp();

    // Return the built Embed
    return(embed);
}

/**
 * Creates the Watchlist embed beginning with User_Info.
 * @param {*} user 
 * @param {Number} age 
 * @param {String} unit 
 * @param {Number} join_count
 * @param {String} action 
 * @param {Array} display_order 
 * @returns EmbedBuilder
 */
function Embed_With_No_Title(user, age, unit, join_count, action, display_order) {
    // Create the field blocks for the report
    var fields = Starts_With_User_Info(user, age, unit, join_count, display_order);

    let embed = new EmbedBuilder()
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL(),
        })
        .setTitle(`${Get_Action_Icon(action)}  \`${action}\``)
        .addFields(...fields)
        .setThumbnail(user.displayAvatarURL())
        .setFooter({
            text: "Watchlist Report",
        })
        .setTimestamp();

    // Return the built Embed
    return (embed);
}

/**
 * Returns the Watchlist embed. Accounts for display type and user data
 * @param {Number} display_order
 * @param {*} user
 * @param {Number} age
 * @param {String} unit
 * @param {Number} join_count
 * @param {String} action
 * @param {String} color
 * @returns A Watchlist report Embed 
 */
function Create_Embed(display_order, user, age, unit, join_count, action, color) {
    // The user's account age is a non-plural value
    if (age == 1) {
        // Remove the 's' from the unit of time
        unit = unit.slice(0, -1);
    }

    // Make the unit proper case
    unit = unit[0].toUpperCase() + unit.slice(1);

    // Watchlist report begins with User_Info
    if (display_order[0] == 'User_Info') {
        // Return the embed
        return(Embed_With_No_Title(user, age, unit, join_count, action, display_order).setColor(color));
    }
    // Watchlist report begins with Account_Age or Join_Frequency
    else {
        // Return the embed
        return(Embed_With_Title(user, age, unit, join_count, action, display_order).setColor(color));
    }
}

function Filter_Report_Type(type) {
    let message, color = "";
    switch(type) {
        case('join'):
            message = '𝑱𝒐𝒊𝒏𝒆𝒅 𝑻𝒉𝒆 𝑺𝒆𝒓𝒗𝒆𝒓';
            color = '#1b901b';
            break;
        case('exit'):
            message = '𝑳𝒆𝒇𝒕 𝑻𝒉𝒆 𝑺𝒆𝒓𝒗𝒆𝒓';
            color = '#921c1c';
            break;
        case('banned'):
            message = '𝑩𝒂𝒏𝒏𝒆𝒅 𝑭𝒓𝒐𝒎 𝑺𝒆𝒓𝒗𝒆𝒓';
            color = '#000000';
            break;
    }

    if (message === "" || color === "") {
        throw new Error("InvalidReportType: Message='" + message + "', Color='" + color +"'");
    }

    // Return the message and color.
    return({
        "message": message,
        "color": color
    });
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

module.exports = {
    Check_Watchlist,
}
