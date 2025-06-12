# Solana Trade Bot

A premium Telegram bot for trading SPL tokens on Solana via Raydium, Jupiter, and Pump.fun. It automates buying, selling, and monitoring pools so you can stay ahead of the market.

![Screenshot](a.jpg)

## Why Choose This Bot?

- **Real-time pool monitoring** across major DEX platforms
- **Automated trading tools** with customizable strategies
- **Secure operations** using dedicated wallets
- **PNL card generation** for easy profit tracking
- **Referral features** to help grow your community

## Quick Start

1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd solana-trade-bot
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the required tokens and API keys.
3. Run the bot in development mode:
   ```bash
   npm run serve
   ```

For production deployments, run `npm run build` followed by `npm start`.

## Configuration

Environment variables control how the bot connects to Telegram, MongoDB, Redis, and the Solana network. See [`SETUP.md`](SETUP.md) for a full explanation of each option.

## Disclaimer

This project is provided "as is" without warranties of any kind. Use it at your own risk. Cryptocurrency trading carries significant risk, and nothing in this repository constitutes financial advice.

## Contact

Questions or suggestions? Reach out on [Telegram](https://t.me/BTC0in23).
