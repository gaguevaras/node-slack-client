// This is a simple example of how to use the slack-client module. It creates a
// bot that responds to all messages in all channels it is in with a reversed
// string of the text received.
//
// To run, copy your token below, then:
//	npm install
// 	cd examples
// 	node simple.js

var Slack = require('..');

var token = 'xoxb-3463721915-mXLDStOphmDcva9aBNBuYCcT', // Add a bot at https://my.slack.com/services/new/bot and copy the token here.
    autoReconnect = true,
    autoMark = true;

var slack = new Slack(token, autoReconnect, autoMark);

var fs = require("fs");

var story = new Array();
var players = new Array();
var playersMap = {};

var turnModes = ["random", "roundRobin"];
var turnMode = 0;
var lastTurn = 0;

if (fs.existsSync("story.json")) {
	fs.readFile("story.json", "utf8", function (err, data) {
	  if (err) throw err;
	  story = JSON.parse(data);
	});
}

slack.on('open', function() {

	var channels = ["#test-bot"],
	    groups = [],
	    unreads = slack.getUnreadCount(),
	    key;

	for (key in slack.channels) {
		if (slack.channels[key].is_member) {
			channels.push('#' + slack.channels[key].name);
			console.log('pushing: #' + slack.channels[key].name);
		}
	}

	for (key in slack.groups) {
		if (slack.groups[key].is_open && !slack.groups[key].is_archived) {
			groups.push(slack.groups[key].name);
		}
	}

	console.log('Welcome to Slack. You are @%s of %s', slack.self.name, slack.team.name);
	console.log('You are in: %s', channels.join(', '));
	console.log('As well as: %s', groups.join(', '));
	console.log('You have %s unread ' + (unreads === 1 ? 'message' : 'messages'), unreads);
});

