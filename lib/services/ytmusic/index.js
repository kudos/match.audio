import urlMatch from './url.js';
import querystring from 'querystring';
import request from 'superagent';
import { parse } from 'url';
import debuglog from 'debug';

const debug = debuglog('combine.fm:ytmusic');

const standard_body = {'context': {'capabilities': {}, 'client': {'clientName': 'WEB_REMIX', 'clientVersion': '0.1', 'experimentIds': [], 'experimentsToken': '', 'gl': 'DE', 'hl': 'en', 'locationInfo': {'locationPermissionAuthorizationStatus': 'LOCATION_PERMISSION_AUTHORIZATION_STATUS_UNSUPPORTED'}, 'musicAppInfo': {'musicActivityMasterSwitch': 'MUSIC_ACTIVITY_MASTER_SWITCH_INDETERMINATE', 'musicLocationMasterSwitch': 'MUSIC_LOCATION_MASTER_SWITCH_INDETERMINATE', 'pwaInstallabilityStatus': 'PWA_INSTALLABILITY_STATUS_UNKNOWN'}, 'utcOffsetMinutes': 60}, 'request': {'internalExperimentFlags': [{'key': 'force_music_enable_outertube_tastebuilder_browse', 'value': 'true'}, {'key': 'force_music_enable_outertube_playlist_detail_browse', 'value': 'true'}, {'key': 'force_music_enable_outertube_search_suggestions', 'value': 'true'}], 'sessionIndex': {}}, 'user': {'enableSafetyMode': false}}}
const standard_headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "Content-Type": "application/json",
  "X-Goog-AuthUser": "0",
  "origin": "https://music.youtube.com",
  "X-Goog-Visitor-Id": "CgtWaTB2WWRDeEFUYyjhv-X8BQ%3D%3D"
}
const standard_params = { alt: "json", key: "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30"} // INNERTUBE_API_KEY from music.youtube.com

const base_filter = "Eg-KAQwIA"
const albums_filter = "BAAGAEgACgA"
const tracks_filter = "RAAGAAgACgA"
// If you make a typo, ytmusic searches for a correction. With this filter it will look for the exact match
// since we don't let users type, no sense in letting it autocorrect
const exact_search_filter = "MABqChAEEAMQCRAFEAo%3D"

// The logic here comes from https://github.com/sigma67/ytmusicapi
// If something doesn't work, looking up back there might be a good idea.
export async function search(data, original = {}) {
  let query;
  const various = data.artist.name === 'Various Artists' || data.artist.name === 'Various';
  if (various) {
    data.artist.name = "";
  }
  if (data.type == "track") {
    query = [data.name, data.artist.name, data.albumName]
  } else if (data.type == "album") {
    query = [data.name, data.artist.name]
  } else {
    throw new Error();
  }
  // Add "" to try and make the search better, works for stuff like "The beatles" to reduce noise
  query = query.filter(String).map((entry) => '"' + entry + '"').join(" ")

  let params = base_filter + (data.type == "track" ? tracks_filter : albums_filter) + exact_search_filter
  let request_body = {query, params, ...standard_body }

  const { body } = await request.post("https://music.youtube.com/youtubei/v1/search")
    .set(standard_headers)
    .query(standard_params)
    .send(request_body)

  // no results
  if (body.contents === undefined) {
    debug("Empty body, no results")
    return { service: 'ytmusic' };
  }

  let results;
  if (body.contents.tabbedSearchResultsRenderer !== undefined) {
    results = body.contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content
  } else {
    results = body.contents.sectionListRenderer.contents
  }

  // no results
  if (results.length == 1 && results.itemSectionRenderer !== undefined) {
    debug("Only itemSectionRenderer, no results")
    return { service: 'ytmusic' };
  }

  for (const result of results) {
    if (result.musicShelfRenderer === undefined) {
      continue;
    }

    const matches = parse_result_content(result.musicShelfRenderer.contents, data.type)
    // This could probably be done without extra lookups, but it would involve parsing deeply the response.
    // If there's some kind of rate limit on ytmusic's side, this is a good play to start refactoring
    for (const match of matches) {
      const possibleMatch = await lookupId(match, data.type)
      const nameMatch = possibleMatch.name == data.name;
      const artistMatch = data.artist.name == "" ? possibleMatch.artist.name === 'Various Artists' : data.artist.name == possibleMatch.artist.name;
      if (nameMatch && artistMatch) {
        return possibleMatch
      }
    }
  }
  debug("Finished looking up, no results")
  return { service: 'ytmusic' };
}

function parse_result_content(contents, type) {
  let matches = []
  for (const result of contents) {
    const data = result.musicResponsiveListItemRenderer;
    const informed_type = data.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text
    if (["Video", "Playlist"].includes(informed_type)) {
      continue;
    }
    let matchId;
    if (type == "track") {
      matchId = data.overlay?.musicItemThumbnailOverlayRenderer.content.musicPlayButtonRenderer.playNavigationEndpoint.watchEndpoint?.videoId
    } else if (type == "album") {
      matchId = data.navigationEndpoint?.browseEndpoint.browseId
    }
    if(matchId) {
      matches.push(matchId)
    }
  }

  return matches
}

