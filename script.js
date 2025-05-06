// In script.js (highly simplified)

// --- DOM Elements ---
const multiplierDisplay = document.getElementById('multiplier-display');
const placeBetButton = document.getElementById('placeBetButton');
const cashOutButton = document.getElementById('cashOutButton');
const betAmountInput = document.getElementById('betAmount');
const balanceDisplay = document.getElementById('balance');
const roundStatusDisplay = document.getElementById('round-status');
const roundHistoryList = document.getElementById('round-history-list');
const autoCashOutInput = document.getElementById('autoCashOutMultiplier');
const userHistoryList = document.getElementById('user-bet-history-list');
const simulatedPlayersList = document.getElementById('live-bets-list');

// --- Sounds ---
const takeOffSound = document.getElementById('takeOffSound');
const crashSound = document.getElementById('crashSound');
const cashOutSound = document.getElementById('cashOutSound');
const clickSound = document.getElementById('clickSound');

// --- Game State Variables ---
let balance = 10000;
let currentBet = 0;
let currentMultiplier = 1.00;
let targetCrashPoint = 0;
let gameState = 'idle'; // idle, betting, inProgress, crashed
let gameInterval = null;
let hasCashedOutThisRound = false;
let autoCashOutValue = 0;
const roundHistory = [];
const userBetHistory = [];

// --- Game Constants ---
const MULTIPLIER_INCREMENT_SPEED = 50; // ms per 0.01x increment
const PRE_BET_TIME = 5000; // 5 seconds for betting
const POST_CRASH_TIME = 3000; // 3 seconds to show crash result

// --- Initialization ---
function init() {
    updateBalanceDisplay();
    roundStatusDisplay.textContent = 'Place your bet for the next round!';
    placeBetButton.disabled = false;
    cashOutButton.disabled = true;
    betAmountInput.disabled = false;
    // TODO: Load sound preferences, etc.
}

// --- UI Updates ---
function updateBalanceDisplay() {
    balanceDisplay.textContent = `Balance: ${balance.toFixed(2)} Demo Coins`;
}

