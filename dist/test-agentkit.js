import { Agentkit } from "@0xgasless/agentkit";
import * as dotenv from "dotenv";
dotenv.config();
async function testAgentkitInit() {
    try {
        const agentkit = await Agentkit.configureWithWallet({
            privateKey: process.env.PRIVATE_KEY,
            rpcUrl: process.env.RPC_URL,
            apiKey: process.env.API_KEY,
            chainID: Number(process.env.CHAIN_ID) || 43114,
        });
        console.log("✅ AgentKit initialisé avec succès !");
        console.log("Instance AgentKit :", agentkit);
    }
    catch (error) {
        console.error("Erreur d'initialisation AgentKit :", error);
    }
}
testAgentkitInit();
//# sourceMappingURL=test-agentkit.js.map