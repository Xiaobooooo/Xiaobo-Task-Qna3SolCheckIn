const anchor = require("@coral-xyz/anchor");

const idl = require("./idl.json");
const fs = require("fs");


const connection = new anchor.web3.Connection('https://api.mainnet-beta.solana.com');
const systemProgram = new anchor.web3.PublicKey("11111111111111111111111111111111")
const programId = new anchor.web3.PublicKey("G3qf2wmWSurK5S3f7HaenmNNsoiZQY41i9d3kboHURZC")


async function main() {
    // 读取文件内容
    const fileContent = fs.readFileSync('SolWallet.txt', 'utf-8');
    // 将文件内容按行分割成数组
    const wallets = fileContent.trim().split('\n');

    for (let i = 0; i < wallets.length; i++) {
        const privateKey = wallets[i].trim().split("----")[1].trim()
        const wallet = new anchor.Wallet(anchor.web3.Keypair.fromSecretKey(anchor.utils.bytes.bs58.decode(privateKey)));
        const balance = await connection.getBalance(wallet.publicKey)
        console.log(`[${wallet.publicKey.toString()}]SOL余额: ${balance / 1e9}`)

        const provider = new anchor.AnchorProvider(connection, wallet, {commitment: "confirmed"});
        const program = new anchor.Program(idl, programId, provider);
        const txs = new anchor.web3.Transaction()
        txs.add(anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: 100000}))
        txs.add(anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({units: 200000}))
        let [checkInAccount] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("checkin"), wallet.publicKey.toBuffer()], programId
        );
        const instruction = await program.methods.checkin(wallet.publicKey)
            .accounts({user: wallet.publicKey, checkInAccount: checkInAccount, systemProgram: systemProgram})
            .instruction()
        txs.add(instruction)
        try {
            // 签名交易
            txs.feePayer = wallet.publicKey;
            txs.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            txs.sign(wallet.payer);
            // 发送并确认交易
            console.log(`[${wallet.publicKey.toString()}]签到交易正在发送`)
            const signature = await connection.sendRawTransaction(txs.serialize(), {skipPreflight: true})
            console.log(`[${wallet.publicKey.toString()}]签到交易已发送，等待确认...`)
            connection.confirmTransaction(signature).then(() => {
                console.log(`[${wallet.publicKey.toString()}]签到交易确认成功: ${signature}`);
                fs.appendFileSync('Qna3Sol签到成功.txt', wallets[i])
            }).catch((e) => {
                console.log(`[${wallet.publicKey.toString()}]签到交易可能失败: ${e}`);
                fs.appendFileSync('Qna3Sol签到失败.txt', wallets[i])
            })
        } catch (e) {
            console.log(`[${wallet.publicKey.toString()}]签到交易发送失败: ${e}`);
            fs.appendFileSync('Qna3Sol签到失败.txt', wallets[i])
        }
    }
}

main()