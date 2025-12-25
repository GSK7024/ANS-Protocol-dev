const { Keypair } = require('@solana/web3.js');
console.log('Writer:' + Keypair.generate().publicKey.toBase58());
console.log('Code:' + Keypair.generate().publicKey.toBase58());
console.log('Summarize:' + Keypair.generate().publicKey.toBase58());
