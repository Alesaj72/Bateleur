import { Agentkit } from "@0xgasless/agentkit";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config();

async function main() {
  const agentkit = await Agentkit.configureWithWallet({
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    rpcUrl: process.env.RPC_URL!,
    apiKey: process.env.API_KEY!,
    chainID: Number(process.env.CHAIN_ID) || 43114,
  });

  // LLM (OpenRouter ou mock)
  const llm = new ChatOpenAI({
    model: "gpt-4o",
    openAIApiKey: process.env.OPENROUTER_API_KEY || "",
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
  });

  const prompts = [
    "What's my wallet address?",
    "Show my USDC balance"
  ];

  for (const prompt of prompts) {
    console.log("\n=== Prompt :", prompt, "===");
    // TODO : brancher l'agent complet pour traiter le prompt
  }
}

main();
