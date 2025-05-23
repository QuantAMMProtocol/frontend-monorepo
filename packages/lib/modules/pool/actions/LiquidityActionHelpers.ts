import { getChainId, getNativeAsset, getNetworkConfig } from '@repo/lib/config/app.config'
import { TokenAmountToApprove } from '@repo/lib/modules/tokens/approvals/approval-rules'
import { nullAddress } from '@repo/lib/modules/web3/contracts/wagmi-helpers'
import { GqlChain, GqlPoolType } from '@repo/lib/shared/services/api/generated/graphql'
import { isSameAddress } from '@repo/lib/shared/utils/addresses'
import { SentryError } from '@repo/lib/shared/utils/errors'
import { bn, isZero } from '@repo/lib/shared/utils/numbers'
import {
  AddLiquidityQueryOutput,
  HumanAmount,
  InputAmount,
  MinimalToken,
  NestedPoolState,
  PoolGetPool,
  PoolState,
  PoolStateWithUnderlyings,
  PoolTokenWithUnderlying,
  Token,
  TokenAmount,
  mapPoolToNestedPoolStateV2,
  mapPoolToNestedPoolStateV3,
  mapPoolType,
} from '@balancer/sdk'
import BigNumber from 'bignumber.js'
import { Address, Hex, formatUnits, parseUnits } from 'viem'
import {
  isNativeAsset,
  isNativeOrWrappedNative,
  isWrappedNativeAsset,
  swapNativeWithWrapped,
} from '../../tokens/token.helpers'
import { HumanTokenAmountWithAddress } from '../../tokens/token.types'
import { Pool } from '../pool.types'
import {
  isAffectedByCspIssue,
  isComposableStableV1,
  isCowAmmPool,
  isGyro,
  isUnbalancedLiquidityDisabled,
  isV2Pool,
  isV3Pool,
  supportsWethIsEth,
  hasNestedPools,
} from '../pool.helpers'
import { getActionableTokenSymbol } from '../pool-tokens.utils'
import { allPoolTokens } from '../pool-tokens.utils'
import { TokenAmountIn } from '../../tokens/approvals/permit2/useSignPermit2'
import { ApiToken } from '../../tokens/token.types'

// Null object used to avoid conditional checks during hook loading state
const NullPool: Pool = {
  id: nullAddress,
  address: nullAddress,
  type: 'Null',
  tokens: [],
} as unknown as Pool

type InputAmountWithSymbol = InputAmount & { symbol: string }

/*
  This class provides helper methods to traverse the pool state and prepare data structures needed by add/remove liquidity handlers
  to implement the Add/RemoveLiquidityHandler interface
*/
export class LiquidityActionHelpers {
  constructor(public pool: Pool = NullPool) {}

  /* Used by default (non-nested) SDK handlers */
  public get poolState(): PoolState {
    return toPoolState(this.pool)
  }

  /* Used by default nested SDK handlers */
  public get nestedPoolStateV2(): NestedPoolState {
    const result = mapPoolToNestedPoolStateV2(this.pool as PoolGetPool)
    result.protocolVersion = 2
    return result
  }

  /* Used by default nested SDK handlers */
  public get nestedPoolStateV3(): NestedPoolState {
    const result = mapPoolToNestedPoolStateV3(this.pool as PoolGetPool)
    result.protocolVersion = 3
    return result
  }

  /* Used by V3 boosted SDK handlers */
  public get boostedPoolState(): PoolStateWithUnderlyings & { totalShares: HumanAmount } {
    const poolTokensWithUnderlyings: PoolTokenWithUnderlying[] = this.pool.poolTokens.map(
      token => ({
        ...token,
        address: token.address as Address,
        balance: token.balance as HumanAmount,
        underlyingToken:
          token.underlyingToken?.address && token.useUnderlyingForAddRemove
            ? {
                ...token.underlyingToken,
                address: token.underlyingToken?.address as Address,
                decimals: token.underlyingToken?.decimals as number,
                index: token.index,
              }
            : null,
      })
    )
    const state: PoolStateWithUnderlyings & { totalShares: HumanAmount } = {
      id: this.pool.id as Hex,
      address: this.pool.address as Address,
      protocolVersion: 3,
      type: this.pool.type,
      tokens: poolTokensWithUnderlyings,
      totalShares: this.pool.dynamicData.totalShares as HumanAmount,
    }
    return state
  }

