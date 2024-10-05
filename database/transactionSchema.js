import mongoose from "mongoose";

// MongoDB model to save the last buy transaction
const transactionSchema = new mongoose.Schema({
    txHash: String,
    buyer: String,
    timestamp: Date,
});

export const Transaction = mongoose.model('Transaction', transactionSchema);