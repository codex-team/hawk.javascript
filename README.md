# Hawk JavaScript Catcher

[Hawk](https://github.com/codex-team/hawk) is a platform for errors and logs monitoring.

You can find web interface and documentation on [hawk.so/docs](https://hawk.so/docs).

## Installation

We recommend to add Hawk script to page above others to prevent missing any errors.

### Install via NPM or Yarn

Install package

```shell
npm install @hawk.so/javascript --save
```

```shell
yarn add @hawk.so/javascript
```

Then import `@hawk.so/javascript` module to your code.

```js
import HawkCatcher from '@hawk.so/javascript';
````

### Load from CDN

Get newest bundle path from [RawGit](https://rawgit.com) — open site and paste link to JS bundle in repository.

`https://github.com/codex-team/hawk.javascript/master/dist/hawk.js`

> Note: use `production` link with commit hash to avoid issues with caching.

Then require this script on your site.

```
<script src="..." async></script>
```

### Or upload it to your project

Download [hawk.js](dist/hawk.js) file and add it to all pages of your site.
```
<script src="hawk.js" async></script>
```

## Usage

### Get token

First of all, you should register an account on [hawk.so](https://hawk.so/join).

Then [create a new Project](https://hawk.so/websites/create).
You'll get an Integration Token.

### Initialize Catcher

Create `HawkCatcher` class instance when script will be ready and pass your Integration Token:

```js
const hawk = new HawkCatcher({token: 'INTEGRATION_TOKEN'});

// or 

const hawk = new HawkCatcher('INTEGRATION_TOKEN');
```

Alternately, add `onload="const hawk = new HawkCatcher({token: 'INTEGRATION_TOKEN'})"` attribute to the `<script>` tag.

```html
<script src="https://cdn.rawgit.com/codex-team/hawk.javascript/master/hawk.js" onload="const hawk = new HawkCatcher({token: 'INTEGRATION_TOKEN'})"></script>
```

Initialization settings:

| name | type | required | description |
| -- | -- | -- | -- |
| `token` | string | **required** | Your project's Integration Token |
| `release` | string/number | optional | Unique identifier of the release. Used for source map consuming (see below) |
| `user` | {id: string, name?: string, image?: string, url?: string} | optional | Current authenticated user |

Other available [initial settings](types/hawk-initial-settings.d.ts) are described at the type definition.

## Source maps consuming

If your bundle is minified, it is useful to pass source-map files to the Hawk. After that you will see beautiful original source code lines in Hawk Garage instead of minified code.

To enable source map consuming you should do two things:

- Send the source map and the release identifier to the Hawk after you build a new version of the script. For example with the [Hawk Webpack Plugin](https://github.com/codex-team/hawk.webpack.plugin) or with cURL request.
- Pass the release identifier to the Hawk Catcher using `release` option.

## Testing and server responses

To make sure that Hawk is working right, call `test()` method from `HawkCatcher` class instance in browser's console.
`test()` method sends fake error to server. Then, open Hawk and find a test event at the Project's page.
