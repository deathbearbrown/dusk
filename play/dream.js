window.dream = (function() {

  var directions = ["north", "east", "south", "west", "enter", "leave"];
  
  var game = {
  
    story: null,
    room: null,
    items: [],
    myState: {},
    acceptingInput: true,
    lastCommand: null,
    
    respond: function(text) {
      var $response = $("#response");
      $response.empty();
      $response.append(text);
    },
    
    _drawItems: function() {
      var $items = $("#items");
      $items.empty();
      _.each(game.items, function(item) {
        $items.append("<div class='item'>" + item.name +
              "<br>" + item.description + "</div>");
      });
    },
    
    givePlayerItem: function(item) {
      this.items.push(item);
      this._drawItems();
    },
  
    removeItem: function(item) {
      if (typeof item === "string") {
        item = _.chain(game.items).filter(function(it) {
          return it.name === item;
        }).first().value();
      }
      this.items = _.without(game.items, item);
      this._drawItems();
    },
    
    addItemInRoom: function(item) {
      this.room.item = item;
    },
    
    playerHasItem: function(name) {
      return _.chain(this.items).pluck("name").contains(name).value();
    },
    
    state: function(key, value) {
      if (value !== undefined) {
        this.myState[key] = value;
      }
      return this.myState[key];
    },
    
    goto: function(room) {
      game.room = game.story[room];
      game.loop();
    },
    
    describeRoom: function(text) {
      var $text = $("#text");
      $text.append(text);
      $text.append("<br>");
    },

    talk: function(message) {
      if (typeof message === "string") {
        game.respond(game.room.npc.name + ' says "' + message + '"');
      }
      else {
        message.call(game, game);
      }
    },
    
    loop: function() {
    
      // render current room
      $("#text").empty();
      game.describeRoom("<div class='roomName'>" + game.room.name +
                        "</div>");
      game.describeRoom("<div class='roomDescription'>" + game.room.description + "</div>");
      
      // show exits
      var exitsStr = "";
      _.each(directions, function(dir) {
        if (game.room[dir]) {
          if (exitsStr.length !== 0) {
            exitsStr += ", ";
          }
          if (dir === "enter") {
            exitsStr += "ENTER (EN)";
          }
          else if (dir === "leave") {
            exitsStr += "LEAVE (LE)";
          }
          else {
            exitsStr += dir.toUpperCase() +
                        " (" + dir.substr(0, 1).toUpperCase() + ")";
          }
        }
      });
      if (exitsStr.length === 0) {
        game.describeRoom("No obvious exits");
      }
      else {
        game.describeRoom("Exits: " + exitsStr);
      }
      
      // show npcs
      if (game.room.npc) {
        game.describeRoom("<span class=\"inRoom\">You could TALK to " + game.room.npc.name + ".</span>");
      }
      
      // show items
      if (game.room.item) {
        game.describeRoom("<span class=\"inRoom\">You could GET " + game.room.item.name + ".</span>");
      }
      
      // show hints
      if (game.room.hint) {
        game.describeRoom(game.room.hint);
      }
          
    }
    
  };

  $("html").keydown(function(e) {

    // clear on escape or down
    if (e.keyCode === 27 ||
        e.keyCode === 40) {
      $("#inputValue").val("");
    }

    // repeat command on up
    if (e.keyCode === 38) {
      $("#inputValue").val(game.lastCommand);
    }

  });
  
  $("#input").submit(function(e) {
    e.preventDefault();
    
    var command;
    var target;
    var response;
    
    var itemCommands = _.chain(game.items)
                        .pluck("command")
                        .value();
    
    if (game.acceptingInput) {
      game.acceptingInput = false;
      command = $("#inputValue").val().toLowerCase();
      
      // no spaces
      if (command.match(/\s/)) {
        game.respond("All commands are one word long. Don't type multiple words.");
      }
      
      // movement
      else if (command === "n" || command === "north" ||
          command === "e" || command === "east" ||
          command === "s" || command === "south" ||
          command === "w" || command === "west" ||
          command === "en" || command === "enter" ||
          command === "le" || command === "leave") {
        if (command === "n") command = "north";
        if (command === "e") command = "east";
        if (command === "s") command = "south";
        if (command === "w") command = "west";
        if (command === "en") command = "enter";
        if (command === "le") command = "leave";
        if (game.room[command]) {
          game.room = game.story[game.room[command]];
          if (command === "enter") {
            response = "You head inside";
          }
          else if (command === "leave") {
            response = "You leave";
          }
          else {
            response = "You head " + command;
          }
          game.loop();
          response += " and arrive at " + game.room.name;
          game.respond(response);
        }
        else {
          game.respond("You can't go that way.");
        }
      }
      
      // get
      else if (command === "get") {
        if (game.room.item && !game.room.item.heavy) {
          game.respond("You get " + game.room.item.name);
          game.givePlayerItem(game.room.item);
          delete game.room.item;
          game.loop();
        }
        else if (game.room.item) {
          game.respond(game.room.item.heavy);
        }
        else if (game.room.npc) {
          game.respond(game.room.npc.name + " wouldn't appreciate that.");
        }
        else {
          game.respond("Nothing to get here.");
        }
      }

      // item commands
      else if (_.contains(itemCommands, command)) {
        target = _.chain(game.items).filter(function(item) {
          return item.command === command;
        })
        .first().value();
        target.effect(game, target);
        game.loop();
      }
      
      // item in room
      else if (game.room.item && game.room.item.command === command) {
        game.room.item.effect(game, game.room.item);
        game.loop();
      }
      
      // talk
      else if (command === "talk") {
        if (game.room.npc && typeof game.room.npc.dialog === "string") {
          game.talk(game.room.npc.dialog);
        }
        if (game.room.npc && typeof game.room.npc.dialog === "object") {
          game.talk(game.room.npc.dialog.talk);
        }
        else {
          game.respond("No one to talk to here.");
        }
      }

      // npc topic
      else if (game.room.npc && game.room.npc.dialog[command]) {
        game.talk(game.room.npc.dialog[command]);
      }

      // room feature
      else if (game.room.features && game.room.features[command]) {
        game.respond(game.room.features[command]);
      }
      
      // caps
      else if (command === "caps") {
        game.respond("Very clever.");
      }

      // other invalid things people might try
      else if (command === "look" ||
               command === "inspect") {
        game.respond("You don't " + command + " in this game. \
                      You should only try typing commands you \
                      actually see on the screen somewhere.");
      }

      // the poor soul typed "help"
      else if (command === "help") {
        game.respond("All you need to know is that anything you see in all \
                      CAPS is something you should try typing.");
      }
      
      // Invalid command
      else {
        if (command) {
          game.respond("You can't " + command + ".");
        }
      }
      $("#inputValue").val("");
      game.acceptingInput = true;
      game.lastCommand = command;
    }
  });
  
  this.begin = function(storyJson) {
    game.story = storyJson;
    game.goto("start");
    game.loop();
  };
  
  return this;

})();