slack.on('message', function(message) {

	var type = message.type,
	    channel = slack.getChannelGroupOrDMByID(message.channel),
	    user = slack.getUserByID(message.user),
	    time = message.ts,
	    text = message.text,
	    response = '';

	console.log('Received: %s %s @%s %s "%s"', type, (channel.is_channel ? '#' : '') + channel.name, user.name, time, text);

	if (type === 'message') {
		if (!text)
			return; 
		if (text.indexOf("story:") == 0){
			var storyText = text.substring("story:".length);
			addStoryPart(user, storyText);
		} else if (text.indexOf("correct:") == 0){
			var storyText = text.substring("correct:".length);
			correctStoryPart(user, storyText);
		} else if (text.indexOf("bot") == 0){
			if (text.indexOf("introduce yourself") > -1){
				introduce(user);
			} else if (text.indexOf("help") > -1){
				help(user);
			} else if (text.indexOf("joke") > -1){
				joke();
			} else	if (text.indexOf("Who is your creator?") > -1){
				creator();
			} else if (text.indexOf("latest") > -1){
				latest(user);
			} else if (text.indexOf("story so far") > -1){
				fullStory(user);
			} else if (text.indexOf("share the story") > -1){
				fullStory(false);
			} else if (text.indexOf("next turn") > -1){
				nextTurn();
			} else if (text.indexOf("turn mode") > -1){
				changeTurnMode();
			} else if (text.indexOf("dice") > -1 || text.indexOf("throw") > -1){
				dice(user, text);
			}
			else {
				wtf(user);
			}	
		}

	}

	function dice(from, text){
		var dieNotation = /(\d+)?d(\d+)([+-]\d+)?$/.exec(text);
	    if (!dieNotation) {
	        share("What's wrong with you, "+ from+ "? This is crap: " + text);
	    }

	    var amount = (typeof dieNotation[1] == 'undefined') ? 1 : parseInt(dieNotation[1]);
	    var faces = parseInt(dieNotation[2]);
	    var mods = (typeof dieNotation[3] == 'undefined') ? 0 : parseInt(dieNotation[3]);
		
		var diceArray = [];
		var sum = 0;
		for(var i = 0; i < amount; i++) {
			var die = Math.floor(Math.random() * faces) + 1;
			diceArray.push(die);
			sum += die;
		}
		share("Throw = ["+diceArray+"], Avg = "+sum/amount+" Total+mods = "+(sum+mods));
	}

	function introduce(){
		share("I am the slashbot, I can tell you the [story so far], or the [latest] part. If you want to add something to the story, be sure to start your message with [story:] without the brackets. Have fun!");
	}

	function nextTurn(){
		var playerIndex = 0;
		if(turnModes[turnMode] == 'roundRobin'){
			playerIndex = lastTurn;
			lastTurn++;

			share(turnModes[turnMode]+": I suggest @"+players[playerIndex]+" goes next." + playerIndex);
			if (lastTurn >= players.length) {
				lastTurn = 0;
				share("Round complete.");
			}
		} else if (turnModes[turnMode] == 'random'){
			playerIndex = Math.floor(Math.random() * players.length);
			share(turnModes[turnMode]+": I suggest @"+players[playerIndex]+" goes next.");
		}
		
	}

	function changeTurnMode(){
		turnMode++;
		if(turnMode==turnModes.length)
			turnMode = 0;
		share("New turn mode: " + turnModes[turnMode] + ".");
	}

	function joke(){
		share("This is no time for jokes, my friend.");
	}

	function creator(){
		share("Slash did, @slashie_ on twitter.");
	}

	function latest(who){
		if (story.length == 0){
			say(who, "There's no story yet.");
			return;
		}
		var storypart = story[story.length-1];
		say(who, "Latest part of the story was from @"+storypart.author+", he added: \""+storypart.paragraph+"\"");
	}

	function fullStory(who){
		if (story.length == 0){
			if (!who){
				share("There's no story yet.");
			} else {
				say(who, "There's no story yet.");
			}
			return;
		}
		if (!who){
			share("This is the story so far:");
		}
		for (var i = 0; i < story.length; i++){
			var storypart = story[i];
			if (!who){
				share('['+storypart.author+'] '+storypart.paragraph);
			} else {
				share('['+storypart.author+'] '+storypart.paragraph);
			}
		}
	}

	function wtf(who){
		share("Perhaps you need to rephrase... Or add behavior at: https://github.com/slashman/slashbot");
	}

	function addStoryPart(from, storyText){
		var storypart = {
			author: from.name,
			paragraph: storyText
		};
		story.push(storypart);	
		saveStory();	
		say(from.name, "Added.");
	}

	function saveStory(){
		var cache = [];
		var serializedStory = JSON.stringify(story);
		//cache = null; // Enable garbage collection
		// console.log(serializedStory);
		console.log(serializedStory);
		fs.writeFile('story.json', serializedStory, function (err) {
	        if (err) throw err;
	        console.log('It seems as if the file was saved, we shall see.');
	    });
		// fs.writeFile('story.json', serializedStory, function (err) {
	 //        if (err) throw err;
	 //        console.log('It seems as if the file was saved, we shall see.');
	 //    });
	}

	function correctStoryPart(from, storyText){
		if (story.length == 0){
			say(from, "There's no story yet.");
			return;
		}
		var storypart = story[story.length-1];
		if (storypart.author === from){
			storypart = {
				author: from,
				paragraph: storyText
			};
			story[story.length-1] = storypart;
			saveStory();
			say(from, "Corrected.");
		} else {
			say(from, "Sorry, only "+storypart.author+" can correct his fragment.");
		}
	}

	function help(who){
		say(who, "[story:] Adds a new fragment to the story");
		say(who, "[correct:] Corrects the last fragment of the story");
		say(who, "[latest] Gets the latest fragment");
		say(who, "[story so far] Gets the complete story.");
		say(who, "[next turn] Suggest who should do the next turn.");
		say(who, "[share the story] Shows the full store for everyone.");	
	}

	function say(who, text){
		channel.send(text);
		console.log('@%s responded with "%s"', slack.self.name, text);

	}

	function share(text){
		channel.send(text);
	}
});



slack.on('error', function(error) {

	console.error('Error: %s', error);
});

slack.login();
