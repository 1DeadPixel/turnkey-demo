
export class JupiterExternalAPI {

    ROOT_URL = "https://lite-api.jup.ag";

    async getQuoteInfo(inputMint: string, outputMint: string, amount: string, slipageBps: number): Promise<Response> {
        const url = `${this.ROOT_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slipageBps}`
        return await fetch(url, {method: "GET"})
    }

    async getSwapInstructions(quoteResponse: Record<string, unknown>, walletAddress: string): Promise<Response> {
        const url = `${this.ROOT_URL}/swap-instructions`
        return await fetch(url, {method:"POST", body: JSON.stringify({"quoteResponse": quoteResponse, "userPubicKey": walletAddress})})
    }

    async getSwapTx(quoteResponse: Record<string, unknown>, walletAddress: string): Promise<Response> {
        const url = `${this.ROOT_URL}/swap`
        return await fetch(url, {method: "POST", body: JSON.stringify({"quteResponse": quoteResponse, "userPublicKey": walletAddress})})
    }

}