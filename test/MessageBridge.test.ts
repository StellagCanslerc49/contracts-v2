import { expect, use } from 'chai'
import { ContractTransaction, BigNumber, BigNumberish, Signer, providers } from 'ethers'
import { ethers } from 'hardhat'
import {
  ONE_WEEK,
  HUB_CHAIN_ID,
  SPOKE_CHAIN_ID_0,
  SPOKE_CHAIN_ID_1,
  DEFAULT_RESULT,
  DEFAULT_FROM_CHAIN_ID,
  DEFAULT_TO_CHAIN_ID,
  MESSAGE_FEE,
  MAX_BUNDLE_MESSAGES,
  TREASURY,
  PUBLIC_GOODS,
  MIN_PUBLIC_GOODS_BPS,
  FULL_POOL_SIZE,
} from './constants'
import Bridge, { SpokeBridge, HubBridge } from './Bridge'
type Provider = providers.Provider
const { provider } = ethers
const { solidityKeccak256, keccak256, defaultAbiCoder: abi } = ethers.utils
import Fixture from './Fixture'
import { getSetResultCalldata } from './utils'
import type { MockMessageReceiver as IMessageReceiver } from '../typechain'

describe('MessageBridge', function () {
  describe('sendMessage', function () {
    it('Should complete a full Spoke to Hub bundle', async function () {
      const [deployer, sender, relayer] = await ethers.getSigners()
      const data = await getSetResultCalldata(DEFAULT_RESULT)

      const { fixture, hubBridge } = await Fixture.deploy(HUB_CHAIN_ID, [
        SPOKE_CHAIN_ID_0,
        SPOKE_CHAIN_ID_1,
      ])

      const {
        tx: sendTx,
        messageSent: { messageId: messageId0 },
      } = await fixture.sendMessage(sender)

      const numFillerMessages = MAX_BUNDLE_MESSAGES - 2
      await fixture.sendMessageRepeat(numFillerMessages, sender)

      const { bundleCommitted } = await fixture.sendMessage(sender)
      if (!bundleCommitted) throw new Error('Bundle not committed')

      const unspentMessageIds = fixture.getUnspentMessageIds(
        bundleCommitted.bundleId
      )
      const messageReceiver = fixture.getMessageReceiver()

      for (let i = 0; i < unspentMessageIds.length; i++) {
        const messageId = unspentMessageIds[i]
        const { tx: relayTx } = await fixture.relayMessage(messageId)

        await expectMessageReceiverState(
          messageReceiver,
          DEFAULT_RESULT,
          hubBridge.address,
          sender.address,
          DEFAULT_FROM_CHAIN_ID
        )
      }

      const feeDistributor = fixture.getFeeDistributor()
      const expectedFeeDistributorBalance =
        BigNumber.from(MESSAGE_FEE).mul(MAX_BUNDLE_MESSAGES)
      const feeDistributorBalance = await provider.getBalance(
        feeDistributor.address
      )
      expect(expectedFeeDistributorBalance).to.eq(feeDistributorBalance)
    })

    // with large data
    // with empty data
    it('Should call contract Spoke to Hub', async function () {})
    it('Should call contract Hub to Spoke', async function () {})
    it('Should call contract Spoke to Spoke', async function () {})

    // non-happy path
    // with hub
    // with spoke
    it('It should revert if toChainId is not supported', async function () {})

    // just hub
    it('It should revert if to is a spoke bridge', async function () {})
    // just spoke
    it('It should revert if to is a hub bridge', async function () {})
  })

  describe('relayMessage', function () {
    it('Should not allow invalid nonce', async function () {})
    it('Should not allow invalid fromChainId', async function () {})
    it('Should not allow invalid from', async function () {})
    it('Should not allow invalid to', async function () {})
    it('Should not allow invalid data', async function () {})
    // BundleProof
    it('Should not allow invalid bundleId', async function () {})
    it('Should not allow invalid treeIndex', async function () {})
    it('Should not allow invalid siblings', async function () {})
    it('Should not allow extra siblings', async function () {})
    it('Should not allow empty siblings for non single element tree', async function () {})
    it('Should not allow totalLeaves + 1', async function () {})
    it('Should not allow totalLeaves - 1', async function () {})
    it('Should not allow 0', async function () {})

    it('Should not allow the same message to be relayed twice', async function () {})
  })

  describe('getXDomainChainId', function () {
    it('Should revert when called directly', async function () {})
  })

  describe('getXDomainSender', function () {
    it('Should revert when called directly', async function () {})
  })

  describe('getChainId', function () {
    it('Should return the chainId', async function () {})
  })
})

function getCalldataStats(calldata: string) {
  let data = calldata
  if (calldata.slice(0, 2) === '0x') {
    data = calldata.slice(2)
  }
  const calldataBytes = data.length / 2

  let zeroBytes = 0
  for (let i = 0; i < calldataBytes; i = i + 2) {
    const byte = data.slice(i, i + 2)
    if (byte === '00') {
      zeroBytes++
    }
  }
  const nonZeroBytes = calldataBytes - zeroBytes

  const calldataCost = zeroBytes * 4 + nonZeroBytes * 16
  return { calldataBytes, calldataCost }
}

async function expectMessageReceiverState(
  messageReceiver: IMessageReceiver,
  result: BigNumberish,
  msgSender: string,
  xDomainSender: string,
  xDomainChainId: BigNumberish,
) {
  const _result = await messageReceiver.result()
  const _msgSender = await messageReceiver.msgSender()
  const _xDomainSender = await messageReceiver.xDomainSender()
  const _xDomainChainId = await messageReceiver.xDomainChainId()

  expect(result).to.eq(_result)
  expect(msgSender).to.eq(_msgSender)
  expect(xDomainSender).to.eq(_xDomainSender)
  expect(xDomainChainId).to.eq(_xDomainChainId)
}
