import { BigNumber, BigNumberish, Signer, providers } from 'ethers'
import { ethers } from 'hardhat'
import type {
  FeeDistributor as IFeeDistributor,
  MessageBridge as IMessageBridge,
  SpokeMessageBridge as ISpokeMessageBridge,
  HubMessageBridge as IHubMessageBridge
} from '../typechain'
import { 
  ONE_WEEK,
  HUB_CHAIN_ID,
  SPOKE_CHAIN_ID,
  RESULT,
  MESSAGE_FEE,
  MAX_BUNDLE_MESSAGES,
  TREASURY,
  PUBLIC_GOODS,
  MIN_PUBLIC_GOODS_BPS,
  FULL_POOL_SIZE,
} from './constants'
type Provider = providers.Provider

export type Options = Partial<{ shouldLogGas: boolean }>

type Route = {
  chainId: BigNumberish
  messageFee: BigNumberish
  maxBundleMessages: BigNumberish
}

export default class Bridge {
  bridge: IMessageBridge

  get address() {
    return this.bridge.address
  }

  get getChainId() {
    return this.bridge.getChainId
  }

  get relayMessage() {
    return this.bridge.relayMessage
  }

  get connect(): (signerOrProvider: string | Signer | Provider) => Bridge {
    return (signerOrProvider: string | Signer | Provider) =>
      new Bridge(this.bridge.connect(signerOrProvider))
  }

  constructor(_bridge: IMessageBridge) {
    this.bridge = _bridge
  }

  async sendMessage(toChainId: BigNumberish, to: string, data: string) {
    const bridge = this.bridge

    const tx = await bridge.sendMessage(toChainId, to, data, {
      value: MESSAGE_FEE,
    })

    const receipt = await tx.wait()
    const messageSentEvent = receipt.events?.find(
      e => e.event === 'MessageSent'
    )

    if (!messageSentEvent?.args) throw new Error('No MessageSent event found')

    const event = {
      messageId: messageSentEvent.args.messageId as string,
      nonce: messageSentEvent.args.nonce as BigNumber,
      from: messageSentEvent.args.from as string,
      toChainId: messageSentEvent.args.toChainId as BigNumber,
      to: messageSentEvent.args.to as string,
      data: messageSentEvent.args.data as string,
    }

    return event
  }

  static getRandomChainId(): BigNumberish {
    return BigNumber.from(Math.floor(Math.random() * 1000000))
  }
}

export class SpokeBridge extends Bridge {
  bridge: ISpokeMessageBridge

  get nonce() {
    return this.bridge.nonce
  }

  constructor(_bridge: ISpokeMessageBridge) {
    super(_bridge)
    this.bridge = _bridge
  }

  static async deploy(
    hubChainId: BigNumberish,
    hubBridge: HubBridge,
    hubFeeDistributor: IFeeDistributor,
    overrides: Partial<{
      routes: Route[]
      chainId: BigNumberish
    }> = {}
  ) {
    const SpokeMessageBridge = await ethers.getContractFactory(
      'MockSpokeMessageBridge'
    )

    const defaultRoutes = [
      {
        chainId: HUB_CHAIN_ID,
        messageFee: MESSAGE_FEE,
        maxBundleMessages: MAX_BUNDLE_MESSAGES,
      },
    ]

    const defaultParams = {
      routes: defaultRoutes,
      chainId: this.getRandomChainId(),
    }
    const fullParams = Object.assign(defaultParams, overrides)

    const spokeMessageBridge = await SpokeMessageBridge.deploy(
      hubChainId,
      hubBridge.address,
      hubFeeDistributor.address,
      fullParams.routes,
      fullParams.chainId
    )

    return new SpokeBridge(spokeMessageBridge)
  }
}

export class HubBridge extends Bridge {
  bridge: IHubMessageBridge

  get setSpokeBridge() {
    return this.bridge.setSpokeBridge
  }

  constructor(_bridge: IHubMessageBridge) {
    super(_bridge)
    this.bridge = _bridge
  }

  static async deploy(overrides: Partial<{ chainId: BigNumberish }> = {}) {
    const HubMessageBridge = await ethers.getContractFactory(
      'MockHubMessageBridge'
    )

    const defaultParams = { chainId: this.getRandomChainId() }
    const fullParams = Object.assign(defaultParams, overrides)

    const hubMessageBridge = await HubMessageBridge.deploy(fullParams.chainId)

    return new HubBridge(hubMessageBridge)
  }
}