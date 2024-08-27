module.exports = {
    event: 'interactionCreate',
    async execute(interaction) {
		// Try and catch any extreme errors (i.e. DiscordAPIError)
        try {
			if (interaction.isCommand()) {
				console.log(`(Guild: ${interaction.guild.id})\t Command triggered: ${interaction.commandName}`);
				const command = interaction.client.commands.get(interaction.commandName);
	
				if (!command) { // Command was not found in the files
					console.error(`(Guild: ${interaction.guild.id})\t No command matching '${interaction.commandName}' was found.`);
					return;
				}
			
				try { // Execute the command
					await command.execute(interaction);
				} 
				catch (error) { // Something went wrong
					console.error(error);
					if (interaction.replied || interaction.deferred) {
						await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
					} else {
						 await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
					}
				}
			}
			else if (interaction.isAutocomplete()) {
				let commandName = interaction.commandName;
				const command = require(`./../commands/${commandName}.js`);
				command.autocomplete(interaction);
			}
		}
		catch (e) {
			console.error(`(Guild: ${interaction.guild})\t Unhandled Exception: `, e);
		}
    },
};