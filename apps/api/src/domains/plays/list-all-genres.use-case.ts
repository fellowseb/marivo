import z from "zod";
import { Result } from "@marivo/utils";
import { type UseCase } from "../../shared/use-case.ts";
import type { PlaysCollectionRepository } from "./plays-collection.repository.ts";

export const ListAllGenresUseCaseOutputSchema = z.object({
  genres: z.array(z.string()),
});

type ListAllGenresUseCaseOutput = z.infer<typeof ListAllGenresUseCaseOutputSchema>;

export class ListAllGenresUseCase implements UseCase<{ success: ListAllGenresUseCaseOutput }> {
  constructor(repository: PlaysCollectionRepository) {
    this.repository = repository;
  }

  async execute() {
    const result = await this.repository.findAllGenres();
    if (result.isFailure()) {
      return Result.failure(result.errorOrThrow());
    }
    return Result.ok({ genres: result.dataOrThrow().map((record) => record.get("key")) });
  }

  private repository: PlaysCollectionRepository;
}
