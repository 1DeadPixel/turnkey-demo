
export class JupiterExternalAPI {

    ROOT_URL = "https://lite-api.jup.ag/swap/v1";

    async getQuoteInfo(inputMint: string, outputMint: string, amount: string, slippageBps: number): Promise<Response> {
        const url = `${this.ROOT_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
        console.log(`Jupiter quote URL: ${url}`);
        return await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
            }
        });
    }

    async getSwapInstructions(quoteResponse: Record<string, unknown>, walletAddress: string): Promise<Response> {
        const url = `${this.ROOT_URL}/swap-instructions`;
        return await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                quoteResponse: quoteResponse,
                userPublicKey: walletAddress,  // Fixed typo: was "userPubicKey"
            })
        });
    }

    async getSwapTx(quoteResponse: Record<string, unknown>, walletAddress: string): Promise<Response> {
        const url = `${this.ROOT_URL}/swap`;
        return await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                quoteResponse: quoteResponse,  // Fixed typo: was "quteResponse"
                userPublicKey: walletAddress,
            })
        });
    }

}

