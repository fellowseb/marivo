import { Router } from 'express';
import { useCase } from '../../shared/delivery.ts';
import { GetAllPlaysUseCaseOutputSchema } from './get-all-plays.use-case.ts';
import { providers } from './plays.providers.ts';

const router: Router = Router();
router.get(
  '/',
  useCase({
    provider: providers.GetAllPlaysUseCase,
    outputSchema: GetAllPlaysUseCaseOutputSchema,
  }),
);

export default router;
