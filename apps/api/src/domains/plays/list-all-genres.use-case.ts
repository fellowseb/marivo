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
    const genres = (await this.repository.findAllGenres())
      .dataOrThrow()
      .map((record) => record.get("key"));
    return Result.ok({ genres });
  }

  private repository: PlaysCollectionRepository;
}
