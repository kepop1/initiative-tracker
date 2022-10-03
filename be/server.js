const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const server = http.createServer(app);
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
/*
  DONE Get user ids and frontends connecting to some kind of store
  DONE Make the FE clear the tracker and display the players
  DONE Store by the player's name instead as player object
  DONE Make the one's who disconnect dissapear
  DONE Make it so it actually has rolls in the list - remove the uuid
  DONE - Make it room based for a group with owner and players
  DONE - Make it room based for a group with owner and players
  DONE Allow the people to leave a room
  Update rooms when someone disconnects
  Make it sort based on initiativeRoll
  Button to toggle the order / cycle through who's turn it is
  Should be able to change a room's password
  Owner should be able to add NPC's to initiative list
  Allow initiative roll to update for a new encounter
  Ability to clear all the users out of a room
*/

// SocketIO server has to be setup with an origin for CORS - see docs
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

// The new DB for now
let rooms = [];
console.log(rooms);
// Setup CORS for other endpoints if we end up using them
app.use(cors());

// Start listening for a connection to SocketIO
io.on("connection", (socket) => {
  console.log("a user connected");

  // Each connection has it's own socket id - it's own unique connection / interaction
  console.log(socket.id);

  // Create Room
  socket.on("create_room", async ({ uuid, ownerName, roomId, password }) => {
    try {
      console.log("room", { uuid, ownerName, roomId, password });

      const doesRoomExist = rooms.some((room) => room.roomId === roomId);
      console.log({ doesRoomExist });
      if (doesRoomExist) {
        io.to(socket.id).emit(`${socket.id}-error`, {
          message: "This room already exists!",
        });
      } else {
        // Auto generate the password hash using bcrypt
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newRoom = {
          roomId,
          password: passwordHash,
          owner: {
            uuid,
            ownerName,
            socketId: socket.id,
          },
          players: [],
        };

        rooms.push(newRoom);

        console.log({ rooms });

        io.to(socket.id).emit("room_update", newRoom);
      }
    } catch (error) {
      console.log(error);
    }
  });

  // Join Room
  socket.on(
    "join_room",
    async ({ uuid, characterName, initiativeRoll, roomId, password }) => {
      try {
        console.log("room id");

        const roomIndex = rooms.findIndex((room) => roomId === room.roomId);
        const room = rooms[roomIndex];

        if (roomIndex !== -1) {
          const validPassword = await bcrypt.compare(password, room.password);

          if (validPassword) {
            const newRoom = { ...room };

            newRoom.players.push({
              uuid,
              characterName,
              initiativeRoll,
              socketId: socket.id,
            });

            rooms.splice(roomIndex, 1, newRoom);

            io.to(newRoom.owner.socketId).emit("room_update", newRoom);

            // User is now part of this room for the update, doesn't need it's own specific update.
            newRoom.players.forEach((player) => {
              io.to(player.socketId).emit("room_update", newRoom);
            });
          }
        } else {
          io.to(socket.id).emit(`${socket.id}-error`, {
            message: "This room doesn't exist!",
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
  );

  // Leave Room
  socket.on("leave_room", async ({ roomId }) => {
    console.log("room id");

    const roomIndex = rooms.findIndex((room) => roomId === room.roomId);
    const room = rooms[roomIndex];

    // Does the room exist anymore?
    if (roomIndex !== -1) {
      // Current connection is the room owner
      if (room.owner.socketId === socket.id) {
        let newRoom = { ...room };
        const newOwner = newRoom.players[0];

        // If there's a player left
        if (newOwner) {
          newRoom.players.splice(0, 1);
          newRoom.owner = newOwner;
          newRoom.owner.ownerName = newOwner.characterName;

          rooms.splice(roomIndex, 1, newRoom);

          console.log({ newRoom });

          io.to(socket.id).emit("room_left");

          io.to(newRoom.owner.socketId).emit("room_update", newRoom);

          if (newRoom.players.length) {
            newRoom.players.forEach((player) => {
              io.to(player.socketId).emit("room_update", newRoom);
            });
          }
        } else {
          io.to(socket.id).emit("room_left");
        }
      } else {
        // Is the player in the room?
        const roomPlayerIndex = room.players.findIndex(
          (player) => player.socketId === socket.id
        );

        if (roomPlayerIndex !== -1) {
          const newRoom = { ...room };

          newRoom.players.splice(roomPlayerIndex, 1);

          rooms.splice(roomIndex, 1, newRoom);

          io.to(socket.id).emit("room_left");

          io.to(newRoom.owner.socketId).emit("room_update", newRoom);

          newRoom.players.forEach((player) => {
            io.to(player.socketId).emit("room_update", newRoom);
          });
        } else {
          io.to(socket.id).emit(`${socket.id}-error`, {
            message: "Something has gone wrong, you're not in a room?!",
          });
        }
      }
    } else {
      io.to(socket.id).emit(`${socket.id}-error`, {
        message: "Something has gone wrong, this room doesn't exist!",
      });
    }
  });

  // The client will automatically call the 'disconnect' event upon the `unload` event being triggered in a client
  socket.on("disconnect", (...something) => {
    // Remove the disconnected player, find via the socketId
    console.log("player disconnected");

    const newRooms = rooms.map((room) => {
      // Is the user in the room?
      const roomPlayerIndex = room.players.findIndex(
        (player) => player.socketId === socket.id
      );

      if (roomPlayerIndex !== -1) {
        const newRoom = { ...room };

        newRoom.players.splice(roomPlayerIndex, 1);

        return newRoom;
      }

      return room;
    });

    // EMIT ROOMS?
    // io.emit("players update", currentPlayers);
  });
});

io.listen(3001);

server.listen(3000, () => {
  console.log("listening on *:3000");
});
