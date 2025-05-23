// Do not edit this file. It was auto-generated by saveApiMocks.ts

import { Pool } from '../../pool.types'

export const partialBoostedSepoliaWethStataUsdtMock = {
  id: '0x445a49d1ad280b68026629fe029ed0fbef549a94',
  address: '0x445a49d1ad280b68026629fe029ed0fbef549a94',
  name: '50WETH 50stataEthUSDT',
  version: 1,
  owner: '0x0000000000000000000000000000000000000000',
  swapFeeManager: '0x0000000000000000000000000000000000000000',
  pauseManager: '0x0000000000000000000000000000000000000000',
  poolCreator: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  factory: '0x7532d5a3be916e4a4d900240f49f0babd4fd855c',
  symbol: '50WETH-50stataEthUSDT',
  createTime: 1733516928,
  type: 'WEIGHTED',
  chain: 'SEPOLIA',
  protocolVersion: 3,
  tags: ['BOOSTED_AAVE', 'BOOSTED'],
  hasErc4626: true,
  hasNestedErc4626: false,
  liquidityManagement: {
    disableUnbalancedLiquidity: false,
  },
  hook: null,
  dynamicData: {
    poolId: '0x445a49d1ad280b68026629fe029ed0fbef549a94',
    swapEnabled: true,
    totalLiquidity: '929.02',
    totalShares: '8.008128835706017977',
    fees24h: '0.00',
    surplus24h: '0.00',
    swapFee: '0.001',
    volume24h: '0.00',
    holdersCount: '4',
    isInRecoveryMode: false,
    isPaused: false,
    aprItems: [
      {
        id: '0x445a49d1ad280b68026629fe029ed0fbef549a94-swap-apr-30d',
        title: 'Swap fees APR (30d)',
        apr: 0.0001728870330155455,
        type: 'SWAP_FEE_30D',
        rewardTokenSymbol: null,
        rewardTokenAddress: null,
      },
    ],
  },
  staking: null,
  userBalance: {
    totalBalance: '0',
    totalBalanceUsd: 0,
    walletBalance: '0',
    walletBalanceUsd: 0,
    stakedBalances: [],
  },
  nestingType: 'NO_NESTING',
  poolTokens: [
    {
      id: '0x445a49d1ad280b68026629fe029ed0fbef549a94-0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
      chain: 'SEPOLIA',
      chainId: 11155111,
      address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
      decimals: 18,
      name: 'Wrapped Ether',
      symbol: 'WETH',
      priority: 0,
      tradable: true,
      canUseBufferForSwaps: null,
      useWrappedForAddRemove: null,
      useUnderlyingForAddRemove: null,
      index: 0,
      balance: '0.10805627553902844',
      balanceUSD: '254.1926631407659',
      priceRate: '1',
      weight: '0.5',
      hasNestedPool: false,
      isAllowed: true,
      priceRateProvider: '0x0000000000000000000000000000000000000000',
      logoURI: null,
      priceRateProviderData: null,
      nestedPool: null,
      isErc4626: false,
      isBufferAllowed: true,
      underlyingToken: null,
      erc4626ReviewData: null,
    },
    {
      id: '0x445a49d1ad280b68026629fe029ed0fbef549a94-0x978206fae13faf5a8d293fb614326b237684b750',
      chain: 'SEPOLIA',
      chainId: 11155111,
      address: '0x978206fae13faf5a8d293fb614326b237684b750',
      decimals: 6,
      name: 'Static Aave Ethereum USDT',
      symbol: 'stataEthUSDT',
      priority: 0,
      tradable: true,
      canUseBufferForSwaps: true,
      useWrappedForAddRemove: true,
      useUnderlyingForAddRemove: true,
      index: 1,
      balance: '440.809182',
      balanceUSD: '674.8270852968761',
      priceRate: '1.527968371189627188',
      weight: '0.5',
      hasNestedPool: false,
      isAllowed: true,
      priceRateProvider: '0xb1b171a07463654cc1fe3df4ec05f754e41f0a65',
      logoURI: null,
      priceRateProviderData: {
        address: '0xb1b171a07463654cc1fe3df4ec05f754e41f0a65',
        name: 'waUSDT Rate Provider',
        summary: 'safe',
        reviewed: true,
        warnings: [''],
        upgradeableComponents: [],
        reviewFile: './StatATokenTestnetRateProvider.md',
        factory: null,
      },
      nestedPool: null,
      isErc4626: true,
      isBufferAllowed: true,
      underlyingToken: {
        chain: 'SEPOLIA',
        chainId: 11155111,
        address: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
        decimals: 6,
        name: 'USDT (AAVE Faucet)',
        symbol: 'usdt-aave',
        priority: 0,
        tradable: true,
        isErc4626: false,
        isBufferAllowed: true,
        logoURI: null,
      },
      erc4626ReviewData: {
        reviewFile: './AaveV3.md',
        summary: 'safe',
        warnings: [''],
      },
    },
  ],
} as unknown as Pool
