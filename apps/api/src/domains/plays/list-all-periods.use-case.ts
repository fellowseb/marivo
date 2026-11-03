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
    const periods = (await this.repository.findAllPeriods())
      .dataOrThrow()
      .map((record) => record.get("key"));
    return Result.ok({ periods });
  }

  private repository: PlaysCollectionRepository;
}
