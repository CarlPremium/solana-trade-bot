# Solana Trade Bot Setup Guide

This guide explains how to configure and run the Solana trade bot.

## Prerequisites

- **Node.js** v18 or newer
- **npm** (comes with Node.js)
- Access to a MongoDB instance
- Access to a Redis instance
- Telegram Bot tokens and optional JITO UUID

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd solana-trade-bot
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   # edit .env with your favourite editor
   ```
4. Start the bot in development mode:
   ```bash
   npm run serve
   ```

## Environment Variables

The important environment variables are:

- `MONGODB_URL` – MongoDB connection string.
- `REDIS_URI` – Redis connection string.
- `TELEGRAM_BOT_API_TOKEN` – token for the main Telegram bot.
- `ALERT_BOT_API_TOKEN` – token for the alert bot.
- `MAINNET_RPC` – Solana RPC endpoint.
- `PRIVATE_RPC_ENDPOINT` – private RPC endpoint (optional).
- `RPC_WEBSOCKET_ENDPOINT` – WebSocket RPC endpoint.
- `JITO_UUID` – Jito bundle UUID (optional).
- `BIRD_EYE_API` – Birdeye API key.
- `GROWSOL_API_ENDPOINT` – API endpoint for GrowSol service.
- `PNL_IMG_GENERATOR_API` – endpoint for the PNL image generator.

Adjust the values to match your environment.

## Building

Run the TypeScript compiler without emitting files to check for type errors:
```bash
npm run build
```

The compiled output will be placed in the `dist` directory if `noEmit` is disabled in `tsconfig.json`.

## Running in Production

After building, you can start the bot directly with Node.js:
```bash
npm start
```

## Updating Dependencies

Use `npm update` to get the latest package versions. After updating, run `npx tsc --noEmit` to ensure the code still compiles correctly.

