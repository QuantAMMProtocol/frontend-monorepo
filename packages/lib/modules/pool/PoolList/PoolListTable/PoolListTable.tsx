'use client'

import { PaginatedTable } from '@repo/lib/shared/components/tables/PaginatedTable'
import { PoolListTableHeader } from './PoolListTableHeader'
import { PoolListTableRow } from './PoolListTableRow'
import { getPaginationProps } from '@repo/lib/shared/components/pagination/getPaginationProps'
import { PoolListItem } from '../../pool.types'
import { Card, Skeleton } from '@chakra-ui/react'
import { useIsMounted } from '@repo/lib/shared/hooks/useIsMounted'
import { usePoolList } from '../PoolListProvider'
import { useCallback, useMemo } from 'react'

interface Props {
  pools: PoolListItem[]
  count: number
  loading: boolean
}

export function PoolListTable({ pools, count, loading }: Props) {
  const isMounted = useIsMounted()
  const {
    queryState: { pagination, setPagination, userAddress },
  } = usePoolList()
  const paginationProps = getPaginationProps(count || 0, pagination, setPagination)
  const showPagination = !!pools.length && !!count && count > pagination.pageSize

  const numberColumnWidth = userAddress ? '120px' : '175px'
  const furthestLeftColWidth = '120px'

  const rowProps = useMemo(
    () => ({
      px: { base: 'sm', sm: '0' },
      gridTemplateColumns: `32px minmax(320px, 1fr) 180px ${
        userAddress ? furthestLeftColWidth : ''
      } ${userAddress ? numberColumnWidth : furthestLeftColWidth} ${numberColumnWidth} 200px`,
      alignItems: 'center',
      gap: { base: 'xxs', xl: 'lg' },
    }),
    [userAddress, furthestLeftColWidth, numberColumnWidth]
  )

  const needsMarginForPoints = pools.some(pool => pool.tags?.some(tag => tag && tag === 'POINTS'))

  const renderTableRow = useCallback(
    ({ item, index }: { item: PoolListItem; index: number }) => (
      <PoolListTableRow
        keyValue={index}
        needsMarginForPoints={needsMarginForPoints}
        pool={item}
        {...rowProps}
      />
    ),
    [needsMarginForPoints, rowProps]
  )

  const renderTableHeader = useCallback(() => <PoolListTableHeader {...rowProps} />, [rowProps])

  if (!isMounted) return <Skeleton height="500px" w="full" />

  return (
    <Card
      alignItems="flex-start"
      left={{ base: '-4px', sm: '0' }}
      p={{ base: '0', sm: '0' }}
      position="relative"
      // fixing right padding for horizontal scroll on mobile
      pr={{ base: 'lg', sm: 'lg', md: 'lg', lg: '0' }}
      w={{ base: '100vw', lg: 'full' }}
    >
      <PaginatedTable
        getRowId={item => item.id}
        items={pools}
        loading={loading}
        noItemsFoundLabel="No pools found"
        paginationProps={paginationProps}
        renderTableHeader={renderTableHeader}
        renderTableRow={renderTableRow}
        showPagination={showPagination}
      />
    </Card>
  )
}
