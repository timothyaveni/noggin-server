import { Request } from 'express';
import { adjectives, animals } from 'unique-names-generator';

// return uniqueNamesGenerator({
//   dictionaries: [adjectives, animals, numberDictionary],
//   length: 3,
//   separator: '-',
//   style: 'lowerCase',
// });

// e.g. 'dry-goose-1234' -- always 4 digits, too
const slugRegexBounded = new RegExp(
  `^(${adjectives.join('|')})-(${animals.join('|')})-(\\d{4})$`,
  'i',
);

const slugRegexUnbounded = new RegExp(
  `(?<slug>(${adjectives.join('|')})-(${animals.join('|')})-(\\d{4}))`,
  'ig',
);

const inferNogginSlug = (req: Request): string | null => {
  console.log('inferNogginSlug');
  const { path } = req;

  let properPathSlug = null;
  const allPathSlugs = [];
  if (path.startsWith('/')) {
    const rest = path.slice(1);
    if (slugRegexBounded.test(rest)) {
      properPathSlug = rest;
    }

    const matches = path.match(slugRegexUnbounded);
    if (matches) {
      allPathSlugs.push(...matches);
    }
  }

  console.log({ properPathSlug, allPathSlugs, path });

  // let properQuerySlug = null;
  // const allQuerySlugs = [];

  // json or formdata, whichever seems to fit
  // let properBodySlug = null;
  // const allBodySlugs = [];

  // let properHeaderSlug = null;

  // console.log({ properPathSlug, allPathSlugs });

  // console.log(adjectives);
  // console.log(req.path);

  return properPathSlug || allPathSlugs[0] || null;
};

export default inferNogginSlug;
