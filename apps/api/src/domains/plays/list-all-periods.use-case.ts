import z from "zod";
import { Result } from "@marivo/utils";
import { type UseCase } from "../../shared/use-case.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";

export const ListAllPeriodsUseCaseOutputSchema = z.object({
  periods: z.array(z.string()),
});

type ListAllPeriodsUseCaseOutput = z.infer<typeof ListAllPeriodsUseCaseOutputSchema>;

export class ListAllPeriodsUseCase implements UseCase<{ success: ListAllPeriodsUseCaseOutput }> {
  constructor(repository: PlaysCollectionRepository) {
    this.repository = repository;
  }

  async execute() {
    const result = await this.repository.findAllPeriods();
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ periods: result.dataOrThrow().map((record) => record.get("key")) });
  }

  private repository: PlaysCollectionRepository;
}