  public get networkConfig() {
    return getNetworkConfig(this.pool.chain)
  }

  public get chainId() {
    return getChainId(this.pool.chain)
  }

  public getAmountsToApprove(
    humanAmountsIn: HumanTokenAmountWithAddress[],
    isPermit2 = false
  ): TokenAmountToApprove[] {
    return this.toInputAmounts(humanAmountsIn).map(({ address, rawAmount, symbol }) => {
      return {
        isPermit2,
        tokenAddress: address,
        requiredRawAmount: rawAmount,
        requestedRawAmount: rawAmount, //This amount will be probably replaced by MAX_BIGINT depending on the approval rules
        symbol,
      }
    })
  }

  public toInputAmounts(humanAmountsIn: HumanTokenAmountWithAddress[]): InputAmountWithSymbol[] {
    if (!humanAmountsIn.length) return []

    return humanAmountsIn
      .filter(({ humanAmount }) => bn(humanAmount).gt(0))
      .map(({ tokenAddress, humanAmount, symbol }) => {
        const chain = this.pool.chain
        if (isNativeAsset(tokenAddress, chain)) {
          const decimals = getNativeAsset(chain).decimals
          return {
            address: tokenAddress as Address,
            rawAmount: parseUnits(humanAmount, decimals),
            decimals,
            symbol,
          }
        }

        const allTokens = allPoolTokens(this.pool)
        const token = allTokens.find(token => isSameAddress(token.address, tokenAddress))
        if (!token) {
          throw new Error(
            `Provided token address ${tokenAddress} not found in pool tokens [${allTokens
              .map(t => t.address)
              .join(' , \n')}]`
          )
        }
        return {
          address: token.address as Address,
          rawAmount: parseUnits(humanAmount, token.decimals),
          decimals: token.decimals,
          symbol: token.symbol,
        }
      })
  }

  public isV3Pool(): boolean {
    return isV3Pool(this.pool)
  }

  /*
   1. Converts humanAmountsIn into SDK InputAmounts
   2. When the input includes it, it swaps the native asset with the wrapped native asset
  */
  public toSdkInputAmounts(humanAmountsIn: HumanTokenAmountWithAddress[]): InputAmount[] {
    return swapNativeWithWrapped(this.toInputAmounts(humanAmountsIn), this.pool.chain)
  }

  public isNativeAssetIn(humanAmountsIn: HumanTokenAmountWithAddress[]): boolean {
    const nativeAssetAddress = this.networkConfig.tokens.nativeAsset.address

    return humanAmountsIn.some(amountIn => isSameAddress(amountIn.tokenAddress, nativeAssetAddress))
  }

  public isNativeAsset(tokenAddress: Address): boolean {
    const nativeAssetAddress = this.networkConfig.tokens.nativeAsset.address

    return isSameAddress(tokenAddress, nativeAssetAddress)
  }
}

export const isEmptyAmount = (amountIn: HumanTokenAmountWithAddress) =>
  isEmptyHumanAmount(amountIn.humanAmount)

export const isEmptyHumanAmount = (humanAmount: HumanAmount | '') =>
  !humanAmount || bn(humanAmount).eq(0)

export const areEmptyAmounts = (humanAmountsIn: HumanTokenAmountWithAddress[]) =>
  !humanAmountsIn || humanAmountsIn.length === 0 || humanAmountsIn.every(isEmptyAmount)

