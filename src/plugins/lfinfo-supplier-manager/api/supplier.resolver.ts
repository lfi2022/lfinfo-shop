import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { SupplierManagerService } from '../services/supplier-manager.service';
@Resolver()
export class SupplierAdminResolver {
  constructor(private suppliers: SupplierManagerService) {}
  @Query() @Allow(Permission.ReadCatalog) lfinfoSupplierConfigured() { return this.suppliers.isConfigured(); }
  @Query() @Allow(Permission.ReadCatalog) lfinfoSupplierCatalogue(@Args('input') input: any) { return this.suppliers.search(input); }
  @Query() @Allow(Permission.ReadCatalog) lfinfoSupplierLogs() { return this.suppliers.logs(); }
  @Mutation() @Allow(Permission.CreateCatalog) lfinfoSupplierImport(@Ctx() ctx: RequestContext, @Args('items') items: any[], @Args('marginPercent') marginPercent: number, @Args('fixedAmount') fixedAmount: number, @Args('useRecommendedPrice') useRecommendedPrice = true) { return this.suppliers.import(ctx, items, { marginPercent, fixedAmount, useRecommendedPrice }); }
  @Mutation() @Allow(Permission.UpdateCatalog) lfinfoSupplierQueueSync() { return this.suppliers.queueSync(); }
}
