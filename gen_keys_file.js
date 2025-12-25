const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const keys = `Writer: ${Keypair.generate().publicKey.toBase58()}
Code: ${Keypair.generate().publicKey.toBase58()}
Summarize: ${Keypair.generate().publicKey.toBase58()}`;
fs.writeFileSync('keys.txt', keys);
console.log('Keys generated');
