
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createMetadataAccountV3 } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// CONFIGURATION
const MINT_ADDRESS = "AArq7Yoeq39C9cBbp9F4Fv7ERw225V6jnENgZ2Wx42R6";

async function main() {
    console.log("🏷️  Fixing Token Metadata...");

    // 1. Setup Umi
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const umi = createUmi(rpcUrl);

    // 2. Load Wallet (Directly, no web3.js adapter needed)
    const privateKey = process.env.VAULT_PRIVATE_KEY;
    if (!privateKey) throw new Error("Missing VAULT_PRIVATE_KEY");

    const secretKey = bs58.decode(privateKey);
    const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    umi.use(keypairIdentity(keypair));

    // 3. Create Metadata
    const mint = publicKey(MINT_ADDRESS);

    console.log(`Mint: ${MINT_ADDRESS}`);
    console.log(`Authority: ${keypair.publicKey}`);

    const tx = await createMetadataAccountV3(umi, {
        mint: mint,
        mintAuthority: umi.identity,
        payer: umi.identity,
        data: {
            name: "NEXUS Protocol",
            symbol: "NXS",
            uri: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
        },
        isMutable: true,
        collectionDetails: null,
    }).sendAndConfirm(umi);

    console.log(`✅ Metadata Created! Signature: ${bs58.encode(tx.signature)}`);
}

main().catch(err => {
    console.error("❌ Error:", err);
});
