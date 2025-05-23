import networkConfig from '@repo/lib/config/networks/mainnet'
import { balAddress, wETHAddress } from '@repo/lib/debug-helpers'
import { defaultTestUserAccount } from '@repo/test/anvil/anvil-setup'
import { aBalWethPoolElementMock } from '@repo/lib/test/msw/builders/gqlPoolElement.builders'
import { Pool } from '../../../pool.types'
import { QueryRemoveLiquidityInput, RemoveLiquidityType } from '../remove-liquidity.types'
import { SingleTokenRemoveLiquidityV2Handler } from './SingleTokenRemoveLiquidityV2.handler'
import { selectRemoveLiquidityHandler } from './selectRemoveLiquidityHandler'

function selectSingleTokenHandler(pool: Pool): SingleTokenRemoveLiquidityV2Handler {
  return selectRemoveLiquidityHandler(
    pool,
    RemoveLiquidityType.SingleToken
  ) as SingleTokenRemoveLiquidityV2Handler
}

const defaultQueryInput: QueryRemoveLiquidityInput = {
  humanBptIn: '1',
  tokenOut: balAddress,
  userAddress: defaultTestUserAccount,
}

const defaultBuildInput = { account: defaultTestUserAccount, slippagePercent: '0.2' }

describe('When removing unbalanced liquidity for a weighted V2 pool', () => {
  const v2poolMock = aBalWethPoolElementMock() // 80BAL-20WETH

  test('queries amounts out', async () => {
    const handler = selectSingleTokenHandler(v2poolMock)

    const result = await handler.simulate(defaultQueryInput)

    const [balTokenAmountOut, wEthTokenAmountOut] = result.amountsOut

    expect(balTokenAmountOut.token.address).toBe(balAddress)
    expect(balTokenAmountOut.amount).toBeGreaterThan(2000000000000000000n)

    expect(wEthTokenAmountOut.token.address).toBe(wETHAddress)
    expect(wEthTokenAmountOut.amount).toBe(0n)
  })

  test('builds Tx Config', async () => {
    const handler = selectSingleTokenHandler(v2poolMock)

    const inputs: QueryRemoveLiquidityInput = {
      humanBptIn: '1',
      tokenOut: balAddress,
      userAddress: defaultTestUserAccount,
    }

    const queryOutput = await handler.simulate(inputs)

    const result = await handler.buildCallData({ ...defaultBuildInput, queryOutput })

    expect(result.to).toBe(networkConfig.contracts.balancer.vaultV2)
    expect(result.data).toBeDefined()
  })
})
