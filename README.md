# babel_fish <><

> *This is a submission for the [Cloudflare AI Challenge](https://dev.to/devteam/join-us-for-the-cloudflare-ai-challenge-3000-in-prizes-5f99).*

babel_fish is a real time language translation app built with Cloudflare, Svelte, and multiple language models. The app allows you to share a room with your friends in different languages. All messages get translated to your chosen language in real time!

This repo contains the Svelte frontend which includes API routes for interacting with the AI. The chat engine is handled by [the backend](https://github.com/amorriscode/babel-fish-ws).

Built with:

- 💅 Svelte
- ⚙️ Cloudflare Workers
- 🤖 Cloudflare Workers AI
- 📣 ElevenLabs

## 🚧 Requirements

- An [ElevenLabs](https://elevenlabs.io/) API key
- A running version of [the backend](https://github.com/amorriscode/babel-fish-ws)

## 🛠️ Development

> Note: `wrangler` is used to run the dev server so we have access to Cloudflare Workers AI

1. Create an `.env` file and fill in the variables

    `cp .env.example .env`

2. Clone the frontend

    `git clone https://github.com/amorriscode/babel-fish`

3. Install dependencies

    `npm install`

4. Run the wrangler dev server

    `npm run wdev`
