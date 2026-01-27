# Crash Betting Application

A full-stack real-time multiplayer betting application based on the "Crash" game mechanic. This project demonstrates the implementation of a server-authoritative game loop, WebSocket communication, and transactional database integrity using the PERN stack (PostgreSQL, Express, React, Node.js).

## Project Overview

The application simulates a crypto-betting platform where users place bets on a rising multiplier. The goal is to cash out before the multiplier "crashes." The system handles multiple concurrent users, real-time balance updates, and automated game state management.

## Technical Architecture

* **Backend:** Node.js with Express and TypeScript.
* **Real-time Communication:** Socket.io for bi-directional event handling (game ticks, bets, cashouts).
* **Database:** PostgreSQL for persistent storage (users, transactions, game history).
* **Security:** JWT Authenticity and Integrity.
* **Provability fair** Persistent Game State Management: Implemented a robust startup routine that queries the game_seeds registry. The system enforces strict continuity by checking for existing hash chains before initialization— automatically resuming the previous sequence if data exists, or generating a new SHA-256 chain only if the database is empty. This prevents "chain-hopping" and ensures a verifiable audit trail across server  restarts.
* **Caching:** Redis for session management and ephemeral game state.
* **Redunds:** Fail-Safe Refund Mechanism: Implemented a transactional recovery system refundStuckBets to handle server interruptions. The system utilizes explicit row-level locking (SELECT ... FOR UPDATE) to isolate stuck bets, aggregates user balances using BigInt for precision, and executes refunds within an atomic transaction block. This guarantees that in the event of a crash or service restart, no user funds are lost or double-counted.
* **Frontend:** React with Tailwind CSS.

## Key Features

* **Atomic Transactions:** Utilizing PostgreSQL transactions to ensure balance integrity and prevent race conditions during high-concurrency betting.
* **Automated Game Loop:** Server-side loop manages game states (Waiting, Running, Crashed) independently of client connections.
* **Auto-Cashout:** Implementation of server-side auto-cashout logic for automated play.

# Watch how game works>

https://youtu.be/JBAcK6gUllE

## Installation and Setup

### Prerequisites
* Node.js (v18+)
* PostgreSQL
* Redis

### 1. Backend Configuration

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
//----------------------------------------------------------------------------------------------------------------------------------
Configure environment variables. Create a .env file based on .env.example and update it with your local database credentials:
//----------------------------------------------------------------------------------------------------------------------------------

cp .env.example .env
npm run db:setup
npm run dev

cd ../frontend
npm install
npm start

Testing
A demo account is automatically created during database initialization for testing purposes:

Username: demo

Password: 123

Initial Balance: 1000.00
