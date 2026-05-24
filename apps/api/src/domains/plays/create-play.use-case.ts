import z from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { Result } from '@marivo/utils';
import {
  AuthenticatedUseCase,
  UserContextService,
} from '../../shared/use-case.ts';
import type { UserPlaysRepository } from './user-plays.repository.ts';
import type { AppError } from '../../shared/error.ts';
import type { ScriptRepository } from '../script/script.repository.ts';

export const CreatePlayUseCaseInputSchema = z.object({
  title: z.string().max(100),
});

export const CreatePlayUseCaseOutputSchema = z.object({
  uri: z.string().length(36),
});

type CreatePlayUseCaseInput = z.infer<typeof CreatePlayUseCaseInputSchema>;
type CreatePlayUseCaseOutput = z.infer<typeof CreatePlayUseCaseOutputSchema>;

class CreatePlayUseCase extends AuthenticatedUseCase<{
  params: CreatePlayUseCaseInput;
  success: CreatePlayUseCaseOutput;
  failure: AppError;
}> {
  constructor(
    scriptRepository: ScriptRepository,
    playsRepository: UserPlaysRepository,
    userContextService: UserContextService,
  ) {
    super(userContextService);
    this.scriptRepository = scriptRepository;
    this.playsRepository = playsRepository;
  }

  async execute(input: CreatePlayUseCaseInput) {
    const { title } = input;
    const uri = uuidv7();
    const scriptId = await this.scriptRepository.createScript();
    await this.playsRepository.createPlay({ title, uri, scriptId });
    return Result.ok({ uri });
  }

  private scriptRepository: ScriptRepository;
  private playsRepository: UserPlaysRepository;
}

export default CreatePlayUseCase;
