import { Telegraf } from 'telegraf';
import { Transaction } from './database/transactionSchema.js';
import { connectToDb } from './database/db.js';

// Initialize the Telegraf bot with your bot token
const bot = new Telegraf('7731409607:AAGtEz_zNPcLdle4kIqV8xDwh5isQINrldI');

// const groupId = -1002365056522;  
const groupId = -1002217836966;

// Connect to the database
connectToDb();

// Global variables to track the last transaction and the timer
let lastBuyTx = null;
let giveawayTimer = null; // The giveaway timer

// Function to handle new buy messages
async function handleNewBuyMessage(buyer, amount) {

    // Save the new transaction to the database with the buyer and timestamp
    lastBuyTx = await Transaction.findOneAndUpdate({}, {
        buyer,
        amount,
        timestamp: new Date(),
    }, { upsert: true, new: true });


    // Reset the timer for the giveaway
    resetGiveawayTimer();
}

// Reset the timer to 1 minute (60 seconds) and announce the winner when time expires
function resetGiveawayTimer() {
    // Clear the existing timer if it's already running
    if (giveawayTimer) {
        clearTimeout(giveawayTimer);
    }

    // Start a new 1-minute timer
    giveawayTimer = setTimeout(() => {
        announceWinner();  // Automatically announce the winner after 1 minute
    }, 6 * 60 * 60 * 1000); // 6hr

    console.log('Timer reset to 1 minute.');
}

// Announce the winner when the timer ends
function announceWinner() {
    if (lastBuyTx) {
        const message = `
<b>CONGRATS, we have a WINNER!</b>\n
The wallet <i><code>${lastBuyTx.buyer}</code></i> won the COMPETITION! 🎉\n
<b>Congrats from the FOXX team!</b>
        `;

        // Announce the winner in the group
        bot.telegram.sendMessage(groupId, message, { parse_mode: 'HTML' });
        // Reset the transaction after announcing the winner
        lastBuyTx = null;
    } else {
    }
}

// Function to send hourly updates
function startHourlyUpdates() {
    setInterval(() => {
        if (lastBuyTx) {
            const now = new Date();
            const lastTimestamp = new Date(lastBuyTx.timestamp).getTime();
            const timeElapsed = now.getTime() - lastTimestamp;
            // Assuming you calculate the total seconds left earlier
            const totalSecondsLeft = Math.max(0, (60 * 1000 - timeElapsed) / 1000); // Calculate remaining time in seconds
            const hoursLeft = Math.floor(totalSecondsLeft / 3600);
            const minutesLeft = Math.floor((totalSecondsLeft % 3600) / 60);
            const secondsLeft = Math.floor(totalSecondsLeft % 60);

            // Update the message to include hours, minutes, and seconds
            bot.telegram.sendMessage(groupId, `
⏳ <b><i>Time left until the winner is announced:* ${hoursLeft} hours, ${minutesLeft} minutes, ${secondsLeft} seconds </i> </b>
\n<b>Last buyer:</b> <i>${lastBuyTx.buyer}_</i>
` , {
                parse_mode: "HTML"
            });
        } else {
            // bot.telegram.sendMessage(groupId, '_No buy messages detected yet._');
        }
    }, 60 * 60 * 1000); // 1 hour interval
}

// Telegram command to check remaining time (for debugging or manual checks)
bot.command('timer', async (ctx) => {
    if (lastBuyTx) {
        const now = new Date();
        const lastTimestamp = new Date(lastBuyTx.timestamp).getTime();
        const timeElapsed = now.getTime() - lastTimestamp;
        const totalSecondsLeft = Math.max(0, (60 * 1000 - timeElapsed) / 1000); // Calculate remaining time in seconds

        const hoursLeft = Math.floor(totalSecondsLeft / 3600);
        const minutesLeft = Math.floor((totalSecondsLeft % 3600) / 60);
        const secondsLeft = Math.floor(totalSecondsLeft % 60);

        // Format the message with bold and italic using HTML parse mode
        const message = `
⏳ <b>Time left until the winner is announced:</b> <i>${hoursLeft} hours, ${minutesLeft} minutes, ${secondsLeft} seconds</i>
\n<b>Last buyer:</b> <i>${lastBuyTx.buyer}</i>
        `;

        ctx.reply(message, { parse_mode: 'HTML' });
    } else {
        ctx.reply('<i>No buy messages detected yet.</i>', { parse_mode: 'HTML' });
    }

});

bot.on('message', async (ctx) => {
    const message = ctx.message;
    const senderUsername = message.from.username;

    // Check if the message is from the desired user (you can change it based on your needs)
    if (senderUsername === 'gempadbuybot') {
        const text = message.caption;

        // Check if the message contains "New FOXX Presale Contribution"
        if (text && text.includes("New FOXX Presale Contribution")) {
            // Extract the amount bought
            const amountMatch = text.match(/Amount Bought\s*:\s*(\d+\.\d+)\s*USDT/);

            // Extract the buyer address and TX hash from caption entities (assuming 2nd and 3rd links)
            const txHashEntity = message.caption_entities?.find(entity => entity.offset === 277);
            const buyerEntity = message.caption_entities?.find(entity => entity.offset === 282);

            const txHash = txHashEntity?.url?.match(/tx\/([0-9a-fA-Fx]+)/)?.[1];
            const buyerAddress = buyerEntity?.url?.match(/address\/([0-9a-fA-Fx]+)/)?.[1];

            if (amountMatch && buyerAddress && txHash) {
                const amount = parseFloat(amountMatch[1]);

                // Log extracted data
                console.log(`Extracted TX Hash: ${txHash}, Buyer Address: ${buyerAddress}, Amount: ${amount}`);

                // Handle the new buy message
                await handleNewBuyMessage(buyerAddress, amount, txHash);
            } else {
                console.log('Failed to extract buyer address, TX hash, or amount');
            }
        }
    }
});

// Start the bot
startHourlyUpdates(); // Start sending hourly updates
bot.launch();

console.log('Telegram bot started and listening for @New_User66 messages...');
