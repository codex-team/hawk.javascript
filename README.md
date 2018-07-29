# Hawk JavaScript Catcher

[Hawk](https://github.com/codex-team/hawk) is a platform for errors and logs monitoring.

You can find web interface and documentation on [hawk.so/docs](https://hawk.so/docs).

## Installation

We recommend to add Hawk script to page above others to prevent missing any errors.

### Install via NPM or Yarn

Install package

```shell
npm install hawk.javascript --save
```

```shell
yarn add hawk.javascript
```

Then require `hawk.javascript` module

```js
const hawk = require('hawk.javascript');
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

### Initialize Hawk

Call the `hawk.init()` method when script will be ready and pass your Integration Token:

```js
hawk.init({token: 'INTEGRATION_TOKEN'});

// or 

hawk.init('INTEGRATION_TOKEN');
```

Alternately, add `onload="hawk.init({token: 'INTEGRATION_TOKEN'})"` attribute to the `<script>` tag.

```html
<script src="https://cdn.rawgit.com/codex-team/hawk.javascript/master/hawk.js" onload="hawk.init(token)"></script>
```

### Source map support

Hawk supports JS SourceMaps for showing more useful information from your minified bundle. There a few conditions:

1. Bundle ends with line contains anchor to the source map, like `//# sourceMappingURL=all.min.js.map`. It can be absolute or relative (relatively the bundle) path.    
2. Source map are publicly available by its URL.
3. Every build you are updating the `revision` and pass it with `init` method. It can be heximal-hash or simply file's modification timestamp.

```js
hawk.init({token: 'INTEGRATION_TOKEN', revision: 12345654345})
```

## Testing and server responses

To make sure that Hawk is working right, call `hawk.test()` method in browser's console.
`test` method sends fake error to server. So if you get it in your profile, everything works correctly.

Also in browser's console you can find out some Hawk warnings and server responses.
For example, if you get `Access denied` response, something wrong with your token.
