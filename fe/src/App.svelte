<script>
  import { v4 as uuidv4 } from 'uuid'
  import { io } from 'socket.io-client'
  import { afterUpdate, onMount } from 'svelte'

  const uuid = uuidv4()
  const socket = io('http://localhost:3000')

  let socketId = null
  let ownerName = ''
  let roomId = ''
  let password = ''

  let characterName = ''
  let initiativeRoll = ''

  let error = ''
  let isSocketErrorSetup = false

  let currentRoom = null

  // Lifecycle events all that jazz
  onMount(() => {
    console.log('app has mounted')

    socket.on('connect', () => {
      console.log('after connection', socket.id)
      socketId = socket.id
    })
  })

  // Setup the event for if the player list updates.
  // socket.on('players update', players => {
  //   console.log('fe players update', players)
  //   currentPlayers = players
  // })

  $: if (socketId) {
    socket.on(`${socket.id}-error`, error => {
      console.error(error)
      error = error.message
    })

    socket.on('room_update', room => {
      console.log('room update', room)
      currentRoom = room
    })

    socket.on('room_left', () => {
      currentRoom = null
    })
  }

  // This console logs in the event of ANYTHING happening with the client
  // Useful for debugging
  // socket.onAny((event, ...args) => {
  //   console.log('random log', event, args)
  // })

  const createRoom = event => {
    event.preventDefault()

    if (!ownerName) error = 'No owner name'
    else if (!roomId) error = 'No room id'
    else if (!password) error = 'No room password'
    else {
      socket.emit('create_room', { uuid, ownerName, roomId, password })
      error = ''

      // ownerName = ''
      // roomId = ''
      // password = ''
    }
  }

  // Send an event to add a new user to the list of trackers
  const joinRoom = event => {
    event.preventDefault()
    if (!characterName) error = 'You need a name'
    else if (!initiativeRoll) error = 'You need an initiative'
    else if (!roomId) error = 'You need a room id'
    else if (!password) error = 'No room password'
    else {
      socket.emit('join_room', {
        uuid,
        characterName,
        initiativeRoll,
        roomId,
        password,
      })
      error = ''

      // ownerName = ''
      // roomId = ''
      // password = ''
    }
  }

  const leaveRoom = event => {
    event.preventDefault()
    socket.emit('leave_room', { roomId: currentRoom.roomId })
  }

  // Figure out if the user already exists in the player list
  // E.g. a refresh or a tab being re opened.
  // $: currentPlayersSocketIds = currentPlayers.map(player => player.socketId)
  // $: isUserInTracker = currentPlayersSocketIds.includes(socket.id)

  $: console.log('socket connection', socketId)
</script>

<!-- Keep this for a talking point - kind of interesting -->
<!-- <svelte:window on:beforeunload={beforeUnload} /> -->

<!-- Main here doesn't really mean anything it's just html, could be a div -->
<main>
  <h1>Initiative Tracker</h1>
  <h6>{uuid}</h6>

  {#if error}
    <h2 style="color: red">{error}</h2>
  {/if}

  {#if !currentRoom}
    <form class="form" on:submit={createRoom}>
      <input
        class="input"
        type="text"
        bind:value={ownerName}
        placeholder="Owner Name"
      />

      <input
        class="input"
        type="text"
        bind:value={roomId}
        placeholder="Room ID"
      />

      <input
        class="input"
        type="text"
        bind:value={password}
        placeholder="Password"
      />

      <input class="form-button" type="submit" value="Create room" />
    </form>

    <p>-----</p>

    <form class="form" on:submit={joinRoom}>
      <input
        class="input"
        type="text"
        bind:value={characterName}
        placeholder="Character name"
      />

      <input
        class="input"
        type="number"
        bind:value={initiativeRoll}
        placeholder="Initiative roll"
      />

      <input
        class="input"
        type="text"
        bind:value={roomId}
        placeholder="Room ID"
      />

      <input
        class="input"
        type="text"
        bind:value={password}
        placeholder="Password"
      />

      <input class="form-button" type="submit" value="Join tracker" />
    </form>
  {/if}

  {#if currentRoom}
    <h3>{currentRoom.roomId} - {currentRoom.owner.ownerName}'s room</h3>

    {#if !currentRoom.players.length} No players yet! {/if}

    {#each currentRoom.players as player}
      <div class="player-container">
        <p class="player-name">{player.characterName}</p>
        <p class="player-name">{player.initiativeRoll}</p>
        <p>{player.uuid}</p>
      </div>
    {/each}

    <button on:click={leaveRoom}>Leave room</button>
  {/if}
</main>

<style>
  .player-container {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
  }

  .player-name {
    font-size: 18;
    color: orange;
    font-weight: bold;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 25px;
    align-items: center;
  }

  .form-button {
    padding: 10px 15px;
    font-size: 12pt;
    border-radius: 5px;
  }

  .input {
    padding: 10px;
    border-radius: 5px;
    border-color: white;
    font-size: 12pt;
  }
</style>
