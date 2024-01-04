import { Request } from 'express';

// responsetype isn't the output format of the _model_ but the output format of the _request_ --
// a text model outputting json is 'text' here, unless we requested in a way that asks for metadata (which is offered in json).
// an image model might return 'text' if it's just returning a URL or 'image' if it's returning the image itself (or 'json' even in another case)
export default function inferIntent(req: Request): {
  intent: 'stream' | 'create-run';
  responseType: 'text' | 'json' | 'n/a'; // TODO image is one here
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