export function toHumanAmount(tokenAmount: TokenAmount): HumanAmount {
  return formatUnits(tokenAmount.amount, tokenAmount.token.decimals) as HumanAmount
}

export function toHumanAmountWithAddress(tokenAmount: TokenAmount): HumanTokenAmountWithAddress {
  return {
    tokenAddress: tokenAmount.token.address,
    humanAmount: formatUnits(tokenAmount.amount, tokenAmount.token.decimals),
    symbol: tokenAmount.token.symbol,
  } as HumanTokenAmountWithAddress
}

export function ensureLastQueryResponse<Q>(
  liquidityActionDescription: string,
  queryResponse?: Q
): Q {
  if (!queryResponse) {
    // This should never happen but this is a check against potential regression bugs
    console.error(`Missing queryResponse in ${liquidityActionDescription}`)
    throw new SentryError(
      `Missing queryResponse.
It looks that you tried to call useBuildCallData before the last query finished generating queryResponse`
    )
  }

  return queryResponse
}

export function supportsNestedActions(pool: Pool): boolean {
  if (!hasNestedPools(pool)) return false
  const disallowNestedActions = getNetworkConfig(pool.chain).pools?.disallowNestedActions ?? []
  if (disallowNestedActions.includes(pool.id)) return false
  return true
}

export function shouldUseRecoveryRemoveLiquidity(pool: Pool): boolean {
  // DEBUG: Uncomment following if condition to allow testing pools in recovery mode (but note paused). Examples:
  // pools/ethereum/v2/0x0da692ac0611397027c91e559cfd482c4197e4030002000000000000000005c9 (WEIGHTED)
  // pools/ethereum/v2/0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76000000000000000000000570 (COMPOSABLE_STABLE)
  // if (pool.dynamicData.isInRecoveryMode) return true

  // All composableStables V1 are in recovery mode and they should use recovery exit even if they are not paused
  if (isComposableStableV1(pool)) return true

  if (pool.dynamicData.isInRecoveryMode) return true

  if (pool.dynamicData.isInRecoveryMode && pool.dynamicData.isPaused) return true

  if (pool.dynamicData.isInRecoveryMode && isAffectedByCspIssue(pool)) return true

  return false
}

export function requiresProportionalInput(pool: Pool): boolean {
  if (isV3Pool(pool) && isUnbalancedLiquidityDisabled(pool)) return true
  return isGyro(pool.type) || isCowAmmPool(pool.type)
}

// Some pool types do not support AddLiquidityKind.Proportional in the SDK
export function supportsProportionalAddLiquidityKind(pool: Pool): boolean {
  if (
    isV2Pool(pool) &&
    (pool.type === GqlPoolType.Stable || pool.type === GqlPoolType.MetaStable)
  ) {
    return false
  }
  // WeightedPool2Tokens pool types do not support AddLiquidityKind.Proportional in the SDK
  if (isWeightedPool2Tokens(pool)) return false
  return true
}

export function isWeightedPool2Tokens(pool: Pool): boolean {
  if (
    isV2Pool(pool) &&
    isSameAddress(
      (pool?.factory as Address) || '',
      getNetworkConfig(pool.chain).contracts.balancer?.WeightedPool2TokensFactory || '0xUndefined'
    )
  ) {
    return true
  }
  return false
}

type ProtocolVersion = PoolState['protocolVersion']

export function toPoolState(pool: Pool): PoolState {
  return {
    id: pool.id as Hex,
    address: pool.address as Address,
    // Destruct to avoid errors when the SDK tries to mutate the poolTokens (read-only from GraphQL)
    tokens: [...pool.poolTokens] as MinimalToken[],
    // v3 pools do not require pool type mapping
    type: isV3Pool(pool) ? pool.type : mapPoolType(pool.type),
    protocolVersion: pool.protocolVersion as ProtocolVersion,
  }
}

