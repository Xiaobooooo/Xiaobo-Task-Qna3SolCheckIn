const anchor = require("@coral-xyz/anchor");
const fs = require("fs");
const nacl = require("tweetnacl");
const axios = require("axios");
const bs58 = require("bs58");


async function main() {
    // 读取文件内容
    const fileContent = fs.readFileSync('SolWallet.txt', 'utf-8');
    // 将文件内容按行分割成数组
    const wallets = fileContent.trim().split('\n');

    for (let i = 0; i < wallets.length; i++) {
        const address = wallets[i].trim().split("----")[0].trim()
        const privateKey = wallets[i].trim().split("----")[1].trim()
        const wallet = new anchor.Wallet(anchor.web3.Keypair.fromSecretKey(anchor.utils.bytes.bs58.decode(privateKey)));

        // 签名消息
        const message = "AI + DYOR = Ultimate Answer to Unlock Web3 Universe"
        const serializedData = Buffer.from(message);
        const bufSig = nacl.sign(serializedData, wallet.payer.secretKey);
        const signature = bs58.encode(bufSig.slice(0, 64))
        let payload = {"address": address, "signature": signature, "chainType": "solana"}
        let headers = {
            'Host': 'qna3.ai',
            'content-type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        }
        let res = await axios.post("https://qna3.ai/api/v3/auth/login", payload, {headers})
        if (res.status !== 201 || res.data.statusCode !== 200) {
            console.log(`[${wallet.publicKey.toString()}]登录失败`);
            fs.appendFileSync('Qna3Sol查询失败.txt', wallets[i])
            return
        }
        const token = res.data.data.accessToken
        console.log(`[${wallet.publicKey.toString()}]登录成功`);
        payload = {
            "query": "query loadAirDropInfo($nBscAddress: String, $nBscSignature: String) {\n  airdropClaimInfo(bscAddress: $nBscAddress, bscSignature: $nBscSignature) {\n    bsc {\n      __typename\n      ...ClaimInfo\n    }\n    solana {\n      __typename\n      ...ClaimInfo\n    }\n  }\n}\n\nfragment ClaimInfo on ClaimInfo {\n  claim {\n    amount\n    claimed\n    proof\n    id\n  }\n  claimed {\n    amount\n    updated_at\n  }\n}",
            "variables": {},
            "operationName": "loadAirDropInfo"
        }
        res = await axios.post("https://qna3.ai/api/v2/graphql", payload, {
                headers: {
                    ...headers,
                    'authorization': 'Bearer ' + token
                }
            }
        )
        if (res.status !== 200) {
            console.log(`[${wallet.publicKey.toString()}]查询失败`);
            fs.appendFileSync('Qna3Sol查询失败.txt', wallets[i])
            return
        }
        const claim = res.data.data.airdropClaimInfo.solana.claim
        if (claim) {
            console.log(`[${wallet.publicKey.toString()}]GPT: ${claim.amount}`);
            fs.appendFileSync('Qna3Sol有GPT.txt', `${wallets[i]}----${claim.amount}`)
        } else {
            console.log(`[${wallet.publicKey.toString()}]GPT: 0`);
            fs.appendFileSync('Qna3Sol无GPT.txt', wallets[i])
        }
    }
}

main()