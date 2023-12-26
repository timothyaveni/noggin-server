import { Request } from 'express';

const inferNogginAPIKey = (req: Request): string | null => {
  // todo actually write this -- check key regex etc -- copilot just spammed this block in for me
  console.log('rh', req.headers);
  if (req.headers.authorization) {
    const [type, key] = req.headers.authorization.split(' ');
    if (type === 'Bearer') {
      return key;
    }
  }

  return req.query.key?.toString() || null;
  // todo: when getting from headers, allow bearer/basic auth. also allow base64 encoded
};

export default inferNogginAPIKey;
