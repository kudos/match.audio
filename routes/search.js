import { parse } from 'url';
import kue from 'kue';
import debuglog from 'debug';

import lookup from '../lib/lookup';
import services from '../lib/services';
import { find, create } from '../lib/share';

const debug = debuglog('combine.fm:search');

const queue = kue.createQueue({
  redis: process.env.REDIS_URL,
});

export default function* () {
  const url = parse(this.request.body.url);
  debug(`URL ${url.href}`);
  this.assert(url.host, 400, { error: { message: 'You need to submit a url.' } });

  try {
    const music = yield lookup(this.request.body.url);

    this.assert(music, 400, { error: { message: 'No supported music found at that link :(' } });

    let share = yield find(music);

    if (!share) {
      share = yield create(music);

      services.forEach((service) => {
        if (service.id !== share.service) {
          const job = queue.create('search', { share, service }).save((err) => {
            debug(err || job.id);
          });
        }
      });
    }

    share = share.toJSON();

    share.id = share.externalId;

    const unmatched = services.filter(service =>
      !share.matches.find(match => match.service === service.id));

    share.matches = share.matches.concat(unmatched.map((service) => {
      return {
        service: service.id,
        matching: true,
      };
    }));

    share.matches = share.matches.sort(a => !!a.externalId);

    this.body = share;
  } catch (e) {
    this.throw(400, { error: { message: 'Unexpected error looking up music. Please try again later.' } });
    throw e;
  }
}
