const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const server = http.createServer(app);

const { Server } = require("socket.io");

/*
  DONE Get user ids and frontends connecting to some kind of store
  DONE Make the FE clear the tracker and display the players
  DONE Store by the player's name instead as player object
  DONE Make the one's who disconnect dissapear
  Make it room based for a group
  Make it so a DM can select who has the order etc.
  Ability to clear all the users out
*/

// SocketIO server has to be setup with an origin for CORS - see docs
const io = new Server(server, {
  cors: {
    origin: "http://127.0.0.1:5173",
  },
});

// This is our 'db' for now
const currentPlayers = [];

// Setup CORS for other endpoints if we end up using them
app.use(cors());

// Start listening for a connection to SocketIO
io.on("connection", (socket) => {
  console.log("a user connected");

  // Each connection has it's own socket id - it's own unique connection / interaction
  console.log(socket.id);

  // Bad event name atm but it pushes a new player to the store
  socket.on("id", (player) => {
    // Assign the socketId so that we can use it to remove the player if they leave
    currentPlayers.push({ ...player, socketId: socket.id });

    // Tell connected clients to update the player list.
    io.emit("players update", currentPlayers);
  });

  // The client will automatically call the 'disconnect' event upon the `unload` event being triggered in a client
  socket.on("disconnect", (...something) => {
    // Remove the disconnected player, find via the socketId

    const playerIndex = currentPlayers.findIndex(
      (player) => player.socketId === socket.id
    );
    currentPlayers.splice(playerIndex, 1);

    // Update the player list.
    io.emit("players update", currentPlayers);
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
