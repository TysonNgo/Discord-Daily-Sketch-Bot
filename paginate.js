module.exports = function(msg, list){
	const charLimit = 2000;
	let pageContents = [''];
	for (let i = 0; i < list.length; i++){
		let j = pageContents.length-1;
		let newStr = pageContents[j] ? pageContents[j] + '\n' + list[i] : list[i];
		if (newStr.length > charLimit){
			pageContents.push(list[i]);
		} else {
			pageContents[j] = newStr;
		}
	}
	let i = 0;
	let m = msg.channel.send(pageContents[0]);
	if (pageContents.length > 1){
		m.then(msg => {
			msg.react('⬅')
				.then(r => r.message.react('➡'))
				.then(() => {
					msg.awaitReactions((reaction, user) => {
						if (user.id === msg.author.id) return;
						if (reaction.emoji.name === '⬅' && i > 0){
							i--;
						} else if (reaction.emoji.name === '➡' && i < pageContents.length-1){
							i++;
						}
						msg.edit(pageContents[i])
							.then(() => {
								msg.reactions.forEach(r => {
									r.users.forEach(u => {
										if (u.id !== msg.author.id){
											r.remove(u);
										}
									})
								})
							})
					}, {time: 60000})
				});
		})	
	}
}