function updateMultiplierDisplay() {
    multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`;
}

function addToRoundHistory(crashPoint) {
    roundHistory.unshift(crashPoint.toFixed(2) + 'x');
    if (roundHistory.length > 10) roundHistory.pop();
    renderRoundHistory();
}

function renderRoundHistory() {
    roundHistoryList.innerHTML = '';
    roundHistory.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        // Color code based on value
        const val = parseFloat(item);
        if (val < 1.5) li.style.color = 'red';
        else if (val < 3) li.style.color = 'orange';
        else li.style.color = 'green';
        roundHistoryList.appendChild(li);
    });
}

function addUserBetHistory(log) {
    userBetHistory.unshift(log);
    if (userBetHistory.length > 10) userBetHistory.pop();
    renderUserBetHistory();
}

function renderUserBetHistory() {
    userBetHistoryList.innerHTML = '';
    userBetHistory.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        userBetHistoryList.appendChild(li);
    });
}


// --- Core Game Logic ---
function generateCrashPointFair() {
    // More sophisticated distribution needed for "fair feel"
    // This is a placeholder - Spribe's is proprietary and well-tuned.
    // For demo, it's about creating varied outcomes.
    // 1% chance of instant bust
    if (Math.random() < 0.01) return 1.00;

    // Skew towards lower multipliers, but allow high ones
    // (x^2 makes lower numbers more probable in 0-1 range)
    let u = Math.random();
    let R = 1 / (1 - u); // Inverse transform sampling for exponential like curve

    // Cap and floor
    let multiplier = Math.max(1.01, Math.min(R, 200)); // Cap at 200x for demo
    return parseFloat(multiplier.toFixed(2));
}

function startBettingPhase() {
    gameState = 'betting';
    roundStatusDisplay.textContent = `Betting open... Round starts in ${PRE_BET_TIME / 1000}s`;
    placeBetButton.disabled = false;
    betAmountInput.disabled = false;
    cashOutButton.disabled = true;
    currentMultiplier = 1.00;
    updateMultiplierDisplay();
    // TODO: Add a visual timer

    setTimeout(() => {
        if (gameState === 'betting') { // Ensure bet was placed
            startRound();
        }
    }, PRE_BET_TIME);
}

placeBetButton.addEventListener('click', () => {
    const betVal = parseFloat(betAmountInput.value);
    if (betVal > 0 && betVal <= balance) {
        clickSound.play();
        currentBet = betVal;
        balance -= currentBet;
        updateBalanceDisplay();
        placeBetButton.disabled = true;
        betAmountInput.disabled = true;
        roundStatusDisplay.textContent = 'Bet placed! Waiting for round to start...';
        // If round is not yet starting (e.g. waiting for timer), it will start.
        // If betting phase is active and timer running, this is fine.
    } else {
        alert('Invalid bet amount or insufficient balance.');
    }
});

function startRound() {
    if (currentBet <= 0 && gameState !== 'inProgress') { // Check if currentBet is reset or if user did not bet
        roundStatusDisplay.textContent = 'No bet placed. Waiting for next round.';
        setTimeout(startBettingPhase, POST_CRASH_TIME); // Restart betting for next round
        return;
    }

    gameState = 'inProgress';
    targetCrashPoint = generateCrashPointFair();
    currentMultiplier = 1.00;
    hasCashedOutThisRound = false;
    autoCashOutValue = parseFloat(autoCashOutInput.value) || 0;

    updateMultiplierDisplay();
    cashOutButton.disabled = false;
    roundStatusDisplay.textContent = 'Taking off!';
    takeOffSound.play();
    // TODO: Start plane animation

    simulateOtherPlayersBet();

    gameInterval = setInterval(() => {
        currentMultiplier += 0.01;
        // Simulate tiny random fluctuations in increment for visual appeal if desired
        // currentMultiplier += (0.01 + Math.random() * 0.005);
        currentMultiplier = parseFloat(currentMultiplier.toFixed(2));
        updateMultiplierDisplay();
        // TODO: Update plane animation based on multiplier

        // Auto Cash Out Check
        if (!hasCashedOutThisRound && autoCashOutValue > 0 && currentMultiplier >= autoCashOutValue) {
            cashOut();
        }

        if (currentMultiplier >= targetCrashPoint) {
            handleCrash();
        }
    }, MULTIPLIER_INCREMENT_SPEED);
}

cashOutButton.addEventListener('click', () => {
    if (gameState === 'inProgress' && !hasCashedOutThisRound) {
        cashOut();
    }
});

function cashOut() {
    hasCashedOutThisRound = true;
    clearInterval(gameInterval);
    const winnings = currentBet * currentMultiplier;
    balance += winnings;
    updateBalanceDisplay();
    cashOutSound.play();
    roundStatusDisplay.textContent = `Cashed out at ${currentMultiplier.toFixed(2)}x! Won ${winnings.toFixed(2)}`;
    cashOutButton.disabled = true;
    addUserBetHistory(`Cashed out at ${currentMultiplier.toFixed(2)}x. Bet: ${currentBet.toFixed(2)}, Won: ${winnings.toFixed(2)}`);

    // If cashed out manually, but game continues for others (and for history)
    // We need a mechanism to let the round complete visually until actual crash point
    // For simplicity here, we just end user's active participation.
    // To show the plane continue flying until actual crash:
    // We would need to not clear gameInterval here if cashed out before targetCrashPoint
    // and only disable the button. The handleCrash would then show the final crash point.

    // For this simpler demo, we'll let handleCrash do its thing if this wasn't the crash point yet
    // Or rather, if we cashed out, we just wait for the eventual crash.
    // The current structure means cashOut() stops the interval. This is fine for single player feel.
    // For "live" feel, interval should continue.

    // If auto-cashout happened or manual cashout, we still need the round to officially end.
    // So, we don't clear the main gameInterval if not crashed yet.
    // The check `if (currentMultiplier >= targetCrashPoint)` will eventually trigger `handleCrash`.
    // We just mark the player as cashed out.

    // Let's adjust: cashOut() only handles the player's win. The round continues.
    if (gameState === 'inProgress') { // Check again, because crash could happen simultaneously
         // Winnings already calculated and added. Button disabled.
    }
}


function handleCrash() {
    clearInterval(gameInterval);
    crashSound.play();
    gameState = 'crashed';
    cashOutButton.disabled = true;
    placeBetButton.disabled = true; // Keep disabled until next betting phase
    betAmountInput.disabled = true; // Keep disabled

    addToRoundHistory(targetCrashPoint); // Add actual crash point

    if (!hasCashedOutThisRound) {
        roundStatusDisplay.textContent = `CRASHED at ${targetCrashPoint.toFixed(2)}x! You lost ${currentBet.toFixed(2)}.`;
        addUserBetHistory(`Crashed at ${targetCrashPoint.toFixed(2)}x. Bet: ${currentBet.toFixed(2)}, Lost: ${currentBet.toFixed(2)}`);
    } else {
        // If they cashed out earlier, their message is already displayed.
        // We can update with the final crash point for context if desired.
        roundStatusDisplay.textContent += ` (Round crashed at ${targetCrashPoint.toFixed(2)}x)`;
    }

    // Update simulated players who didn't cash out
    updateSimulatedPlayersOnCrash(targetCrashPoint);

    currentBet = 0; // Reset bet for next round
    setTimeout(startBettingPhase, POST_CRASH_TIME); // Restart for next round
}

// --- Simulated Players ---
let simulatedPlayers = [];
const playerNames = ["Player123", "AcePilot", "SkyHigh", "GamblerJoe", "LuckyLucy", "MultiplierMax", "RiskTaker", "DemoUserX"];

function generateSimulatedPlayers() {
    simulatedPlayers = playerNames.map(name => ({
        name: name,
        bet: 0,
        cashOutAt: 0,
        status: 'waiting' // waiting, betting, cashed_out, lost
    }));
}

function simulateOtherPlayersBet() {
    simulatedPlayersList.innerHTML = ''; // Clear previous list
    simulatedPlayers.forEach(player => {
        if (Math.random() < 0.7) { // 70% chance they bet
            player.bet = Math.floor(Math.random() * 500) + 10; // Bet between 10 and 500
            player.cashOutAt = 0; // Reset
            if (Math.random() < 0.8) { // 80% of bettors set an auto-cashout
                player.cashOutAt = parseFloat((1.1 + Math.random() * 5).toFixed(2)); // Auto cash out between 1.1x and 6.1x
            }
            player.status = 'betting';
            const li = document.createElement('li');
            li.textContent = `${player.name} bets ${player.bet}`;
            li.id = `player-${player.name}`;
            simulatedPlayersList.appendChild(li);
        } else {
            player.status = 'waiting';
        }
    });
}

function updateSimulatedPlayersOnCashOut(playerName, multiplier) {
    const playerLi = document.getElementById(`player-${playerName}`);
    if (playerLi) {
        playerLi.textContent += ` - Cashed Out @ ${multiplier.toFixed(2)}x!`;
        playerLi.style.color = 'green';
    }
}
function updateSimulatedPlayersOnCrash(crashPoint) {
    simulatedPlayers.forEach(player => {
        if (player.status === 'betting') { // If they were betting and didn't cash out
            const playerLi = document.getElementById(`player-${player.name}`);
            if (player.cashOutAt > 0 && player.cashOutAt < crashPoint) {
                // They would have auto-cashed out
                 if (playerLi) {
                    playerLi.textContent = `${player.name} bet ${player.bet} - Auto-Cashed @ ${player.cashOutAt.toFixed(2)}x!`;
                    playerLi.style.color = 'lightgreen';
                 }
                player.status = 'cashed_out';
            } else {
                if (playerLi) {
                    playerLi.textContent += ` - Lost (Crashed @ ${crashPoint.toFixed(2)}x)`;
                    playerLi.style.color = 'red';
                }
                player.status = 'lost';
            }
        }
    });
}

// --- Canvas Animation (Very Basic Placeholder) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 600; // Example size
canvas.height = 200; // Example size
let planeY = canvas.height - 30;
let planeX = 20;

function drawPlane() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Background (e.g. sky color)
    ctx.fillStyle = '#87CEEB'; // Sky Blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Plane
    ctx.fillStyle = 'red'; // Simple rectangle for plane
    // As multiplier increases, plane moves up and maybe slightly right
    // This is a very crude animation:
    if (gameState === 'inProgress') {
        planeY = canvas.height - 30 - (currentMultiplier * 5); // Moves up with multiplier
        planeX += 0.5; // Drifts right
        if (planeY < 0) planeY = 0; // Don't go off top
    } else if (gameState === 'idle' || gameState === 'betting') {
        planeY = canvas.height - 30;
        planeX = 20;
    }
    // If crashed, you could draw an explosion or remove plane
    if (gameState === 'crashed') {
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(planeX + 15, planeY + 10, 20, 0, Math.PI * 2); // Explosion
        ctx.fill();
    } else {
        ctx.fillRect(planeX, planeY, 30, 20); // Draw plane
    }


    if (gameState === 'inProgress' || gameState === 'crashed') {
       requestAnimationFrame(drawPlane);
    } else if (gameState === 'idle' || gameState === 'betting') {
        // Draw initial state and stop animation until round starts
        ctx.fillRect(planeX, planeY, 30, 20);
    }
}


// --- Start the game ---
init();
generateSimulatedPlayers();
startBettingPhase(); // Start the first round betting automatically
drawPlane(); // Initial draw

// Game loop for animation if not using setInterval for rendering
function gameLoop() {
    if (gameState === 'inProgress') { // only animate when game is running
        // updateMultiplier(); // Logic is handled by setInterval in startRound
        // Check for auto cash out for simulated players during the multiplier increase
        simulatedPlayers.forEach(player => {
            if (player.status === 'betting' && player.cashOutAt > 0 && currentMultiplier >= player.cashOutAt) {
                player.status = 'cashed_out';
                updateSimulatedPlayersOnCashOut(player.name, player.cashOutAt);
            }
        });
    }
    // drawPlane(); // Canvas drawing is now driven by requestAnimationFrame from drawPlane itself
    requestAnimationFrame(gameLoop);
}
// gameLoop(); // Call this if canvas animation is primary driver

// Initial draw of the plane in its starting position
ctx.fillStyle = '#87CEEB';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = 'red';
ctx.fillRect(planeX, planeY, 30, 20);

