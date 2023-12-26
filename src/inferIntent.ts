import { Request } from 'express';

export default function inferIntent(req: Request): {
  intent: 'stream' | 'create-run';
  responseType: 'text' | 'json' | 'n/a';
} {
  // todo much more robust of course
  if (req.path.includes('/create')) {
    return {
      intent: 'create-run',
      responseType: 'json',
    };
  }

  return {
    intent: 'stream',
    responseType: 'text',
  };
}
