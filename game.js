var _ = require('underscore');
var cards = require('./cards.js');

const MAX_PLAYERS = 4

var gameList = [];

function getDeck() {
  return cards.getDeck();
}

function removeFromArray(array, item) {
  var index = array.indexOf(item);
  if(index !== -1) {
    array.splice(index, 1);
  }
}

function list() {
  return toInfo(_.filter(gameList, function(x) {
    return x.players.length < MAX_PLAYERS && !x.isFull
  }));
}

function listAll() {
  return toInfo(gameList);
}

function toInfo(fullGameList) {
  return _.map(fullGameList, function(game) {
    return { id: game.id, name: game.name, players: game.players.length, maxPlayers: game.maxPlayers };
  });
}

function addGame(game) {
  game.players = [];
  game.maxPlayers = MAX_PLAYERS
  game.history = [];
  game.isOver = false;
  game.winnerId = null;
  game.winningCardId = null;
  game.isStarted = false;
  game.isFull = false;
  game.deck = getDeck();
  game.currentBlackCard = "";
  game.isReadyForScoring = false;
  game.isReadyForReview = false;
  game.pointsToWin = 5;
  gameList.push(game);
  return game;
}

function getGame(gameId) {
    return _.find(gameList, function(x) { return x.id === gameId; }) || undefined;
}

function joinGame(game, player) {
    var joiningPlayer = {
    id: player.id,
    name: player.name,
    isReady: false,
    cards : [],
    selectedWhiteCardId: null,
    awesomePoints: 0,
    isCzar: false
    };

    for(var i = 0; i < 7; i++) {
        drawWhiteCard(game, joiningPlayer);
    }

    game.players.push(joiningPlayer);

    if(game.players.length === MAX_PLAYERS) {
        if(!game.isStarted){
            startGame(game);
        } else {
            //someone may have dropped and rejoined. If it was the Czar, we need to re-elect the re-joining player
            var currentCzar = _.find(game.players, function(p) {
                return p.isCzar == true;
            });
            if(!currentCzar){
                game.players[game.players.length - 1].isCzar = true;
            }
        }
    }

    return game;
}

function departGame(gameId, playerId) {
    var game = getGame(gameId);
    if(game){
        console.info('depart game: ' + game.name);
        var departingPlayer = _.find(game.players, function(p){
            return p.id === playerId;
        });
        readyForNextRound(gameId, playerId)
        removeFromArray(game.players, departingPlayer);
        if(game.players.length === 0){
            //kill the game
            removeFromArray(gameList, game);
        }
        else {
        	//game.isStarted = false;
        	game.isFull = false;
        }
    }
}

function startGame(game) {
  game.isStarted = true;
  game.isFull = true;
  setCurrentBlackCard(game);
  game.players[0].isCzar = true;
}

function roundEnded(game) {
  game.winnerId = null;
  game.winningCardId = null;
  game.isReadyForScoring = false;
  game.isReadyForReview = false;

  setCurrentBlackCard(game);

  _.each(game.players, function(player) {
    if(!player.isCzar) {
      removeFromArray(player.cards, player.selectedWhiteCardId);
      drawWhiteCard(game, player);
    }

    player.isReady = false;
    player.selectedWhiteCardId = null;
  });
  
  for(playerId = 0; playerId < game.maxPlayers; playerId++) {
	console.info('In the for loop for player:' + playerId);
      if(game.players[playerId].isCzar === true) {
        console.info('Player is Czar:' + playerId);
        if(playerId === (game.maxPlayers - 1)) {
    	  console.info('IF');
          game.players[playerId].isCzar = false;
          game.players[0].isCzar = true;
          game.players[0].isReady = false;
        }
        else {
    	  console.info('ELSE');
          game.players[playerId].isCzar = false;
          game.players[playerId+1].isCzar = true;
          game.players[playerId+1].isReady = false;
        }
      }
      break;
  }
  
    if(game.isOver){
        _.map(game.players, function(p) {
            p.awesomePoints = 0;
        });
        game.isOver = false;
    }
}

function drawWhiteCard(game, player) {
  var whiteIndex = Math.floor(Math.random() * game.deck.white.length);
  player.cards.push(game.deck.white[whiteIndex]);
  game.deck.white.splice(whiteIndex, 1);
}

function setCurrentBlackCard(game) {
  var index = Math.floor(Math.random() * game.deck.black.length);
  game.currentBlackCard = game.deck.black[index];
  game.deck.black.splice(index, 1);
}

function getPlayer(gameId, playerId) {
  var game = getGame(gameId);
  return _.find(game.players, function(x) { return x.id === playerId; });
}

function getPlayerByCardId(gameId, cardId) {
  var game = getGame(gameId);
  return _.findWhere(game.players, { selectedWhiteCardId: cardId });
}

function readyForNextRound(gameId, playerId) {
  var player = getPlayer(gameId, playerId);
  player.isReady = true;

  var game = getGame(gameId);
  var allReady = _.every(game.players, function(x) {
    return x.isReady;
  });

  if(allReady) {
    roundEnded(game);
  }
}

function selectCard(gameId, playerId, whiteCardId) {
  var player = getPlayer(gameId, playerId);
  player.selectedWhiteCardId = whiteCardId;
  player.isReady = false;

  var game = getGame(gameId);

  var readyPlayers = _.filter(game.players, function (x) {
    return x.selectedWhiteCardId;
  });

  if(readyPlayers.length === 3) {
    game.isReadyForScoring = true;
  }
}

function selectWinner(gameId, cardId) {
  var player = getPlayerByCardId(gameId, cardId);
  var game = getGame(gameId);
  game.winningCardId = cardId;
  game.isReadyForReview = true;
  player.awesomePoints = player.awesomePoints + 1;
  game.history.push({ black: game.currentBlackCard, white: cardId, winner: player.name });
  if(player.awesomePoints === game.pointsToWin) {
    game = getGame(gameId);
    game.isOver = true;
    game.winnerId = player.id;
  }
}

function reset(){
  gameList = [];
}

exports.list = list;
exports.listAll = listAll;
exports.addGame = addGame;
exports.getGame = getGame;
exports.joinGame = joinGame;
exports.departGame = departGame;
exports.readyForNextRound = readyForNextRound;
exports.reset = reset;
exports.roundEnded = roundEnded;
exports.selectCard = selectCard;
exports.selectWinner = selectWinner;
exports.removeFromArray = removeFromArray;
exports.getDeck = getDeck;
