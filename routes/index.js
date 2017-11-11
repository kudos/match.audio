import debuglog from 'debug';

import services from '../lib/services';
import render from '../lib/render';
import models from '../models';

const debug = debuglog('combine.fm:share');

const recentQuery = {
  include: [
    { model: models.artist },
    { model: models.match },
  ],
  limit: 9,
  order: [
    ['updatedAt', 'DESC'],
  ],
};

export default function* () {
  const recentAlbums = yield models.album.findAll(recentQuery);
  const recentTracks = yield models.track.findAll(recentQuery);

  const initialState = {
    recents: recentAlbums.map(album => album.toJSON())
      .concat(recentTracks.map(track => track.toJSON()))
      .sort((a, b) => a.createdAt < b.createdAt).slice(0, 9),
    services: services.map(service => service.id),
  };

  const url = '/';

  const html = yield render(url, initialState);

  const head = {
    title: 'Share Music',
    shareUrl: `${this.request.origin}${url}`,
    image: `${this.request.origin}/assets/images/logo-512.png`,
    share: false,
  };

  this.set('Cache-Control', 'no-cache');

  yield this.render('index', {
    initialState,
    head,
    html,
  });
}
