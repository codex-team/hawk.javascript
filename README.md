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

Other available [initial settings](types/initial-settings.d.ts) are described at the type definition.

## Testing and server responses

To make sure that Hawk is working right, call `test()` method from `HawkCatcher` class instance in browser's console.
`test()` method sends fake error to server. Then, open Hawk and find a test event at the Project's page.