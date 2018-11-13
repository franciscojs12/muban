/**
 * Generation the production pages from the compiled partials and json files
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const loadData = require('json-import-loader').loadData;
// eslint-disable-next-line import/no-extraneous-dependencies
const Handlebars = require('handlebars');
// eslint-disable-next-line import/no-extraneous-dependencies
const recursive = require('recursive-readdir');
// eslint-disable-next-line import/no-extraneous-dependencies
const beautifyHtml = require('js-beautify').html;
const config = require('../config');

const projectRoot = path.resolve(__dirname, '../../');

module.exports = function(cb, cleanupAfter = true) {
  const partialsPath = path.join(config.buildPath, 'asset/partials.js');
  if (!fs.existsSync(partialsPath)) {
    throw new Error('Partials file not present, run `yarn build partials` first.');
  }
  // eslint-disable-next-line import/no-unresolved
  const { appTemplate } = require(partialsPath);

  const htmlTemplate = Handlebars.compile(
    fs.readFileSync(path.resolve(__dirname, './template.hbs'), 'utf-8'),
  );

  console.log();
  console.log();

  // read json files and generate a page for each json
  recursive(
    path.resolve(projectRoot, 'src/data'),
    [file => path.extname(file) !== '.json' && path.extname(file) !== '.yaml'],
    (err, files) => {
      files
        .map(f => path.basename(f))
        .sort()
        .forEach(file => {
          const page = path.basename(file, `.${file.split('.').pop()}`);
          // eslint-disable-next-line import/no-dynamic-require, global-require
          const data = loadData(path.resolve(__dirname, `../../src/data/${file}`), {
            resolvers: {
              yaml: path => yaml.safeLoad(fs.readFileSync(path, 'utf8')),
            },
          });
          const content = appTemplate(data);

          console.log(`Generating... ${page}.html`);

          const templateResult = htmlTemplate({
            content,
            page,
            publicPath: config.dist.publicPath,
          });

          let html = beautifyHtml(templateResult, { indent_size: 2 });

          html = inline(html, page);

          fs.writeFileSync(path.resolve(config.buildPath, `${page}.html`), html, 'utf-8');
        });

      // cleanup, doesn't belong in the build folder
      if (cleanupAfter) {
        fs.unlink(partialsPath);
      }

      cb(null);
    },
  );
};

function inline(html, page) {
  // TODO
  // if (isProductionBuild) {
  //   // Replace "local" links with production links
  //   html = html.replace(/(href|data-target)="([^"]*)"/gi, (match, attr, value) => {
  //     const [page, anchor] = value.split('#');
  //     const replacement = linkReplacements[page];
  //     if (!replacement) return `${attr}="${value}"`;
  //     const newLink = anchor ? `${attr}="${replacement}#${anchor}"` : `${attr}="${replacement}"`;
  //     return newLink;
  //   });
  // }

  // this will inline css, when just checking filesize, you can comment this out so it will load them separately in devtools
  let css = fs.readFileSync(path.resolve(projectRoot, 'dist/site/asset/common.css'), 'utf-8');
  html = html.replace(
    '<link rel="stylesheet" href="/asset/common.css">',
    `<style>
  ${css}
</style>`,
  );

  css = fs.readFileSync(path.resolve(projectRoot, `dist/site/asset/${page}.css`), 'utf-8');
  html = html.replace(
    `<link rel="stylesheet" href="/asset/${page}.css">`,
    `<style>
  ${css}
</style>`,
  );
  return html;
}