async function lookupTrack(id) {
  let endpoint = "https://www.youtube.com/get_video_info"
  const { body } = await request.get(endpoint).query({ video_id: id, hl: "en", el: "detailpage" })

  if (body.player_response === undefined) {
    throw new Error();
  }
  let player_response = JSON.parse(body.player_response)
  let song_meta = player_response.videoDetails

  let description = song_meta.shortDescription.split("\n\n")
  let album_name = description[2]
  let artists = description[1].split(' · ').slice(1)

  const artwork = {
    small: song_meta.thumbnail.thumbnails[0].url,
    large: song_meta.thumbnail.thumbnails[song_meta.thumbnail.thumbnails.length-1].url,
  };

  return Promise.resolve({
    service: 'ytmusic',
    type: 'track',
    id: song_meta.videoId,
    name: song_meta.title,
    streamUrl: `https://music.youtube.com/watch?v=${song_meta.videoId}`,
    purchaseUrl: null,
    artwork,
    artist: {
      name: artists.join(", "),
    },
    album: {
      name: album_name,
    },
  });
}

async function lookupAlbum(id) {
  let request_body = {'browseEndpointContextSupportedConfigs': {'browseEndpointContextMusicConfig': {'pageType': 'MUSIC_PAGE_TYPE_ALBUM'}}, 'browseId': id, ...standard_body }

  const { body } = await request.post("https://music.youtube.com/youtubei/v1/browse")
    .set(standard_headers)
    .query(standard_params)
    .send(request_body)

  let data = body.frameworkUpdates?.entityBatchUpdate.mutations
  if (data === undefined) {
    throw new Error()
  }
  let album_data = data.find((entry) => {
    if (entry.payload.musicAlbumRelease !== undefined) {
      return true
    }
    return false
  }).payload.musicAlbumRelease;
  let artists;
  if (album_data.primaryArtists) {
    artists= data.filter((entry) => {
      if (entry.payload.musicArtist !== undefined) {
        if (album_data.primaryArtists.includes(entry.entityKey)) {
          return true
        }
      }
      return false
    }).map((entry) => entry.payload.musicArtist.name);
  } else { // Various artists, most likely
    artists = [album_data.artistDisplayName];
  }

  const artwork = {
    small: album_data.thumbnailDetails.thumbnails[0].url,
    large: album_data.thumbnailDetails.thumbnails[album_data.thumbnailDetails.thumbnails.length-1].url,
  };
  return Promise.resolve({
    service: 'ytmusic',
    type: 'album',
    id,
    name: album_data.title,
    streamUrl: null,
    streamUrl: `https://music.youtube.com/browse/${id}`,
    purchaseUrl: null,
    artwork,
    artist: {
      name: artists.join(", "),
    },
    playlistId: album_data.audioPlaylistId
  });
}

async function lookupPlaylist(id) {
  let request_body = {enablePersistentPlaylistPanel: true, isAudioOnly: true, playlistId: id, ...standard_body}
  const { body } = await request.post("https://music.youtube.com/youtubei/v1/next")
    .set(standard_headers)
    .query(standard_params)
    .send(request_body)

  // The playlist object is rather complex, but here's what I'm doing: I'll parse the very minimum to get to the first track.
  // At that point, I'm going to check the id of the album in that track. And make a lookup on it. If the album looked up
  // has the same playlist id as the one I'm looking up, it means it's an album and not a playlist and we're good.
  const watchNextRenderer = body.contents.singleColumnMusicWatchNextResultsRenderer.tabbedRenderer.watchNextTabbedResultsRenderer
  const firstTrack = watchNextRenderer.tabs[0].tabRenderer.content.musicQueueRenderer.content.playlistPanelRenderer.contents[0]
  const runs = firstTrack.playlistPanelVideoRenderer.longBylineText.runs
  const reverse_last_artist_idx = runs.reverse().findIndex((entry) => {
    if (entry.navigationEndpoint === undefined) {
      return false
    }
    return entry.navigationEndpoint.browseEndpoint.browseId.startsWith("UC") ||
      entry.navigationEndpoint.browseEndpoint.browseId.startsWith("FEmusic_library_privately_owned_artist")
  });
  if (reverse_last_artist_idx == -1) {
    debug("Could not find an artist. Implement extra logic from ytmusicapi!");
    throw new Error();
  }
  const last_artist_idx = runs.length - reverse_last_artist_idx - 1;
  if (runs.length - last_artist_idx != 5) {
    debug("No album found, can't find this.");
    throw new Error();
  }
  const albumId = runs[last_artist_idx + 2].navigationEndpoint.browseEndpoint.browseId
  const possibleAlbum = await lookupAlbum(albumId)
  if (possibleAlbum.playlistId = id) {
    return possibleAlbum;
  }
  throw new Error();
}

export async function lookupId(id, type) {
  if (type == 'track') {
    return lookupTrack(id);
  } else if (type == 'album') {
    return lookupAlbum(id);
  } else if (type == 'playlist') {
    return lookupPlaylist(id);
  }
  return { service: 'ytmusic', id };
}

export function parseUrl(url) {
  const parsed = parse(url);
  const query = querystring.parse(parsed.query);
  let id = query.v;
  let list_id = query.list;
  let match;

  if (parsed.path.match(/^\/watch/) && id !== undefined) {
    return lookupId(id, 'track');
  } else if (match = parsed.path.match(/^\/browse\/([A-Za-z0-9_]+)/)) {
    return lookupId(match[1], 'album');
  } else if (match = parsed.path.match(/^\/playlist/) && list_id !== undefined) {
    return lookupId(list_id, 'playlist');
  }
  throw new Error();
}
export const id = 'ytmusic';
export const match = urlMatch;