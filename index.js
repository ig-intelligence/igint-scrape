"use strict";

const debug = require('debug')('igint-scrape:main');
const express = require('express');
const logger = require('morgan');
const ig_posts_scraper = require('instagram-screen-scrape');

const app = express();
app.use(logger('dev'));

const SCRAPE_LIMIT = 50;

function handler(req, res) {
  const username = req.params.username;
  const last_modified = req.get('If-Range') || null;

  console.log(last_modified);

  let last_modified_ts;
  if (last_modified) {
    last_modified_ts = Date.parse(last_modified);
  }

  const posts_stream = new ig_posts_scraper.InstagramPosts({username});

  posts_stream.on('error', function (err) {
    if (err === 'Instagram returned status code: 404') {
      res.sendStatus(404);
    } else {
      console.error(err);
    }
  });

  let first_post_out = false;
  let done = false;
  let count = 0;

  const handle_post = function (post) {
    if (!first_post_out) {
      first_post_out = true;

      if (last_modified && post.time * 1000 < last_modified_ts) {
        res.sendStatus(204);
      }

      res.status(200);
      res.type('json');

      res.write('[' + JSON.stringify(post));
    } else {
      if (last_modified && post.time * 1000 < last_modified_ts) {
        done = true;
      } else {
        res.write(',' + JSON.stringify(post));
      }
    }

    count += 1;

    if (count === SCRAPE_LIMIT) {
      done = true;
    }

    if (done) {
      posts_stream.removeListener('data', handle_post);
      res.write(']');
      return res.end();
    }
  };

  posts_stream.on('data', handle_post);

  posts_stream.on('close', () => res.end())
}

app.get('/:username', handler);

app.get('/version', (req, res) => res.send(require('./package.json').version));

const port = process.env.port || 3000;

app.listen(port, () => {
  debug(`Listening on port ${port}.`);
});