/**
 * Filters the human amounts based on whether the token to filter:
 * - is already in the array and
 * - is native and the wrapped native token is already in the array and
 * - is wrapped native and the native token is already in the array
 *
 * @param {HumanTokenAmountWithAddress[]} humanAmountsIn - The array of human amounts to filter.
 * @param {Address} tokenAddress - The token address to compare against.
 * @param {GqlChain} chain - The chain type for comparison.
 * @return {HumanTokenAmountWithAddress[]} The filtered array of human amounts.
 */
export function filterHumanAmountsIn(
  humanAmountsIn: HumanTokenAmountWithAddress[],
  tokenAddress: Address,
  chain: GqlChain
) {
  return humanAmountsIn.filter(
    amountIn =>
      !isSameAddress(amountIn.tokenAddress, tokenAddress) &&
      !(isNativeAsset(tokenAddress, chain) && isWrappedNativeAsset(amountIn.tokenAddress, chain)) &&
      !(isNativeAsset(amountIn.tokenAddress, chain) && isWrappedNativeAsset(tokenAddress, chain))
  )
}

/**
 * Used to avoid problems with proportional SDK priceImpact queries
 * Rounds down to avoid balance overflow issues
 */
export function roundDecimals(humanAmountsIn: HumanTokenAmountWithAddress[], maxDecimals = 10) {
  return humanAmountsIn.map(({ humanAmount, tokenAddress }) => ({
    humanAmount: bn(humanAmount).toFixed(maxDecimals, BigNumber.ROUND_DOWN) as HumanAmount,
    tokenAddress,
  }))
}

export function emptyTokenAmounts(pool: Pool): TokenAmount[] {
  return pool.poolTokens.map(token => TokenAmount.fromHumanAmount(token as unknown as Token, '0'))
}

export function shouldShowNativeWrappedSelector(token: ApiToken, pool: Pool) {
  return supportsWethIsEth(pool) && isNativeOrWrappedNative(token.address as Address, token.chain)
}

export function replaceWrappedWithNativeAsset(
  validTokens: ApiToken[],
  nativeAsset: ApiToken | undefined
) {
  if (!nativeAsset) return validTokens
  return validTokens.map(token => {
    if (isWrappedNativeAsset(token.address as Address, nativeAsset.chain)) {
      return nativeAsset
    } else {
      return token
    }
  })
}

export function injectNativeAsset(
  validTokens: ApiToken[],
  nativeAsset: ApiToken | undefined,
  pool: Pool
) {
  const isWrappedNativeAssetInPool = validTokens.find(token =>
    isWrappedNativeAsset(token.address as Address, pool.chain)
  )

  if (
    isWrappedNativeAssetInPool &&
    nativeAsset &&
    // Cow AMM pools don't support wethIsEth
    !isCowAmmPool(pool.type)
  ) {
    return [nativeAsset, ...validTokens]
  }
  return validTokens
}

export function hasNoLiquidity(pool: Pool): boolean {
  return isZero(pool.dynamicData.totalShares)
}

// When the pool has version < v3, it adds extra buildCall params (sender and recipient) that must be present only in V1/V2
export function formatBuildCallParams<T>(buildCallParams: T, account: Address) {
  // sender and recipient must be defined only for v1 and v2 pools
  return { ...buildCallParams, sender: account, recipient: account }
}

export function toTokenAmountsIn(
  sdkQueryOutput: AddLiquidityQueryOutput,
  pool: Pool
): TokenAmountIn[] | undefined {
  if (!sdkQueryOutput) return
  return sdkQueryOutput.amountsIn.map(amountIn => ({
    address: amountIn.token.address,
    amount: amountIn.amount,
    symbol: amountIn.token.symbol || getActionableTokenSymbol(amountIn.token.address, pool),
  }))
}

export function getSender(userAddress?: Address): Address | undefined {
  if (userAddress === ('' as Address)) return undefined // '' would cause an error in the SDK
  return userAddress
}
