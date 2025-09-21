import pkg from "@0xgasless/agentkit";
const { Agentkit } = pkg;
const { AgentkitToolkit } = pkg;
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const agentkit = await Agentkit.configureWithWallet({
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    rpcUrl: process.env.RPC_URL!,
    apiKey: process.env.API_KEY!,
    chainID: Number(process.env.CHAIN_ID) || 43114,
  });

  const agentkitToolkit = new AgentkitToolkit(agentkit);
  const tools = agentkitToolkit.getTools();

  const llm = new ChatOpenAI({
    model: "gpt-4o",
    openAIApiKey: process.env.OPENROUTER_API_KEY || "",
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
  });

  const memory = new MemorySaver();
  const agentConfig = { configurable: { thread_id: "0xGasless AgentKit Test" } };

  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: memory,
    messageModifier: `
      You are a helpful agent that can interact with EVM chains using 0xGasless smart accounts. You can perform 
      gasless transactions using the account abstraction wallet. You can check balances of ETH and any ERC20 token 
      by providing their contract address. If someone asks you to do something you can't do with your currently 
      available tools, you must say so. Be concise and helpful with your responses.
    `,
  });

  const prompts = [
    "What's my wallet address?",
    "Show my USDC balance"
  ];

  for (const prompt of prompts) {
    console.log("\n=== Prompt :", prompt, "===");
    const stream = await agent.stream({ messages: [new HumanMessage(prompt)] }, agentConfig);
    for await (const chunk of stream) {
      if ("agent" in chunk) {
        console.log(chunk.agent.messages[0].content);
      } else if ("tools" in chunk) {
        console.log(chunk.tools.messages[0].content);
      }
      console.log("-------------------");
    }
  }
}

main();
