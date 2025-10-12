import type { Application } from 'express';
import { useCase } from '../../shared/delivery.ts';
import { PlaysRepository } from './plays.repository.ts';
import {
  GetAllPlaysUseCase,
  GetAllPlaysUseCaseOutputSchema,
} from './get-all-plays.use-case.ts';
import { UserContextService } from '../../shared/use-case.ts';

const repository = new PlaysRepository();

export default {
  setup: (app: Application) => {
    app.get(
      '/plays',
      useCase({
        provider: {
          instantiate(req) {
            const userContextService = new UserContextService(req);
            return new GetAllPlaysUseCase(repository, userContextService);
          },
        },
        outputSchema: GetAllPlaysUseCaseOutputSchema,
      }),
    );
  },
};
