import { ethers } from 'hardhat'
import { getSigners, getSetResultCalldata } from '../utils'
import {
  contracts,
  deployConfig,
  messageConfig,
  txConfig,
} from './config'
const { messengers } = contracts.testnet

async function main() {
  const { maxBundleMessages } = deployConfig
  for (let i = 0; i < maxBundleMessages; i++) {
    await dispatchMessage()
  }
}

async function dispatchMessage() {
  const { message } = messageConfig
  const { fromChainId, toChainId, to, result } = message
  const { messageFee } = deployConfig
  const { gasLimit } = txConfig

  const { signers } = getSigners()
  const signer = signers[message.fromChainId]

  const messageBridgeAddress = messengers[fromChainId]
  const messageBridge = (
    await ethers.getContractAt('SpokeMessageBridge', messageBridgeAddress)
  ).connect(signer)
  const data = await getSetResultCalldata(result)

  const tx = await messageBridge.dispatchMessage(toChainId, to, data, {
    gasLimit: gasLimit,
    value: messageFee,
  })

  const receipt = await tx.wait()
  console.log('messageSent', receipt.transactionHash)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
