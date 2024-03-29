// cost is in US cents ("credits").
// a reasonable minimum cost for gpt-3.5-turbo is 5 tokens => 0.0005 credits. let's be consistent about using 0.00001 credit as the minimum division.
// == 100 nanodollars. do we need a word for this? like a satoshi? how about a quastra? thanks copilot
// 0.00001 credits is a quastra. one dollar is 10 million quastrae. one cent is 100,000 quastrae.

// yeah we're gonna need a library

import * as math from 'mathjs';

const { add, unit } = math;

// these are stateful, so we need to prevent them from running more than once
try {
  math.createUnit('dollar', { aliases: ['dollars'] });
  math.createUnit('cent', {
    definition: '0.01 dollars',
    aliases: ['cents'],
  });
  math.createUnit('credit', {
    definition: '1 cent',
    aliases: ['credits'],
  });
  math.createUnit('quastra', {
    definition: '0.00001 credits',
    aliases: ['quastrae'],
  });
  math.createUnit('intoken', { aliases: ['intokens'], prefixes: 'long' });
  math.createUnit('outtoken', { aliases: ['outtokens'], prefixes: 'long' });
} catch (e) {
  // ignore. i wish there were a better way to check but the source code seems to say no
}

export { add, unit };
