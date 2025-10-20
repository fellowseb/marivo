import type { UseQueryResult } from '@tanstack/react-query';
import type { DecorateQueryProcedure } from '@trpc/tanstack-react-query';
import type { LegitAny } from '@marivo/utils';
import { useBackgroundSync } from './use-background-sync';

export function useTrpcBackgroundSync(params: {
  procedure: DecorateQueryProcedure<LegitAny>;
  query: UseQueryResult<unknown, unknown>;
}) {
  useBackgroundSync({
    serviceId: params.procedure.pathKey()[0].join('-'),
    onRefresh: () => params.query.refetch(),
  });
}
