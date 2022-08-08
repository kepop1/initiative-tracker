<script>
  import { v4 } from 'uuid'
  import { io } from 'socket.io-client'
  import { afterUpdate, onMount } from 'svelte'

  const uuid = v4()
  const socket = io('http://localhost:3000')

  let currentPlayers = []
  let playerName = ''
  let error = ''

  // Lifecycle events all that jazz
  onMount(() => {
    console.log('app has mounted')
  })

  afterUpdate(() => {
    console.log('after state update', { currentPlayers, playerName, error })
  })

  // Setup the event for if the player list updates.
  socket.on('players update', players => {
    console.log('fe players update', players)
    currentPlayers = players
  })

  // This console logs in the event of ANYTHING happening with the client
  // Useful for debugging
  // socket.onAny((event, ...args) => {
  //   console.log('random log', event, args)
  // })

  // Send an event to add a new user to the list of trackers
  const onButtonPress = () => {
    if (playerName) {
      error = ''
      socket.emit('id', { uuid, playerName })
    } else {
      error = 'you need a name'
    }
  }

  // Figure out if the user already exists in the player list
  // E.g. a refresh or a tab being re opened.
  $: currentPlayersSocketIds = currentPlayers.map(player => player.socketId)
  $: isUserInTracker = currentPlayersSocketIds.includes(socket.id)

  // Note here that we needed to do a $ in order to see this in the console logs to make it reactive
  $: console.log({ currentPlayersSocketIds, id: socket.id })
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

  {#if !isUserInTracker}
    <input type="text" bind:value={playerName} placeholder="player name" />

    <button on:click={onButtonPress}>Join Tracker</button>
  {/if}

  <!-- Could also destructure here `as { playernName, uuid }` -->
  {#each currentPlayers as player}
    <div class="player-container">
      <p class="player-name">{player.playerName}</p>
      <p>{player.uuid}</p>
    </div>
  {/each}
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
</style>
